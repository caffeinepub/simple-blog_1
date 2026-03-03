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
  /** Selected country code (ISO 2-letter) */
  selectedCountry?: string;
  /** Callback when a country is selected */
  onCountryChange?: (countryCode: string) => void;
}

export default function LanguageSelector({
  compact = false,
  onLanguageChange,
  selectedCountry,
  onCountryChange,
}: LanguageSelectorProps) {
  const { language, setLanguage, t } = useLanguage();

  // Find current displayed entry: prefer selectedCountry match, else fall back to language-mapped entry
  const current =
    (selectedCountry
      ? LANGUAGES.find((l) => l.code === selectedCountry)
      : LANGUAGES.find((l) => l.langCode === language)) ?? LANGUAGES[0];

  const handleSelect = (countryCode: string) => {
    const entry = LANGUAGES.find((l) => l.code === countryCode);
    if (entry?.langCode) {
      setLanguage(entry.langCode);
      onLanguageChange?.(entry.langCode);
    }
    onCountryChange?.(countryCode);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          className="gap-1.5 font-medium"
          aria-label={t.languageSelectorLabel}
          data-ocid="language_selector.toggle"
        >
          <span className="text-base leading-none">{current.flag}</span>
          <span className="text-xs font-semibold tracking-wide">
            {current.label}
          </span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        className="min-w-[120px] max-h-72 overflow-y-auto"
        data-ocid="language_selector.dropdown_menu"
      >
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            className={`gap-2 cursor-pointer ${current.code === lang.code ? "bg-accent font-semibold" : ""}`}
            data-ocid={`language_selector.item.${lang.code.toLowerCase()}`}
          >
            <span className="text-base leading-none">{lang.flag}</span>
            <span className="text-sm font-medium">{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
