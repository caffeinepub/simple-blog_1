import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  Loader2,
  PenSquare,
  Rss,
  Tag,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Post } from "../backend";
import PostCard from "../components/PostCard";
import PostSummaryCard, { detectCategory } from "../components/PostSummaryCard";
import SearchPanel, {
  CATEGORIES,
  EMPTY_FILTERS,
  type SearchFilters,
  isFilterActive,
} from "../components/SearchPanel";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetAllPublishedPosts,
  useGetFollowedUsers,
} from "../hooks/useQueries";
import { formatDate } from "../utils/dateFormatter";

function matchesFilters(
  post: { title: string; author: string; content: string; createdAt: bigint },
  filters: SearchFilters,
): boolean {
  if (filters.text.trim()) {
    const needle = filters.text.trim().toLowerCase();
    const haystack =
      `${post.title} ${post.author} ${post.content}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  if (filters.category && filters.category !== "Alla") {
    const matched = detectCategory(post.title, post.content);
    if (matched !== filters.category) {
      const titleLower = post.title.toLowerCase();
      const catLower = filters.category.toLowerCase();
      if (!titleLower.includes(catLower)) return false;
    }
  }

  const postMs = Number(post.createdAt) / 1_000_000;
  if (filters.dateFrom) {
    const fromMs = new Date(filters.dateFrom).getTime();
    if (postMs < fromMs) return false;
  }
  if (filters.dateTo) {
    const toMs = new Date(filters.dateTo).getTime() + 86_400_000;
    if (postMs > toMs) return false;
  }

  return true;
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

function HeroPost({ post }: { post: Post }) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const urlRef = useRef<string | null>(null);

  const rawText = post.content
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const excerpt =
    rawText.length > 180 ? `${rawText.substring(0, 180)}…` : rawText;
  const category = detectCategory(post.title, post.content);

  useEffect(() => {
    if (post.images && post.images.length > 0) {
      const firstImage = post.images[0];
      if (!firstImage || firstImage.length === 0) {
        setImageError(true);
        return;
      }
      try {
        const blob = new Blob([new Uint8Array(firstImage)], {
          type: "image/jpeg",
        });
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setThumbnailUrl(url);
      } catch {
        setImageError(true);
      }
    }
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [post.images]);

  const hasImage =
    post.images && post.images.length > 0 && !imageError && thumbnailUrl;

  return (
    <Link
      to="/post/$id"
      params={{ id: post.id.toString() }}
      className="block group relative overflow-hidden rounded-2xl shadow-xl"
      data-ocid="hero.post.link"
    >
      {/* Background: image or warm editorial gradient */}
      <div className="relative aspect-[21/9] sm:aspect-[16/7] md:aspect-[21/8] overflow-hidden">
        {hasImage ? (
          <img
            src={thumbnailUrl!}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="eager"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background:
                "linear-gradient(160deg, oklch(0.86 0.12 72) 0%, oklch(0.76 0.17 55) 45%, oklch(0.52 0.1 195 / 0.55) 100%)",
            }}
          />
        )}
        {/* Deep bottom shadow for text legibility */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, oklch(0.10 0.025 55 / 0.92) 0%, oklch(0.10 0.025 55 / 0.6) 35%, oklch(0.10 0.025 55 / 0.15) 65%, transparent 100%)",
          }}
        />
        {/* Subtle amber top vignette for branding */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, oklch(0.72 0.18 72 / 0.18) 0%, transparent 30%)",
          }}
        />
      </div>

      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 lg:p-10">
        {/* Eyebrow: category + date in small caps */}
        <div className="flex items-center gap-3 mb-3">
          {category && (
            <Badge className="bg-primary/90 text-primary-foreground text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-sm">
              {category}
            </Badge>
          )}
          <span className="text-white/50 text-[10px] font-semibold tracking-[0.2em] uppercase flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            <time
              dateTime={new Date(
                Number(post.createdAt) / 1_000_000,
              ).toISOString()}
            >
              {formatDate(post.createdAt)}
            </time>
          </span>
        </div>

        {/* Title — largest element, strong serif */}
        <h2 className="font-serif font-bold text-[1.6rem] sm:text-4xl md:text-5xl text-white leading-[1.15] tracking-tight mb-3 max-w-3xl group-hover:text-primary/90 transition-colors drop-shadow-sm">
          {post.title}
        </h2>

        {/* Excerpt */}
        {excerpt && (
          <p className="text-white/75 text-sm md:text-base leading-relaxed mb-5 max-w-2xl line-clamp-2 hidden sm:block">
            {excerpt}
          </p>
        )}

        {/* Meta row with CTA */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-white/70 text-sm font-medium">
            {post.author}
          </span>
          <span className="inline-flex items-center gap-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors px-5 py-2 rounded-full shadow-lg shrink-0">
            Läs mer
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Welcome Hero (no posts) ──────────────────────────────────────────────────

function WelcomeHero({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden py-16 px-8 md:py-20 md:px-12 text-center"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.95 0.04 72) 0%, oklch(0.92 0.06 55) 50%, oklch(0.94 0.03 195 / 0.4) 100%)",
        boxShadow: "inset 0 0 60px oklch(0.72 0.18 72 / 0.06)",
      }}
      data-ocid="hero.welcome.section"
    >
      <div className="relative z-10 max-w-2xl mx-auto">
        <h1 className="font-serif font-bold text-4xl md:text-5xl text-foreground mb-4 tracking-tight leading-tight">
          Välkommen till <span className="text-primary italic">HKLO</span>
        </h1>
        <p className="text-lg md:text-xl text-foreground/70 leading-relaxed mb-8 max-w-xl mx-auto">
          Tankar, idéer och berättelser från vår gemenskap av skribenter. Bli
          den första att dela din historia!
        </p>
        {isAuthenticated && (
          <Button
            asChild
            size="lg"
            className="gap-2 font-semibold"
            data-ocid="hero.create_post.button"
          >
            <Link to="/create">
              <PenSquare className="h-5 w-5" />
              Skapa inlägg
            </Link>
          </Button>
        )}
      </div>
      {/* Decorative circles */}
      <div
        className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20"
        style={{
          background: "oklch(0.72 0.18 72)",
          transform: "translate(30%, -30%)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-15"
        style={{
          background: "oklch(0.52 0.1 195)",
          transform: "translate(-30%, 30%)",
        }}
      />
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  posts,
  onCategoryFilter,
  activeCategory,
}: {
  posts: Post[];
  onCategoryFilter: (cat: string) => void;
  activeCategory: string;
}) {
  const recentPosts = useMemo(
    () =>
      [...posts].sort((a, b) => Number(b.createdAt - a.createdAt)).slice(0, 5),
    [posts],
  );

  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const post of posts) {
      const cat = detectCategory(post.title, post.content);
      if (cat) cats.add(cat);
    }
    return Array.from(cats);
  }, [posts]);

  // Derive keywords from titles
  const tags = useMemo(() => {
    const words = new Map<string, number>();
    const stopwords = new Set([
      "och",
      "i",
      "att",
      "det",
      "en",
      "av",
      "för",
      "på",
      "är",
      "den",
      "med",
      "om",
      "som",
      "men",
      "de",
      "ett",
      "till",
      "från",
      "vi",
      "jag",
      "du",
      "han",
      "hon",
      "ni",
      "the",
      "a",
      "an",
      "of",
      "in",
      "to",
    ]);
    for (const post of posts) {
      for (const word of post.title.toLowerCase().split(/\W+/)) {
        if (word.length > 3 && !stopwords.has(word)) {
          words.set(word, (words.get(word) || 0) + 1);
        }
      }
    }
    return Array.from(words.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([w]) => w);
  }, [posts]);

  return (
    <aside className="space-y-6" aria-label="Sidopanel">
      {/* Senaste inlägg */}
      <div
        className="bg-card border border-border/40 rounded-xl p-5"
        data-ocid="sidebar.recent_posts.panel"
      >
        <h3 className="font-serif font-bold text-base text-foreground mb-4 flex items-center gap-2">
          <span
            className="block w-2.5 h-2.5 rounded-sm bg-primary"
            aria-hidden="true"
          />
          Senaste inlägg
        </h3>
        {recentPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga inlägg ännu.</p>
        ) : (
          <ul className="space-y-0" data-ocid="sidebar.recent_posts.list">
            {recentPosts.map((post, idx) => (
              <li
                key={post.id.toString()}
                data-ocid={`sidebar.recent_posts.item.${idx + 1}`}
              >
                <Link
                  to="/post/$id"
                  params={{ id: post.id.toString() }}
                  className="group flex gap-3 py-3 border-b border-border/30 last:border-0"
                  data-ocid={`sidebar.recent_posts.link.${idx + 1}`}
                >
                  <span className="font-serif font-bold text-sm text-primary/60 shrink-0 w-5 tabular-nums mt-0.5">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2 block">
                      {post.title}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      <time
                        dateTime={new Date(
                          Number(post.createdAt) / 1_000_000,
                        ).toISOString()}
                      >
                        {formatDate(post.createdAt)}
                      </time>
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Kategorier */}
      {categories.length > 0 && (
        <div
          className="bg-card border border-border/40 rounded-xl p-5"
          data-ocid="sidebar.categories.panel"
        >
          <h3 className="font-serif font-bold text-base text-foreground mb-4 flex items-center gap-2">
            <span
              className="block w-2.5 h-2.5 rounded-sm bg-accent"
              aria-hidden="true"
            />
            Kategorier
          </h3>
          <div
            className="flex flex-wrap gap-2"
            data-ocid="sidebar.categories.list"
          >
            <Badge
              variant={activeCategory === "Alla" ? "default" : "secondary"}
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs font-medium px-3 py-1"
              onClick={() => onCategoryFilter("Alla")}
              data-ocid="sidebar.categories.all.toggle"
            >
              Alla
            </Badge>
            {categories.map((cat, idx) => (
              <Badge
                key={cat}
                variant={activeCategory === cat ? "default" : "secondary"}
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs font-medium px-3 py-1"
                onClick={() => onCategoryFilter(cat)}
                data-ocid={`sidebar.categories.item.${idx + 1}`}
              >
                {cat}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Taggar */}
      {tags.length > 0 && (
        <div
          className="bg-card border border-border/40 rounded-xl p-5"
          data-ocid="sidebar.tags.panel"
        >
          <h3 className="font-serif font-bold text-base text-foreground mb-4 flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            Taggar
          </h3>
          <div className="flex flex-wrap gap-1.5" data-ocid="sidebar.tags.list">
            {tags.map((tag, idx) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-xs font-normal px-2 py-0.5 border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary cursor-default transition-colors"
                data-ocid={`sidebar.tags.item.${idx + 1}`}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

// ─── All Posts Tab ────────────────────────────────────────────────────────────

function AllPostsTab({
  categoryFilter,
  onCategoryFilterChange,
}: {
  categoryFilter: string;
  onCategoryFilterChange: (cat: string) => void;
}) {
  const { data: posts, isLoading, error } = useGetAllPublishedPosts();
  const [filters, setFilters] = useState<SearchFilters>({
    ...EMPTY_FILTERS,
    category: categoryFilter,
  });

  // Sync external category filter into local filters
  useEffect(() => {
    setFilters((prev) => ({ ...prev, category: categoryFilter }));
  }, [categoryFilter]);

  const handleFiltersChange = useCallback(
    (next: SearchFilters) => {
      setFilters(next);
      if (next.category !== filters.category) {
        onCategoryFilterChange(next.category);
      }
    },
    [filters.category, onCategoryFilterChange],
  );

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
      <div className="flex items-center justify-center py-20">
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          data-ocid="home.loading_state"
        />
      </div>
    );
  }

  // Suppress error state -- treat fetch errors as empty list so the page always renders
  if (error && !posts) {
    return (
      <div className="text-center py-16" data-ocid="home.empty_state">
        <p className="text-muted-foreground text-lg">
          Inga publicerade inlägg ännu. Bli den första att dela din berättelse!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SearchPanel
        filters={filters}
        onChange={handleFiltersChange}
        resultCount={active ? filteredPosts.length : undefined}
        isActive={active}
      />

      {filteredPosts.length === 0 ? (
        <div className="text-center py-16" data-ocid="home.empty_state">
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
        // Search results: compact summary cards
        <div className="grid gap-3 md:grid-cols-2" data-ocid="home.post_list">
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
        // Normal magazine grid: 2 columns on md+
        <div className="grid gap-6 md:grid-cols-2" data-ocid="home.post_list">
          {filteredPosts.map((post, idx) => (
            <div
              key={post.id.toString()}
              data-ocid={`home.post_list.item.${idx + 1}`}
            >
              <PostCard post={post} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── My Feed Tab ──────────────────────────────────────────────────────────────

function MyFeedTab() {
  const { data: allPosts, isLoading: postsLoading } = useGetAllPublishedPosts();
  const { data: followedUsers, isLoading: followLoading } =
    useGetFollowedUsers();
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

  const isLoading = postsLoading || followLoading;

  const feedPosts = useMemo(() => {
    if (!allPosts || !followedUsers) return [];
    const followedSet = new Set(followedUsers.map((p) => p.toString()));
    return [...allPosts]
      .filter((post) => followedSet.has(post.ownerId.toString()))
      .sort((a, b) => Number(b.createdAt - a.createdAt));
  }, [allPosts, followedUsers]);

  if (!isAuthenticated) {
    return (
      <div className="text-center py-20" data-ocid="feed.empty_state">
        <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
          <Rss className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground font-medium">
          Logga in för att se ditt personliga flöde.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          data-ocid="feed.loading_state"
        />
      </div>
    );
  }

  if (!followedUsers || followedUsers.length === 0) {
    return (
      <div className="text-center py-20 space-y-4" data-ocid="feed.empty_state">
        <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
          <Users className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <div>
          <p className="text-foreground font-semibold mb-1">
            Du följer ingen ännu
          </p>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Följ skribenter för att se deras inlägg samlade här.
          </p>
        </div>
        <Link
          to="/users"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
          data-ocid="feed.users.link"
        >
          <Users className="h-4 w-4" />
          Hitta användare att följa
        </Link>
      </div>
    );
  }

  if (feedPosts.length === 0) {
    return (
      <div className="text-center py-20" data-ocid="feed.empty_state">
        <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
          <Rss className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <p className="text-foreground font-semibold mb-1">
          Inga inlägg från de du följer ännu
        </p>
        <p className="text-muted-foreground text-sm">
          De du följer har inte publicerat något ännu. Kom tillbaka senare!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-ocid="feed.post_list">
      <p className="text-sm text-muted-foreground">
        {feedPosts.length} inlägg från {followedUsers.length} följda skribenter
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        {feedPosts.map((post, idx) => (
          <div
            key={post.id.toString()}
            data-ocid={`feed.post_list.item.${idx + 1}`}
          >
            <PostCard post={post} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { data: posts, isLoading } = useGetAllPublishedPosts();
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

  const [categoryFilter, setCategoryFilter] = useState("Alla");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const sortedPosts = useMemo(
    () =>
      posts ? [...posts].sort((a, b) => Number(b.createdAt - a.createdAt)) : [],
    [posts],
  );

  const latestPost = sortedPosts[0] ?? null;
  const hasPosts = sortedPosts.length > 0;

  // Posts excluding the hero post — the hero already shows the latest post,
  // so we slice it off to avoid the same post appearing twice in the grid.
  const gridPosts = hasPosts ? sortedPosts.slice(1) : [];

  return (
    <div className="min-h-screen">
      {/* ── Hero section ── */}
      <section
        className="container mx-auto px-4 pt-6 pb-4 md:pt-8 md:pb-6"
        aria-label="Framhävt inlägg"
        data-ocid="home.hero.section"
      >
        {isLoading ? (
          <div className="flex items-center justify-center aspect-[21/8] rounded-2xl bg-muted/30">
            <Loader2
              className="h-8 w-8 animate-spin text-primary"
              data-ocid="hero.loading_state"
            />
          </div>
        ) : hasPosts && latestPost ? (
          <HeroPost post={latestPost} />
        ) : (
          <WelcomeHero isAuthenticated={isAuthenticated} />
        )}
      </section>

      {/* ── Magazine masthead divider ── */}
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 py-2 mb-4">
          <div className="h-px flex-1 bg-border/50" />
          <span className="font-serif text-xs tracking-[0.3em] uppercase text-muted-foreground/70 shrink-0">
            Senaste berättelserna
          </span>
          <div className="h-px flex-1 bg-border/50" />
        </div>
      </div>

      {/* ── Mobile collapsible sidebar ── */}
      {hasPosts && (
        <div className="lg:hidden container mx-auto px-4 mb-4">
          <Collapsible
            open={mobileSidebarOpen}
            onOpenChange={setMobileSidebarOpen}
            data-ocid="sidebar.mobile.panel"
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between gap-2 h-10 font-medium text-sm"
                data-ocid="sidebar.mobile.toggle"
              >
                <span className="flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-primary" />
                  Senaste inlägg &amp; Kategorier
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${mobileSidebarOpen ? "rotate-180" : ""}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              {gridPosts.length > 0 && (
                <Sidebar
                  posts={gridPosts}
                  onCategoryFilter={setCategoryFilter}
                  activeCategory={categoryFilter}
                />
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* ── Main content + Desktop sidebar ── */}
      <div className="container mx-auto px-4 pb-16">
        <div className="flex gap-8 lg:gap-10">
          {/* Main column */}
          <main className="flex-1 min-w-0" aria-label="Artikelflöde">
            {/* Tab switcher */}
            <Tabs defaultValue="all" className="w-full">
              <TabsList
                className="mb-6 w-full sm:w-auto border border-border/40 bg-card/60"
                data-ocid="home.tab"
              >
                <TabsTrigger
                  value="all"
                  className="flex-1 sm:flex-none gap-2 text-sm"
                  data-ocid="home.all_posts.tab"
                >
                  Alla inlägg
                </TabsTrigger>
                <TabsTrigger
                  value="feed"
                  className="flex-1 sm:flex-none gap-2 text-sm"
                  data-ocid="home.feed.tab"
                >
                  <Rss className="h-3.5 w-3.5" />
                  Mitt flöde
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <AllPostsTab
                  categoryFilter={categoryFilter}
                  onCategoryFilterChange={setCategoryFilter}
                />
              </TabsContent>

              <TabsContent value="feed">
                <MyFeedTab />
              </TabsContent>
            </Tabs>
          </main>

          {/* Desktop sidebar */}
          {hasPosts && (
            <aside
              className="hidden lg:block w-72 xl:w-80 shrink-0"
              aria-label="Sidopanel"
            >
              <div className="sticky top-20">
                <Sidebar
                  posts={gridPosts}
                  onCategoryFilter={setCategoryFilter}
                  activeCategory={categoryFilter}
                />
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
