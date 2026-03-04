import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Principal } from "@dfinity/principal";
import { Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import type { PublicProfile } from "../backend";
import FollowButton from "../components/FollowButton";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetFollowerCount, useGetPublicProfiles } from "../hooks/useQueries";

// ─── Individual user row with follower count ──────────────────────────────────

function UserRow({
  profile,
  index,
}: {
  profile: PublicProfile;
  index: number;
}) {
  const { data: followerCount } = useGetFollowerCount(profile.principal);

  return (
    <div
      className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border/40 bg-card hover:bg-muted/20 transition-colors"
      data-ocid={`users.item.${index + 1}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar placeholder */}
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm select-none">
          {profile.alias.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground text-sm truncate">
            {profile.alias}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
              {followerCount !== undefined ? Number(followerCount) : "…"}{" "}
              följare
            </Badge>
          </div>
        </div>
      </div>
      <FollowButton
        targetPrincipal={profile.principal as Principal}
        targetAlias={profile.alias}
      />
    </div>
  );
}

// ─── Loading skeletons ────────────────────────────────────────────────────────

function UserRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border/40">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-7 w-16 rounded-full" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();
  const { data: profiles, isLoading, isError } = useGetPublicProfiles();
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = useMemo(() => {
    if (!profiles) return [];
    const term = searchTerm.trim().toLowerCase();
    if (!term) return profiles;
    return profiles.filter((p) => p.alias.toLowerCase().includes(term));
  }, [profiles, searchTerm]);

  return (
    <div className="container max-w-2xl mx-auto px-4 sm:px-6 py-10 md:py-16">
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-3 tracking-tight">
          Användare
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
          Hitta skribenter och följ dem för att se deras inlägg i ditt flöde.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Sök efter alias…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
          data-ocid="users.search_input"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3" data-ocid="users.loading_state">
          {[1, 2, 3, 4, 5].map((i) => (
            <UserRowSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div
          className="text-center py-12 text-destructive"
          data-ocid="users.error_state"
        >
          <p>Kunde inte hämta användare. Försök igen senare.</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && filtered.length === 0 && (
        <div className="text-center py-16" data-ocid="users.empty_state">
          <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Users className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground font-medium">
            {searchTerm.trim()
              ? "Inga användare hittades."
              : "Inga registrerade användare ännu."}
          </p>
          {searchTerm.trim() && (
            <p className="text-sm text-muted-foreground mt-1">
              Prova ett annat sökord.
            </p>
          )}
        </div>
      )}

      {/* User list */}
      {!isLoading && !isError && filtered.length > 0 && (
        <>
          <div className="space-y-2.5" data-ocid="users.list">
            {filtered.map((profile, idx) => (
              <UserRow
                key={profile.principal.toString()}
                profile={profile}
                index={idx}
              />
            ))}
          </div>
          {!isAuthenticated && (
            <p className="text-xs text-muted-foreground text-center mt-6">
              Logga in för att följa användare.
            </p>
          )}
          <p className="text-xs text-muted-foreground text-right mt-4">
            {filtered.length} av {(profiles ?? []).length} användare
          </p>
        </>
      )}
    </div>
  );
}
