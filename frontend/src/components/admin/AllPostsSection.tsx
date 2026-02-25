import { useState } from 'react';
import { useAllPostsAdmin, useAdminDeletePost, useAdminChangePostStatus } from '../../hooks/useQueries';
import { PostStatus } from '../../backend';
import type { Post } from '../../backend';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '../../utils/dateFormatter';
import PostEditModal from './PostEditModal';

function statusLabel(status: PostStatus): string {
  switch (status) {
    case PostStatus.published:
      return 'Publicerad';
    case PostStatus.draft:
      return 'Utkast';
    case PostStatus.hidden:
      return 'Dold';
    default:
      return String(status);
  }
}

function statusVariant(status: PostStatus): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case PostStatus.published:
      return 'default';
    case PostStatus.draft:
      return 'secondary';
    case PostStatus.hidden:
      return 'destructive';
    default:
      return 'outline';
  }
}

export default function AllPostsSection() {
  const { data: posts = [], isLoading } = useAllPostsAdmin();
  const deletePostMutation = useAdminDeletePost();
  const changeStatusMutation = useAdminChangePostStatus();
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deletingId, setDeletingId] = useState<bigint | null>(null);
  const [changingStatusId, setChangingStatusId] = useState<bigint | null>(null);

  const handleDelete = async (id: bigint) => {
    setDeletingId(id);
    try {
      await deletePostMutation.mutateAsync(id);
      toast.success('Inlägget har tagits bort');
    } catch (err) {
      toast.error('Kunde inte ta bort inlägget');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (id: bigint, status: PostStatus) => {
    setChangingStatusId(id);
    try {
      await changeStatusMutation.mutateAsync({ id, status });
      toast.success('Status uppdaterad');
    } catch (err) {
      toast.error('Kunde inte uppdatera status');
    } finally {
      setChangingStatusId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const sortedPosts = [...posts].sort((a, b) => Number(b.createdAt - a.createdAt));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {posts.length} inlägg totalt
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>Inga inlägg hittades.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[35%]">Titel</TableHead>
                <TableHead>Författare</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Åtgärder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPosts.map((post) => (
                <TableRow key={post.id.toString()}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {post.title}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{post.author}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(post.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant(post.status)}>
                        {statusLabel(post.status)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      {/* Status change dropdown */}
                      <Select
                        value={post.status}
                        onValueChange={(val) => handleStatusChange(post.id, val as PostStatus)}
                        disabled={changingStatusId === post.id}
                      >
                        <SelectTrigger className="h-8 w-[130px] text-xs">
                          {changingStatusId === post.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={PostStatus.published}>Publicerad</SelectItem>
                          <SelectItem value={PostStatus.draft}>Utkast</SelectItem>
                          <SelectItem value={PostStatus.hidden}>Dold</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Edit button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingPost(post)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      {/* Delete button */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={deletingId === post.id}
                          >
                            {deletingId === post.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Ta bort inlägg</AlertDialogTitle>
                            <AlertDialogDescription>
                              Är du säker på att du vill ta bort inlägget{' '}
                              <strong>"{post.title}"</strong>? Denna åtgärd kan inte ångras.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Avbryt</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(post.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Ta bort
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Modal */}
      {editingPost && (
        <PostEditModal
          post={editingPost}
          open={!!editingPost}
          onClose={() => setEditingPost(null)}
        />
      )}
    </div>
  );
}
