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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Eye,
  FileText,
  Globe,
  Loader2,
  PenSquare,
  Pencil,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Post } from "../backend";
import { PostStatus } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useDeleteDraft,
  useGetAllPublishedPosts,
  useGetMyDrafts,
  useGetNotifications,
  useUpdatePost,
} from "../hooks/useQueries";
import { truncateContent } from "../utils/contentTruncator";
import { formatDate } from "../utils/dateFormatter";

// ─── Published Post Card ──────────────────────────────────────────────────────

function PublishedPostCard({
  post,
  hasNotification,
  onEdit,
  onView,
}: {
  post: Post;
  hasNotification: boolean;
  onEdit: () => void;
  onView: () => void;
}) {
  const preview = truncateContent(post.content, 30);
  const dateStr = formatDate(post.createdAt);

  return (
    <Card
      className={`border-border/40 shadow-sm hover:shadow-md transition-shadow ${
        hasNotification ? "ring-1 ring-amber-400/60" : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {hasNotification && (
                <span
                  className="flex items-center gap-1 text-xs text-amber-600 font-medium"
                  data-ocid="published_post.notification_badge"
                >
                  <Bell className="h-3 w-3" />
                  Ny kommentar
                </span>
              )}
            </div>
            <CardTitle className="text-lg font-serif font-semibold leading-snug line-clamp-2">
              {post.title || (
                <span className="text-muted-foreground italic">
                  (Utan titel)
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge
                variant="default"
                className="text-xs bg-emerald-600/15 text-emerald-700 border-emerald-200 hover:bg-emerald-600/20"
              >
                <Globe className="h-2.5 w-2.5 mr-1" />
                Publicerad
              </Badge>
              <span className="text-xs text-muted-foreground">{dateStr}</span>
            </div>
          </div>
          <Globe className="h-5 w-5 text-emerald-600/60 shrink-0 mt-0.5" />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {preview ? (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
            {preview}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic mb-4">
            Inget innehåll.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onView}
            className="gap-1.5"
            data-ocid="published_post.view_button"
          >
            <Eye className="h-3.5 w-3.5" />
            Visa inlägg
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            className="gap-1.5"
            data-ocid="published_post.edit_button"
          >
            <Pencil className="h-3.5 w-3.5" />
            Redigera
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Draft Card ───────────────────────────────────────────────────────────────

function DraftCard({
  draft,
  onEdit,
  onPublish,
  onDelete,
  isPublishing,
  isDeleting,
}: {
  draft: Post;
  onEdit: () => void;
  onPublish: () => void;
  onDelete: () => void;
  isPublishing: boolean;
  isDeleting: boolean;
}) {
  const preview = truncateContent(draft.content, 30);
  const dateStr = formatDate(draft.createdAt);

  return (
    <Card className="border-border/40 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-serif font-semibold leading-snug line-clamp-2">
              {draft.title || (
                <span className="text-muted-foreground italic">
                  (Utan titel)
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant="secondary" className="text-xs">
                Utkast
              </Badge>
              <span className="text-xs text-muted-foreground">{dateStr}</span>
            </div>
          </div>
          <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {preview ? (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
            {preview}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic mb-4">
            Inget innehåll ännu.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            className="gap-1.5"
          >
            <PenSquare className="h-3.5 w-3.5" />
            Redigera
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={onPublish}
            disabled={isPublishing || isDeleting}
            className="gap-1.5"
          >
            {isPublishing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Globe className="h-3.5 w-3.5" />
            )}
            Publicera
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                disabled={isPublishing || isDeleting}
                className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Ta bort
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Ta bort utkast</AlertDialogTitle>
                <AlertDialogDescription>
                  Är du säker på att du vill ta bort detta utkast permanent?
                  Åtgärden kan inte ångras.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Ta bort permanent
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Loading Skeletons ────────────────────────────────────────────────────────

function LoadingSkeletons() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="border-border/40">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/3 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-full mb-4" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MyDraftsPage() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const callerPrincipal = identity?.getPrincipal().toString() ?? "";

  const {
    data: drafts,
    isLoading: draftsLoading,
    isError: draftsError,
  } = useGetMyDrafts();
  const { data: allPublished, isLoading: publishedLoading } =
    useGetAllPublishedPosts();
  const { data: notifications = [] } = useGetNotifications();

  const deleteDraftMutation = useDeleteDraft();
  const updatePostMutation = useUpdatePost();

  const [publishingId, setPublishingId] = useState<bigint | null>(null);
  const [deletingId, setDeletingId] = useState<bigint | null>(null);

  // Filter published posts owned by the caller
  const myPublished = useMemo(() => {
    if (!allPublished || !callerPrincipal) return [];
    return allPublished.filter(
      (p) =>
        p.status === PostStatus.published &&
        p.ownerId.toString() === callerPrincipal,
    );
  }, [allPublished, callerPrincipal]);

  // Set of post IDs with unread notifications
  const unreadPostIds = useMemo(() => {
    return new Set(
      notifications.filter((n) => !n.isRead).map((n) => n.postId.toString()),
    );
  }, [notifications]);

  // Sort: posts with unread notifications first
  const sortedPublished = useMemo(() => {
    return [...myPublished].sort((a, b) => {
      const aHas = unreadPostIds.has(a.id.toString()) ? 1 : 0;
      const bHas = unreadPostIds.has(b.id.toString()) ? 1 : 0;
      return bHas - aHas;
    });
  }, [myPublished, unreadPostIds]);

  const handleEdit = (post: Post) => {
    navigate({ to: `/post/${post.id.toString()}/edit` });
  };

  const handleView = (post: Post) => {
    navigate({ to: `/post/${post.id.toString()}` });
  };

  const handlePublish = async (draft: Post) => {
    setPublishingId(draft.id);
    try {
      await updatePostMutation.mutateAsync({
        id: draft.id,
        title: draft.title,
        content: draft.content,
        author: draft.author,
        published: true,
        images: draft.images as Uint8Array[],
      });
      toast.success(`"${draft.title || "Utkastet"}" har publicerats!`);
    } catch {
      toast.error("Kunde inte publicera utkastet. Försök igen.");
    } finally {
      setPublishingId(null);
    }
  };

  const handleDelete = async (draft: Post) => {
    setDeletingId(draft.id);
    try {
      await deleteDraftMutation.mutateAsync(draft.id);
      toast.success("Utkastet har tagits bort.");
    } catch {
      toast.error("Kunde inte ta bort utkastet. Försök igen.");
    } finally {
      setDeletingId(null);
    }
  };

  const isLoading = draftsLoading || publishedLoading;

  return (
    <div className="container max-w-4xl mx-auto px-6 py-16">
      <Button
        onClick={() => navigate({ to: "/" })}
        variant="ghost"
        size="sm"
        className="mb-8 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Tillbaka till hem
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold tracking-tight">
          Mina inlägg och utkast
        </h1>
        <p className="text-muted-foreground mt-1">
          Dina publicerade inlägg och sparade utkast.
        </p>
      </div>

      {/* ── Publicerade inlägg ─────────────────────────── */}
      <section className="mb-12" data-ocid="published_posts.section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-serif font-semibold tracking-tight flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-600" />
            Publicerade inlägg
            {sortedPublished.length > 0 && (
              <span className="text-base font-normal text-muted-foreground">
                ({sortedPublished.length})
              </span>
            )}
            {unreadPostIds.size > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium ml-1">
                <Bell className="h-3.5 w-3.5" />
                {unreadPostIds.size} ny{unreadPostIds.size === 1 ? "" : "a"}
              </span>
            )}
          </h2>
        </div>

        {isLoading ? (
          <LoadingSkeletons />
        ) : sortedPublished.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border/30 rounded-xl"
            data-ocid="published_posts.empty_state"
          >
            <Globe className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Inga publicerade inlägg ännu.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate({ to: "/create" })}
              className="mt-3 gap-2"
            >
              <PenSquare className="h-3.5 w-3.5" />
              Skapa ett inlägg
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {sortedPublished.map((post, i) => (
              <div
                key={post.id.toString()}
                data-ocid={`published_posts.item.${i + 1}`}
              >
                <PublishedPostCard
                  post={post}
                  hasNotification={unreadPostIds.has(post.id.toString())}
                  onEdit={() => handleEdit(post)}
                  onView={() => handleView(post)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Utkast ──────────────────────────────────────── */}
      <section data-ocid="drafts.section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-serif font-semibold tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Utkast
            {drafts && drafts.length > 0 && (
              <span className="text-base font-normal text-muted-foreground">
                ({drafts.length})
              </span>
            )}
          </h2>
        </div>

        {isLoading && <LoadingSkeletons />}

        {draftsError && (
          <div className="text-center py-16">
            <p className="text-destructive mb-4">
              Kunde inte hämta utkast. Försök igen.
            </p>
            <Button variant="outline" onClick={() => navigate({ to: "/" })}>
              Tillbaka till hem
            </Button>
          </div>
        )}

        {!isLoading && !draftsError && drafts && drafts.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border/30 rounded-xl"
            data-ocid="drafts.empty_state"
          >
            <BookOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              Inga sparade utkast.
            </p>
            <Button
              size="sm"
              onClick={() => navigate({ to: "/create" })}
              className="gap-2"
            >
              <PenSquare className="h-3.5 w-3.5" />
              Skapa nytt inlägg
            </Button>
          </div>
        )}

        {!isLoading && !draftsError && drafts && drafts.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {drafts.map((draft, i) => (
              <div key={draft.id.toString()} data-ocid={`drafts.item.${i + 1}`}>
                <DraftCard
                  draft={draft}
                  onEdit={() => handleEdit(draft)}
                  onPublish={() => handlePublish(draft)}
                  onDelete={() => handleDelete(draft)}
                  isPublishing={publishingId === draft.id}
                  isDeleting={deletingId === draft.id}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
