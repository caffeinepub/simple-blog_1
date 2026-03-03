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
  BookOpen,
  FileText,
  Globe,
  Loader2,
  PenSquare,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Post } from "../backend";
import {
  useDeleteDraft,
  useGetMyDrafts,
  useUpdatePost,
} from "../hooks/useQueries";
import { truncateContent } from "../utils/contentTruncator";
import { formatDate } from "../utils/dateFormatter";

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

export default function MyDraftsPage() {
  const navigate = useNavigate();
  const { data: drafts, isLoading, isError } = useGetMyDrafts();
  const deleteDraftMutation = useDeleteDraft();
  const updatePostMutation = useUpdatePost();

  const [publishingId, setPublishingId] = useState<bigint | null>(null);
  const [deletingId, setDeletingId] = useState<bigint | null>(null);

  const handleEdit = (draft: Post) => {
    navigate({ to: `/post/${draft.id.toString()}/edit` });
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
          Mina utkast
        </h1>
        <p className="text-muted-foreground mt-1">
          Dina sparade utkast som inte har publicerats ännu.
        </p>
      </div>

      {isLoading && (
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
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isError && (
        <div className="text-center py-16">
          <p className="text-destructive mb-4">
            Kunde inte hämta utkast. Försök igen.
          </p>
          <Button variant="outline" onClick={() => navigate({ to: "/" })}>
            Tillbaka till hem
          </Button>
        </div>
      )}

      {!isLoading && !isError && drafts && drafts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground/40 mb-4" />
          <h2 className="text-xl font-serif font-semibold mb-2">
            Inga utkast ännu
          </h2>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Du har inga sparade utkast. Börja skriva ett nytt inlägg och spara
            det som utkast.
          </p>
          <Button onClick={() => navigate({ to: "/create" })} className="gap-2">
            <PenSquare className="h-4 w-4" />
            Skapa nytt inlägg
          </Button>
        </div>
      )}

      {!isLoading && !isError && drafts && drafts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {drafts.map((draft) => (
            <DraftCard
              key={draft.id.toString()}
              draft={draft}
              onEdit={() => handleEdit(draft)}
              onPublish={() => handlePublish(draft)}
              onDelete={() => handleDelete(draft)}
              isPublishing={publishingId === draft.id}
              isDeleting={deletingId === draft.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
