import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import { Calendar, Share2, ThumbsDown, ThumbsUp, User } from "lucide-react";
import { useState } from "react";
import type { Post } from "../backend";
import { useShare } from "../hooks/useShare";
import { formatDate } from "../utils/dateFormatter";
import ShareModal from "./ShareModal";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Livsstil: [
    "livsstil",
    "minimalism",
    "hållbar",
    "digital detox",
    "avsikt",
    "livsstilsförändringar",
  ],
  Livsberättelser: [
    "livsberättelse",
    "kaos",
    "klarhet",
    "börja om",
    "misstag",
    "introvert",
    "brev",
    "yngre jag",
  ],
  Mat: [
    "mat",
    "recept",
    "matlagning",
    "måltid",
    "vegetarisk",
    "sourdough",
    "budget",
    "smaker",
    "asien",
    "hjärte mat",
  ],
  Hobby: [
    "hobby",
    "hantverk",
    "stickning",
    "virkning",
    "trädgård",
    "fotografi",
    "diy",
  ],
  "Djupa tankar": [
    "djupa tankar",
    "mening",
    "tystnad",
    "släppa taget",
    "lycka",
    "mindfulness",
    "meditation",
    "nuet",
  ],
};

export function detectCategory(title: string, content: string): string | null {
  const haystack = `${title} ${content}`.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => haystack.includes(kw.toLowerCase()))) {
      return cat;
    }
  }
  return null;
}

interface PostSummaryCardProps {
  post: Post;
}

export default function PostSummaryCard({ post }: PostSummaryCardProps) {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const { share, isSupported } = useShare();

  const postUrl = `${window.location.origin}/post/${post.id.toString()}`;
  const preview =
    post.content.length > 120
      ? `${post.content.substring(0, 120)}...`
      : post.content;

  const category = detectCategory(post.title, post.content);
  const likeCount = post.likedBy?.length ?? 0;
  const dislikeCount = post.dislikedBy?.length ?? 0;

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
      <Card className="group hover:shadow-sm transition-all duration-200 border-border/40 bg-card/80 hover:border-border/70">
        <CardContent className="p-4">
          <div className="flex flex-col gap-2">
            {/* Title row with category badge */}
            <div className="flex items-start justify-between gap-2">
              <Link
                to="/post/$id"
                params={{ id: post.id.toString() }}
                data-ocid="summary_card.link"
                className="flex-1 min-w-0"
              >
                <h3 className="font-serif font-bold text-base md:text-lg text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                  {post.title}
                </h3>
              </Link>
              {category && (
                <Badge
                  variant="secondary"
                  className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 mt-0.5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15"
                >
                  {category}
                </Badge>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3 shrink-0" />
                <span className="font-medium truncate max-w-[120px]">
                  {post.author}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 shrink-0" />
                <time
                  dateTime={new Date(
                    Number(post.createdAt) / 1000000,
                  ).toISOString()}
                >
                  {formatDate(post.createdAt)}
                </time>
              </span>
            </div>

            {/* Preview text */}
            <p className="text-sm text-foreground/70 leading-relaxed line-clamp-2">
              {preview}
            </p>

            {/* Footer: reactions + share + read more */}
            <div className="flex items-center justify-between gap-2 pt-1">
              {/* Reaction counts (read-only) */}
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-primary/10 border-primary/30 text-primary"
                  title="Gillar"
                >
                  <ThumbsUp className="h-3.5 w-3.5" fill="currentColor" />
                  {likeCount}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-accent/15 border-accent/30 text-accent"
                  title="Ogillningar"
                >
                  <ThumbsDown className="h-3.5 w-3.5" fill="currentColor" />
                  {dislikeCount}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {/* Share */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  data-ocid="summary_card.share_button"
                  className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
                  title="Dela inlägg"
                >
                  <Share2 className="h-3 w-3" />
                  <span className="hidden sm:inline">Dela</span>
                </Button>

                {/* Read more */}
                <Link
                  to="/post/$id"
                  params={{ id: post.id.toString() }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-md hover:bg-primary/8"
                >
                  Läs mer →
                </Link>
              </div>
            </div>
          </div>
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
