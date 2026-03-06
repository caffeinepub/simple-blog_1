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
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Globe,
  Image as ImageIcon,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import GroupSelector from "../components/GroupSelector";
import RichTextEditor from "../components/RichTextEditor";
import {
  type Category,
  categories,
  titleSuggestions,
} from "../data/titleSuggestions";
import { useActor } from "../hooks/useActor";
import { useImageUpload } from "../hooks/useImageUpload";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useGetDraft,
  usePublishDraft,
  useUpdateDraft,
} from "../hooks/useQueries";
import { addPostToGroupAsync } from "../lib/groupStorage";

export default function EditDraftPage() {
  const { id } = useParams({ from: "/draft/$id/edit" });
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const { actor } = useActor();
  const principalStr = identity?.getPrincipal().toString() ?? "";
  const { data: draft, isLoading: isLoadingDraft } = useGetDraft(BigInt(id));
  const updateDraftMutation = useUpdateDraft();
  const publishDraftMutation = usePublishDraft();

  // Load user profile alias
  const { data: userProfile, isFetched: profileFetched } =
    useGetCallerUserProfile();
  const profileAlias = userProfile?.name?.trim() ?? "";
  const hasProfileAlias = profileAlias.length > 0 && profileAlias !== "unnamed";

  const [category, setCategory] = useState<Category | "">("");
  const [suggestedTitle, setSuggestedTitle] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [groupInMainFeed, setGroupInMainFeed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    content?: string;
    author?: string;
  }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [existingImages, setExistingImages] = useState<Uint8Array[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);

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
    if (draft && identity && profileFetched) {
      const isOwner =
        identity.getPrincipal().toString() === draft.ownerId.toString();
      if (!isOwner) {
        toast.error("Du har inte behörighet att redigera detta utkast");
        navigate({ to: "/drafts" });
        return;
      }
      setTitle(draft.title);
      setContent(draft.content);
      setAuthor(hasProfileAlias ? profileAlias : draft.author);
      setExistingImages((draft.images as Uint8Array[]) || []);
    }
  }, [
    draft,
    identity,
    navigate,
    profileFetched,
    hasProfileAlias,
    profileAlias,
  ]);

  const handleGroupSelectionChange = (ids: string[], inMainFeed: boolean) => {
    setSelectedGroupIds(ids);
    setGroupInMainFeed(inMainFeed);
  };

  const isContentEmpty = (html: string) => {
    const stripped = html.replace(/<[^>]*>/g, "").trim();
    return stripped.length === 0;
  };

  const validateForm = () => {
    const newErrors: { title?: string; content?: string; author?: string } = {};
    if (!title.trim()) newErrors.title = "Titel krävs";
    if (isContentEmpty(content)) newErrors.content = "Innehåll krävs";
    if (!author.trim()) newErrors.author = "Alias krävs";
    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!draft) return;
    if (hasSizeError) return;

    try {
      const newImageBlobs = await convertToBlobs();
      const allImages = [...existingImages, ...newImageBlobs];

      await updateDraftMutation.mutateAsync({
        id: draft.id,
        title: title.trim(),
        content: content,
        author: author.trim(),
        images: allImages,
      });

      toast.success("Utkastet har sparats.");
      clearImages();
      navigate({ to: "/drafts" });
    } catch (err) {
      console.error("Failed to save draft:", err);
      const msg = err instanceof Error ? err.message : "Okänt fel";
      setSubmitError(`Kunde inte spara utkastet: ${msg}`);
    }
  };

  const handlePublish = async () => {
    setSubmitError(null);
    if (!validateForm() || !draft) return;
    if (hasSizeError) return;

    try {
      // First save any changes
      const newImageBlobs = await convertToBlobs();
      const allImages = [...existingImages, ...newImageBlobs];

      await updateDraftMutation.mutateAsync({
        id: draft.id,
        title: title.trim(),
        content: content,
        author: author.trim(),
        images: allImages,
      });

      // Then publish
      const publishedId = await publishDraftMutation.mutateAsync(draft.id);

      // Add post to selected groups after publishing
      if (selectedGroupIds.length > 0 && publishedId !== undefined) {
        const postIdStr =
          typeof publishedId === "bigint"
            ? publishedId.toString()
            : String(publishedId);
        await Promise.all(
          selectedGroupIds.map((groupId) =>
            addPostToGroupAsync(actor, groupId, postIdStr, groupInMainFeed),
          ),
        );
      }

      toast.success(`"${title.trim()}" har publicerats!`);
      clearImages();
      navigate({ to: "/" });
    } catch (err) {
      console.error("Failed to publish draft:", err);
      const msg = err instanceof Error ? err.message : "Okänt fel";
      if (msg.startsWith("__contentBlocked__:")) {
        const reason = msg.replace("__contentBlocked__:", "");
        toast.error(
          `Inlägget blockerades av innehållsmodereringen: ${reason}. Vänligen ändra ditt innehåll.`,
          { duration: 8000 },
        );
      } else {
        setSubmitError(`Kunde inte publicera inlägget: ${msg}`);
      }
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

  const isPending =
    updateDraftMutation.isPending || publishDraftMutation.isPending;

  if (isLoadingDraft) {
    return (
      <div className="container max-w-3xl mx-auto px-6 py-16">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="container max-w-3xl mx-auto px-6 py-16">
        <div className="text-center py-20">
          <p className="text-destructive mb-6">Utkastet hittades inte.</p>
          <Button onClick={() => navigate({ to: "/drafts" })} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tillbaka till mina inlägg
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto px-6 py-16">
      <Button
        onClick={() => navigate({ to: "/drafts" })}
        variant="ghost"
        size="sm"
        className="mb-8 -ml-2 text-muted-foreground hover:text-foreground"
        data-ocid="edit_draft.back_button"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Tillbaka till mina inlägg
      </Button>

      <Card className="border-border/40 shadow-sm">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-3xl font-serif font-bold tracking-tight">
            Redigera utkast
          </CardTitle>
          <CardDescription className="text-base">
            Uppdatera ditt utkast eller publicera det
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveDraft} className="space-y-6">
            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">
                Kategori
              </Label>
              <Select value={category} onValueChange={handleCategoryChange}>
                <SelectTrigger
                  id="category"
                  data-ocid="edit_draft.category.select"
                >
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
                data-ocid="edit_draft.title.input"
              />
              {fieldErrors.title && (
                <p className="text-sm text-destructive">{fieldErrors.title}</p>
              )}
            </div>

            {/* Author */}
            <div className="space-y-2">
              <Label htmlFor="author" className="text-sm font-medium">
                Ditt alias
              </Label>
              {hasProfileAlias ? (
                <p
                  className="text-sm py-2 px-3 rounded-md bg-muted/40 min-h-[2.5rem] flex items-center text-foreground"
                  data-ocid="edit_draft.author.display"
                >
                  {profileAlias}
                </p>
              ) : (
                <Input
                  id="author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="skriv in ett påhittat alias namn"
                  className={fieldErrors.author ? "border-destructive" : ""}
                  data-ocid="edit_draft.author.input"
                />
              )}
              {fieldErrors.author && (
                <p className="text-sm text-destructive">{fieldErrors.author}</p>
              )}
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content" className="text-sm font-medium">
                Innehåll
              </Label>
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Skriv din berättelse..."
                hasError={!!fieldErrors.content}
                data-ocid="edit_draft.content.editor"
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
                  data-ocid="edit_draft.upload_button"
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

            {/* Group selector */}
            {principalStr && (
              <GroupSelector
                principalStr={principalStr}
                selectedGroupIds={selectedGroupIds}
                onSelectionChange={handleGroupSelectionChange}
              />
            )}

            {submitError && (
              <Alert variant="destructive" data-ocid="edit_draft.error_state">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                variant="outline"
                disabled={isPending || isProcessing || hasSizeError}
                className="flex-1"
                data-ocid="edit_draft.save_button"
              >
                {updateDraftMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sparar...
                  </>
                ) : (
                  "Spara utkast"
                )}
              </Button>
              <Button
                type="button"
                onClick={handlePublish}
                disabled={isPending || isProcessing || hasSizeError}
                className="flex-1 gap-2"
                data-ocid="edit_draft.publish_button"
              >
                {publishDraftMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Publicerar...
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4" />
                    Publicera
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: "/drafts" })}
                disabled={isPending || isProcessing}
                data-ocid="edit_draft.cancel_button"
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
