import Text "mo:core/Text";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";

actor {
  type Post = {
    id : Nat;
    title : Text;
    content : Text;
    author : Text;
    createdAt : Time.Time;
    published : Bool;
  };

  module Post {
    public func compare(post1 : Post, post2 : Post) : Order.Order {
      Int.compare(post1.id, post2.id);
    };
  };

  let posts = Map.empty<Nat, Post>();
  var nextId = 0;

  public shared ({ caller }) func createPost(title : Text, content : Text, author : Text) : async Nat {
    let id = nextId;
    let post : Post = {
      id;
      title;
      content;
      author;
      createdAt = Time.now();
      published = false;
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

  public shared ({ caller }) func updatePost(id : Nat, title : Text, content : Text, author : Text, published : Bool) : async () {
    switch (posts.get(id)) {
      case (null) { Runtime.trap("Post does not exist! ") };
      case (?post) {
        let updatedPost : Post = {
          post with
          title;
          content;
          author;
          published;
        };
        posts.add(id, updatedPost);
      };
    };
  };

  public shared ({ caller }) func deletePost(id : Nat) : async () {
    if (not posts.containsKey(id)) {
      Runtime.trap("Post does not exist! ");
    };
    posts.remove(id);
  };
};
