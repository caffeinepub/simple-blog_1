import { Principal } from "@dfinity/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AuthorInfo,
  Comment,
  GetCommentsResult,
  Image,
  ModerationLog,
  Notification,
  Post,
  PublicProfile,
  ReactionCount,
  UserProfile,
} from "../backend";
import { DeleteCommentResult, PostStatus, UpdatePostResult } from "../backend";
import { ADMIN_PRINCIPAL_ID } from "../config/constants";
import { getBlockedAuthors } from "../lib/blockedAuthors";
import { checkPostContent, findBlockedWord } from "../lib/contentModeration";
import { getAllGroups } from "../lib/groupStorage";
import { getSecretParameter } from "../utils/urlParams";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

// Helper: convert unknown error to a human-readable message string
function toErrorMessage(err: unknown): string {
  return err instanceof Error
    ? err.message
    : JSON.stringify(err) || "Okänt fel";
}

// Helper: detect "User is not registered" backend trap
function isNotRegisteredError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("not registered") ||
    msg.includes("User is not registered") ||
    msg.includes("is not registered")
  );
}

// Helper: re-register caller in access control using the existing actor
async function tryReinitAccessControl(actor: {
  _initializeAccessControlWithSecret: (token: string) => Promise<void>;
}): Promise<void> {
  try {
    const adminToken = getSecretParameter("caffeineAdminToken") || "";
    await actor._initializeAccessControlWithSecret(adminToken);
  } catch {
    // Best-effort — silent fail, let caller handle
  }
}

// ─── EditCommentResult (defined here since it mirrors DeleteCommentResult) ────
export type EditCommentResult = "ok" | "notFound" | "notOwner";

// ─── Public / User Hooks ────────────────────────────────────────────────────

/**
 * Build a set of post IDs that belong exclusively to PRIVATE groups and must
 * NOT appear in the main feed.
 *
 * A post is hidden from the main feed when:
 *   • it is linked to at least one private group, AND
 *   • it does NOT appear in inMainFeedPostIds for any of those private groups
 *
 * Posts that are only in public groups, or that the author explicitly marked
 * "Synlig i huvudflöde", remain visible.
 */
function buildPrivateGroupPostIds(): Set<string> {
  const groups = getAllGroups();
  const hiddenIds = new Set<string>();

  for (const group of groups) {
    if (group.visibility !== "private") continue;
    for (const postId of group.postIds) {
      if (!group.inMainFeedPostIds.includes(postId)) {
        hiddenIds.add(postId);
      }
    }
  }

  return hiddenIds;
}

