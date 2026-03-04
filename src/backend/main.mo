import Array "mo:core/Array";
import Blob "mo:core/Blob";
import Int "mo:core/Int";
import Iter "mo:core/Iter";
import Map "mo:core/Map";
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
};
