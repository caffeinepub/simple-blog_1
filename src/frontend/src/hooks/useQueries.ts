import { Principal } from "@dfinity/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AuthorInfo,
  Comment,
  GetCommentsResult,
  Image,
  Notification,
  Post,
  PublicProfile,
  ReactionCount,
  UserProfile,
} from "../backend";
import { DeleteCommentResult, PostStatus } from "../backend";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

// ─── EditCommentResult (defined here since it mirrors DeleteCommentResult) ────
export type EditCommentResult = "ok" | "notFound" | "notOwner";

// ─── Public / User Hooks ────────────────────────────────────────────────────

export function useGetAllPublishedPosts() {
  const { actor, isFetching } = useActor();

  return useQuery<Post[]>({
    queryKey: ["posts", "published"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPublishedPosts();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetPost(id: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery<Post>({
    queryKey: ["post", id.toString()],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.getPost(id);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreatePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      content,
      author,
      published,
      images = [],
    }: {
      title: string;
      content: string;
      author: string;
      published: boolean;
      images?: Uint8Array[];
    }) => {
      if (!actor) throw new Error("Actor not initialized");

      const createResult = await actor.createPost(
        title,
        content,
        author,
        images,
      );

      if (createResult.__kind__ === "imageTooLarge") {
        throw new Error("Bilden är för stor. Max 800 KB per bild tillåts.");
      }

      const postId = createResult.ok;

      if (published) {
        const updateResult = await actor.updatePost(
          postId,
          title,
          content,
          author,
          PostStatus.published,
          images,
        );
        if (updateResult === "imageTooLarge") {
          throw new Error("Bilden är för stor. Max 800 KB per bild tillåts.");
        }
      }

      return postId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useUpdatePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      title,
      content,
      author,
      published,
      images = [],
    }: {
      id: bigint;
      title: string;
      content: string;
      author: string;
      published: boolean;
      images?: Uint8Array[];
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      const status = published ? PostStatus.published : PostStatus.draft;
      const result = await actor.updatePost(
        id,
        title,
        content,
        author,
        status,
        images,
      );
      if (result === "imageTooLarge") {
        throw new Error("Bilden är för stor. Max 800 KB per bild tillåts.");
      }
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", id.toString()] });
    },
  });
}

export function useDeletePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.deletePost(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

// ─── Reaction Hooks ──────────────────────────────────────────────────────────

export function useGetPostReactions(postId: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery<ReactionCount>({
    queryKey: ["reactions", postId.toString()],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.getPostReactions(postId);
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useLikePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.likePost(postId);
    },
    onSuccess: (_data, postId) => {
      queryClient.invalidateQueries({
        queryKey: ["reactions", postId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["post", postId.toString()] });
      queryClient.invalidateQueries({ queryKey: ["posts", "published"] });
    },
  });
}

export function useDislikePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.dislikePost(postId);
    },
    onSuccess: (_data, postId) => {
      queryClient.invalidateQueries({
        queryKey: ["reactions", postId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["post", postId.toString()] });
      queryClient.invalidateQueries({ queryKey: ["posts", "published"] });
    },
  });
}

// ─── Draft Hooks ─────────────────────────────────────────────────────────────

export function useGetMyDrafts() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

  return useQuery<Post[]>({
    queryKey: ["myDrafts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyDrafts();
    },
    enabled: !!actor && !isFetching && isAuthenticated,
  });
}

export function useSaveDraft() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      content,
      author,
      images = [],
    }: {
      title: string;
      content: string;
      author: string;
      images?: Uint8Array[];
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.saveDraft(title, content, author, images);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myDrafts"] });
    },
  });
}

export function useUpdateDraft() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      title,
      content,
      author,
      images = [],
    }: {
      id: bigint;
      title: string;
      content: string;
      author: string;
      images?: Uint8Array[];
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.updateDraft(id, title, content, author, images);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myDrafts"] });
    },
  });
}

