import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Loader2,
  LogIn,
  Pencil,
  Share2,
  Trash2,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import CommentsSection from "../components/CommentsSection";
import ImageGallery from "../components/ImageGallery";
import ReactionButtons from "../components/ReactionButtons";
import ShareModal from "../components/ShareModal";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useClearAllNotifications,
  useDeletePost,
  useGetNotifications,
  useGetPost,
} from "../hooks/useQueries";
import { useShare } from "../hooks/useShare";
import { truncateContent } from "../utils/contentTruncator";
import { formatDate } from "../utils/dateFormatter";

export default function PostDetailPage() {
  const { id } = useParams({ from: "/post/$id" });
  const navigate = useNavigate();
  const { data: post, isLoading, error } = useGetPost(BigInt(id));
  const { identity, login, isLoggingIn, isInitializing } =
    useInternetIdentity();
  const deletePostMutation = useDeletePost();
  const [isDeleting, setIsDeleting] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const thumbnailUrlRef = useRef<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const { share, isSupported } = useShare();
  const { data: notifications = [] } = useGetNotifications();
  const clearAllMutation = useClearAllNotifications();

  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();
  const isOwner =
    isAuthenticated &&
    post &&
    identity.getPrincipal().toString() === post.ownerId.toString();

  const postUrl = `${window.location.origin}/post/${id}`;

  // Build thumbnail for the preview gate
  useEffect(() => {
    if (post?.images && post.images.length > 0) {
      const firstImage = post.images[0];
      if (firstImage && firstImage.length > 0) {
        try {
          const blob = new Blob([new Uint8Array(firstImage)], {
            type: "image/jpeg",
          });
          const url = URL.createObjectURL(blob);
          thumbnailUrlRef.current = url;
          setThumbnailUrl(url);
        } catch {
          // ignore
        }
      }
    }
    return () => {
      if (thumbnailUrlRef.current) {
        URL.revokeObjectURL(thumbnailUrlRef.current);
        thumbnailUrlRef.current = null;
      }
    };
  }, [post?.images]);

  const handleDelete = async () => {
    if (!post) return;
    setIsDeleting(true);
    try {
      await deletePostMutation.mutateAsync(post.id);
      toast.success("Inlägget har tagits bort");
      navigate({ to: "/" });
    } catch (error) {
      console.error("Kunde inte ta bort inlägg:", error);
      toast.error("Kunde inte ta bort inlägget. Försök igen.");
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    navigate({ to: `/post/${id}/edit` });
  };

  const handleShare = async () => {
    if (!post) return;
    if (isSupported) {
      const used = await share(post.title, postUrl);
      if (!used) setShareModalOpen(true);
    } else {
      setShareModalOpen(true);
    }
  };

  const handleLogin = async () => {
    sessionStorage.setItem("postLoginRedirect", window.location.href);
    try {
      await login();
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  // After successful login, clear the stored redirect (already on the right page)
  useEffect(() => {
    if (isAuthenticated) {
      const redirect = sessionStorage.getItem("postLoginRedirect");
      if (redirect) {
        sessionStorage.removeItem("postLoginRedirect");
      }
    }
  }, [isAuthenticated]);

  // Mark notifications as read when the post owner views their post
  const clearMutate = clearAllMutation.mutate;
  useEffect(() => {
    if (!isOwner || !post || notifications.length === 0) return;
    const postIdStr = post.id.toString();
    const hasUnreadForPost = notifications.some(
      (n) => !n.isRead && n.postId.toString() === postIdStr,
    );
    if (hasUnreadForPost) {
      clearMutate();
    }
  }, [isOwner, post, notifications, clearMutate]);

  if (isLoading || isInitializing) {
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
          <p className="text-destructive mb-6">
            Inlägget hittades inte eller kunde inte laddas.
          </p>
          <Button onClick={() => navigate({ to: "/" })} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tillbaka till hem
          </Button>
        </div>
      </div>
    );
  }

  // ── Unauthenticated preview/teaser view ──────────────────────────────────
  if (!isAuthenticated) {
    const previewText = truncateContent(post.content, 120);

    return (
      <>
        <article className="container max-w-4xl mx-auto px-6 py-16">
          {/* Back button */}
          <Button
            onClick={() => navigate({ to: "/login" })}
            variant="ghost"
            size="sm"
            className="-ml-2 mb-8 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Logga in
          </Button>

          {/* Post header */}
          <header className="mb-10 pb-8 border-b border-border/40">
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
                <time
                  dateTime={new Date(
                    Number(post.createdAt) / 1000000,
                  ).toISOString()}
                >
                  {formatDate(post.createdAt)}
                </time>
              </div>
              {/* Share button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="gap-2 text-muted-foreground hover:text-foreground ml-auto"
              >
                <Share2 className="h-4 w-4" />
                Dela
              </Button>
            </div>
          </header>

          {/* Thumbnail image */}
          {thumbnailUrl && (
            <div className="mb-8 rounded-xl overflow-hidden aspect-[16/9] bg-muted/30">
              <img
                src={thumbnailUrl}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Truncated content with gradient fade */}
          <div className="relative mb-0">
            <div className="prose prose-lg prose-stone dark:prose-invert max-w-none">
              <div className="rich-content leading-relaxed text-foreground opacity-90">
                {previewText}
              </div>
            </div>
            {/* Gradient fade overlay */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-background pointer-events-none" />
          </div>

          {/* Login gate */}
          <div className="mt-0 pt-8 border-t border-border/30">
            <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-8 text-center shadow-sm">
              <div className="mb-4 inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
                <LogIn className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-foreground mb-2">
                Fortsätt läsa
              </h2>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Logga in för att läsa hela inlägget och ta del av alla
                berättelser i HKLO-gemenskapen.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  size="lg"
                  className="gap-2 h-12 text-base"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loggar in...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5" />
                      Logga in med Internet Identity
                    </>
                  )}
                </Button>
                <a
                  href="https://identity.ic0.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors text-base font-medium"
                >
                  <ExternalLink className="h-4 w-4" />
                  Skapa Internet Identity
                </a>
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

  // ── Authenticated full view ───────────────────────────────────────────────
  return (
    <>
      <article className="container max-w-4xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <Button
            onClick={() => navigate({ to: "/" })}
            variant="ghost"
            size="sm"
            className="-ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tillbaka till alla inlägg
          </Button>

          <div className="flex gap-2">
            {/* Share button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              Dela
            </Button>

            {isOwner && (
              <>
                <Button
                  onClick={handleEdit}
                  variant="outline"
                  size="sm"
                  disabled={isDeleting}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Redigera
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Ta bort
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Är du säker?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Är du säker på att du vill ta bort detta inlägg? Denna
                        åtgärd kan inte ångras.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeleting}>
                        Avbryt
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Tar bort...
                          </>
                        ) : (
                          "Ta bort"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>

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
              <time
                dateTime={new Date(
                  Number(post.createdAt) / 1000000,
                ).toISOString()}
              >
                {formatDate(post.createdAt)}
              </time>
            </div>
          </div>
        </header>

        {post.images && post.images.length > 0 && (
          <ImageGallery images={post.images} />
        )}

        <div className="prose prose-lg prose-stone dark:prose-invert max-w-none mb-10">
          <div
            className="rich-content leading-relaxed text-foreground opacity-90"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: controlled rich text from Quill editor
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>

        {/* Reaction buttons */}
        <div className="pt-6 border-t border-border/30">
          <ReactionButtons post={post} />
        </div>

        {/* Comments */}
        <CommentsSection postId={post.id} />
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
