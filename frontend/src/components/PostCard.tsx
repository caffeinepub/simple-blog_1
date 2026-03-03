import { Link } from '@tanstack/react-router';
import { type Post } from '../backend';
import { formatDate } from '../utils/dateFormatter';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { User, Calendar, ArrowRight, ImageOff, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef } from 'react';
import ShareModal from './ShareModal';
import { useShare } from '../hooks/useShare';
import ReactionButtons from './ReactionButtons';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const preview =
    post.content.length > 200 ? post.content.substring(0, 200) + '...' : post.content;

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const urlRef = useRef<string | null>(null);

  const { share, isSupported } = useShare();
  const postUrl = `${window.location.origin}/post/${post.id.toString()}`;

  useEffect(() => {
    if (post.images && post.images.length > 0) {
      const firstImage = post.images[0];
      if (!firstImage || firstImage.length === 0) {
        setImageError(true);
        return;
      }
      try {
        const blob = new Blob([new Uint8Array(firstImage)], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setThumbnailUrl(url);
        setImageError(false);
      } catch {
        setImageError(true);
      }
    }

    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [post.images]);

  const hasThumbnail = post.images && post.images.length > 0;

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSupported) {
      const used = await share(post.title, postUrl);
      if (!used) setShareModalOpen(true);
    } else {
      setShareModalOpen(true);
    }
  };

  return (
    <>
      <Card className="group hover:shadow-md transition-all duration-300 border-border/40 overflow-hidden">
        {hasThumbnail && (
          <Link to="/post/$id" params={{ id: post.id.toString() }} className="block">
            <div className="relative aspect-[16/9] overflow-hidden bg-muted/30">
              {thumbnailUrl && !imageError ? (
                <img
                  src={thumbnailUrl}
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                  loading="lazy"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                  <ImageOff className="h-8 w-8 mb-1" />
                  <span className="text-xs">Bild ej tillgänglig</span>
                </div>
              )}
            </div>
          </Link>
        )}
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
            {/* Share button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="gap-1.5 text-muted-foreground hover:text-foreground ml-auto -mr-2 h-7 px-2"
              title="Dela inlägg"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="text-xs">Dela</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-foreground opacity-80 leading-relaxed line-clamp-3">{preview}</p>

          {/* Reaction buttons */}
          <div className="pt-1">
            <ReactionButtons post={post} />
          </div>

          <Link to="/post/$id" params={{ id: post.id.toString() }}>
            <Button variant="ghost" size="sm" className="group/btn -ml-2">
              Läs mer
              <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title={post.title}
        url={postUrl}
      />
    </>
  );
}
