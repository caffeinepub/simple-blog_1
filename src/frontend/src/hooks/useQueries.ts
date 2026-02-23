import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Post, Image } from '../backend';

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
      
      const postId = await actor.createPost(title, content, author, images);
      
      if (published) {
        await actor.updatePost(postId, title, content, author, true, images);
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
      await actor.updatePost(id, title, content, author, published, images);
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
