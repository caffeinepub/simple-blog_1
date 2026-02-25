import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useCreatePost } from '../hooks/useQueries';
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

export default function CreatePostPage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category | ''>('');
  const [suggestedTitle, setSuggestedTitle] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [published, setPublished] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; content?: string; author?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createPostMutation = useCreatePost();
  const { images, error: imageError, addImages, removeImage, convertToBlobs, clearImages } = useImageUpload();

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

    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    try {
      const imageBlobs = await convertToBlobs();

      await createPostMutation.mutateAsync({
        title: title.trim(),
        content: content.trim(),
        author: author.trim(),
        published,
        images: imageBlobs,
      });

      clearImages();
      navigate({ to: '/' });
    } catch (err) {
      console.error('Failed to create post:', err);
      setSubmitError('Failed to create post. Please try a smaller image or try again.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addImages(e.target.files);
    // Reset input so the same file can be selected again
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

  return (
    <div className="container max-w-3xl mx-auto px-6 py-16">
      <Button
        onClick={() => navigate({ to: '/' })}
        variant="ghost"
        size="sm"
        className="mb-8 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Tillbaka till hem
      </Button>

      <Card className="border-border/40 shadow-sm">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-3xl font-serif font-bold tracking-tight">
            Skapa nytt inlägg
          </CardTitle>
          <CardDescription className="text-base">
            Dela dina tankar och berättelser med gemenskapen
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
                className={fieldErrors.title ? 'border-destructive' : ''}
              />
              {fieldErrors.title && (
                <p className="text-sm text-destructive">{fieldErrors.title}</p>
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
                className={fieldErrors.author ? 'border-destructive' : ''}
              />
              {fieldErrors.author && (
                <p className="text-sm text-destructive">{fieldErrors.author}</p>
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
                className={`resize-none ${fieldErrors.content ? 'border-destructive' : ''}`}
              />
              {fieldErrors.content && (
                <p className="text-sm text-destructive">{fieldErrors.content}</p>
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
                    Välj bilder
                  </Button>
                </div>

                {imageError && (
                  <p className="text-sm text-destructive">{imageError}</p>
                )}

                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {images.map((image, index) => (
                      <div
                        key={index}
                        className="relative aspect-square rounded-lg border border-border/40 overflow-hidden bg-muted/30 group"
                      >
                        <img
                          src={image.preview}
                          alt={`Förhandsvisning ${index + 1}`}
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
                )}

                {images.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-border/40 rounded-lg bg-muted/20">
                    <ImageIcon className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground text-center">
                      Inga bilder valda. Klicka på knappen ovan för att lägga till bilder.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/40">
              <div className="space-y-0.5">
                <Label htmlFor="published" className="text-sm font-medium cursor-pointer">
                  Publicera omedelbart
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

            {submitError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={createPostMutation.isPending}
                className="flex-1"
              >
                {createPostMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Skapar...
                  </>
                ) : (
                  'Skapa inlägg'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: '/' })}
                disabled={createPostMutation.isPending}
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
