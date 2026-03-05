import Array "mo:core/Array";
import Int "mo:core/Int";
import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Time "mo:core/Time";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";

actor {
  include MixinStorage();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

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
    email : Text;
    phone : Text;
    country : Text;
    preferredLanguage : Text;
  };

  public type AuthorInfo = {
    principal : Principal;
    displayName : Text;
  };

  public type CreatePostResult = {
    #ok : Nat;
    #imageTooLarge;
    #contentBlocked : Text;
  };

  public type UpdatePostResult = {
    #ok : ();
    #imageTooLarge;
    #postNotFound;
    #contentBlocked : Text;
  };

  public type ReactionCount = {
    likes : Nat;
    dislikes : Nat;
  };

  public type PublicProfile = {
    principal : Principal;
    alias : Text;
  };

  public type Comment = {
    id : Nat;
    postId : Nat;
    authorPrincipal : Principal;
    authorAlias : Text;
    content : Text;
    images : [Blob];
    createdAt : Time.Time;
    isDeleted : Bool;
  };

  public type Notification = {
    id : Nat;
    recipientPrincipal : Principal;
    postId : Nat;
    postTitle : Text;
    commenterAlias : Text;
    createdAt : Time.Time;
    isRead : Bool;
  };

  public type EditCommentResult = {
    #ok;
    #notFound;
    #notOwner;
  };

  public type DeleteCommentResult = {
    #ok;
    #notFound;
    #notOwner;
  };

  public type LikeResult = {
    #ok : ();
    #alreadyLiked : ();
  };

  public type DislikeResult = {
    #ok : ();
    #alreadyDisliked : ();
  };

  public type GetCommentsResult = {
    #ok : [Comment];
    #postNotFound : ();
  };

  public type GetNotificationsResult = {
    #ok : [Notification];
    #userNotFound : ();
  };

  public type MarkNotificationReadResult = {
    #ok : ();
    #notificationNotFound : ();
  };

  public type ModerationLog = {
    id : Nat;
    contentType : Text;
    authorPrincipal : Principal;
    contentSnippet : Text;
    reason : Text;
    createdAt : Time.Time;
  };

  //---------------------------
  // Group Management Types
  //---------------------------

  public type GroupVisibility = {
    #public_;
    #private_;
  };

  public type GroupMemberRole = {
    #owner;
    #moderator;
    #member;
  };

  public type GroupMember = {
    groupId : Text;
    userPrincipal : Principal;
    alias : Text;
    role : GroupMemberRole;
  };

  public type Group = {
    id : Text;
    name : Text;
    description : Text;
    visibility : GroupVisibility;
    ownerId : Principal;
    createdAt : Time.Time;
  };

  public type GroupPostEntry = {
    groupId : Text;
    postId : Text;
    inMainFeed : Bool;
  };

  // State
  var owner : Principal = Principal.fromText("ci3hz-xset5-ahrcc-nhtdc-kfnzc-34wqe-e2yzj-qk2gl-ygiwy-oc5j5-2ae");
  let posts = Map.empty<Nat, Post>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  var nextPostId = 0;
  let drafts = Map.empty<Nat, Post>();
  let followMap = Map.empty<Principal, Set.Set<Principal>>(); // Follow system
  let comments = Map.empty<Nat, Comment>();
  let notifications = Map.empty<Nat, Notification>();
  var nextCommentId = 0;
  var nextNotificationId = 0;

  // Moderation state
  let moderationLogs = Map.empty<Nat, ModerationLog>();
  var nextModerationLogId = 0;

  // Group state
  let groups_ = Map.empty<Text, Group>();
  let groupMembers_ = Map.empty<Text, [GroupMember]>();
  let groupPosts_ = Map.empty<Text, [GroupPostEntry]>();
  var groupIdCounter = 0;

  //---------------------------
  // Content Moderation Helpers
  //---------------------------

  func containsBlockedContent(text : Text) : ?Text {
    let blockedWords = [
      // Swedish offensive words
      "jävla", "fan", "helvete", "hora", "fitta", "kuk", "knulla", "skit", "idiot", "mongo", "cp", "neger", "bög", "rövhål", "djävul", "satan", "bastard", "as", "kräk", "skitstövel", "jävel", "förbannad", "döda", "mörda", "slå ihjäl", "hata", "hatet", "rasist", "rasism", "nazist", "nazism", "pedofil", "terroris",
      // English offensive words
      "fuck", "shit", "asshole", "bitch", "cunt", "dick", "bastard", "nigger", "faggot", "retard", "kill", "murder", "rape", "racist", "racism", "nazi", "pedophile", "terrorist", "hate speech", "kys", "go die"
    ];
    for (word in blockedWords.values()) {
      if (text.contains(#text word)) {
        return ?word;
      };
    };
    null;
  };

  func logModerationBlock(contentType : Text, author : Principal, snippet : Text, reason : Text) : () {
    let logId = nextModerationLogId;
    let log : ModerationLog = {
      id = logId;
      contentType;
      authorPrincipal = author;
      contentSnippet = snippet;
      reason;
      createdAt = Time.now();
    };
    moderationLogs.add(logId, log);
    nextModerationLogId += 1;

    // Create admin notification
    let notificationId = nextNotificationId;
    let snippetPreview = if (snippet.size() > 50) {
      snippet;
    } else {
      snippet;
    };

    let notification : Notification = {
      id = notificationId;
      recipientPrincipal = owner;
      postId = 0;
      postTitle = "Innehåll blockerat";
      commenterAlias = "[Moderering] " # contentType # " av " # snippetPreview;
      createdAt = Time.now();
      isRead = false;
    };
    notifications.add(notificationId, notification);
    nextNotificationId += 1;
  };

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

  /// Get the preferred language for the caller (authenticated users only)
  public query ({ caller }) func getPreferredLanguage() : async Text {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can get their preferred language");
    };
    switch (userProfiles.get(caller)) {
      case (null) { "en" }; // Default to English if no profile found
      case (?profile) { profile.preferredLanguage };
    };
  };

  /// Set the preferred language for the caller (authenticated users only)
  public shared ({ caller }) func setPreferredLanguage(language : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can set their preferred language");
    };

    let profile = switch (userProfiles.get(caller)) {
      case (null) {
        // Create a new profile with "unnamed" as name and empty fields
        {
          name = "unnamed";
          email = "";
          phone = "";
          country = "";
          preferredLanguage = language;
        };
      };
      case (?existing) {
        // Update only the preferred language in existing profile
        { existing with preferredLanguage = language };
      };
    };

    userProfiles.add(caller, profile);
  };

  // User profile functions

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can get their profile");
    };

    switch (userProfiles.get(caller)) {
      case (null) {
        // Return default profile even if user has not set one yet
        ?{
          name = "unnamed";
          email = "";
          phone = "";
          country = "";
          preferredLanguage = "en";
        };
      };
      case (?existing) { ?existing };
    };
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

  // Profile management (New functionality)
  public shared ({ caller }) func updateUserProfile(profile : UserProfile) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can update profiles");
    };
    userProfiles.add(caller, profile);
  };

  /// List all profiles (admins only — profiles contain sensitive PII: email, phone, country)
  public query ({ caller }) func getAllProfiles() : async [UserProfile] {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can view all profiles");
    };
    userProfiles.values().toArray();
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

    // Content moderation check
    let combinedText = title # " " # content;
    switch (containsBlockedContent(combinedText)) {
      case (?blockedWord) {
        let snippet = combinedText;
        logModerationBlock("post", caller, snippet, blockedWord);
        return #contentBlocked(blockedWord);
      };
      case (null) {};
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

  /// Get a specific draft by ID (authenticated users only, owner of draft only)
  public query ({ caller }) func getDraft(id : Nat) : async Post {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can retrieve drafts");
    };
    switch (drafts.get(id)) {
      case (null) { Runtime.trap("Draft does not exist!") };
      case (?draft) {
        if (draft.ownerId != caller) {
          Runtime.trap("Unauthorized: You do not have permission to access this draft");
        };
        draft;
      };
    };
  };

  /// Delete a draft by ID (authenticated users only, owner of draft only)
  public shared ({ caller }) func deleteDraft(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can delete drafts");
    };
    switch (drafts.get(id)) {
      case (null) { Runtime.trap("Draft does not exist!") };
      case (?draft) {
        if (draft.ownerId != caller) {
          Runtime.trap("Unauthorized: You do not have permission to delete this draft");
        };
        drafts.remove(id);
      };
    };
  };

  /// Publish a draft (authenticated users only, owner of draft only)
  public shared ({ caller }) func publishDraft(id : Nat) : async UpdatePostResult {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can publish drafts");
    };
    switch (drafts.get(id)) {
      case (null) { #postNotFound };
      case (?draft) {
        if (draft.ownerId != caller) {
          Runtime.trap("Unauthorized: You do not have permission to publish this draft");
        };

        // Content moderation check
        let combinedText = draft.title # " " # draft.content;
        switch (containsBlockedContent(combinedText)) {
          case (?blockedWord) {
            let snippet = combinedText;
            logModerationBlock("draft", caller, snippet, blockedWord);
            return #contentBlocked(blockedWord);
          };
          case (null) {};
        };

        // Update status and add to posts map
        let publishedPost : Post = { draft with status = #published };
        posts.add(id, publishedPost);

        // Remove from drafts map
        drafts.remove(id);

        #ok;
      };
    };
  };

  //--- Follow System ---

  /// Follow a user (authenticated users only)
  public shared ({ caller }) func followUser(target : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can follow others");
    };

    if (caller == target) {
      Runtime.trap("You cannot follow yourself");
    };

    let currentFollowers = switch (followMap.get(target)) {
      case (null) { Set.empty<Principal>() };
      case (?followers) { followers };
    };

    if (currentFollowers.contains(caller)) {
      return;
    };

    let updatedFollowers = Set.empty<Principal>();
    for (follower in currentFollowers.values()) {
      updatedFollowers.add(follower);
    };
    updatedFollowers.add(caller);

    followMap.add(target, updatedFollowers);
  };

  /// Unfollow a user (authenticated users only)
  public shared ({ caller }) func unfollowUser(target : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can unfollow others");
    };

    switch (followMap.get(target)) {
      case (null) { return };
      case (?followers) {
        if (not followers.contains(caller)) {
          return;
        };
        followers.remove(caller);
        if (followers.isEmpty()) {
          followMap.remove(target);
        };
      };
    };
  };

  /// Check if user is following another user (authenticated users only)
  public query ({ caller }) func isFollowing(target : Principal) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can check follow status");
    };
    switch (followMap.get(target)) {
      case (null) { false };
      case (?followers) { followers.contains(caller) };
    };
  };

  /// Get follower count for a user (public)
  public query func getFollowerCount(target : Principal) : async Nat {
    switch (followMap.get(target)) {
      case (null) { 0 };
      case (?followers) { followers.size() };
    };
  };

  /// Get list of users the caller follows (authenticated users only)
  public query ({ caller }) func getFollowedUsers() : async [Principal] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can get their followed users");
    };

    var followedUsers : [Principal] = [];
    for ((target, followers) in followMap.entries()) {
      if (followers.contains(caller)) {
        followedUsers := followedUsers.concat([target]);
      };
    };
    followedUsers;
  };

  /// Get all users who have a public profile (name only, must not be empty)
  public query func getPublicProfiles() : async [PublicProfile] {
    let publicProfiles = userProfiles.entries().toArray().filter(
      func((principal, profile)) { profile.name != "" and profile.name != "unnamed" }
    );

    publicProfiles.map(
      func((principal, profile)) {
        {
          principal;
          alias = profile.name;
        };
      }
    );
  };

  // New Comments and Notifications

  public shared ({ caller }) func addComment(postId : Nat, content : Text, authorAlias : Text, images : [Blob]) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can comment");
    };

    if (content == "") {
      Runtime.trap("Comment content cannot be empty");
    };

    // Content moderation check
    switch (containsBlockedContent(content)) {
      case (?blockedWord) {
        let snippet = content;
        logModerationBlock("comment", caller, snippet, blockedWord);
        Runtime.trap("Kommentaren blockerades av innehållsmodereringen: " # blockedWord);
      };
      case (null) {};
    };

    switch (posts.get(postId)) {
      case (null) { Runtime.trap("Invalid post " # postId.toText()) };
      case (?post) {
        let commentId = nextCommentId;
        let comment : Comment = {
          id = commentId;
          postId;
          authorPrincipal = caller;
          authorAlias;
          content;
          images;
          createdAt = Time.now();
          isDeleted = false;
        };

        comments.add(commentId, comment);
        nextCommentId += 1;

        // Only create notification if the commenter is not the post owner
        if (caller != post.ownerId) {
          let notificationId = nextNotificationId;
          let notification : Notification = {
            id = notificationId;
            recipientPrincipal = post.ownerId;
            postId;
            postTitle = post.title;
            commenterAlias = authorAlias;
            createdAt = Time.now();
            isRead = false;
          };

          notifications.add(notificationId, notification);
          nextNotificationId += 1;
        };

        commentId;
      };
    };
  };

  public shared ({ caller }) func editComment(commentId : Nat, content : Text, images : [Blob]) : async EditCommentResult {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can edit comments");
    };

    switch (comments.get(commentId)) {
      case (null) { #notFound };
      case (?comment) {
        if (comment.authorPrincipal != caller) { #notOwner }
        else {
          let updatedComment : Comment = {
            comment with
            content;
            images;
          };
          comments.add(commentId, updatedComment);
          #ok;
        };
      };
    };
  };

  public shared ({ caller }) func deleteComment(commentId : Nat) : async DeleteCommentResult {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can delete comments");
    };

    switch (comments.get(commentId)) {
      case (null) { #notFound };
      case (?comment) {
        if (comment.authorPrincipal != caller) { #notOwner }
        else {
          let updatedComment : Comment = { comment with isDeleted = true };
          comments.add(commentId, updatedComment);
          #ok;
        };
      };
    };
  };

  public query ({ caller }) func getCommentsForPost(postId : Nat) : async GetCommentsResult {
    switch (posts.get(postId)) {
      case (null) { #postNotFound };
      case (_) {
        let postComments = comments.entries().toArray().filter(
          func(entry) { entry.1.postId == postId and not entry.1.isDeleted }
        );
        let result = postComments.map(func(entry) { entry.1 });
        #ok(result);
      };
    };
  };

  public query ({ caller }) func getNotifications() : async [Notification] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can get notifications");
    };

    let userNotifications = notifications.values().toArray().filter(
      func(notification) { notification.recipientPrincipal == caller }
    );

    userNotifications;
  };

  public query ({ caller }) func getUnreadNotificationCount() : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can get notification count");
    };

    let unreadNotifications = notifications.values().toArray().filter(
      func(notification) {
        notification.recipientPrincipal == caller and not notification.isRead
      }
    );
    unreadNotifications.size();
  };

  public shared ({ caller }) func markNotificationRead(notificationId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can mark notifications as read");
    };

    switch (notifications.get(notificationId)) {
      case (null) { Runtime.trap("Notification not found") };
      case (?notification) {
        if (notification.recipientPrincipal != caller) {
          Runtime.trap("You do not own this notification");
        };
        let updatedNotification : Notification = { notification with isRead = true };
        notifications.add(notificationId, updatedNotification);
      };
    };
  };

  public shared ({ caller }) func clearAllNotifications() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can clear notifications");
    };

    for ((id, notification) in notifications.entries()) {
      if (notification.recipientPrincipal == caller and not notification.isRead) {
        let updatedNotification : Notification = { notification with isRead = true };
        notifications.add(id, updatedNotification);
      };
    };
  };

  //---------------------------
  // Content Moderation Functions
  //---------------------------

  /// Get moderation log (admins only)
  public query ({ caller }) func getModerationLog() : async [ModerationLog] {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can access moderation logs");
    };

    let logs = moderationLogs.values().toArray();
    logs.sort(func(a : ModerationLog, b : ModerationLog) : Order.Order {
      Int.compare(b.createdAt, a.createdAt)
    });
  };

  //--------------------------------------
  // Group Management Functions
  //--------------------------------------

  public shared ({ caller }) func createGroup(name : Text, description : Text, isPublic : Bool) : async Text {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can create groups");
    };

    let groupId : Text = "grp-" # groupIdCounter.toText();
    groupIdCounter += 1;

    let newGroup : Group = {
      id = groupId;
      name;
      description;
      visibility = if (isPublic) { #public_ } else { #private_ };
      ownerId = caller;
      createdAt = Time.now();
    };

    // Add group to groups map
    groups_.add(groupId, newGroup);

    // Add creator as owner member
    let ownerMember : GroupMember = {
      groupId;
      userPrincipal = caller;
      alias = getUserAlias(caller);
      role = #owner;
    };

    groupMembers_.add(groupId, [ownerMember]);
    groupPosts_.add(groupId, []);

    groupId;
  };

  public query ({ caller }) func getGroupById(id : Text) : async ?Group {
    switch (groups_.get(id)) {
      case (null) { null };
      case (?group) {
        if (group.visibility == #public_) {
          ?group;
        } else {
          switch (isMember(caller, id)) {
            case (true) { ?group };
            case (false) { null };
          };
        };
      };
    };
  };

  public query ({ caller }) func getAllGroupsForCaller() : async [Group] {
    let publicGroups = groups_.values().toArray().filter(func(g) { g.visibility == #public_ });

    let memberGroups = groups_.entries().toArray().filter(
      func((groupId, group)) { isMember(caller, groupId) }
    ).map(func((groupId, group)) { group });

    publicGroups.concat(memberGroups);
  };

  public query ({ caller }) func getPublicGroups() : async [Group] {
    groups_.values().toArray().filter(func(g) { g.visibility == #public_ });
  };

  public shared ({ caller }) func updateGroup(id : Text, name : Text, description : Text, isPublic : Bool) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can update groups");
    };

    switch (groups_.get(id)) {
      case (null) { false };
      case (?group) {
        if (group.ownerId != caller) {
          Runtime.trap("Unauthorized: Only group owner can update group");
        };

        let updatedGroup : Group = {
          group with
          name;
          description;
          visibility = if (isPublic) { #public_ } else { #private_ };
        };

        groups_.add(id, updatedGroup);
        true;
      };
    };
  };

  public shared ({ caller }) func deleteGroup(id : Text) : async Bool {
    switch (groups_.get(id)) {
      case (null) { false };
      case (?group) {
        if (group.ownerId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only group owner or admin can delete group");
        };

        groups_.remove(id);
        groupMembers_.remove(id);
        groupPosts_.remove(id);
        true;
      };
    };
  };

  public query ({ caller }) func getGroupMembers(groupId : Text) : async [GroupMember] {
    switch (groupMembers_.get(groupId)) {
      case (null) { [] };
      case (?members) { members };
    };
  };

  public shared ({ caller }) func joinGroup(groupId : Text) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can join groups");
    };

    switch (groups_.get(groupId)) {
      case (null) { false };
      case (?group) {
        if (group.visibility != #public_) {
          Runtime.trap("Cannot join private groups without invitation");
        };

        let newMember : GroupMember = {
          groupId;
          userPrincipal = caller;
          alias = getUserAlias(caller);
          role = #member;
        };

        switch (groupMembers_.get(groupId)) {
          case (null) { groupMembers_.add(groupId, [newMember]) };
          case (?members) {
            groupMembers_.add(groupId, members.concat([newMember]));
          };
        };
        true;
      };
    };
  };

  public shared ({ caller }) func inviteToGroup(groupId : Text, targetPrincipal : Principal) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can invite to groups");
    };

    switch (groups_.get(groupId)) {
      case (null) { false };
      case (?group) {
        if (not (isOwnerOrModerator(caller, groupId))) {
          Runtime.trap("Unauthorized: Only owner/moderators can invite");
        };

        let newMember : GroupMember = {
          groupId;
          userPrincipal = targetPrincipal;
          alias = getUserAlias(targetPrincipal);
          role = #member;
        };

        switch (groupMembers_.get(groupId)) {
          case (null) { groupMembers_.add(groupId, [newMember]) };
          case (?members) {
            groupMembers_.add(groupId, members.concat([newMember]));
          };
        };
        true;
      };
    };
  };

  public shared ({ caller }) func leaveGroup(groupId : Text) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can leave groups");
    };

    switch (groupMembers_.get(groupId)) {
      case (null) { false };
      case (?members) {
        var remainingMembers : [GroupMember] = [];
        var isOwnerMember = false;

        for (member in members.values()) {
          if (member.userPrincipal == caller) {
            isOwnerMember := (member.role == #owner);
          } else {
            remainingMembers := remainingMembers.concat([member]);
          };
        };

        if (isOwnerMember) {
          Runtime.trap("Owner cannot leave the group");
        };

        groupMembers_.add(groupId, remainingMembers);
        true;
      };
    };
  };

  public shared ({ caller }) func removeGroupMember(groupId : Text, targetPrincipal : Principal) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can remove group members");
    };

    if (not (isOwnerOrModerator(caller, groupId))) {
      Runtime.trap("Unauthorized: Only owner/moderators can remove members");
    };

    switch (groupMembers_.get(groupId)) {
      case (null) { false };
      case (?members) {
        let remainingMembers = members.filter(
          func(member) { member.userPrincipal != targetPrincipal }
        );
        groupMembers_.add(groupId, remainingMembers);
        true;
      };
    };
  };

  public shared ({ caller }) func setGroupModerator(groupId : Text, targetPrincipal : Principal) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can set moderators");
    };

    switch (groups_.get(groupId)) {
      case (null) { false };
      case (?group) {
        if (group.ownerId != caller) {
          Runtime.trap("Only group owner can promote to moderator");
        };

        switch (groupMembers_.get(groupId)) {
          case (null) { false };
          case (?members) {
            let updatedMembers = members.map(
              func(member) {
                if (member.userPrincipal == targetPrincipal) {
                  { member with role = #moderator };
                } else {
                  member;
                };
              }
            );
            groupMembers_.add(groupId, updatedMembers);
            true;
          };
        };
      };
    };
  };

  public shared ({ caller }) func removeGroupModerator(groupId : Text, targetPrincipal : Principal) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can remove moderators");
    };

    switch (groups_.get(groupId)) {
      case (null) { false };
      case (?group) {
        if (group.ownerId != caller) {
          Runtime.trap("Only group owner can demote moderator");
        };

        switch (groupMembers_.get(groupId)) {
          case (null) { false };
          case (?members) {
            let updatedMembers = members.map(
              func(member) {
                if (member.userPrincipal == targetPrincipal) {
                  { member with role = #member };
                } else {
                  member;
                };
              }
            );
            groupMembers_.add(groupId, updatedMembers);
            true;
          };
        };
      };
    };
  };

  public query ({ caller }) func getGroupPosts(groupId : Text) : async [GroupPostEntry] {
    switch (groupPosts_.get(groupId)) {
      case (null) { [] };
      case (?posts) { posts };
    };
  };

  public shared ({ caller }) func addPostToGroup(groupId : Text, postId : Text, inMainFeed : Bool) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can add posts to groups");
    };

    if (not isMember(caller, groupId)) {
      Runtime.trap("Only members can add posts to groups");
    };

    let newPost : GroupPostEntry = {
      groupId;
      postId;
      inMainFeed;
    };

    switch (groupPosts_.get(groupId)) {
      case (null) { groupPosts_.add(groupId, [newPost]) };
      case (?posts) {
        groupPosts_.add(groupId, posts.concat([newPost]));
      };
    };
    true;
  };

  public shared ({ caller }) func removePostFromGroup(groupId : Text, postId : Text) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can remove posts from groups");
    };

    if (not (isOwnerOrModerator(caller, groupId) or isPostOwner(caller, postId))) {
      Runtime.trap("Only group owner, moderator, or post owner can remove post");
    };

    switch (groupPosts_.get(groupId)) {
      case (null) { false };
      case (?posts) {
        let remainingPosts = posts.filter(func(post) { post.postId != postId });
        groupPosts_.add(groupId, remainingPosts);
        true;
      };
    };
  };

  //--------------------------------------
  // Helper Functions
  //--------------------------------------

  func getUserAlias(user : Principal) : Text {
    switch (userProfiles.get(user)) {
      case (null) { "Anonym" };
      case (?profile) {
        if (profile.name != "" and profile.name != "unnamed") {
          profile.name;
        } else {
          "Anonym";
        };
      };
    };
  };

  func isMember(user : Principal, groupId : Text) : Bool {
    switch (groupMembers_.get(groupId)) {
      case (null) { false };
      case (?members) {
        members.find(
          func(member) { member.userPrincipal == user }
        ) != null;
      };
    };
  };

  func isOwnerOrModerator(user : Principal, groupId : Text) : Bool {
    switch (groupMembers_.get(groupId)) {
      case (null) { false };
      case (?members) {
        members.find(
          func(member) {
            member.userPrincipal == user and (member.role == #owner or member.role == #moderator)
          }
        ) != null;
      };
    };
  };

  func isPostOwner(user : Principal, postId : Text) : Bool {
    let postIdNat = switch (Nat.fromText(postId)) {
      case (null) { return false };
      case (?id) { id };
    };

    switch (posts.get(postIdNat)) {
      case (null) { false };
      case (?post) { post.ownerId == user };
    };
  };
};
