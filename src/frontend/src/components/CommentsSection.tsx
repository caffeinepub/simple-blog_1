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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
// Inline emoji picker (replaces @emoji-mart — not in package.json)
import {
  Calendar,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Pencil,
  Smile,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Comment } from "../backend";
import type { UserProfile } from "../backend";
import { useImageUpload } from "../hooks/useImageUpload";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddComment,
  useDeleteComment,
  useEditComment,
  useGetCallerUserProfile,
  useGetCommentsForPost,
  useSaveCallerUserProfile,
} from "../hooks/useQueries";
import { formatDate } from "../utils/dateFormatter";

// ─── Inline Emoji Picker ──────────────────────────────────────────────────────

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    emojis: [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "😂",
      "🤣",
      "😊",
      "😇",
      "🙂",
      "🙃",
      "😉",
      "😌",
      "😍",
      "🥰",
      "😘",
      "😗",
      "😙",
      "😚",
      "😋",
      "😛",
      "😝",
      "😜",
      "🤪",
      "🤨",
      "🧐",
      "🤓",
      "😎",
      "🥸",
      "🤩",
      "🥳",
      "😏",
      "😒",
      "😞",
      "😔",
      "😟",
      "😕",
      "🙁",
      "☹️",
      "😣",
      "😖",
      "😫",
      "😩",
      "🥺",
      "😢",
      "😭",
      "😤",
      "😠",
      "😡",
      "🤬",
      "🤯",
      "😳",
      "🥵",
      "🥶",
      "😱",
      "😨",
      "😰",
      "😥",
      "😓",
    ],
  },
  {
    label: "Händer",
    emojis: [
      "👍",
      "👎",
      "👌",
      "✌️",
      "🤞",
      "🤟",
      "🤘",
      "🤙",
      "👈",
      "👉",
      "👆",
      "🖕",
      "👇",
      "☝️",
      "👋",
      "🤚",
      "🖐️",
      "✋",
      "🖖",
      "👏",
      "🙌",
      "🤲",
      "🤝",
      "🙏",
      "💪",
      "🦾",
      "🦿",
      "✍️",
      "🤳",
      "💅",
    ],
  },
  {
    label: "Hjärtan",
    emojis: [
      "❤️",
      "🧡",
      "💛",
      "💚",
      "💙",
      "💜",
      "🖤",
      "🤍",
      "🤎",
      "💔",
      "❣️",
      "💕",
      "💞",
      "💓",
      "💗",
      "💖",
      "💘",
      "💝",
      "💟",
      "☮️",
    ],
  },
  {
    label: "Natur",
    emojis: [
      "🌸",
      "🌺",
      "🌻",
      "🌹",
      "🌷",
      "🌱",
      "🌿",
      "🍀",
      "🍁",
      "🍂",
      "🍃",
      "🌳",
      "🌲",
      "🎋",
      "🎄",
      "🌵",
      "🌴",
      "🌾",
      "☘️",
      "🍄",
      "🐶",
      "🐱",
      "🐭",
      "🐹",
      "🐰",
      "🦊",
      "🐻",
      "🐼",
      "🐨",
      "🐯",
    ],
  },
  {
    label: "Mat",
    emojis: [
      "🍕",
      "🍔",
      "🍟",
      "🌮",
      "🌯",
      "🥪",
      "🥗",
      "🍜",
      "🍣",
      "🍱",
      "🍩",
      "🍪",
      "🎂",
      "🍰",
      "🧁",
      "🍫",
      "🍬",
      "🍭",
      "🍦",
      "🧃",
      "☕",
      "🍵",
      "🧋",
      "🥤",
      "🍺",
      "🥂",
      "🍷",
      "🥃",
      "🍸",
      "🎉",
    ],
  },
];