export function useGetAllPublishedPosts() {
  const { actor, isFetching } = useActor();

  const query = useQuery<Post[]>({
    queryKey: ["posts", "published"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const posts = await actor.getAllPublishedPosts();

        // Filter out the ICP anonymous principal (2vxsx-fae) and locally-blocked authors
        const blocked = getBlockedAuthors();
        let filtered = posts.filter(
          (p) =>
            p.ownerId.toString() !== "2vxsx-fae" &&
            (blocked.length === 0 || !blocked.includes(p.ownerId.toString())),
        );

        // Filter out posts that belong to private groups and are not explicitly
        // marked as visible in the main feed. This ensures private-group posts
        // never leak into the public main feed.
        const privateGroupPostIds = buildPrivateGroupPostIds();
        if (privateGroupPostIds.size > 0) {
          filtered = filtered.filter(
            (p) => !privateGroupPostIds.has(p.id.toString()),
          );
        }

        return filtered;
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    retry: 1,
    retryDelay: 1000,
  });

  // Include actor loading state so callers show a spinner while actor initialises
  return {
    ...query,
    isLoading: isFetching || query.isLoading,
  };
}

/**
 * Fetch ALL published posts owned by the caller — WITHOUT the private-group
 * filter that useGetAllPublishedPosts applies. This is used in "Mina inlägg"
 * so that the author can always see their own group-published posts.
 */
export function useGetMyPublishedPosts() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const callerPrincipal = identity?.getPrincipal().toString() ?? "";
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

  const query = useQuery<Post[]>({
    queryKey: ["posts", "myPublished", callerPrincipal],
    queryFn: async () => {
      if (!actor || !callerPrincipal) return [];
      try {
        const posts = await actor.getAllPublishedPosts();
        // Return ALL published posts owned by the caller — no private-group filter.
        // The author should always see their own posts regardless of group visibility.
        return posts.filter(
          (p) =>
            p.status === PostStatus.published &&
            p.ownerId.toString() === callerPrincipal,
        );
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching && isAuthenticated,
    retry: 1,
    retryDelay: 1000,
  });

  return {
    ...query,
    isLoading: isFetching || query.isLoading,
  };
}

/**
 * Fetch ALL published posts WITHOUT the private-group filter.
 * Used in GroupDetailPage so that group members can see private-group posts.
 * Anonymous principal (2vxsx-fae) and blocked authors are still filtered out.
 */
export function useGetAllPublishedPostsUnfiltered() {
  const { actor, isFetching } = useActor();

  const query = useQuery<Post[]>({
    queryKey: ["posts", "published", "unfiltered"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const posts = await actor.getAllPublishedPosts();
        const blocked = getBlockedAuthors();
        // Only filter anonymous principal and blocked authors — NO private-group filter
        return posts.filter(
          (p) =>
            p.ownerId.toString() !== "2vxsx-fae" &&
            (blocked.length === 0 || !blocked.includes(p.ownerId.toString())),
        );
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    retry: 1,
    retryDelay: 1000,
  });

  return {
    ...query,
    isLoading: isFetching || query.isLoading,
  };
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
      if (!actor) throw new Error("Anslutningen är inte klar. Försök igen.");

      if (!author || !author.trim()) {
        throw new Error(
          "Alias saknas. Fyll i ett alias eller spara ett i din profil.",
        );
      }

      // Frontend moderation check (case-insensitive, HTML-stripped)
      const blockedWordFrontend = checkPostContent(title, content);
      if (blockedWordFrontend) {
        throw new Error(`__contentBlocked__:${blockedWordFrontend}`);
      }

      // Inner function to perform the actual call, with one retry after re-init
      const doCreate = async (retrying = false): Promise<bigint> => {
        try {
          if (!published) {
            return await actor.saveDraft(title, content, author.trim(), images);
          }
          const createResult = await actor.createPost(
            title,
            content,
            author.trim(),
            images,
          );
          if (createResult.__kind__ === "imageTooLarge") {
            throw new Error(
              "Bilden är för stor efter komprimering. Max 800 KB per bild tillåts. Försök med en annan bild.",
            );
          }
          if (createResult.__kind__ === "contentBlocked") {
            throw new Error(
              `__contentBlocked__:${createResult.contentBlocked}`,
            );
          }
          return createResult.ok;
        } catch (err) {
          if (!retrying && isNotRegisteredError(err)) {
            // Re-register caller in access control and retry once
            await tryReinitAccessControl(actor);
            return doCreate(true);
          }
          throw err;
        }
      };

      return doCreate();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["myDrafts"] });
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
      // Frontend moderation check
      const blockedWordFE = checkPostContent(title, content);
      if (blockedWordFE) {
        throw new Error(`__contentBlocked__:${blockedWordFE}`);
      }
      const status = published ? PostStatus.published : PostStatus.draft;
      const result = await actor.updatePost(
        id,
        title,
        content,
        author,
        status,
        images,
      );
      if (result.__kind__ === "imageTooLarge") {
        throw new Error("Bilden är för stor. Max 800 KB per bild tillåts.");
      }
      if (result.__kind__ === "contentBlocked") {
        throw new Error(`__contentBlocked__:${result.contentBlocked}`);
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

  const query = useQuery<Post[]>({
    queryKey: ["myDrafts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyDrafts();
    },
    enabled: !!actor && !isFetching && isAuthenticated,
  });

  // Include actor loading state so callers show a spinner while actor initialises
  return {
    ...query,
    isLoading: (isFetching && isAuthenticated) || query.isLoading,
  };
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
      if (!actor)
        throw new Error("Anslutningen är inte klar. Försök igen om en stund.");
      // Frontend moderation check
      const blockedWord = checkPostContent(title, content);
      if (blockedWord) {
        throw new Error(`__contentBlocked__:${blockedWord}`);
      }
      const safeAuthor = author?.trim() ? author.trim() : "(Okänd)";

      const doSave = async (retrying = false): Promise<bigint> => {
        try {
          return await actor.saveDraft(title, content, safeAuthor, images);
        } catch (err) {
          if (!retrying && isNotRegisteredError(err)) {
            await tryReinitAccessControl(actor);
            return doSave(true);
          }
          throw err;
        }
      };
      return doSave();
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
      if (!actor)
        throw new Error("Anslutningen är inte klar. Försök igen om en stund.");
      const safeAuthor = author?.trim() ? author.trim() : "(Okänd)";

      const doUpdate = async (retrying = false): Promise<bigint> => {
        try {
          await actor.updateDraft(id, title, content, safeAuthor, images);
          return id;
        } catch (err) {
          if (!retrying && isNotRegisteredError(err)) {
            await tryReinitAccessControl(actor);
            return doUpdate(true);
          }
          throw err;
        }
      };
      return doUpdate();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myDrafts"] });
    },
  });
}

