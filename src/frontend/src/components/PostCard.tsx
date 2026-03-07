import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Calendar,
  Share2,
  ThumbsDown,
  ThumbsUp,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Post } from "../backend";
import { useShare } from "../hooks/useShare";
import { formatDate } from "../utils/dateFormatter";
import FollowButton from "./FollowButton";
import { detectCategory } from "./PostSummaryCard";
import ShareModal from "./ShareModal";

interface PostCardProps {
  post: Post;
  /** When true, renders a compact summary card (no reactions inline, smaller text) */
  compact?: boolean;
}

export default function PostCard({ post, compact = false }: PostCardProps) {
  const rawText = post.content
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const preview =
    rawText.length > 160 ? `${rawText.substring(0, 160)}…` : rawText;

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const urlRef = useRef<string | null>(null);

  const { share, isSupported } = useShare();
  const postUrl = `${window.location.origin}/post/${post.id.toString()}`;
  const category = detectCategory(post.title, post.content);
  const likeCount = post.likedBy?.length ?? 0;
  const dislikeCount = post.dislikedBy?.length ?? 0;

  useEffect(() => {
    if (post.images && post.images.length > 0) {
      const firstImage = post.images[0];
      if (!firstImage || firstImage.length === 0) {
        setImageError(true);
        return;
      }
      try {
        const blob = new Blob([new Uint8Array(firstImage)], {
          type: "image/jpeg",
        });
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

  const hasThumbnail = post.images && post.images.length > 0 && !imageError;

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

  if (compact) {
    // Compact sidebar-style card
    return (
      <>
        <article className="group flex gap-3 py-3 border-b border-border/30 last:border-0">
          {hasThumbnail && thumbnailUrl && (
            <Link
              to="/post/$id"
              params={{ id: post.id.toString() }}
              className="shrink-0 w-16 h-16 rounded-md overflow-hidden block"
            >
              <img
                src={thumbnailUrl}
                alt={post.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            </Link>
          )}
          <div className="flex-1 min-w-0">
            <Link
              to="/post/$id"
              params={{ id: post.id.toString() }}
              data-ocid="post_card.compact.link"
            >
              <h4 className="font-serif font-semibold text-sm leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {post.title}
              </h4>
            </Link>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3 shrink-0" />
              <time
                dateTime={new Date(
                  Number(post.createdAt) / 1_000_000,
                ).toISOString()}
              >
                {formatDate(post.createdAt)}
              </time>
            </p>
          </div>
        </article>
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          title={post.title}
          url={postUrl}
        />
      </>
    );
  }

  // Full magazine card
  return (
    <>
      <article
        className="group bg-card border border-border/40 rounded-xl overflow-hidden hover:shadow-xl hover:shadow-foreground/5 hover:border-primary/25 transition-all duration-300 flex flex-col"
        data-ocid="post_card.card"
      >
        {/* Image thumbnail — always shown, gradient when no image */}
        <Link
          to="/post/$id"
          params={{ id: post.id.toString() }}
          className="block relative overflow-hidden aspect-[4/3] shrink-0"
          data-ocid="post_card.link"
        >
          {hasThumbnail && thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            /* Warm editorial gradient — evokes print paper */
            <div
              className="w-full h-full relative"
              style={{
                background:
                  "linear-gradient(145deg, oklch(0.94 0.06 78) 0%, oklch(0.88 0.10 65) 50%, oklch(0.82 0.07 195 / 0.35) 100%)",
              }}
            >
              {/* Subtle noise-like texture via CSS */}
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, transparent, transparent 2px, oklch(0.72 0.18 72 / 0.04) 2px, oklch(0.72 0.18 72 / 0.04) 4px)",
                }}
              />
              {/* Big decorative serif initial */}
              <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none">
                <span
                  className="font-serif font-black text-[6rem] leading-none opacity-[0.07] text-foreground"
                  aria-hidden="true"
                >
                  {post.title.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          )}
          {/* Category badge overlaid on image */}
          {category && (
            <span className="absolute bottom-3 left-3 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-primary text-primary-foreground shadow-md">
              {category}
            </span>
          )}
        </Link>

        {/* Card body — structured hierarchy */}
        <div className="flex flex-col flex-1 p-5 gap-0">
          {/* Title — dominant */}
          <Link
            to="/post/$id"
            params={{ id: post.id.toString() }}
            className="block mb-2.5"
          >
            <h3 className="font-serif font-bold text-xl leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {post.title}
            </h3>
          </Link>

          {/* Preview text */}
          {preview && (
            <p className="text-sm text-foreground/65 leading-relaxed line-clamp-3 mb-4 flex-1">
              {preview}
            </p>
          )}

          {/* Spacer to push footer to bottom */}
          <div className="flex-1" />

          {/* Author + date meta */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3 shrink-0" />
              <span className="font-medium truncate max-w-[110px]">
                {post.author}
              </span>
              <FollowButton
                targetPrincipal={post.ownerId}
                targetAlias={post.author}
              />
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 shrink-0" />
              <time
                dateTime={new Date(
                  Number(post.createdAt) / 1_000_000,
                ).toISOString()}
              >
                {formatDate(post.createdAt)}
              </time>
            </span>
          </div>

          {/* Footer: reactions + share + read more */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/40">
            {/* Reaction counts (read-only pills) */}
            <div className="flex items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border bg-primary/8 border-primary/20 text-primary"
                title="Gillar"
              >
                <ThumbsUp className="h-3 w-3" fill="currentColor" />
                {likeCount}
              </span>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border bg-accent/10 border-accent/20 text-accent"
                title="Ogillningar"
              >
                <ThumbsDown className="h-3 w-3" fill="currentColor" />
                {dislikeCount}
              </span>
            </div>

            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
                title="Dela inlägg"
                data-ocid="post_card.share.button"
              >
                <Share2 className="h-3 w-3" />
                <span className="hidden sm:inline">Dela</span>
              </Button>
              <Link
                to="/post/$id"
                params={{ id: post.id.toString() }}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors px-2.5 py-1.5 rounded-md hover:bg-primary/8"
                data-ocid="post_card.read_more.link"
              >
                Läs mer
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </article>

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title={post.title}
        url={postUrl}
      />
    </>
  );
}