function EmojiPicker({
  onSelect,
}: {
  onSelect: (emoji: string) => void;
}) {
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter(() => true)
    : (EMOJI_CATEGORIES[activeCategory]?.emojis ?? []);

  // Simple search: just show all when searching (emoji search by character not meaningful)
  const displayEmojis = search.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis)
    : filtered;

  return (
    <div className="w-72 p-2 space-y-2">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Sök emoji..."
        className="w-full text-xs px-2 py-1 rounded border border-border/40 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
      />
      {!search.trim() && (
        <div className="flex gap-1 flex-wrap">
          {EMOJI_CATEGORIES.map((cat, i) => (
            <button
              key={cat.label}
              type="button"
              onClick={() => setActiveCategory(i)}
              className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                activeCategory === i
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-8 gap-0.5 max-h-40 overflow-y-auto">
        {displayEmojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            className="h-8 w-8 flex items-center justify-center text-lg rounded hover:bg-accent transition-colors"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Inline Image Display ─────────────────────────────────────────────────────

function CommentImages({ images }: { images: Uint8Array[] }) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const generated = images
      .filter((img) => img && img.length > 0)
      .map((img) =>
        URL.createObjectURL(
          new Blob([new Uint8Array(img)], { type: "image/jpeg" }),
        ),
      );
    setUrls(generated);
    return () => {
      for (const u of generated) URL.revokeObjectURL(u);
    };
  }, [images]);

  if (urls.length === 0) return null;

  return (
    <div
      className={`mt-2 grid gap-2 ${
        urls.length === 1
          ? "grid-cols-1"
          : urls.length === 2
            ? "grid-cols-2"
            : "grid-cols-3"
      }`}
    >
      {urls.map((url, index) => (
        <div
          key={url}
          className="relative aspect-square rounded-md overflow-hidden border border-border/30 bg-muted/20"
        >
          <img
            src={url}
            alt={`Bild ${index + 1}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}

// ─── Single Comment Row ───────────────────────────────────────────────────────

interface CommentRowProps {
  comment: Comment;
  isOwn: boolean;
  postId: bigint;
}

function CommentRow({ comment, isOwn, postId }: CommentRowProps) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const editMutation = useEditComment();
  const deleteMutation = useDeleteComment();

  const {
    images: editImages,
    addImages: addEditImages,
    removeImage: removeEditImage,
    convertToBlobs: convertEditBlobs,
    clearImages: clearEditImages,
    isProcessing: editProcessing,
  } = useImageUpload();

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    try {
      const imageBlobs = await convertEditBlobs();
      await editMutation.mutateAsync({
        commentId: comment.id,
        content: editContent.trim(),
        images: imageBlobs,
        postId,
      });
      setEditing(false);
      clearEditImages();
      toast.success("Kommentaren har uppdaterats.");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Kunde inte uppdatera kommentaren.",
      );
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ commentId: comment.id, postId });
      toast.success("Kommentaren har tagits bort.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Kunde inte ta bort kommentaren.",
      );
    }
  };

  const insertEmojiInEdit = (emoji: string) => {
    const el = editTextareaRef.current;
    if (!el) {
      setEditContent((prev) => prev + emoji);
      setEmojiOpen(false);
      return;
    }
    const start = el.selectionStart ?? editContent.length;
    const end = el.selectionEnd ?? editContent.length;
    const next = editContent.slice(0, start) + emoji + editContent.slice(end);
    setEditContent(next);
    setEmojiOpen(false);
    setTimeout(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    }, 50);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="group relative"
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
          {comment.authorAlias.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Author + date */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground">
              {comment.authorAlias}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(comment.createdAt)}
            </span>
          </div>

          {editing ? (
            <div className="space-y-2">
              <div className="relative">
                <Textarea
                  ref={editTextareaRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="text-sm resize-none pr-10"
                  rows={3}
                  data-ocid="comment.edit.textarea"
                />
                <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 bottom-2 h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-2 w-auto shadow-xl" align="end">
                    <EmojiPicker onSelect={insertEmojiInEdit} />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Edit image uploads */}
              {editImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {editImages.map((img, index) => (
                    <div
                      key={img.preview}
                      className="relative aspect-square rounded-md overflow-hidden border border-border/30 group/img"
                    >
                      <img
                        src={img.preview}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeEditImage(index)}
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      addEditImages(e.target.files);
                      e.target.value = "";
                    }}
                    disabled={editProcessing}
                  />
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs text-muted-foreground border border-border/40 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                    <ImageIcon className="h-3 w-3" />
                    Bild
                  </span>
                </label>

                <Button
                  size="sm"
                  onClick={handleEdit}
                  disabled={
                    editMutation.isPending ||
                    !editContent.trim() ||
                    editProcessing
                  }
                  className="h-7 text-xs"
                  data-ocid="comment.edit.save_button"
                >
                  {editMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Spara"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    setEditContent(comment.content);
                    clearEditImages();
                  }}
                  className="h-7 text-xs"
                  data-ocid="comment.edit.cancel_button"
                >
                  Avbryt
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {comment.content}
              {comment.images && comment.images.length > 0 && (
                <CommentImages images={comment.images} />
              )}
            </div>
          )}

          {/* Owner actions */}
          {isOwn && !editing && (
            <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(true)}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                data-ocid="comment.edit_button"
              >
                <Pencil className="h-3 w-3" />
                Redigera
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deleteMutation.isPending}
                    className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                    data-ocid="comment.delete_button"
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    Ta bort
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent data-ocid="comment.delete.dialog">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Ta bort kommentar</AlertDialogTitle>
                    <AlertDialogDescription>
                      Är du säker på att du vill ta bort denna kommentar?
                      Åtgärden kan inte ångras.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-ocid="comment.delete.cancel_button">
                      Avbryt
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      data-ocid="comment.delete.confirm_button"
                    >
                      Ta bort
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── CommentsSection ──────────────────────────────────────────────────────────

interface CommentsSectionProps {
  postId: bigint;
  commentsLocked?: boolean;
  commentsHidden?: boolean;
}

export default function CommentsSection({
  postId,
  commentsLocked = false,
  commentsHidden = false,
}: CommentsSectionProps) {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();
  const callerPrincipal = identity?.getPrincipal().toString() ?? "";

  const { data: comments = [], isLoading } = useGetCommentsForPost(postId);
  const { data: userProfile, isFetched: profileFetched } =
    useGetCallerUserProfile();
  const addCommentMutation = useAddComment();
  const saveProfileMutation = useSaveCallerUserProfile();

  const profileAlias = userProfile?.name?.trim() ?? "";
  const hasProfileAlias = profileAlias.length > 0;

  const [newComment, setNewComment] = useState("");
  const [authorAlias, setAuthorAlias] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    images,
    addImages,
    removeImage,
    convertToBlobs,
    clearImages,
    isProcessing,
    error: imageError,
  } = useImageUpload();

  // Pre-fill alias from profile
  useEffect(() => {
    if (profileFetched && hasProfileAlias) {
      setAuthorAlias(profileAlias);
    }
  }, [profileFetched, hasProfileAlias, profileAlias]);

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) {
      setNewComment((prev) => prev + emoji);
      setEmojiOpen(false);
      return;
    }
    const start = el.selectionStart ?? newComment.length;
    const end = el.selectionEnd ?? newComment.length;
    const next = newComment.slice(0, start) + emoji + newComment.slice(end);
    setNewComment(next);
    setEmojiOpen(false);
    setTimeout(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    }, 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const alias = hasProfileAlias ? profileAlias : authorAlias.trim();
    if (!newComment.trim()) return;
    if (!alias) {
      toast.error("Du måste ange ett alias för att kommentera.");
      return;
    }

    try {
      const imageBlobs = await convertToBlobs();

      // Save alias to profile if not set
      if (!hasProfileAlias && alias) {
        try {
          const updatedProfile: UserProfile = {
            name: alias,
            email: userProfile?.email ?? "",
            phone: userProfile?.phone ?? "",
            country: userProfile?.country ?? "",
            preferredLanguage: userProfile?.preferredLanguage ?? "sv",
          };
          await saveProfileMutation.mutateAsync(updatedProfile);
        } catch {
          // Non-fatal
        }
      }

      await addCommentMutation.mutateAsync({
        postId,
        content: newComment.trim(),
        authorAlias: alias,
        images: imageBlobs,
      });

      setNewComment("");
      clearImages();
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      // Backend traps with a Swedish moderation message — extract and surface it
      const moderationPrefix =
        "Kommentaren blockerades av innehållsmodereringen:";
      if (rawMsg.includes(moderationPrefix)) {
        const idx = rawMsg.indexOf(moderationPrefix);
        const reason = rawMsg
          .slice(idx + moderationPrefix.length)
          .trim()
          .replace(/\.$/, "");
        toast.error(
          `Kommentaren blockerades av innehållsmodereringen: ${reason}.`,
          { duration: 8000 },
        );
      } else {
        toast.error(rawMsg || "Kunde inte lägga till kommentaren.");
      }
    }
  };

  if (!isAuthenticated) return null;

  // If comments are fully hidden, render nothing
  if (commentsHidden) return null;

  return (
    <section
      className="mt-10 pt-8 border-t border-border/30"
      data-ocid="comments.section"
    >
      <h2 className="text-xl font-serif font-semibold mb-6 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-primary" />
        Kommentarer
        {comments.length > 0 && (
          <span className="text-sm font-normal text-muted-foreground">
            ({comments.length})
          </span>
        )}
      </h2>

      {/* Comment list */}
      {isLoading ? (
        <div
          className="flex items-center gap-2 py-4 text-muted-foreground text-sm"
          data-ocid="comments.loading_state"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Laddar kommentarer...
        </div>
      ) : comments.length === 0 ? (
        <div
          className="py-8 text-center text-muted-foreground text-sm"
          data-ocid="comments.empty_state"
        >
          Inga kommentarer ännu. Bli den första att kommentera!
        </div>
      ) : (
        <div className="space-y-5 mb-8" data-ocid="comments.list">
          <AnimatePresence initial={false}>
            {comments.map((comment, i) => (
              <div
                key={comment.id.toString()}
                data-ocid={`comments.item.${i + 1}`}
              >
                <CommentRow
                  comment={comment}
                  isOwn={callerPrincipal === comment.authorPrincipal.toString()}
                  postId={postId}
                />
                {i < comments.length - 1 && (
                  <div className="mt-5 border-t border-border/20" />
                )}
              </div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add comment form or locked notice */}
      {commentsLocked ? (
        <div
          className="rounded-xl border border-border/40 bg-muted/30 p-4 text-center text-sm text-muted-foreground"
          data-ocid="comments.locked.panel"
        >
          Kommentarer är stängda
        </div>
      ) : (
        <div
          className="rounded-xl border border-border/40 bg-card/60 p-4"
          data-ocid="comments.add.panel"
        >
          <h3 className="text-sm font-semibold mb-3 text-foreground">
            Lägg till kommentar
          </h3>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Alias field if no profile alias */}
            {profileFetched && !hasProfileAlias && (
              <div className="space-y-1">
                <Label
                  htmlFor="comment-alias"
                  className="text-xs text-muted-foreground"
                >
                  Ditt alias
                </Label>
                <Input
                  id="comment-alias"
                  value={authorAlias}
                  onChange={(e) => setAuthorAlias(e.target.value)}
                  placeholder="skriv in ett påhittat alias namn"
                  className="text-sm h-8"
                  data-ocid="comments.add.input"
                />
              </div>
            )}

            {hasProfileAlias && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                  {profileAlias.charAt(0).toUpperCase()}
                </div>
                <span>
                  Kommenterar som <strong>{profileAlias}</strong>
                </span>
              </div>
            )}

            {/* Textarea with emoji picker */}
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Skriv en kommentar..."
                rows={3}
                className="text-sm resize-none pr-10"
                data-ocid="comments.add.textarea"
              />
              <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 bottom-2 h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    data-ocid="comments.emoji.toggle"
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-2 w-auto shadow-xl"
                  align="end"
                  data-ocid="comments.emoji.popover"
                >
                  <EmojiPicker onSelect={insertEmoji} />
                </PopoverContent>
              </Popover>
            </div>

            {/* Image preview */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {images.map((img, index) => (
                  <div
                    key={img.preview}
                    className="relative aspect-square rounded-md overflow-hidden border border-border/30 group/img"
                  >
                    <img
                      src={img.preview}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {imageError && (
              <p className="text-xs text-destructive">{imageError}</p>
            )}

            {/* Toolbar + submit */}
            <div className="flex items-center justify-between gap-2">
              <label
                className="cursor-pointer"
                data-ocid="comments.add.upload_button"
              >
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addImages(e.target.files);
                    e.target.value = "";
                  }}
                  disabled={isProcessing}
                />
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-muted-foreground border border-border/40 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                  {isProcessing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  Bilder
                </span>
              </label>

              <Button
                type="submit"
                size="sm"
                disabled={
                  addCommentMutation.isPending ||
                  !newComment.trim() ||
                  isProcessing
                }
                className="gap-1.5"
                data-ocid="comments.add.submit_button"
              >
                {addCommentMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MessageCircle className="h-3.5 w-3.5" />
                )}
                Kommentera
              </Button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
