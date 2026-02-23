import { useGetAllPublishedPosts } from '../hooks/useQueries';
import PostCard from '../components/PostCard';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { data: posts, isLoading, error } = useGetAllPublishedPosts();

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto px-6 py-16">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-5xl mx-auto px-6 py-16">
        <div className="text-center py-20">
          <p className="text-destructive">Failed to load posts. Please try again later.</p>
        </div>
      </div>
    );
  }

  const sortedPosts = posts ? [...posts].sort((a, b) => Number(b.createdAt - a.createdAt)) : [];

  return (
    <div className="container max-w-5xl mx-auto px-6 py-16">
      <div className="mb-12 text-center">
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4 tracking-tight">
          Latest Stories
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Thoughts, ideas, and narratives from our community of writers
        </p>
      </div>

      {sortedPosts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">
            No published posts yet. Be the first to share your story!
          </p>
        </div>
      ) : (
        <div className="grid gap-8 md:gap-10">
          {sortedPosts.map((post) => (
            <PostCard key={post.id.toString()} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
