import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, RotateCcw, Search } from "lucide-react";
import { useCallback } from "react";

export interface SearchFilters {
  text: string;
  category: string;
  dateFrom: string;
  dateTo: string;
}

export const CATEGORIES = [
  "Alla",
  "Livsstil",
  "Livsberättelser",
  "Mat",
  "Hobby",
  "Djupa tankar",
] as const;

export const EMPTY_FILTERS: SearchFilters = {
  text: "",
  category: "Alla",
  dateFrom: "",
  dateTo: "",
};

export function isFilterActive(filters: SearchFilters): boolean {
  return (
    filters.text.trim() !== "" ||
    filters.category !== "Alla" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== ""
  );
}

interface SearchPanelProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  resultCount?: number;
  isActive?: boolean;
}

export default function SearchPanel({
  filters,
  onChange,
  resultCount,
  isActive = false,
}: SearchPanelProps) {
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...filters, text: e.target.value });
    },
    [filters, onChange],
  );

  const handleCategoryChange = useCallback(
    (value: string) => {
      onChange({ ...filters, category: value });
    },
    [filters, onChange],
  );

  const handleDateFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...filters, dateFrom: e.target.value });
    },
    [filters, onChange],
  );

  const handleDateToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...filters, dateTo: e.target.value });
    },
    [filters, onChange],
  );

  const handleClear = useCallback(() => {
    onChange(EMPTY_FILTERS);
  }, [onChange]);

  return (
    <div
      data-ocid="home.search_panel"
      className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm p-4 md:p-5 mb-8"
    >
      {/* Main search row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-3">
        {/* Free text search — takes priority */}
        <div className="flex-1 min-w-0">
          <Label
            htmlFor="search-text"
            className="text-xs font-medium text-muted-foreground mb-1.5 block"
          >
            Fritext
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="search-text"
              data-ocid="search.search_input"
              type="search"
              placeholder="Sök i titel, alias eller innehåll..."
              value={filters.text}
              onChange={handleTextChange}
              className="pl-9 h-10 bg-background/70"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Category */}
        <div className="w-full md:w-44 shrink-0">
          <Label
            htmlFor="search-category"
            className="text-xs font-medium text-muted-foreground mb-1.5 block"
          >
            Kategori
          </Label>
          <Select value={filters.category} onValueChange={handleCategoryChange}>
            <SelectTrigger
              id="search-category"
              data-ocid="search.select"
              className="h-10 bg-background/70"
            >
              <SelectValue placeholder="Alla kategorier" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date range */}
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-2 md:flex-row md:gap-2">
          <div className="flex-1 sm:flex-none sm:w-36 md:w-36">
            <Label
              htmlFor="search-date-from"
              className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"
            >
              <CalendarDays className="h-3 w-3" />
              Från datum
            </Label>
            <Input
              id="search-date-from"
              data-ocid="search.date_from.input"
              type="date"
              value={filters.dateFrom}
              onChange={handleDateFromChange}
              className="h-10 bg-background/70 text-sm"
            />
          </div>
          <div className="flex-1 sm:flex-none sm:w-36 md:w-36">
            <Label
              htmlFor="search-date-to"
              className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"
            >
              <CalendarDays className="h-3 w-3" />
              Till datum
            </Label>
            <Input
              id="search-date-to"
              data-ocid="search.date_to.input"
              type="date"
              value={filters.dateTo}
              onChange={handleDateToChange}
              className="h-10 bg-background/70 text-sm"
            />
          </div>
        </div>

        {/* Clear button */}
        {isActive && (
          <div className="flex items-end shrink-0">
            <Button
              data-ocid="search.clear_button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="h-10 gap-1.5 text-muted-foreground hover:text-foreground whitespace-nowrap"
              title="Rensa sökning"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Rensa</span>
            </Button>
          </div>
        )}

        {/* Hidden submit button for keyboard Enter support */}
        <button
          type="button"
          data-ocid="search.submit_button"
          className="sr-only"
          aria-label="Sök"
        >
          Sök
        </button>
      </div>

      {/* Result count pill */}
      {isActive && resultCount !== undefined && (
        <div className="mt-3 flex items-center gap-2">
          <Badge
            variant={resultCount > 0 ? "default" : "secondary"}
            className="text-xs font-medium"
          >
            {resultCount === 0
              ? "Inga inlägg hittades"
              : `${resultCount} inlägg hittad${resultCount === 1 ? "" : "e"}`}
          </Badge>
          <span className="text-xs text-muted-foreground">för din sökning</span>
        </div>
      )}
    </div>
  );
}
