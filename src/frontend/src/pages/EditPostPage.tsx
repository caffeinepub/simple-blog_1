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
import { Loader2, ArrowLeft, Upload, X, Image as ImageIcon } from 'lucide-react';
import { categories, titleSuggestions, type Category } from '../data/titleSuggestions';
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
  const [errors, setErrors] = useState<{ title?: string; content?: string; author?: string }>({});
  const [existingImages, setExistingImages] = useState<Uint8Array[]>([]);

  const { images: newImages, error: imageError, addImages, removeImage, convertToBlobs, clearImages } = useImageUpload();

  // Check ownership and populate form
  useEffect(() => {
    if (post && identity) {
      const isOwner = identity.getPrincipal().toString() === post.ownerId.toString();
      if (!isOwner) {
        toast.error('Du har inte behörighet att redigera detta inlägg');
        navigate({ to: `/post/${id}` });
        return;
      }

      // Populate form with existing data
      setTitle(post.title);
      setContent(post.content);
      setAuthor(post.author);
      setPublished(post.published);
      setExistingImages(post.images || []);
    }
  }, [post, identity, navigate, id]);

  const validateForm = () => {
    const newErrors: { title?: string; content?: string; author?: string } = {};
    
    if (!title.trim()) {
      newErrors.title = 'Titel krävs';
    }
    if (!content.trim()) {
      newErrors.content = 'Innehåll krävs';
    }
    if (!author.trim()) {
      newErrors.author = 'Författarnamn krävs';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !post) {
      return;
    }

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
    } catch (error) {
      console.error('Kunde inte uppdatera inlägg:', error);
      toast.error('Kunde inte uppdatera inlägget. Försök igen.');
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
    setExistingImages(prev => prev.filter((_, i) => i !== index));
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
          <CardDescription className="text-base">
            Uppdatera ditt inlägg
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Titel
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ange din inläggstitel..."
                className={errors.title ? 'border-destructive' : ''}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="author" className="text-sm font-medium">
                Författare
              </Label>
              <Input
                id="author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Ditt namn..."
                className={errors.author ? 'border-destructive' : ''}
              />
              {errors.author && (
                <p className="text-sm text-destructive">{errors.author}</p>
              )}
            </div>

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
                className={`resize-none ${errors.content ? 'border-destructive' : ''}`}
              />
              {errors.content && (
                <p className="text-sm text-destructive">{errors.content}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="images" className="text-sm font-medium">
                Bilder
              </Label>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Input
                    id="images"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('images')?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Lägg till fler bilder
                  </Button>
                </div>
                
                {imageError && (
                  <p className="text-sm text-destructive">{imageError}</p>
                )}

                {(existingImages.length > 0 || newImages.length > 0) && (
                  <div className="space-y-3">
                    {existingImages.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Befintliga bilder</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {existingImages.map((image, index) => {
                            const blob = new Blob([new Uint8Array(image)], { type: 'image/jpeg' });
                            const imageUrl = URL.createObjectURL(blob);
                            return (
                              <div
                                key={`existing-${index}`}
                                className="relative aspect-square rounded-lg border border-border/40 overflow-hidden bg-muted/30 group"
                              >
                                <img
                                  src={imageUrl}
                                  alt={`Befintlig bild ${index + 1}`}
                                  className="w-full h-full object-cover"
                                  onLoad={() => URL.revokeObjectURL(imageUrl)}
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => removeExistingImage(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {newImages.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Nya bilder</p>
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
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeImage(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              {image.uploadProgress > 0 && image.uploadProgress < 100 && (
                                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {existingImages.length === 0 && newImages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-border/40 rounded-lg bg-muted/20">
                    <ImageIcon className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground text-center">
                      Inga bilder. Klicka på knappen ovan för att lägga till bilder.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/40">
              <div className="space-y-0.5">
                <Label htmlFor="published" className="text-sm font-medium cursor-pointer">
                  Publicera
                </Label>
                <p className="text-sm text-muted-foreground">
                  Gör detta inlägg synligt för alla
                </p>
              </div>
              <Switch
                id="published"
                checked={published}
                onCheckedChange={setPublished}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={updatePostMutation.isPending}
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
                disabled={updatePostMutation.isPending}
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
