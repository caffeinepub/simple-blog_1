import { Link } from '@tanstack/react-router';
import { type Post } from '../backend';
import { formatDate } from '../utils/dateFormatter';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { User, Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const preview = post.content.length > 200 
    ? post.content.substring(0, 200) + '...' 
    : post.content;

  return (
    <Card className="group hover:shadow-md transition-all duration-300 border-border/40 overflow-hidden">
      <CardHeader className="space-y-4 pb-4">
        <Link
          to="/post/$id"
          params={{ id: post.id.toString() }}
          className="block"
        >
          <h3 className="text-2xl md:text-3xl font-serif font-bold text-foreground group-hover:text-primary transition-colors leading-tight tracking-tight">
            {post.title}
          </h3>
        </Link>
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
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-foreground opacity-80 leading-relaxed line-clamp-3">
          {preview}
        </p>
        <Link
          to="/post/$id"
          params={{ id: post.id.toString() }}
        >
          <Button variant="ghost" size="sm" className="group/btn -ml-2">
            Read more
            <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
