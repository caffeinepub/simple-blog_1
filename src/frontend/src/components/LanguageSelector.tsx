import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import React from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { LANGUAGES, type LanguageCode } from "../i18n/translations";

interface LanguageSelectorProps {
  /** When true, renders a compact inline button (for login page). Default: false */
  compact?: boolean;
  /** Optional callback after language changes (e.g. to persist to backend) */
  onLanguageChange?: (code: LanguageCode) => void;
}

export default function LanguageSelector({
  compact = false,
  onLanguageChange,
}: LanguageSelectorProps) {
  const { language, setLanguage, t } = useLanguage();

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  const handleSelect = (code: LanguageCode) => {
    setLanguage(code);
    onLanguageChange?.(code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          className="gap-1.5 font-medium"
          aria-label={t.languageSelectorLabel}
        >
          <span className="text-base leading-none">{current.flag}</span>
          <span className="text-xs font-semibold tracking-wide">
            {current.label}
          </span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-[120px]">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            className={`gap-2 cursor-pointer ${language === lang.code ? "bg-accent font-semibold" : ""}`}
          >
            <span className="text-base leading-none">{lang.flag}</span>
            <span className="text-sm font-medium">{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
