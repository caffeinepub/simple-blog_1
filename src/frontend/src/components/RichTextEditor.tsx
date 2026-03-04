import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hasError?: boolean;
  "data-ocid"?: string;
}

const TOOLBAR_OPTIONS = [
  [{ font: [] }, { size: ["small", false, "large", "huge"] }],
  ["bold", "italic", "underline", "strike"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ header: [1, 2, 3, false] }],
  [{ align: [] }],
  [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
  ["blockquote", "code-block"],
  ["link"],
  ["clean"],
];

const FORMATS = [
  "font",
  "size",
  "bold",
  "italic",
  "underline",
  "strike",
  "color",
  "background",
  "script",
  "header",
  "align",
  "list",
  "indent",
  "blockquote",
  "code-block",
  "link",
];

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
  {
    label: "Aktivitet",
    emojis: [
      "⚽",
      "🏀",
      "🏈",
      "⚾",
      "🥎",
      "🎾",
      "🏐",
      "🏉",
      "🥏",
      "🎱",
      "🏓",
      "🏸",
      "🥊",
      "🥋",
      "🎯",
      "⛳",
      "🎮",
      "🎲",
      "🎭",
      "🎨",
      "🎵",
      "🎶",
      "🎤",
      "🎧",
      "🎸",
      "🥁",
      "🎹",
      "🎺",
      "🎻",
      "🪗",
    ],
  },
  {
    label: "Resor",
    emojis: [
      "🚗",
      "🚕",
      "🚙",
      "🚌",
      "🚎",
      "🏎️",
      "🚓",
      "🚑",
      "🚒",
      "🚐",
      "✈️",
      "🚀",
      "🛸",
      "🚂",
      "⛵",
      "🚢",
      "🛳️",
      "🚁",
      "🛶",
      "🏖️",
      "🗺️",
      "🧭",
      "🌍",
      "🌎",
      "🌏",
      "🗼",
      "🗽",
      "🏰",
      "🏯",
      "🏟️",
    ],
  },
];

function EmojiPickerPanel({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState("");

  const displayEmojis = search.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis)
    : (EMOJI_CATEGORIES[activeCategory]?.emojis ?? []);

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

// ─────────────────────────────────────────────────────────────────────────────

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Skriv din berättelse...",
  hasError = false,
  "data-ocid": dataOcid,
}: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<ReactQuill>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  // Apply error border styling
  useEffect(() => {
    if (!containerRef.current) return;
    const editor = containerRef.current.querySelector(".ql-container");
    if (editor) {
      if (hasError) {
        (editor as HTMLElement).style.borderColor = "hsl(var(--destructive))";
      } else {
        (editor as HTMLElement).style.borderColor = "";
      }
    }
  }, [hasError]);

  const insertEmoji = (emoji: string) => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection(true);
      const index = range ? range.index : quill.getLength();
      quill.insertText(index, emoji);
      quill.setSelection(index + emoji.length, 0);
    } else {
      onChange(value + emoji);
    }
    setEmojiOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="rich-text-editor-wrapper"
      data-ocid={dataOcid}
    >
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        modules={{
          toolbar: TOOLBAR_OPTIONS,
        }}
        formats={FORMATS}
      />
      {/* Emoji button below the editor */}
      <div className="flex items-center mt-1 px-1">
        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-muted-foreground border border-border/40 hover:bg-accent hover:text-accent-foreground transition-colors"
              data-ocid="rich_editor.emoji.toggle"
            >
              <Smile className="h-3.5 w-3.5" />
              Emoji
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="p-2 w-auto shadow-xl"
            align="start"
            data-ocid="rich_editor.emoji.popover"
          >
            <EmojiPickerPanel onSelect={insertEmoji} />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
