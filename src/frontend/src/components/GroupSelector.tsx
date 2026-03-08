import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useActor } from "../hooks/useActor";
import {
  type Group,
  fetchAndSyncGroupsFromBackend,
  getAllGroups,
} from "../lib/groupStorage";

interface GroupSelectorProps {
  principalStr: string;
  selectedGroupIds: string[];
  onSelectionChange: (ids: string[], inMainFeed: boolean) => void;
}

export default function GroupSelector({
  principalStr,
  selectedGroupIds,
  onSelectionChange,
}: GroupSelectorProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [inMainFeed, setInMainFeed] = useState(false);
  // Start in syncing state so we show a loader before actor is ready,
  // preventing premature "no groups" renders while actor initializes.
  const [isSyncing, setIsSyncing] = useState(true);
  const { actor, isFetching: actorFetching } = useActor();

  // Sync groups from backend once actor is ready; fall back to localStorage.
  // We wait for actor to be non-null AND not still fetching before rendering
  // with stale/empty data — this prevents groups from appearing "gone" during
  // page reload.
  useEffect(() => {
    // If actor is still initializing, keep showing the loader
    if (actorFetching) {
      setIsSyncing(true);
      return;
    }

    if (!actor) {
      // Actor finished initializing but is null (not authenticated).
      // Fall back to whatever is in localStorage.
      setGroups(getAllGroups());
      setIsSyncing(false);
      return;
    }

    // Actor is ready — sync from backend before displaying groups.
    setIsSyncing(true);
    fetchAndSyncGroupsFromBackend(actor)
      .then(() => setGroups(getAllGroups()))
      .catch(() => setGroups(getAllGroups()))
      .finally(() => setIsSyncing(false));
  }, [actor, actorFetching]);

  // Split into member-accessible-private and all-public.
  // Show private groups where the user is a member (includes owner) — not just
  // groups they own. This ensures invited members can also publish to a group.
  const privateGroups = useMemo(
    () =>
      groups.filter(
        (g) =>
          g.visibility === "private" &&
          g.members.some((m) => m.principal === principalStr),
      ),
    [groups, principalStr],
  );

  const publicGroups = useMemo(
    () => groups.filter((g) => g.visibility === "public"),
    [groups],
  );

  // While syncing, show a subtle loader
  if (isSyncing) {
    return (
      <div className="p-4 bg-muted/30 rounded-lg border border-border/40 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Laddar grupper...
      </div>
    );
  }

  // If no groups available after sync, render nothing
  if (privateGroups.length === 0 && publicGroups.length === 0) {
    return null;
  }

  const toggleGroup = (id: string, checked: boolean) => {
    const next = checked
      ? [...selectedGroupIds, id]
      : selectedGroupIds.filter((gid) => gid !== id);
    onSelectionChange(next, inMainFeed);
  };

  const toggleMainFeed = (checked: boolean) => {
    setInMainFeed(checked);
    onSelectionChange(selectedGroupIds, checked);
  };

  const hasSelections = selectedGroupIds.length > 0;

  return (
    <div
      className="p-4 bg-muted/30 rounded-lg border border-border/40 space-y-4"
      data-ocid="group_selector.section"
    >
      {/* Heading */}
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Publicera mot grupper</span>
      </div>

      {/* Private groups */}
      {privateGroups.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wide">
            <Lock className="h-3 w-3" />
            <span>Privata grupper</span>
          </div>
          <div className="space-y-2 pl-1">
            {privateGroups.map((group) => (
              <div key={group.id} className="flex items-center gap-2">
                <Checkbox
                  id={`group-private-${group.id}`}
                  checked={selectedGroupIds.includes(group.id)}
                  onCheckedChange={(checked) =>
                    toggleGroup(group.id, checked === true)
                  }
                  data-ocid="group_selector.checkbox"
                />
                <Label
                  htmlFor={`group-private-${group.id}`}
                  className="text-sm cursor-pointer font-normal"
                >
                  {group.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Divider between sections when both exist */}
      {privateGroups.length > 0 && publicGroups.length > 0 && (
        <div className="border-t border-border/30" />
      )}

      {/* Public groups */}
      {publicGroups.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wide">
            <Users className="h-3 w-3" />
            <span>Publika grupper</span>
          </div>
          <div className="space-y-2 pl-1">
            {publicGroups.map((group) => (
              <div key={group.id} className="flex items-center gap-2">
                <Checkbox
                  id={`group-public-${group.id}`}
                  checked={selectedGroupIds.includes(group.id)}
                  onCheckedChange={(checked) =>
                    toggleGroup(group.id, checked === true)
                  }
                  data-ocid="group_selector.checkbox"
                />
                <Label
                  htmlFor={`group-public-${group.id}`}
                  className="text-sm cursor-pointer font-normal"
                >
                  {group.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main feed toggle — shown only when at least one group is selected */}
      {hasSelections && (
        <>
          <div className="border-t border-border/30" />
          <div className="flex items-center gap-2">
            <Checkbox
              id="group-main-feed"
              checked={inMainFeed}
              onCheckedChange={(checked) => toggleMainFeed(checked === true)}
              data-ocid="group_selector.main_feed.checkbox"
            />
            <Label
              htmlFor="group-main-feed"
              className="text-sm cursor-pointer font-normal"
            >
              Synlig i huvudflöde
            </Label>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            Inlägget publiceras enbart mot valda grupper
          </p>
        </>
      )}
    </div>
  );
}
