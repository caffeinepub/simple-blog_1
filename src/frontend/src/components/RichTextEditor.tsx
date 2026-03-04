import { useEffect, useRef } from "react";
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
  ["emoji"],
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
  "emoji",
];

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Skriv din berättelse...",
  hasError = false,
  "data-ocid": dataOcid,
}: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={containerRef}
      className="rich-text-editor-wrapper"
      data-ocid={dataOcid}
    >
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        modules={{
          toolbar: TOOLBAR_OPTIONS,
        }}
        formats={FORMATS}
      />
    </div>
  );
}
