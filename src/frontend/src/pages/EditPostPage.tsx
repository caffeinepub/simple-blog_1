import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Image as ImageIcon,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PostStatus } from "../backend";
import UnpublishDialog from "../components/UnpublishDialog";
import {
  type Category,
  categories,
  titleSuggestions,
} from "../data/titleSuggestions";
import { useImageUpload } from "../hooks/useImageUpload";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useDeletePost, useGetPost, useUpdatePost } from "../hooks/useQueries";

export default function EditPostPage() {
  const { id } = useParams({ from: "/post/$id/edit" });
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const { data: post, isLoading: isLoadingPost } = useGetPost(BigInt(id));
  const updatePostMutation = useUpdatePost();
  const deletePostMutation = useDeletePost();

  const [category, setCategory] = useState<Category | "">("");
  const [suggestedTitle, setSuggestedTitle] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");
  const [published, setPublished] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    content?: string;
    author?: string;
  }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [existingImages, setExistingImages] = useState<Uint8Array[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);

  // Unpublish dialog state
  const [showUnpublishDialog, setShowUnpublishDialog] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [isSavingAsDraft, setIsSavingAsDraft] = useState(false);

  // Track whether the post was originally published
  const wasPublishedRef = useRef(false);

  const {
    images: newImages,
    error: imageError,
    hasSizeError,
    isProcessing,
    addImages,
    removeImage,
    convertToBlobs,
    clearImages,
  } = useImageUpload();

  // Build blob URLs for existing images
  useEffect(() => {
    const urls = existingImages.map((img) => {
      if (!img || img.length === 0) return "";
      try {
        const blob = new Blob([new Uint8Array(img)], { type: "image/jpeg" });
        return URL.createObjectURL(blob);
      } catch {
        return "";
      }
    });
    setExistingImageUrls(urls);

    return () => {
      for (const u of urls) {
        if (u) URL.revokeObjectURL(u);
      }
    };
  }, [existingImages]);

  // Check ownership and populate form
  useEffect(() => {
    if (post && identity) {
      const isOwner =
        identity.getPrincipal().toString() === post.ownerId.toString();
      if (!isOwner) {
        toast.error("Du har inte behörighet att redigera detta inlägg");
        navigate({ to: `/post/${id}` });
        return;
      }
      setTitle(post.title);
      setContent(post.content);
      setAuthor(post.author);
      const isPublished = post.status === PostStatus.published;
      setPublished(isPublished);
      wasPublishedRef.current = isPublished;
      setExistingImages((post.images as Uint8Array[]) || []);
    }
  }, [post, identity, navigate, id]);

  const handlePublishedToggle = (newValue: boolean) => {
    // If turning OFF and the post is currently published, show the dialog
    if (!newValue && wasPublishedRef.current && post) {
      setShowUnpublishDialog(true);
      // Don't change the toggle state yet
      return;
    }
    setPublished(newValue);
  };

  const handleUnpublishDelete = async () => {
    if (!post) return;
    setIsDeletingPost(true);
    try {
      await deletePostMutation.mutateAsync(post.id);
      toast.success("Inlägget har tagits bort permanent.");
      setShowUnpublishDialog(false);
      navigate({ to: "/" });
    } catch {
      toast.error("Kunde inte ta bort inlägget. Försök igen.");
    } finally {
      setIsDeletingPost(false);
    }
  };

  const handleUnpublishSaveDraft = async () => {
    if (!post) return;
    setIsSavingAsDraft(true);
    try {
      const newImageBlobs = await convertToBlobs();
      const allImages = [...existingImages, ...newImageBlobs];
      await updatePostMutation.mutateAsync({
        id: post.id,
        title: title.trim() || post.title,
        content: content.trim() || post.content,
        author: author.trim() || post.author,
        published: false,
        images: allImages,
      });
      wasPublishedRef.current = false;
      setPublished(false);
      toast.success("Inlägget har sparats som utkast.");
      setShowUnpublishDialog(false);
      navigate({ to: "/drafts" });
    } catch {
      toast.error("Kunde inte spara som utkast. Försök igen.");
    } finally {
      setIsSavingAsDraft(false);
    }
  };

  const handleUnpublishCancel = () => {
    // Restore toggle to published state
    setPublished(true);
    setShowUnpublishDialog(false);
  };

  const validateForm = () => {
    const newErrors: { title?: string; content?: string; author?: string } = {};
    if (!title.trim()) newErrors.title = "Titel krävs";
    if (!content.trim()) newErrors.content = "Innehåll krävs";
    if (!author.trim()) newErrors.author = "Författarnamn krävs";
    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validateForm() || !post) return;
    if (hasSizeError) return;

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

      toast.success("Inlägget har uppdaterats");
      clearImages();
      navigate({ to: `/post/${id}` });
    } catch (err) {
      console.error("Failed to update post:", err);
      setSubmitError(
        "Kunde inte uppdatera inlägget. Försök med en mindre bild eller försök igen.",
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addImages(e.target.files);
    e.target.value = "";
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value as Category);
    setSuggestedTitle("");
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
          <Button onClick={() => navigate({ to: "/" })} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tillbaka till hem
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <UnpublishDialog
        open={showUnpublishDialog}
        isDeleting={isDeletingPost}
        isSavingDraft={isSavingAsDraft}
        onDelete={handleUnpublishDelete}
        onSaveDraft={handleUnpublishSaveDraft}
        onCancel={handleUnpublishCancel}
      />

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
                  <Label
                    htmlFor="suggested-title"
                    className="text-sm font-medium"
                  >
                    Föreslagen titel
                  </Label>
                  <Select
                    value={suggestedTitle}
                    onValueChange={handleSuggestedTitleChange}
                  >
                    <SelectTrigger id="suggested-title">
                      <SelectValue placeholder="Välj en föreslagen titel (valfritt)" />
                    </SelectTrigger>
                    <SelectContent>
                      {titleSuggestions[category].map((titleOption) => (
                        <SelectItem key={titleOption} value={titleOption}>
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
                  className={fieldErrors.title ? "border-destructive" : ""}
                />
                {fieldErrors.title && (
                  <p className="text-sm text-destructive">
                    {fieldErrors.title}
                  </p>
                )}
              </div>

              {/* Author */}
              <div className="space-y-2">
                <Label htmlFor="author" className="text-sm font-medium">
                  Ditt alias
                </Label>
                <Input
                  id="author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Ditt namn..."
                  className={fieldErrors.author ? "border-destructive" : ""}
                />
                {fieldErrors.author && (
                  <p className="text-sm text-destructive">
                    {fieldErrors.author}
                  </p>
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
                  className={`resize-none ${fieldErrors.content ? "border-destructive" : ""}`}
                />
                {fieldErrors.content && (
                  <p className="text-sm text-destructive">
                    {fieldErrors.content}
                  </p>
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
                    onClick={() => document.getElementById("images")?.click()}
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
                    Stöder JPEG, PNG, WebP och GIF · Max 10 MB per bild · Bilder
                    komprimeras automatiskt till max 800 KB
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
                        {existingImages.map((_image, index) => {
                          const key = `existing-${index}`;
                          return (
                            <div
                              key={key}
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
                          );
                        })}
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
                        {newImages.map((image, index) => {
                          const key = `new-${index}`;
                          return (
                            <div
                              key={key}
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
                          );
                        })}
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
                  {existingImages.length === 0 &&
                    newImages.length === 0 &&
                    !isProcessing && (
                      <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-border/40 rounded-lg bg-muted/20">
                        <ImageIcon className="h-10 w-10 text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground text-center">
                          Inga bilder. Klicka på knappen ovan för att lägga till
                          bilder.
                        </p>
                      </div>
                    )}
                </div>
              </div>

              {/* Publish toggle */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/40">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="published"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Publicera omedelbart
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Gör detta inlägg synligt för alla
                  </p>
                </div>
                <Switch
                  id="published"
                  checked={published}
                  onCheckedChange={handlePublishedToggle}
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
                  disabled={
                    updatePostMutation.isPending || isProcessing || hasSizeError
                  }
                  className="flex-1"
                >
                  {updatePostMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sparar...
                    </>
                  ) : (
                    "Spara ändringar"
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
    </>
  );
}