export function useDeleteDraft() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not initialized");
      try {
        await actor.deletePost(id);
      } catch (err: unknown) {
        // Surface the exact backend error message (e.g. Runtime.trap messages)
        if (err instanceof Error) {
          throw err;
        }
        const msg =
          typeof err === "string"
            ? err
            : JSON.stringify(err) || "Okänt fel från servern";
        throw new Error(msg);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myDrafts"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

// ─── Profile Hooks ────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching && isAuthenticated,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useGetAllProfiles() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

  return useQuery<UserProfile[]>({
    queryKey: ["allProfiles"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllProfiles();
    },
    enabled: !!actor && !isFetching && isAuthenticated,
    retry: false,
  });
}

// ─── Language Hooks ───────────────────────────────────────────────────────────

export function useGetPreferredLanguage() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

  return useQuery<string>({
    queryKey: ["preferredLanguage"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getPreferredLanguage();
    },
    enabled: !!actor && !actorFetching && isAuthenticated,
    retry: false,
    staleTime: 60_000,
  });
}

export function useSetPreferredLanguage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (language: string) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.setPreferredLanguage(language);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferredLanguage"] });
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

// ─── Admin Hooks ─────────────────────────────────────────────────────────────

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

  return useQuery<boolean>({
    queryKey: ["isCallerAdmin", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await actor.isCallerAdmin();
      } catch {
        return false;
      }
    },
    enabled: !!actor && !isFetching && isAuthenticated,
    retry: false,
    staleTime: 0,
  });
}

export function useAllPostsAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<Post[]>({
    queryKey: ["posts", "admin"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPostsAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAdmins() {
  const { actor, isFetching } = useActor();

  return useQuery<Principal[]>({
    queryKey: ["admins"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAdmins();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetAuthors() {
  const { actor, isFetching } = useActor();

  return useQuery<AuthorInfo[]>({
    queryKey: ["authors"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAuthors();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (principalText: string) => {
      if (!actor) throw new Error("Actor not initialized");
      const principal = Principal.fromText(principalText);
      await actor.addAdmin(principal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
    },
  });
}

export function useRemoveAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (principalText: string) => {
      if (!actor) throw new Error("Actor not initialized");
      const principal = Principal.fromText(principalText);
      await actor.removeAdmin(principal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
    },
  });
}

export function useAdminUpdatePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      title,
      content,
      author,
      status,
      images = [],
    }: {
      id: bigint;
      title: string;
      content: string;
      author: string;
      status: PostStatus;
      images?: Uint8Array[];
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      const result = await actor.updatePost(
        id,
        title,
        content,
        author,
        status,
        images,
      );
      if (result === "imageTooLarge") {
        throw new Error("Bilden är för stor. Max 800 KB per bild tillåts.");
      }
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["posts", "admin"] });
      queryClient.invalidateQueries({ queryKey: ["posts", "published"] });
      queryClient.invalidateQueries({ queryKey: ["post", id.toString()] });
    },
  });
}

export function useAdminChangePostStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: bigint; status: PostStatus }) => {
      if (!actor) throw new Error("Actor not initialized");
      // Fetch the current post to preserve all existing fields
      const post = await actor.getPost(id);
      const result = await actor.updatePost(
        id,
        post.title,
        post.content,
        post.author,
        status,
        post.images as Uint8Array[],
      );
      if (result === "imageTooLarge") {
        throw new Error("Bilden är för stor. Max 800 KB per bild tillåts.");
      }
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["posts", "admin"] });
      queryClient.invalidateQueries({ queryKey: ["posts", "published"] });
      queryClient.invalidateQueries({ queryKey: ["post", id.toString()] });
    },
  });
}

export function useAdminDeletePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.deletePost(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", "admin"] });
      queryClient.invalidateQueries({ queryKey: ["posts", "published"] });
    },
  });
}

export function useRemoveAuthor() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (principalText: string) => {
      if (!actor) throw new Error("Actor not initialized");
      const principal = Principal.fromText(principalText);
      await actor.removeAuthor(principal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authors"] });
      queryClient.invalidateQueries({ queryKey: ["posts", "admin"] });
      queryClient.invalidateQueries({ queryKey: ["posts", "published"] });
    },
  });
}

// ─── Follow Hooks ─────────────────────────────────────────────────────────────

