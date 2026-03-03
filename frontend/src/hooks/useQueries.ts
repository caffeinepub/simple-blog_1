import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { Post, Image, AuthorInfo, ReactionCount } from '../backend';
import { PostStatus } from '../backend';
import { Principal } from '@dfinity/principal';

// ─── Public / User Hooks ────────────────────────────────────────────────────

export function useGetAllPublishedPosts() {
  const { actor, isFetching } = useActor();

  return useQuery<Post[]>({
    queryKey: ['posts', 'published'],
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
    queryKey: ['post', id.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
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
      if (!actor) throw new Error('Actor not initialized');

      const createResult = await actor.createPost(title, content, author, images);

      if (createResult.__kind__ === 'imageTooLarge') {
        throw new Error('Bilden är för stor. Max 800 KB per bild tillåts.');
      }

      const postId = createResult.ok;

      if (published) {
        const updateResult = await actor.updatePost(postId, title, content, author, PostStatus.published, images);
        if (updateResult === 'imageTooLarge') {
          throw new Error('Bilden är för stor. Max 800 KB per bild tillåts.');
        }
      }

      return postId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
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
      if (!actor) throw new Error('Actor not initialized');
      const status = published ? PostStatus.published : PostStatus.draft;
      const result = await actor.updatePost(id, title, content, author, status, images);
      if (result === 'imageTooLarge') {
        throw new Error('Bilden är för stor. Max 800 KB per bild tillåts.');
      }
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', id.toString()] });
    },
  });
}

export function useDeletePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not initialized');
      await actor.deletePost(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

// ─── Reaction Hooks ──────────────────────────────────────────────────────────

export function useGetPostReactions(postId: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery<ReactionCount>({
    queryKey: ['reactions', postId.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
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
      if (!actor) throw new Error('Actor not initialized');
      await actor.likePost(postId);
    },
    onSuccess: (_data, postId) => {
      queryClient.invalidateQueries({ queryKey: ['reactions', postId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['post', postId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'published'] });
    },
  });
}

export function useDislikePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error('Actor not initialized');
      await actor.dislikePost(postId);
    },
    onSuccess: (_data, postId) => {
      queryClient.invalidateQueries({ queryKey: ['reactions', postId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['post', postId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'published'] });
    },
  });
}

// ─── Draft Hooks ─────────────────────────────────────────────────────────────

export function useGetMyDrafts() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

  return useQuery<Post[]>({
    queryKey: ['myDrafts'],
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
      if (!actor) throw new Error('Actor not initialized');
      return actor.saveDraft(title, content, author, images);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myDrafts'] });
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
      if (!actor) throw new Error('Actor not initialized');
      await actor.updateDraft(id, title, content, author, images);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myDrafts'] });
    },
  });
}

export function useDeleteDraft() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not initialized');
      await actor.deletePost(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myDrafts'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

// ─── Admin Hooks ─────────────────────────────────────────────────────────────

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  // Only check admin status when the user is authenticated (non-anonymous identity)
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

  return useQuery<boolean>({
    queryKey: ['isCallerAdmin', identity?.getPrincipal().toString()],
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
    queryKey: ['posts', 'admin'],
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
    queryKey: ['admins'],
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
    queryKey: ['authors'],
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
      if (!actor) throw new Error('Actor not initialized');
      const principal = Principal.fromText(principalText);
      await actor.addAdmin(principal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
  });
}

export function useRemoveAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (principalText: string) => {
      if (!actor) throw new Error('Actor not initialized');
      const principal = Principal.fromText(principalText);
      await actor.removeAdmin(principal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
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
      if (!actor) throw new Error('Actor not initialized');
      const result = await actor.updatePost(id, title, content, author, status, images);
      if (result === 'imageTooLarge') {
        throw new Error('Bilden är för stor. Max 800 KB per bild tillåts.');
      }
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['posts', 'admin'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'published'] });
      queryClient.invalidateQueries({ queryKey: ['post', id.toString()] });
    },
  });
}

export function useAdminDeletePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not initialized');
      await actor.deletePost(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', 'admin'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'published'] });
    },
  });
}

export function useAdminChangePostStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: bigint; status: PostStatus }) => {
      if (!actor) throw new Error('Actor not initialized');
      const post = await actor.getPost(id);
      const result = await actor.updatePost(id, post.title, post.content, post.author, status, post.images);
      if (result === 'imageTooLarge') {
        throw new Error('Bilden är för stor. Max 800 KB per bild tillåts.');
      }
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['posts', 'admin'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'published'] });
      queryClient.invalidateQueries({ queryKey: ['post', id.toString()] });
    },
  });
}

export function useRemoveAuthor() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (principalText: string) => {
      if (!actor) throw new Error('Actor not initialized');
      const principal = Principal.fromText(principalText);
      await actor.removeAuthor(principal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authors'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'admin'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'published'] });
    },
  });
}
