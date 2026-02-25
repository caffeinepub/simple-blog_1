import { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useGetPost, useUpdatePost } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useImageUpload } from '../hooks/useImageUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { categories, titleSuggestions, type Category } from '../data/titleSuggestions';
import { PostStatus } from '../backend';
import { toast } from 'sonner';

export default function EditPostPage() {
  const { id } = useParams({ from: '/post/$id/edit' });
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const { data: post, isLoading: isLoadingPost } = useGetPost(BigInt(id));
  const updatePostMutation = useUpdatePost();

  const [category, setCategory] = useState<Category | ''>('');
  const [suggestedTitle, setSuggestedTitle] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [published, setPublished] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; content?: string; author?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [existingImages, setExistingImages] = useState<Uint8Array[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);

  const {
    images: newImages,
    error: imageError,
    isProcessing,
    addImages,
    removeImage,
    convertToBlobs,
    clearImages,
  } = useImageUpload();

  // Build blob URLs for existing images
  useEffect(() => {
    const urls = existingImages.map((img) => {
      if (!img || img.length === 0) return '';
      try {
        const blob = new Blob([new Uint8Array(img)], { type: 'image/jpeg' });
        return URL.createObjectURL(blob);
      } catch {
        return '';
      }
    });
    setExistingImageUrls(urls);

    return () => {
      urls.forEach((u) => { if (u) URL.revokeObjectURL(u); });
    };
  }, [existingImages]);

  // Check ownership and populate form
  useEffect(() => {
    if (post && identity) {
      const isOwner = identity.getPrincipal().toString() === post.ownerId.toString();
      if (!isOwner) {
        toast.error('Du har inte behörighet att redigera detta inlägg');
        navigate({ to: `/post/${id}` });
        return;
      }
      setTitle(post.title);
      setContent(post.content);
      setAuthor(post.author);
      setPublished(post.status === PostStatus.published);
      setExistingImages((post.images as Uint8Array[]) || []);
    }
  }, [post, identity, navigate, id]);

  const validateForm = () => {
    const newErrors: { title?: string; content?: string; author?: string } = {};
    if (!title.trim()) newErrors.title = 'Titel krävs';
    if (!content.trim()) newErrors.content = 'Innehåll krävs';
    if (!author.trim()) newErrors.author = 'Författarnamn krävs';
    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validateForm() || !post) return;

    try {
      const newImageBlobs = await convertToBlobs();
      const allImages = [...existingImages, ...newImageBlobs];

      await updatePostMutation.mutateAsync({
        id: post.id,
        title: title.trim(),
        content: content.trim(),
        author: author.trim(),
        published,
        images: allImages,
      });

      toast.success('Inlägget har uppdaterats');
      clearImages();
      navigate({ to: `/post/${id}` });
    } catch (err) {
      console.error('Failed to update post:', err);
      setSubmitError('Kunde inte uppdatera inlägget. Försök med en mindre bild eller försök igen.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addImages(e.target.files);
    e.target.value = '';
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value as Category);
    setSuggestedTitle('');
  };

  const handleSuggestedTitleChange = (value: string) => {
    setSuggestedTitle(value);
    setTitle(value);
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  if (isLoadingPost) {
    return (
      <div className="container max-w-3xl mx-auto px-6 py-16">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container max-w-3xl mx-auto px-6 py-16">
        <div className="text-center py-20">
          <p className="text-destructive mb-6">Inlägget hittades inte.</p>
          <Button onClick={() => navigate({ to: '/' })} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tillbaka till hem
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto px-6 py-16">
      <Button
        onClick={() => navigate({ to: `/post/${id}` })}
        variant="ghost"
        size="sm"
        className="mb-8 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Tillbaka till inlägg
      </Button>

      <Card className="border-border/40 shadow-sm">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-3xl font-serif font-bold tracking-tight">
            Redigera inlägg
          </CardTitle>
          <CardDescription className="text-base">Uppdatera ditt inlägg</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">
                Kategori
              </Label>
              <Select value={category} onValueChange={handleCategoryChange}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Välj en kategori (valfritt)" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Suggested title */}
            {category && (
              <div className="space-y-2">
                <Label htmlFor="suggested-title" className="text-sm font-medium">
                  Föreslagen titel
                </Label>
                <Select value={suggestedTitle} onValueChange={handleSuggestedTitleChange}>
                  <SelectTrigger id="suggested-title">
                    <SelectValue placeholder="Välj en föreslagen titel (valfritt)" />
                  </SelectTrigger>
                  <SelectContent>
                    {titleSuggestions[category].map((titleOption, index) => (
                      <SelectItem key={index} value={titleOption}>
                        {titleOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Titel
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ange din inläggstitel..."
                className={fieldErrors.title ? 'border-destructive' : ''}
              />
              {fieldErrors.title && (
                <p className="text-sm text-destructive">{fieldErrors.title}</p>
              )}
            </div>

            {/* Author */}
            <div className="space-y-2">
              <Label htmlFor="author" className="text-sm font-medium">
                Författare
              </Label>
              <Input
                id="author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Ditt namn..."
                className={fieldErrors.author ? 'border-destructive' : ''}
              />
              {fieldErrors.author && (
                <p className="text-sm text-destructive">{fieldErrors.author}</p>
              )}
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content" className="text-sm font-medium">
                Innehåll
              </Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Skriv din berättelse..."
                rows={12}
                className={`resize-none ${fieldErrors.content ? 'border-destructive' : ''}`}
              />
              {fieldErrors.content && (
                <p className="text-sm text-destructive">{fieldErrors.content}</p>
              )}
            </div>

            {/* Images */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Bilder</Label>
              <div className="space-y-4">
                <Input
                  id="images"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isProcessing}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('images')?.click()}
                  className="w-full"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Bearbetar bilder...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Lägg till fler bilder
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Stöder JPEG, PNG, WebP och GIF · Max 10 MB per bild · Bilder komprimeras automatiskt
                </p>

                {imageError && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="whitespace-pre-line text-sm">
                      {imageError}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Existing images */}
                {existingImages.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Befintliga bilder ({existingImages.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {existingImages.map((image, index) => (
                        <div
                          key={`existing-${index}`}
                          className="relative aspect-square rounded-lg border border-border/40 overflow-hidden bg-muted/30 group"
                        >
                          {existingImageUrls[index] ? (
                            <img
                              src={existingImageUrls[index]}
                              alt={`Befintlig bild ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <ImageIcon className="h-8 w-8" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeExistingImage(index)}
                            className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity focus:opacity-100"
                            aria-label={`Ta bort bild ${index + 1}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New images */}
                {newImages.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Nya bilder ({newImages.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {newImages.map((image, index) => (
                        <div
                          key={`new-${index}`}
                          className="relative aspect-square rounded-lg border border-border/40 overflow-hidden bg-muted/30 group"
                        >
                          <img
                            src={image.preview}
                            alt={`Ny bild ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity focus:opacity-100"
                            aria-label={`Ta bort ny bild ${index + 1}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-background/70 px-1.5 py-0.5 text-xs text-foreground truncate opacity-0 group-hover:opacity-100 transition-opacity">
                            {image.file.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Processing placeholder */}
                {isProcessing && (
                  <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-border/40 rounded-lg bg-muted/20">
                    <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
                    <p className="text-sm text-muted-foreground text-center">
                      Bearbetar och komprimerar bilder...
                    </p>
                  </div>
                )}

                {/* Empty state */}
                {existingImages.length === 0 && newImages.length === 0 && !isProcessing && (
                  <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-border/40 rounded-lg bg-muted/20">
                    <ImageIcon className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground text-center">
                      Inga bilder. Klicka på knappen ovan för att lägga till bilder.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Publish toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/40">
              <div className="space-y-0.5">
                <Label htmlFor="published" className="text-sm font-medium cursor-pointer">
                  Publicera
                </Label>
                <p className="text-sm text-muted-foreground">
                  Gör detta inlägg synligt för alla
                </p>
              </div>
              <Switch id="published" checked={published} onCheckedChange={setPublished} />
            </div>

            {submitError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={updatePostMutation.isPending || isProcessing}
                className="flex-1"
              >
                {updatePostMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sparar...
                  </>
                ) : (
                  'Spara ändringar'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: `/post/${id}` })}
                disabled={updatePostMutation.isPending || isProcessing}
              >
                Avbryt
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
