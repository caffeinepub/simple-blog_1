import { useParams, useNavigate } from '@tanstack/react-router';
import { useGetPost } from '../hooks/useQueries';
import { formatDate } from '../utils/dateFormatter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, User, Calendar } from 'lucide-react';

export default function PostDetailPage() {
  const { id } = useParams({ from: '/post/$id' });
  const navigate = useNavigate();
  const { data: post, isLoading, error } = useGetPost(BigInt(id));

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-6 py-16">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container max-w-4xl mx-auto px-6 py-16">
        <div className="text-center py-20">
          <p className="text-destructive mb-6">Post not found or failed to load.</p>
          <Button onClick={() => navigate({ to: '/' })} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <article className="container max-w-4xl mx-auto px-6 py-16">
      <Button
        onClick={() => navigate({ to: '/' })}
        variant="ghost"
        size="sm"
        className="mb-8 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to all posts
      </Button>

      <header className="mb-12 pb-8 border-b border-border/40">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-6 leading-tight tracking-tight">
          {post.title}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="font-medium">{post.author}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <time dateTime={new Date(Number(post.createdAt) / 1000000).toISOString()}>
              {formatDate(post.createdAt)}
            </time>
          </div>
        </div>
      </header>

      <div className="prose prose-lg prose-slate dark:prose-invert max-w-none">
        <div className="whitespace-pre-wrap leading-relaxed text-foreground opacity-90">
          {post.content}
        </div>
      </div>
    </article>
  );
}
