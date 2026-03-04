import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@tanstack/react-router";
import { Loader2, Rss, Users } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import PostCard from "../components/PostCard";
import PostSummaryCard, { detectCategory } from "../components/PostSummaryCard";
import SearchPanel, {
  EMPTY_FILTERS,
  type SearchFilters,
  isFilterActive,
} from "../components/SearchPanel";
import SunMoonWidget from "../components/SunMoonWidget";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetAllPublishedPosts,
  useGetFollowedUsers,
} from "../hooks/useQueries";

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

// ─── All Posts tab ────────────────────────────────────────────────────────────

function AllPostsTab() {
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
      <div className="flex items-center justify-center py-20">
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          data-ocid="home.loading_state"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20" data-ocid="home.error_state">
        <p className="text-destructive">
          Kunde inte ladda inlägg. Försök igen senare.
        </p>
      </div>
    );
  }

  return (
    <>
      <SearchPanel
        filters={filters}
        onChange={handleFiltersChange}
        resultCount={active ? filteredPosts.length : undefined}
        isActive={active}
      />

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
        <div className="grid gap-8 md:gap-10" data-ocid="home.post_list">
          {sortedPosts.map((post) => (
            <PostCard key={post.id.toString()} post={post} />
          ))}
        </div>
      )}
    </>
  );
}

// ─── My Feed tab ──────────────────────────────────────────────────────────────

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
    <div className="space-y-8 md:space-y-10" data-ocid="feed.post_list">
      <p className="text-sm text-muted-foreground">
        {feedPosts.length} inlägg från {followedUsers.length} följda skribenter
      </p>
      {feedPosts.map((post, idx) => (
        <div
          key={post.id.toString()}
          data-ocid={`feed.post_list.item.${idx + 1}`}
        >
          <PostCard post={post} />
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-10 md:py-16">
      {/* Date / Solar / Lunar bar above the heading */}
      <div className="mb-6">
        <SunMoonWidget standalone />
      </div>

      {/* Hero heading */}
      <div className="mb-8 md:mb-10 text-center">
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4 tracking-tight">
          Senaste berättelserna
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Tankar, idéer och berättelser från vår gemenskap av skribenter
        </p>
      </div>

      {/* Tabs: Alla inlägg / Mitt flöde */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6 w-full sm:w-auto" data-ocid="home.tab">
          <TabsTrigger
            value="all"
            className="flex-1 sm:flex-none gap-2"
            data-ocid="home.all_posts.tab"
          >
            Alla inlägg
          </TabsTrigger>
          <TabsTrigger
            value="feed"
            className="flex-1 sm:flex-none gap-2"
            data-ocid="home.feed.tab"
          >
            <Rss className="h-4 w-4" />
            Mitt flöde
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <AllPostsTab />
        </TabsContent>

        <TabsContent value="feed">
          <MyFeedTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