export function useGetPublicProfiles() {
  const { actor, isFetching } = useActor();

  return useQuery<PublicProfile[]>({
    queryKey: ["publicProfiles"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPublicProfiles();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useGetFollowedUsers() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

  return useQuery<Principal[]>({
    queryKey: ["followedUsers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFollowedUsers();
    },
    enabled: !!actor && !isFetching && isAuthenticated,
    staleTime: 15_000,
  });
}

export function useGetFollowerCount(target: Principal | undefined) {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ["followerCount", target?.toString()],
    queryFn: async () => {
      if (!actor || !target) return BigInt(0);
      return actor.getFollowerCount(target);
    },
    enabled: !!actor && !isFetching && !!target,
    staleTime: 30_000,
  });
}

export function useIsFollowing(target: Principal | undefined) {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

  return useQuery<boolean>({
    queryKey: ["isFollowing", target?.toString()],
    queryFn: async () => {
      if (!actor || !target) return false;
      return actor.isFollowing(target);
    },
    enabled: !!actor && !isFetching && isAuthenticated && !!target,
    staleTime: 15_000,
  });
}

export function useFollowUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (target: Principal) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.followUser(target);
    },
    onSuccess: (_data, target) => {
      queryClient.invalidateQueries({ queryKey: ["followedUsers"] });
      queryClient.invalidateQueries({
        queryKey: ["isFollowing", target.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["followerCount", target.toString()],
      });
    },
  });
}

export function useUnfollowUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (target: Principal) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.unfollowUser(target);
    },
    onSuccess: (_data, target) => {
      queryClient.invalidateQueries({ queryKey: ["followedUsers"] });
      queryClient.invalidateQueries({
        queryKey: ["isFollowing", target.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["followerCount", target.toString()],
      });
    },
  });
}

// ─── Comment Hooks ────────────────────────────────────────────────────────────

export function useGetCommentsForPost(postId: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery<Comment[]>({
    queryKey: ["comments", postId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      const result: GetCommentsResult = await actor.getCommentsForPost(postId);
      if (result.__kind__ === "ok") {
        return result.ok.filter((c) => !c.isDeleted);
      }
      return [];
    },
    enabled: !!actor && !isFetching,
    staleTime: 15_000,
  });
}

export function useAddComment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      content,
      authorAlias,
      images = [],
    }: {
      postId: bigint;
      content: string;
      authorAlias: string;
      images?: Uint8Array[];
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.addComment(postId, content, authorAlias, images);
    },
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", postId.toString()],
      });
    },
  });
}

export function useEditComment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      content,
      images = [],
      postId,
    }: {
      commentId: bigint;
      content: string;
      images?: Uint8Array[];
      postId: bigint;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      const result = await actor.editComment(commentId, content, images);
      const resultStr = String(result);
      if (resultStr === "notFound") {
        throw new Error("Kommentaren hittades inte.");
      }
      if (resultStr === "notOwner") {
        throw new Error("Du äger inte denna kommentar.");
      }
      return { commentId, postId };
    },
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", postId.toString()],
      });
    },
  });
}

export function useDeleteComment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      postId,
    }: {
      commentId: bigint;
      postId: bigint;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      const result = await actor.deleteComment(commentId);
      if (result === DeleteCommentResult.notFound) {
        throw new Error("Kommentaren hittades inte.");
      }
      if (result === DeleteCommentResult.notOwner) {
        throw new Error("Du äger inte denna kommentar.");
      }
      return { commentId, postId };
    },
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", postId.toString()],
      });
    },
  });
}

// ─── Notification Hooks ───────────────────────────────────────────────────────

export function useGetNotifications() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

  return useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getNotifications();
    },
    enabled: !!actor && !isFetching && isAuthenticated,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useGetUnreadNotificationCount() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

  return useQuery<bigint>({
    queryKey: ["unreadNotificationCount"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getUnreadNotificationCount();
    },
    enabled: !!actor && !isFetching && isAuthenticated,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: bigint) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.markNotificationRead(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationCount"] });
    },
  });
}

export function useClearAllNotifications() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.clearAllNotifications();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationCount"] });
    },
  });
}