export function useGetDraft(id: bigint) {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

  return useQuery<Post>({
    queryKey: ["draft", id.toString()],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.getDraft(id);
    },
    enabled: !!actor && !isFetching && isAuthenticated,
    retry: false,
  });
}

export function useDeleteDraft() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not initialized");
      try {
        await actor.deleteDraft(id);
      } catch (err: unknown) {
        // Surface the exact backend error message (e.g. Runtime.trap messages)
        if (err instanceof Error) throw err;
        throw new Error(toErrorMessage(err));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myDrafts"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function usePublishDraft() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: bigint | { id: bigint; title?: string; content?: string },
    ) => {
      if (!actor) throw new Error("Actor not initialized");
      const id = typeof input === "bigint" ? input : input.id;
      const title = typeof input === "bigint" ? undefined : input.title;
      const content = typeof input === "bigint" ? undefined : input.content;
      // Frontend moderation check if title/content supplied
      if (title !== undefined || content !== undefined) {
        const blockedWord = checkPostContent(title ?? "", content ?? "");
        if (blockedWord) {
          throw new Error(`__contentBlocked__:${blockedWord}`);
        }
      }
      const result = await actor.publishDraft(id);
      if (result.__kind__ === "postNotFound") {
        throw new Error("Utkastet hittades inte.");
      }
      if (result.__kind__ === "imageTooLarge") {
        throw new Error("Bilden är för stor. Max 800 KB per bild tillåts.");
      }
      if (result.__kind__ === "contentBlocked") {
        throw new Error(`__contentBlocked__:${result.contentBlocked}`);
      }
      return id;
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
      try {
        return await actor.getCallerUserProfile();
      } catch (err) {
        if (isNotRegisteredError(err)) {
          // Re-register and retry once
          await tryReinitAccessControl(actor);
          try {
            return await actor.getCallerUserProfile();
          } catch {
            // Return null so the form shows the alias input field
            return null;
          }
        }
        // For any other error, return null so UI falls back to alias input
        return null;
      }
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
  const { actor } = useActor();
  const { identity } = useInternetIdentity();

  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();
  const principalStr = identity ? identity.getPrincipal().toString() : "";

  return useQuery<boolean>({
    queryKey: ["isCallerAdmin", principalStr],
    queryFn: async () => {
      // First check if caller is the hardcoded owner
      if (principalStr === ADMIN_PRINCIPAL_ID) return true;
      // Then check backend admin list
      if (!actor) return false;
      try {
        const callerPrincipal = identity!.getPrincipal();
        return await actor.isAdmin(callerPrincipal);
      } catch {
        return false;
      }
    },
    enabled: isAuthenticated,
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
      try {
        // Try admin endpoint first (requires backend owner match)
        return await actor.getAllPostsAdmin();
      } catch {
        // Fall back to published posts if admin access is denied
        try {
          return await actor.getAllPublishedPosts();
        } catch {
          return [];
        }
      }
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

export function useAdmins() {
  const { actor, isFetching } = useActor();

  return useQuery<Principal[]>({
    queryKey: ["admins"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAdmins();
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

export function useGetAuthors() {
  const { actor, isFetching } = useActor();

  return useQuery<AuthorInfo[]>({
    queryKey: ["authors"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        // Try admin endpoint first (requires backend owner match)
        return await actor.getAuthors();
      } catch {
        // Fall back: derive author list from published posts
        try {
          const posts = await actor.getAllPublishedPosts();
          const seen = new Map<string, AuthorInfo>();
          for (const post of posts) {
            const pid = post.ownerId.toString();
            if (!seen.has(pid)) {
              seen.set(pid, {
                principal: post.ownerId,
                displayName: post.author,
              });
            }
          }
          return Array.from(seen.values());
        } catch {
          return [];
        }
      }
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

export function useAddAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (principalText: string) => {
      if (!actor) throw new Error("Actor not initialized");
      try {
        const principal = Principal.fromText(principalText);
        await actor.addAdmin(principal);
      } catch (err: unknown) {
        const msg = toErrorMessage(err);
        if (msg.includes("Unauthorized") || msg.includes("unauthorized")) {
          throw new Error(
            "Unauthorized: Bakänden är inte konfigurerad för detta principal ID. Kontakta systemadministratören.",
          );
        }
        throw new Error(msg);
      }
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
      try {
        const principal = Principal.fromText(principalText);
        await actor.removeAdmin(principal);
      } catch (err: unknown) {
        throw new Error(toErrorMessage(err));
      }
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
      try {
        const result = await actor.updatePost(
          id,
          title,
          content,
          author,
          status,
          images,
        );
        if (result.__kind__ === "imageTooLarge") {
          throw new Error("Bilden är för stor. Max 800 KB per bild tillåts.");
        }
        if (result.__kind__ === "contentBlocked") {
          throw new Error(`__contentBlocked__:${result.contentBlocked}`);
        }
        return id;
      } catch (err: unknown) {
        if (err instanceof Error) throw err;
        throw new Error(toErrorMessage(err));
      }
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
      try {
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
        if (result.__kind__ === "imageTooLarge") {
          throw new Error("Bilden är för stor. Max 800 KB per bild tillåts.");
        }
        if (result.__kind__ === "contentBlocked") {
          throw new Error(`__contentBlocked__:${result.contentBlocked}`);
        }
        return id;
      } catch (err: unknown) {
        if (err instanceof Error) throw err;
        throw new Error(toErrorMessage(err));
      }
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
      try {
        await actor.deletePost(id);
      } catch (err: unknown) {
        if (err instanceof Error) throw err;
        throw new Error(toErrorMessage(err));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", "admin"] });
      queryClient.invalidateQueries({ queryKey: ["posts", "published"] });
    },
  });
}

export function useGetModerationLog() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

  return useQuery<ModerationLog[]>({
    queryKey: ["moderationLog"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getModerationLog();
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching && isAuthenticated,
    staleTime: 30_000,
    retry: false,
  });
}

export function useRemoveAuthor() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (principalText: string) => {
      if (!actor) throw new Error("Actor not initialized");
      try {
        const principal = Principal.fromText(principalText);
        await actor.removeAuthor(principal);
      } catch (err: unknown) {
        const msg = toErrorMessage(err);
        if (
          msg.includes("Unauthorized") ||
          msg.includes("unauthorized") ||
          msg.includes("Only admin")
        ) {
          throw new Error(
            "Kan inte ta bort författaren: Backend-behörighet saknas. Principal ID-mismatch i backend. Kontakta systemadministratören.",
          );
        }
        throw new Error(msg);
      }
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
      // Frontend moderation check for comments
      const blockedWord = findBlockedWord(content);
      if (blockedWord) {
        throw new Error(
          `Kommentaren blockerades av innehållsmodereringen: "${blockedWord}". Vänligen ändra ditt innehåll.`,
        );
      }
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
    staleTime: 30_000,
    // Poll less frequently than useGetNotifications (30s) to reduce backend load.
    // The full notification list is already fetched every 30s; this count query
    // is supplementary and doesn't need to stay perfectly in sync.
    refetchInterval: 60_000,
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
