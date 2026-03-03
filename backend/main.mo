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

  public type Image = Storage.ExternalBlob;

  public type PostStatus = {
    #published;
    #draft;
    #hidden;
  };

  public type Post = {
    id : Nat;
    title : Text;
    content : Text;
    author : Text;
    createdAt : Time.Time;
    status : PostStatus;
    images : [Image];
    ownerId : Principal;
    likedBy : [Principal];
    dislikedBy : [Principal];
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

  public type CreatePostResult = {
    #ok : Nat;
    #imageTooLarge;
  };

  public type UpdatePostResult = {
    #ok : ();
    #imageTooLarge;
    #postNotFound;
  };

  public type ReactionCount = {
    likes : Nat;
    dislikes : Nat;
  };

  // State
  var owner : Principal = Principal.fromText("2vxsx-fae");
  let posts = Map.empty<Nat, Post>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  var nextPostId = 0;
  let drafts = Map.empty<Nat, Post>(); // Store drafts by postId

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
    let adminList = userProfiles.keys().toArray().filter(func(p) { AccessControl.isAdmin(accessControlState, p) });

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

  /// Called by admin to promote a principal to user role
  public shared ({ caller }) func promoteUser(user : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can set users");
    };
    if (user.isAnonymous()) {
      Runtime.trap("Cannot promote anonymous principal");
    };
    AccessControl.assignRole(accessControlState, caller, user, #user);
  };

  // Post management functions

  /// Create a post (authenticated users only)
  public shared ({ caller }) func createPost(title : Text, content : Text, author : Text, images : [Image]) : async CreatePostResult {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can create posts");
    };

    if (images.size() > 0) {
      for (image in images.values()) {
        if (image.size() > 900_000) {
          return #imageTooLarge;
        };
      };
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
      likedBy = [];
      dislikedBy = [];
    };
    posts.add(id, post);
    nextPostId += 1;
    #ok(id);
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
  public shared ({ caller }) func updatePost(id : Nat, title : Text, content : Text, author : Text, status : PostStatus, images : [Image]) : async UpdatePostResult {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can update posts");
    };
    switch (posts.get(id)) {
      case (null) { #postNotFound };
      case (?post) {
        if (post.ownerId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: You do not have permission to update this post");
        };

        if (images.size() > 0) {
          for (image in images.values()) {
            if (image.size() > 900_000) {
              return #imageTooLarge;
            };
          };
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
        #ok;
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

  // Reactions Management

  /// Like a post (authenticated users only). Toggles like; removes dislike if present.
  public shared ({ caller }) func likePost(postId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can like posts");
    };

    switch (posts.get(postId)) {
      case (null) { Runtime.trap("Post " # postId.toText() # " does not exist!") };
      case (?post) {
        let alreadyLiked = post.likedBy.find(func(p : Principal) : Bool { p == caller });
        let alreadyDisliked = post.dislikedBy.find(func(p : Principal) : Bool { p == caller });

        var newLikedBy = post.likedBy;
        var newDislikedBy = post.dislikedBy;

        // Toggle like
        switch (alreadyLiked) {
          case (null) {
            // Add to liked
            newLikedBy := post.likedBy.concat([caller]);
          };
          case (_) {
            // Remove from liked
            newLikedBy := post.likedBy.filter(func(p : Principal) : Bool { p != caller });
          };
        };

        // Remove from disliked if present
        switch (alreadyDisliked) {
          case (null) { () };
          case (_) {
            newDislikedBy := post.dislikedBy.filter(func(p : Principal) : Bool { p != caller });
          };
        };

        let updatedPost = { post with likedBy = newLikedBy; dislikedBy = newDislikedBy };
        posts.add(postId, updatedPost);
      };
    };
  };

  /// Dislike a post (authenticated users only). Toggles dislike; removes like if present.
  public shared ({ caller }) func dislikePost(postId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can dislike posts");
    };

    switch (posts.get(postId)) {
      case (null) { Runtime.trap("Post " # postId.toText() # " does not exist!") };
      case (?post) {
        let alreadyLiked = post.likedBy.find(func(p : Principal) : Bool { p == caller });
        let alreadyDisliked = post.dislikedBy.find(func(p : Principal) : Bool { p == caller });

        var newLikedBy = post.likedBy;
        var newDislikedBy = post.dislikedBy;

        // Toggle dislike
        switch (alreadyDisliked) {
          case (null) {
            // Add to disliked
            newDislikedBy := post.dislikedBy.concat([caller]);
          };
          case (_) {
            // Remove from disliked
            newDislikedBy := post.dislikedBy.filter(func(p : Principal) : Bool { p != caller });
          };
        };

        // Remove from liked if present
        switch (alreadyLiked) {
          case (null) { () };
          case (_) {
            newLikedBy := post.likedBy.filter(func(p : Principal) : Bool { p != caller });
          };
        };

        let updatedPost = { post with likedBy = newLikedBy; dislikedBy = newDislikedBy };
        posts.add(postId, updatedPost);
      };
    };
  };

  /// Get like/dislike counts for a post (public, no auth required)
  public query func getPostReactions(postId : Nat) : async ReactionCount {
    switch (posts.get(postId)) {
      case (null) { Runtime.trap("Post does not exist!") };
      case (?post) {
        {
          likes = post.likedBy.size();
          dislikes = post.dislikedBy.size();
        };
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

  //---------------------------
  // Draft handling functions
  //---------------------------

  /// Save a new draft (authenticated users only)
  public shared ({ caller }) func saveDraft(title : Text, content : Text, author : Text, images : [Image]) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can save drafts");
    };

    let id = nextPostId;
    let draft : Post = {
      id;
      title;
      content;
      author;
      createdAt = Time.now();
      status = #draft;
      images;
      ownerId = caller;
      likedBy = [];
      dislikedBy = [];
    };
    drafts.add(id, draft);
    nextPostId += 1;
    id;
  };

  /// Update an existing draft (authenticated users only, owner of draft only)
  public shared ({ caller }) func updateDraft(id : Nat, title : Text, content : Text, author : Text, images : [Image]) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can update drafts");
    };
    switch (drafts.get(id)) {
      case (null) { Runtime.trap("Draft does not exist!") };
      case (?draft) {
        if (draft.ownerId != caller) {
          Runtime.trap("Unauthorized: You do not have permission to update this draft");
        };

        let updatedDraft : Post = {
          draft with
          title;
          content;
          author;
          images;
        };
        drafts.add(id, updatedDraft);
      };
    };
  };

  /// Get all drafts belonging to the caller (authenticated users only)
  public query ({ caller }) func getMyDrafts() : async [Post] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can retrieve their drafts");
    };
    drafts.values().toArray().filter(func(draft : Post) : Bool { draft.ownerId == caller });
  };
};
