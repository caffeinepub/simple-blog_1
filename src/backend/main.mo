import Text "mo:core/Text";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";

actor {
  include MixinStorage();

  type Image = Storage.ExternalBlob;

  type Post = {
    id : Nat;
    title : Text;
    content : Text;
    author : Text;
    createdAt : Time.Time;
    published : Bool;
    images : [Image];
    ownerId : Principal;
  };

  module Post {
    public func compare(post1 : Post, post2 : Post) : Order.Order {
      Int.compare(post1.id, post2.id);
    };
  };

  let posts = Map.empty<Nat, Post>();
  var nextId = 0;

  public shared ({ caller }) func createPost(title : Text, content : Text, author : Text, imageBlobs : [Image]) : async Nat {
    let id = nextId;
    let post : Post = {
      id;
      title;
      content;
      author;
      createdAt = Time.now();
      published = false;
      images = imageBlobs;
      ownerId = caller;
    };
    posts.add(id, post);
    nextId += 1;
    id;
  };

  public query ({ caller }) func getPost(id : Nat) : async Post {
    switch (posts.get(id)) {
      case (null) { Runtime.trap("Post does not exist! ") };
      case (?post) { post };
    };
  };

  public query ({ caller }) func getAllPublishedPosts() : async [Post] {
    posts.values().toArray().filter(func(post) { post.published });
  };

  public shared ({ caller }) func updatePost(id : Nat, title : Text, content : Text, author : Text, published : Bool, images : [Image]) : async () {
    switch (posts.get(id)) {
      case (null) { Runtime.trap("Post does not exist! ") };
      case (?post) {
        if (post.ownerId != caller) {
          Runtime.trap("You do not have permission to update this post.");
        };
        let updatedPost : Post = {
          post with
          title;
          content;
          author;
          published;
          images;
        };
        posts.add(id, updatedPost);
      };
    };
  };

  public shared ({ caller }) func deletePost(id : Nat) : async () {
    switch (posts.get(id)) {
      case (null) {
        Runtime.trap("Post does not exist! ");
      };
      case (?post) {
        if (post.ownerId != caller) {
          Runtime.trap("You do not have permission to delete this post.");
        };
        posts.remove(id);
      };
    };
  };
};
