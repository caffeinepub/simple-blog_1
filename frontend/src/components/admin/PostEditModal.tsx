import { useState, useEffect } from 'react';
import type { Post } from '../../backend';
import { PostStatus } from '../../backend';
import { useAdminUpdatePost } from '../../hooks/useQueries';
import { useImageUpload } from '../../hooks/useImageUpload';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PostEditModalProps {
  post: Post;
  open: boolean;
  onClose: () => void;
}

export default function PostEditModal({ post, open, onClose }: PostEditModalProps) {
  const updatePostMutation = useAdminUpdatePost();
  const { images: newImages, error: imageError, addImages, removeImage, convertToBlobs, clearImages } = useImageUpload();

  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [author, setAuthor] = useState(post.author);
  const [status, setStatus] = useState<PostStatus>(post.status);
  const [existingImages, setExistingImages] = useState<Uint8Array[]>([...(post.images as Uint8Array[])]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; content?: string; author?: string }>({});

  // Reset form when post changes
  useEffect(() => {
    setTitle(post.title);
    setContent(post.content);
    setAuthor(post.author);
    setStatus(post.status);
    setExistingImages([...(post.images as Uint8Array[])]);
    setSubmitError(null);
    setFieldErrors({});
    clearImages();
  }, [post.id]);

  const validate = () => {
    const errors: { title?: string; content?: string; author?: string } = {};
    if (!title.trim()) errors.title = 'Titel krävs';
    if (!content.trim()) errors.content = 'Innehåll krävs';
    if (!author.trim()) errors.author = 'Författarnamn krävs';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    try {
      const newImageBlobs = await convertToBlobs();
      const allImages = [...existingImages, ...newImageBlobs];

      await updatePostMutation.mutateAsync({
        id: post.id,
        title: title.trim(),
        content: content.trim(),
        author: author.trim(),
        status,
        images: allImages,
      });

      toast.success('Inlägget har uppdaterats');
      clearImages();
      onClose();
    } catch (err) {
      setSubmitError('Kunde inte uppdatera inlägget. Försök igen.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addImages(e.target.files);
    e.target.value = '';
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif font-bold">Redigera inlägg</DialogTitle>
          <DialogDescription>
            Uppdatera inläggets innehåll, status och bilder.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Titel</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Inläggets titel..."
              className={fieldErrors.title ? 'border-destructive' : ''}
            />
            {fieldErrors.title && <p className="text-sm text-destructive">{fieldErrors.title}</p>}
          </div>

          {/* Author */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-author">Författare</Label>
            <Input
              id="edit-author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Författarens namn..."
              className={fieldErrors.author ? 'border-destructive' : ''}
            />
            {fieldErrors.author && <p className="text-sm text-destructive">{fieldErrors.author}</p>}
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as PostStatus)}>
              <SelectTrigger id="edit-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PostStatus.published}>Publicerad</SelectItem>
                <SelectItem value={PostStatus.draft}>Utkast</SelectItem>
                <SelectItem value={PostStatus.hidden}>Dold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-content">Innehåll</Label>
            <Textarea
              id="edit-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Inläggets innehåll..."
              rows={8}
              className={`resize-none ${fieldErrors.content ? 'border-destructive' : ''}`}
            />
            {fieldErrors.content && <p className="text-sm text-destructive">{fieldErrors.content}</p>}
          </div>

          {/* Images */}
          <div className="space-y-2">
            <Label>Bilder</Label>
            <div className="space-y-3">
              <Input
                id="edit-images"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('edit-images')?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Lägg till bilder
              </Button>

              {imageError && <p className="text-sm text-destructive">{imageError}</p>}

              {existingImages.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Befintliga bilder</p>
                  <div className="grid grid-cols-3 gap-2">
                    {existingImages.map((image, index) => {
                      const blob = new Blob([new Uint8Array(image)], { type: 'image/jpeg' });
                      const imageUrl = URL.createObjectURL(blob);
                      return (
                        <div
                          key={`existing-${index}`}
                          className="relative aspect-square rounded-md border border-border/40 overflow-hidden bg-muted/30 group"
                        >
                          <img
                            src={imageUrl}
                            alt={`Bild ${index + 1}`}
                            className="w-full h-full object-cover"
                            onLoad={() => URL.revokeObjectURL(imageUrl)}
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeExistingImage(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {newImages.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Nya bilder</p>
                  <div className="grid grid-cols-3 gap-2">
                    {newImages.map((image, index) => (
                      <div
                        key={`new-${index}`}
                        className="relative aspect-square rounded-md border border-border/40 overflow-hidden bg-muted/30 group"
                      >
                        <img
                          src={image.preview}
                          alt={`Ny bild ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {existingImages.length === 0 && newImages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-border/40 rounded-lg bg-muted/20">
                  <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">Inga bilder</p>
                </div>
              )}
            </div>
          </div>

          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={updatePostMutation.isPending}>
              Avbryt
            </Button>
            <Button type="submit" disabled={updatePostMutation.isPending}>
              {updatePostMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sparar...
                </>
              ) : (
                'Spara ändringar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
