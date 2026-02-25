import { useParams, useNavigate } from '@tanstack/react-router';
import { useGetPost, useDeletePost } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { formatDate } from '../utils/dateFormatter';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Loader2, User, Calendar, Pencil, Trash2 } from 'lucide-react';
import ImageGallery from '../components/ImageGallery';
import { toast } from 'sonner';
import { useState } from 'react';

export default function PostDetailPage() {
  const { id } = useParams({ from: '/post/$id' });
  const navigate = useNavigate();
  const { data: post, isLoading, error } = useGetPost(BigInt(id));
  const { identity } = useInternetIdentity();
  const deletePostMutation = useDeletePost();
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = identity && post && identity.getPrincipal().toString() === post.ownerId.toString();

  const handleDelete = async () => {
    if (!post) return;
    
    setIsDeleting(true);
    try {
      await deletePostMutation.mutateAsync(post.id);
      toast.success('Inlägget har tagits bort');
      navigate({ to: '/' });
    } catch (error) {
      console.error('Kunde inte ta bort inlägg:', error);
      toast.error('Kunde inte ta bort inlägget. Försök igen.');
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    navigate({ to: `/post/${id}/edit` });
  };

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
          <p className="text-destructive mb-6">Inlägget hittades inte eller kunde inte laddas.</p>
          <Button onClick={() => navigate({ to: '/' })} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tillbaka till hem
          </Button>
        </div>
      </div>
    );
  }

  return (
    <article className="container max-w-4xl mx-auto px-6 py-16">
      <div className="flex items-center justify-between mb-8">
        <Button
          onClick={() => navigate({ to: '/' })}
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tillbaka till alla inlägg
        </Button>

        {isOwner && (
          <div className="flex gap-2">
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
                    Är du säker på att du vill ta bort detta inlägg? Denna åtgärd kan inte ångras.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Avbryt</AlertDialogCancel>
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
                      'Ta bort'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
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
            <time dateTime={new Date(Number(post.createdAt) / 1000000).toISOString()}>
              {formatDate(post.createdAt)}
            </time>
          </div>
        </div>
      </header>

      {post.images && post.images.length > 0 && (
        <ImageGallery images={post.images} />
      )}

      <div className="prose prose-lg prose-slate dark:prose-invert max-w-none">
        <div className="whitespace-pre-wrap leading-relaxed text-foreground opacity-90">
          {post.content}
        </div>
      </div>
    </article>
  );
}
