import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Copy, Mail } from "lucide-react";
import { useState } from "react";
import { SiFacebook, SiWhatsapp, SiX } from "react-icons/si";
import { toast } from "sonner";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  title,
  url,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareOptions = [
    {
      label: "E-post",
      icon: <Mail className="h-5 w-5" />,
      href: `mailto:?subject=${encodedTitle}&body=${encodedTitle}%0A%0A${encodedUrl}`,
      color:
        "hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/30 dark:hover:text-amber-400",
    },
    {
      label: "WhatsApp",
      icon: <SiWhatsapp className="h-5 w-5" />,
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      color:
        "hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950/30 dark:hover:text-green-400",
    },
    {
      label: "X (Twitter)",
      icon: <SiX className="h-5 w-5" />,
      href: `https://x.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      color:
        "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100",
    },
    {
      label: "Facebook",
      icon: <SiFacebook className="h-5 w-5" />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color:
        "hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/30 dark:hover:text-blue-400",
    },
  ];

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        window.prompt("Kopiera länken:", url);
      }
      setCopied(true);
      toast.success("Länk kopierad!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Kopiera länken:", url);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Dela inlägg</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground line-clamp-2">
            {title}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          {shareOptions.map((option) => (
            <a
              key={option.label}
              href={option.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border border-border/50 bg-card text-foreground transition-colors cursor-pointer ${option.color}`}
            >
              {option.icon}
              <span className="text-sm font-medium">{option.label}</span>
            </a>
          ))}
        </div>

        {/* Copy link row */}
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-border/50 bg-muted/40 px-3 py-2">
          <span className="flex-1 text-xs text-muted-foreground truncate">
            {url}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="shrink-0 h-7 px-2 gap-1.5"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span className="text-xs">{copied ? "Kopierad!" : "Kopiera"}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
