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
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../backend";
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
  useCreatePost,
  useGetCallerUserProfile,
  useSaveCallerUserProfile,
  useSaveDraft,
  useUpdateDraft,
} from "../hooks/useQueries";
import { saveCommentSettings } from "../lib/commentSettings";
import { addPostToGroupAsync } from "../lib/groupStorage";

export default function CreatePostPage() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const principalStr = identity?.getPrincipal().toString() ?? "";

  const [category, setCategory] = useState<Category | "">("");
  const [suggestedTitle, setSuggestedTitle] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");
  const [published, setPublished] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [groupInMainFeed, setGroupInMainFeed] = useState(false);
  const [commentsLocked, setCommentsLocked] = useState(false);
  const [commentsHidden, setCommentsHidden] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    content?: string;
    author?: string;
  }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Track current draft ID for manual saves
  const currentDraftIdRef = useRef<bigint | null>(null);

  const createPostMutation = useCreatePost();
  const saveDraftMutation = useSaveDraft();
  const updateDraftMutation = useUpdateDraft();
  const saveProfileMutation = useSaveCallerUserProfile();

  // Load the user's profile alias
  const {
    data: userProfile,
    isFetched: profileFetched,
    isLoading: profileLoading,
  } = useGetCallerUserProfile();
  const profileAlias = userProfile?.name?.trim() ?? "";
  // Only treat alias as "found" if profile has actually loaded AND alias is non-empty
  // If actor is null / profile is still loading, fall back to manual input
  const hasProfileAlias = profileFetched && profileAlias.length > 0;

  // Pre-fill author from profile alias once profile loads
  useEffect(() => {
    if (profileFetched && hasProfileAlias) {
      setAuthor(profileAlias);
    }
  }, [profileFetched, hasProfileAlias, profileAlias]);

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

  const isContentEmpty = (html: string) => {
    const stripped = html.replace(/<[^>]*>/g, "").trim();
    return stripped.length === 0;
  };

  const validateForm = () => {
    const newErrors: { title?: string; content?: string; author?: string } = {};
    if (!title.trim()) newErrors.title = "Titel krävs";
    if (isContentEmpty(content)) newErrors.content = "Innehåll krävs";
    // Author is valid if: profile alias exists OR user has typed something
    const effectiveAuthorForValidation = hasProfileAlias
      ? profileAlias
      : author.trim();
    if (!effectiveAuthorForValidation)
      newErrors.author =
        "Alias krävs — fyll i ett alias eller spara ett i din profil";
    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGroupSelectionChange = (ids: string[], inMainFeed: boolean) => {
    setSelectedGroupIds(ids);
    setGroupInMainFeed(inMainFeed);
    // Auto-disable public publish when groups are selected
    if (ids.length > 0) {
      setPublished(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validateForm()) return;
    if (hasSizeError) return;

    // Guard: actor must be ready before submitting
    if (!actor) {
      setSubmitError(
        "Anslutningen är inte klar än. Vänta ett ögonblick och försök igen.",
      );
      return;
    }

    try {
      const imageBlobs = await convertToBlobs();
      // Use profile alias if available — author state is empty when profile alias is shown
      const trimmedAuthor = hasProfileAlias ? profileAlias : author.trim();

      // If the user has no saved alias yet, save it to their profile now
      if (!hasProfileAlias && trimmedAuthor) {
        try {
          const updatedProfile: UserProfile = {
            name: trimmedAuthor,
            email: userProfile?.email ?? "",
            phone: userProfile?.phone ?? "",
            country: userProfile?.country ?? "",
            preferredLanguage: userProfile?.preferredLanguage ?? "sv",
          };
          await saveProfileMutation.mutateAsync(updatedProfile);
        } catch {
          // Non-fatal — profile save failure should not block post creation
        }
      }

      const postId = await createPostMutation.mutateAsync({
        title: title.trim(),
        content: content,
        author: trimmedAuthor,
        published,
        images: imageBlobs,
      });

      // Save comment settings if comments are locked
      if (commentsLocked && postId !== undefined) {
        const postIdStr =
          typeof postId === "bigint" ? postId.toString() : String(postId);
        saveCommentSettings(postIdStr, {
          locked: commentsLocked,
          hidden: commentsHidden,
        });
      }

      // Add post to selected groups after creation
      if (selectedGroupIds.length > 0 && postId !== undefined) {
        const postIdStr =
          typeof postId === "bigint" ? postId.toString() : String(postId);
        await Promise.all(
          selectedGroupIds.map((groupId) =>
            addPostToGroupAsync(actor, groupId, postIdStr, groupInMainFeed),
          ),
        );
      }

      clearImages();
      navigate({ to: "/" });
    } catch (err) {
      console.error("Failed to create post:", err);
      const errMsg = err instanceof Error ? err.message : "";
      if (errMsg.startsWith("__contentBlocked__:")) {
        const reason = errMsg.replace("__contentBlocked__:", "");
        toast.error(
          `Inlägget blockerades av innehållsmodereringen: ${reason}. Vänligen ändra ditt innehåll.`,
          { duration: 8000 },
        );
      } else {
        setSubmitError(
          "Kunde inte skapa inlägget. Försök med en mindre bild eller försök igen.",
        );
      }
    }
  };

  const handleSaveAsDraft = async () => {
    // Use profile alias if available, otherwise use what's typed
    const effectiveAuthor = hasProfileAlias ? profileAlias : author.trim();
    const contentIsEmpty = isContentEmpty(content);

    if (!title.trim() && contentIsEmpty && !effectiveAuthor) {
      toast.error("Fyll i minst ett fält innan du sparar som utkast.");
      return;
    }

    // Guard: actor must be ready
    if (!actor) {
      toast.error(
        "Anslutningen är inte klar än. Vänta ett ögonblick och försök igen.",
      );
      return;
    }

    try {
      const imageBlobs = await convertToBlobs();
      const draftTitle = title.trim() || "(Utan titel)";
      const draftAuthor = effectiveAuthor || "(Okänd)";

      if (currentDraftIdRef.current !== null) {
        await updateDraftMutation.mutateAsync({
          id: currentDraftIdRef.current,
          title: draftTitle,
          content: content,
          author: draftAuthor,
          images: imageBlobs,
        });
      } else {
        const newId = await saveDraftMutation.mutateAsync({
          title: draftTitle,
          content: content,
          author: draftAuthor,
          images: imageBlobs,
        });
        if (newId === undefined || newId === null) {
          throw new Error("Backend returnerade inget utkast-ID.");
        }
        currentDraftIdRef.current = newId;
      }
      // Save comment settings for the draft
      if (commentsLocked && currentDraftIdRef.current !== null) {
        saveCommentSettings(currentDraftIdRef.current.toString(), {
          locked: commentsLocked,
          hidden: commentsHidden,
        });
      }
      toast.success(
        "Utkastet har sparats! Du hittar det under Mina inlägg och utkast.",
        { duration: 4000 },
      );
    } catch (err) {
      console.error("Failed to save draft:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      // Show the full backend error message — never hide what went wrong
      const cleanMsg = errMsg.includes("Reject")
        ? errMsg.split("Reject").slice(-1)[0].trim()
        : errMsg.includes(":")
          ? errMsg.split(":").slice(-1)[0].trim()
          : errMsg;
      toast.error(`Kunde inte spara utkastet: ${cleanMsg}`, { duration: 8000 });
    }
  };

  const handlePreview = async () => {
    // Use profile alias if available — author state is empty when profile alias is shown
    const effectiveAuthor = hasProfileAlias ? profileAlias : author.trim();

    if (!effectiveAuthor) {
      toast.error(
        "Fyll i ett alias innan du förhandsgranskar. Gå till Profil och spara ett alias, eller skriv in ett i fältet Ditt alias.",
      );
      return;
    }

    try {
      const imageBlobs = await convertToBlobs();
      const draftTitle = title.trim() || "(Utan titel)";
      let draftId = currentDraftIdRef.current;

      if (draftId === null) {
        const newId = await saveDraftMutation.mutateAsync({
          title: draftTitle,
          content: content,
          author: effectiveAuthor,
          images: imageBlobs,
        });
        if (newId === undefined || newId === null) {
          throw new Error("Backend returnerade inget utkast-ID.");
        }
        currentDraftIdRef.current = newId;
        draftId = newId;
      } else {
        await updateDraftMutation.mutateAsync({
          id: draftId,
          title: draftTitle,
          content: content,
          author: effectiveAuthor,
          images: imageBlobs,
        });
      }
      navigate({ to: `/draft/${draftId.toString()}/preview` });
    } catch (err) {
      console.error("Failed to save draft for preview:", err);
      const errMsg = err instanceof Error ? err.message : "Okänt fel";
      toast.error(
        `Kunde inte spara utkastet för förhandsgranskning: ${errMsg}`,
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

  const isSavingDraft =
    saveDraftMutation.isPending || updateDraftMutation.isPending;

  // Actor loading state — true only while actively fetching
  const isActorLoading = actorFetching;
  // Never show a "failed" banner — if actor is null after loading, we let the
  // individual action handlers surface the error when the user actually clicks.

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

      {isActorLoading && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-4 py-2.5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          Ansluter till nätverket...
        </div>
      )}

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
            {/* Top action buttons */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={handlePreview}
                disabled={
                  createPostMutation.isPending ||
                  isProcessing ||
                  hasSizeError ||
                  isSavingDraft
                }
                className="gap-2"
                data-ocid="create_post.preview_top.secondary_button"
              >
                {isSavingDraft ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sparar...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Förhandsgranska
                  </>
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
                className="gap-2"
                data-ocid="create_post.save_draft_top.button"
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
                Ditt alias
              </Label>
              {hasProfileAlias ? (
                <p
                  className="text-sm py-2 px-3 rounded-md bg-muted/40 min-h-[2.5rem] flex items-center text-foreground"
                  data-ocid="create_post.author.display"
                >
                  {profileAlias}
                </p>
              ) : profileLoading ? (
                <p className="text-sm py-2 px-3 rounded-md bg-muted/40 min-h-[2.5rem] flex items-center text-muted-foreground">
                  Hämtar alias...
                </p>
              ) : (
                <>
                  <Input
                    id="author"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="skriv in ett påhittat alias namn"
                    className={fieldErrors.author ? "border-destructive" : ""}
                    data-ocid="create_post.author.input"
                  />
                  <p className="text-xs text-muted-foreground">
                    Aliaset sparas automatiskt i din profil
                  </p>
                </>
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
                data-ocid="create_post.content.editor"
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

            {/* Group selector */}
            {principalStr && (
              <GroupSelector
                principalStr={principalStr}
                selectedGroupIds={selectedGroupIds}
                onSelectionChange={handleGroupSelectionChange}
              />
            )}

            {/* Comment settings */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Kommentarsinställningar
              </Label>
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border/40">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="comments-locked-create"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Stäng kommentarer
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Förhindra nya kommentarer på detta inlägg
                    </p>
                  </div>
                  <Switch
                    id="comments-locked-create"
                    checked={commentsLocked}
                    onCheckedChange={(val) => {
                      setCommentsLocked(val);
                      if (!val) setCommentsHidden(false);
                    }}
                    data-ocid="post.comments_locked.switch"
                  />
                </div>
                {commentsLocked && (
                  <div className="pt-2 border-t border-border/30 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Visa befintliga kommentarer?
                    </p>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="radio"
                          name="comments-visibility-create"
                          checked={!commentsHidden}
                          onChange={() => setCommentsHidden(false)}
                          className="accent-primary"
                          data-ocid="post.comments_show.radio"
                        />
                        Visa kommentarer (men inga nya kan postas)
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="radio"
                          name="comments-visibility-create"
                          checked={commentsHidden}
                          onChange={() => setCommentsHidden(true)}
                          className="accent-primary"
                          data-ocid="post.comments_hide.radio"
                        />
                        Dölj alla kommentarer
                      </label>
                    </div>
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
                    Publicerar...
                  </>
                ) : (
                  "Publicera"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handlePreview}
                disabled={
                  createPostMutation.isPending ||
                  isProcessing ||
                  hasSizeError ||
                  isSavingDraft
                }
                className="flex-1 sm:flex-none gap-2"
                data-ocid="create_post.preview_bottom.secondary_button"
              >
                {isSavingDraft ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sparar...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Förhandsgranska
                  </>
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
                onClick={() => navigate({ to: "/" })}
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
