import { Loader2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import PostCard from "../components/PostCard";
import PostSummaryCard, { detectCategory } from "../components/PostSummaryCard";
import SearchPanel, {
  EMPTY_FILTERS,
  type SearchFilters,
  isFilterActive,
} from "../components/SearchPanel";
import { useGetAllPublishedPosts } from "../hooks/useQueries";

function matchesFilters(
  post: { title: string; author: string; content: string; createdAt: bigint },
  filters: SearchFilters,
): boolean {
  // Text search — case-insensitive across title, author, content
  if (filters.text.trim()) {
    const needle = filters.text.trim().toLowerCase();
    const haystack =
      `${post.title} ${post.author} ${post.content}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  // Category — match title+content against known keywords
  if (filters.category && filters.category !== "Alla") {
    const matched = detectCategory(post.title, post.content);
    if (matched !== filters.category) {
      // Also check if category keyword appears literally in title
      const titleLower = post.title.toLowerCase();
      const catLower = filters.category.toLowerCase();
      if (!titleLower.includes(catLower)) return false;
    }
  }

  // Date range — nanoseconds bigint → JS Date
  const postMs = Number(post.createdAt) / 1_000_000;
  if (filters.dateFrom) {
    const fromMs = new Date(filters.dateFrom).getTime();
    if (postMs < fromMs) return false;
  }
  if (filters.dateTo) {
    // Include the full "to" day by adding 24h
    const toMs = new Date(filters.dateTo).getTime() + 86_400_000;
    if (postMs > toMs) return false;
  }

  return true;
}

export default function HomePage() {
  const { data: posts, isLoading, error } = useGetAllPublishedPosts();
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);

  const handleFiltersChange = useCallback((next: SearchFilters) => {
    setFilters(next);
  }, []);

  const sortedPosts = useMemo(
    () =>
      posts ? [...posts].sort((a, b) => Number(b.createdAt - a.createdAt)) : [],
    [posts],
  );

  const active = isFilterActive(filters);

  const filteredPosts = useMemo(
    () =>
      active
        ? sortedPosts.filter((p) => matchesFilters(p, filters))
        : sortedPosts,
    [active, sortedPosts, filters],
  );

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto px-6 py-16">
        <div className="flex items-center justify-center py-20">
          <Loader2
            className="h-8 w-8 animate-spin text-primary"
            data-ocid="home.loading_state"
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-5xl mx-auto px-6 py-16">
        <div className="text-center py-20" data-ocid="home.error_state">
          <p className="text-destructive">
            Kunde inte ladda inlägg. Försök igen senare.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-10 md:py-16">
      {/* Hero heading */}
      <div className="mb-8 md:mb-10 text-center">
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4 tracking-tight">
          Senaste berättelserna
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Tankar, idéer och berättelser från vår gemenskap av skribenter
        </p>
      </div>

      {/* Search panel — always visible */}
      <SearchPanel
        filters={filters}
        onChange={handleFiltersChange}
        resultCount={active ? filteredPosts.length : undefined}
        isActive={active}
      />

      {/* Post list */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-20" data-ocid="home.empty_state">
          {active ? (
            <div className="space-y-2">
              <p className="text-muted-foreground text-lg font-medium">
                Inga inlägg hittades för din sökning.
              </p>
              <p className="text-muted-foreground text-sm">
                Prova att ändra söktermer eller rensa filtren.
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-lg">
              Inga publicerade inlägg ännu. Bli den första att dela din
              berättelse!
            </p>
          )}
        </div>
      ) : active ? (
        /* Search results — compact summary card grid */
        <div
          className="grid gap-3 sm:grid-cols-1 md:grid-cols-2"
          data-ocid="home.post_list"
        >
          {filteredPosts.map((post, idx) => (
            <div
              key={post.id.toString()}
              data-ocid={`home.post_list.item.${idx + 1}`}
            >
              <PostSummaryCard post={post} />
            </div>
          ))}
        </div>
      ) : (
        /* Normal view — full PostCards */
        <div className="grid gap-8 md:gap-10" data-ocid="home.post_list">
          {sortedPosts.map((post) => (
            <PostCard key={post.id.toString()} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
