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
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type Category,
  categories,
  titleSuggestions,
} from "../data/titleSuggestions";
import { useImageUpload } from "../hooks/useImageUpload";
import {
  useCreatePost,
  useSaveDraft,
  useUpdateDraft,
} from "../hooks/useQueries";

const AUTOSAVE_INTERVAL_MS = 30_000;

export default function CreatePostPage() {
  const navigate = useNavigate();
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
  const [_draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [showDraftSaved, setShowDraftSaved] = useState(false);

  // Track current draft ID for autosave updates
  const currentDraftIdRef = useRef<bigint | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const draftSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const createPostMutation = useCreatePost();
  const saveDraftMutation = useSaveDraft();
  const updateDraftMutation = useUpdateDraft();

  const {
    images,
    error: imageError,
    hasSizeError,
    isProcessing,
    addImages,
    removeImage,
    convertToBlobs,
    clearImages,
  } = useImageUpload();

  const hasContent = title.trim() || content.trim() || author.trim();

  const showDraftSavedIndicator = useCallback(() => {
    setDraftSavedAt(new Date());
    setShowDraftSaved(true);
    if (draftSavedTimerRef.current) clearTimeout(draftSavedTimerRef.current);
    draftSavedTimerRef.current = setTimeout(
      () => setShowDraftSaved(false),
      3000,
    );
  }, []);

  const performAutosave = useCallback(async () => {
    if (!hasContent) return;
    try {
      const imageBlobs = await convertToBlobs();
      if (currentDraftIdRef.current !== null) {
        await updateDraftMutation.mutateAsync({
          id: currentDraftIdRef.current,
          title: title.trim() || "(Utan titel)",
          content: content.trim(),
          author: author.trim(),
          images: imageBlobs,
        });
      } else {
        const newId = await saveDraftMutation.mutateAsync({
          title: title.trim() || "(Utan titel)",
          content: content.trim(),
          author: author.trim(),
          images: imageBlobs,
        });
        currentDraftIdRef.current = newId;
      }
      showDraftSavedIndicator();
    } catch {
      // Silent autosave failure – don't interrupt the user
    }
  }, [
    hasContent,
    title,
    content,
    author,
    convertToBlobs,
    saveDraftMutation,
    updateDraftMutation,
    showDraftSavedIndicator,
  ]);

  // Set up autosave interval
  useEffect(() => {
    autosaveTimerRef.current = setInterval(
      performAutosave,
      AUTOSAVE_INTERVAL_MS,
    );
    return () => {
      if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);
      if (draftSavedTimerRef.current) clearTimeout(draftSavedTimerRef.current);
    };
  }, [performAutosave]);

  const clearAutosave = () => {
    if (autosaveTimerRef.current) {
      clearInterval(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
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
    if (!validateForm()) return;
    if (hasSizeError) return;

    clearAutosave();
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
      navigate({ to: "/" });
    } catch (err) {
      console.error("Failed to create post:", err);
      setSubmitError(
        "Kunde inte skapa inlägget. Försök med en mindre bild eller försök igen.",
      );
    }
  };

  const handleSaveAsDraft = async () => {
    if (!title.trim() && !content.trim() && !author.trim()) {
      toast.error("Fyll i minst ett fält innan du sparar som utkast.");
      return;
    }
    clearAutosave();
    try {
      const imageBlobs = await convertToBlobs();
      if (currentDraftIdRef.current !== null) {
        await updateDraftMutation.mutateAsync({
          id: currentDraftIdRef.current,
          title: title.trim() || "(Utan titel)",
          content: content.trim(),
          author: author.trim(),
          images: imageBlobs,
        });
      } else {
        await saveDraftMutation.mutateAsync({
          title: title.trim() || "(Utan titel)",
          content: content.trim(),
          author: author.trim(),
          images: imageBlobs,
        });
      }
      clearImages();
      toast.success("Utkastet har sparats!");
      navigate({ to: "/drafts" });
    } catch (err) {
      console.error("Failed to save draft:", err);
      toast.error("Kunde inte spara utkastet. Försök igen.");
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

  const isSavingDraft =
    saveDraftMutation.isPending || updateDraftMutation.isPending;

  return (
    <div className="container max-w-3xl mx-auto px-6 py-16">
      <Button
        onClick={() => navigate({ to: "/" })}
        variant="ghost"
        size="sm"
        className="mb-8 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Tillbaka till hem
      </Button>

      <Card className="border-border/40 shadow-sm">
        <CardHeader className="space-y-1 pb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-3xl font-serif font-bold tracking-tight">
                Skapa nytt inlägg
              </CardTitle>
              <CardDescription className="text-base mt-1">
                Dela dina tankar och berättelser med gemenskapen
              </CardDescription>
            </div>
            {/* Draft saved indicator */}
            <div
              className={`flex items-center gap-1.5 text-xs text-muted-foreground transition-opacity duration-500 mt-1 shrink-0 ${showDraftSaved ? "opacity-100" : "opacity-0"}`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              <span>Utkast sparat</span>
            </div>
          </div>
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
                className={fieldErrors.author ? "border-destructive" : ""}
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
                      Välj bilder
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

                {/* New images */}
                {images.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {images.map((image, index) => {
                      const key = `img-${index}`;
                      return (
                        <div
                          key={key}
                          className="relative aspect-square rounded-lg border border-border/40 overflow-hidden bg-muted/30 group"
                        >
                          <img
                            src={image.preview}
                            alt={`Bild ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity focus:opacity-100"
                            aria-label={`Ta bort bild ${index + 1}`}
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
                ) : !isProcessing ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-border/40 rounded-lg bg-muted/20">
                    <ImageIcon className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground text-center">
                      Inga bilder valda. Klicka på knappen ovan för att lägga
                      till bilder.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-border/40 rounded-lg bg-muted/20">
                    <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
                    <p className="text-sm text-muted-foreground text-center">
                      Bearbetar och komprimerar bilder...
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
                onCheckedChange={setPublished}
              />
            </div>

            {submitError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="submit"
                disabled={
                  createPostMutation.isPending ||
                  isProcessing ||
                  hasSizeError ||
                  isSavingDraft
                }
                className="flex-1"
              >
                {createPostMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Skapar...
                  </>
                ) : (
                  "Skapa inlägg"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveAsDraft}
                disabled={
                  createPostMutation.isPending ||
                  isProcessing ||
                  hasSizeError ||
                  isSavingDraft
                }
                className="flex-1 sm:flex-none gap-2"
              >
                {isSavingDraft ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sparar...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Spara som utkast
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  clearAutosave();
                  navigate({ to: "/" });
                }}
                disabled={createPostMutation.isPending || isSavingDraft}
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
