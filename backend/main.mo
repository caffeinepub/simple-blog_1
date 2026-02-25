import Text "mo:core/Text";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Set "mo:core/Set";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";



actor {
  include MixinStorage();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Types

  type Image = Storage.ExternalBlob;

  type PostStatus = {
    #published;
    #draft;
    #hidden;
  };

  type Post = {
    id : Nat;
    title : Text;
    content : Text;
    author : Text;
    createdAt : Time.Time;
    status : PostStatus;
    images : [Image];
    ownerId : Principal;
  };

  module Post {
    public func compare(post1 : Post, post2 : Post) : Order.Order {
      Int.compare(post1.id, post2.id);
    };
  };

  public type UserProfile = {
    name : Text;
  };

  public type AuthorInfo = {
    principal : Principal;
    displayName : Text;
  };

  // State
  var owner : Principal = Principal.fromText("2vxsx-fae");
  let posts = Map.empty<Nat, Post>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  var nextPostId = 0;

  // Owner/Admin management functions

  /// Set a new owner (owner only)
  public shared ({ caller }) func setOwner(newOwner : Principal) : async () {
    if (caller != owner) {
      Runtime.trap("Unauthorized: Only the owner can set a new owner");
    };
    // Assign admin role to new owner
    AccessControl.assignRole(accessControlState, caller, newOwner, #admin);
    owner := newOwner;
  };

  /// Add an admin (owner only)
  public shared ({ caller }) func addAdmin(principal : Principal) : async () {
    if (caller != owner) {
      Runtime.trap("Unauthorized: Only the owner can add admins");
    };
    AccessControl.assignRole(accessControlState, caller, principal, #admin);
  };

  /// Remove an admin (owner only). The owner cannot be removed.
  public shared ({ caller }) func removeAdmin(principal : Principal) : async () {
    if (caller != owner) {
      Runtime.trap("Unauthorized: Only the owner can remove admins");
    };
    if (principal == owner) {
      Runtime.trap("Cannot remove the owner from the admin list");
    };
    AccessControl.assignRole(accessControlState, caller, principal, #user);
  };

  /// Get all admins (owner only)
  public query ({ caller }) func getAdmins() : async [Principal] {
    if (caller != owner) {
      Runtime.trap("Unauthorized: Only the owner can list admins");
    };
    // Return owner plus all principals with admin role tracked via AccessControl
    // Since AccessControl does not expose a list, we maintain our own set via userProfiles iteration
    // We return all principals that have admin role by checking each known principal
    let adminList = userProfiles.keys().toArray().filter(func(p) { AccessControl.isAdmin(accessControlState, p) });

    // Always include owner if not already present
    let ownerExists = adminList.find(func(p) { p == owner });

    switch (ownerExists) {
      case (?_) {
        adminList;
      };
      case (null) {
        adminList.concat([owner]);
      };
    };
  };

  /// Check if a principal is an admin (any authenticated user can check their own status)
  public query ({ caller }) func isAdmin(principal : Principal) : async Bool {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous users cannot check admin status");
    };
    AccessControl.isAdmin(accessControlState, principal);
  };

  // User profile functions

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can get their profile");
    };
    userProfiles.get(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can save their profile");
    };
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  // Post management functions

  /// Create a post (authenticated users only)
  public shared ({ caller }) func createPost(title : Text, content : Text, author : Text, images : [Image]) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can create posts");
    };
    let id = nextPostId;
    let post : Post = {
      id;
      title;
      content;
      author;
      createdAt = Time.now();
      status = #published;
      images;
      ownerId = caller;
    };
    posts.add(id, post);
    nextPostId += 1;
    id;
  };

  /// Get a single post by ID (public, but only published posts for non-admins)
  public query ({ caller }) func getPost(id : Nat) : async Post {
    switch (posts.get(id)) {
      case (null) { Runtime.trap("Post does not exist!") };
      case (?post) {
        if (post.status != #published and not AccessControl.isAdmin(accessControlState, caller) and post.ownerId != caller) {
          Runtime.trap("Unauthorized: Post is not published");
        };
        post;
      };
    };
  };

  /// Get all published posts (public)
  public query ({ caller }) func getAllPublishedPosts() : async [Post] {
    posts.values().toArray().filter(func(post : Post) : Bool { post.status == #published });
  };

  /// Get all posts regardless of status (admins only)
  public query ({ caller }) func getAllPostsAdmin() : async [Post] {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can access all posts");
    };
    posts.values().toArray();
  };

  /// Update a post (owner of post or admin)
  public shared ({ caller }) func updatePost(id : Nat, title : Text, content : Text, author : Text, status : PostStatus, images : [Image]) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can update posts");
    };
    switch (posts.get(id)) {
      case (null) { Runtime.trap("Post does not exist!") };
      case (?post) {
        if (post.ownerId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: You do not have permission to update this post");
        };
        let updatedPost : Post = {
          post with
          title;
          content;
          author;
          status;
          images;
        };
        posts.add(id, updatedPost);
      };
    };
  };

  /// Delete a post (owner of post or admin)
  public shared ({ caller }) func deletePost(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can delete posts");
    };
    switch (posts.get(id)) {
      case (null) { Runtime.trap("Post does not exist!") };
      case (?post) {
        if (post.ownerId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: You do not have permission to delete this post");
        };
        posts.remove(id);
      };
    };
  };

  // Author management functions

  /// Get all unique authors and their display names (admins only)
  public query ({ caller }) func getAuthors() : async [AuthorInfo] {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can access author information");
    };

    let seen = Set.empty<Principal>();
    var result : [AuthorInfo] = [];

    for ((_, post) in posts.entries()) {
      if (not seen.contains(post.ownerId)) {
        seen.add(post.ownerId);
        result := result.concat([{
          principal = post.ownerId;
          displayName = post.author;
        }]);
      };
    };

    result;
  };

  /// Remove all posts belonging to an author (admins only)
  public shared ({ caller }) func removeAuthor(principal : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can remove authors");
    };

    var idsToRemove : [Nat] = [];
    for ((id, post) in posts.entries()) {
      if (post.ownerId == principal) {
        idsToRemove := idsToRemove.concat([id]);
      };
    };

    for (id in idsToRemove.values()) {
      posts.remove(id);
    };
  };
};
