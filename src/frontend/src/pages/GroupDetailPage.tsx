import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Crown,
  Globe,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Shield,
  ShieldOff,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserMinus,
  UserPlus,
  Users2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Post, PublicProfile } from "../backend";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetAllPublishedPosts,
  useGetCallerUserProfile,
  useGetPublicProfiles,
} from "../hooks/useQueries";
import {
  type Group,
  type GroupMember,
  addPostToGroupAsync,
  deleteGroupAsync,
  fetchAndSyncGroupsFromBackend,
  getGroup,
  getGroupRole,
  inviteToGroupAsync,
  isGroupMember,
  leaveGroupAsync,
  makeGroupModeratorAsync,
  removeGroupMemberAsync,
  removeGroupModeratorAsync,
  removePostFromGroupAsync,
} from "../lib/groupStorage";

// ─── Role badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: GroupMember["role"] }) {
  if (role === "owner")
    return (
      <Badge variant="default" className="gap-1 text-xs">
        <Crown className="h-3 w-3" /> Ägare
      </Badge>
    );
  if (role === "moderator")
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <Shield className="h-3 w-3" /> Moderator
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-xs">
      Medlem
    </Badge>
  );
}

// ─── Post card (slim) ─────────────────────────────────────────────────────────

function GroupPostCard({
  post,
  inMainFeed,
  canManage,
  groupId,
  actor,
  onRefresh,
}: {
  post: Post;
  inMainFeed: boolean;
  canManage: boolean;
  groupId: string;
  actor: ReturnType<typeof useActor>["actor"];
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const likeCount = Number(post.likedBy?.length ?? 0);
  const dislikeCount = Number(post.dislikedBy?.length ?? 0);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      const ok = await removePostFromGroupAsync(
        actor,
        groupId,
        post.id.toString(),
      );
      if (ok) {
        toast.success("Inlägget togs bort från gruppen.");
        onRefresh();
      } else {
        toast.error("Kunde inte ta bort inlägget från gruppen.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Okänt fel.";
      toast.error(msg);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Card className="border-border/40 hover:border-primary/20 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            className="flex-1 min-w-0 cursor-pointer text-left bg-transparent border-0 p-0"
            onClick={() => navigate({ to: `/post/${post.id}` })}
          >
            <CardTitle className="text-base hover:text-primary transition-colors line-clamp-2">
              {post.title}
            </CardTitle>
            <CardDescription className="mt-0.5 text-xs">
              av {post.author}
            </CardDescription>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            {inMainFeed && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Globe className="h-3 w-3" /> Huvudflöde
              </Badge>
            )}
            {canManage && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                onClick={handleRemove}
                disabled={isRemoving}
                title="Ta bort från grupp"
              >
                {isRemoving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ThumbsUp className="h-3.5 w-3.5 text-amber-500" />
            {likeCount}
          </span>
          <span className="flex items-center gap-1">
            <ThumbsDown className="h-3.5 w-3.5 text-purple-500" />
            {dislikeCount}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Add post to group dialog ─────────────────────────────────────────────────

function AddPostDialog({
  group,
  myPosts,
  currentPrincipal,
  actor,
  onRefresh,
}: {
  group: Group;
  myPosts: Post[];
  currentPrincipal: string;
  actor: ReturnType<typeof useActor>["actor"];
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [inMainFeed, setInMainFeed] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const availablePosts = myPosts.filter(
    (p) =>
      p.ownerId.toString() === currentPrincipal &&
      !group.postIds.includes(p.id.toString()),
  );

  const handleAdd = async () => {
    if (!selectedPostId) {
      toast.error("Välj ett inlägg.");
      return;
    }
    setIsPending(true);
    try {
      const ok = await addPostToGroupAsync(
        actor,
        group.id,
        selectedPostId,
        inMainFeed,
      );
      if (ok) {
        toast.success("Inlägget lades till i gruppen!");
        setSelectedPostId("");
        setInMainFeed(false);
        setOpen(false);
        onRefresh();
      } else {
        toast.error("Kunde inte lägga till inlägget.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Okänt fel.";
      toast.error(msg);
    } finally {
      setIsPending(false);
    }
  };

  if (availablePosts.length === 0) return null;

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-2"
        data-ocid="group_detail.posts.open_modal_button"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Lägg till inlägg
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lägg till inlägg i gruppen</DialogTitle>
            <DialogDescription>
              Välj ett av dina publicerade inlägg att dela med gruppen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Välj inlägg</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={selectedPostId}
                onChange={(e) => setSelectedPostId(e.target.value)}
                disabled={isPending}
                data-ocid="group_detail.posts.select"
              >
                <option value="">-- Välj ett inlägg --</option>
                {availablePosts.map((p) => (
                  <option key={p.id.toString()} value={p.id.toString()}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
              <div>
                <Label className="text-sm font-medium cursor-pointer">
                  Visa i huvudflödet
                </Label>
                <p className="text-xs text-muted-foreground">
                  Inlägget syns även för alla i det vanliga flödet
                </p>
              </div>
              <Switch
                checked={inMainFeed}
                onCheckedChange={setInMainFeed}
                disabled={isPending}
                data-ocid="group_detail.posts.mainfeed.switch"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
              data-ocid="group_detail.posts.cancel_button"
            >
              Avbryt
            </Button>
            <Button
              onClick={handleAdd}
              disabled={isPending}
              data-ocid="group_detail.posts.submit_button"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Lägger till...
                </>
              ) : (
                "Lägg till"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Invite member section ────────────────────────────────────────────────────

function InviteMemberSection({
  group,
  publicProfiles,
  actor,
  onRefresh,
}: {
  group: Group;
  publicProfiles: PublicProfile[];
  actor: ReturnType<typeof useActor>["actor"];
  onRefresh: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return publicProfiles.filter(
      (p) =>
        p.alias.toLowerCase().includes(term) &&
        !group.members.some((m) => m.principal === p.principal.toString()),
    );
  }, [searchTerm, publicProfiles, group.members]);

  const handleInvite = async (profile: PublicProfile) => {
    const principalStr = profile.principal.toString();
    setInvitingId(principalStr);
    try {
      const ok = await inviteToGroupAsync(
        actor,
        group.id,
        principalStr,
        profile.alias,
      );
      if (ok) {
        toast.success(`${profile.alias} bjöds in till gruppen!`);
        setSearchTerm("");
        onRefresh();
      } else {
        toast.error(`Kunde inte bjuda in ${profile.alias}.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Okänt fel.";
      toast.error(msg);
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <div className="mt-4">
      <Separator className="mb-4" />
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <UserPlus className="h-4 w-4" />
        Bjud in användare
      </h4>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Sök efter alias..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
          data-ocid="group_detail.invite.search_input"
        />
      </div>
      {filtered.length > 0 && (
        <div className="mt-2 space-y-1.5 border border-border/40 rounded-lg overflow-hidden">
          {filtered.slice(0, 8).map((profile) => {
            const principalStr = profile.principal.toString();
            const isInviting = invitingId === principalStr;
            return (
              <div
                key={principalStr}
                className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {profile.alias.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm truncate">{profile.alias}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs shrink-0"
                  onClick={() => handleInvite(profile)}
                  disabled={isInviting}
                  data-ocid="group_detail.invite.button"
                >
                  {isInviting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Bjud in"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GroupDetailPage() {
  const { id } = useParams({ from: "/groups/$id" });
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  useGetCallerUserProfile();
  const { data: allPosts = [] } = useGetAllPublishedPosts();
  const { data: publicProfiles = [] } = useGetPublicProfiles();
  const { actor, isFetching: actorFetching } = useActor();

  const currentPrincipal = identity?.getPrincipal().toString() ?? "";

  const [refreshTick, setRefreshTick] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [confirmDeleteGroupOpen, setConfirmDeleteGroupOpen] = useState(false);
  const [modActionId, setModActionId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const refresh = () => setRefreshTick((t) => t + 1);
  void refreshTick;

  // Sync from backend on mount when actor becomes available
  useEffect(() => {
    if (!actor || actorFetching) return;
    setIsSyncing(true);
    fetchAndSyncGroupsFromBackend(actor)
      .then(() => setRefreshTick((t) => t + 1))
      .catch(() => {
        // silently ignore sync errors
      })
      .finally(() => setIsSyncing(false));
  }, [actor, actorFetching]);

  // Read group fresh on each render
  const group = getGroup(id);

  const isMember = group ? isGroupMember(id, currentPrincipal) : false;
  const myRole = group ? getGroupRole(id, currentPrincipal) : null;
  const isOwner = myRole === "owner";
  const canManage = myRole === "owner" || myRole === "moderator";

  if (!group) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        {isSyncing ? (
          <div
            className="flex flex-col items-center gap-4 text-muted-foreground"
            data-ocid="group_detail.loading_state"
          >
            <RefreshCw className="h-8 w-8 animate-spin opacity-50" />
            <p>Laddar gruppinformation...</p>
          </div>
        ) : (
          <>
            <Alert variant="destructive" data-ocid="group_detail.error_state">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Gruppen hittades inte. Den kan ha blivit raderad.
              </AlertDescription>
            </Alert>
            <Button
              variant="ghost"
              className="mt-6 gap-2"
              onClick={() => navigate({ to: "/groups" })}
              data-ocid="group_detail.back.button"
            >
              <ArrowLeft className="h-4 w-4" /> Tillbaka till grupper
            </Button>
          </>
        )}
      </div>
    );
  }

  if (group.visibility === "private" && !isMember) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <h2 className="text-xl font-serif font-bold mb-2">Privat grupp</h2>
        <p className="text-muted-foreground">
          Du måste vara inbjuden för att se detta.
        </p>
        <Button
          variant="ghost"
          className="mt-6 gap-2"
          onClick={() => navigate({ to: "/groups" })}
          data-ocid="group_detail.back.button"
        >
          <ArrowLeft className="h-4 w-4" /> Tillbaka till grupper
        </Button>
      </div>
    );
  }

  // Posts in this group
  const groupPosts = allPosts.filter((p) =>
    group.postIds.includes(p.id.toString()),
  );

  // My own published posts (for adding to group)
  const myPublishedPosts = allPosts.filter(
    (p) => p.ownerId.toString() === currentPrincipal,
  );

  const handleLeave = async () => {
    setIsLeaving(true);
    try {
      const ok = await leaveGroupAsync(actor, id, currentPrincipal);
      if (ok) {
        toast.success(`Du lämnade gruppen "${group.name}".`);
        navigate({ to: "/groups" });
      } else {
        toast.error("Kunde inte lämna gruppen.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Okänt fel.";
      toast.error(msg);
    } finally {
      setIsLeaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    setIsDeletingGroup(true);
    try {
      const ok = await deleteGroupAsync(actor, id);
      if (ok) {
        toast.success(`Gruppen "${group.name}" raderades.`);
        navigate({ to: "/groups" });
      } else {
        toast.error("Kunde inte radera gruppen.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Okänt fel.";
      toast.error(msg);
    } finally {
      setIsDeletingGroup(false);
    }
  };

  const handleMakeMod = async (principal: string, alias: string) => {
    setModActionId(principal);
    try {
      const ok = await makeGroupModeratorAsync(actor, id, principal);
      if (ok) {
        toast.success(`${alias} är nu moderator.`);
        refresh();
      } else {
        toast.error("Kunde inte ändra rollen.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Okänt fel.";
      toast.error(msg);
    } finally {
      setModActionId(null);
    }
  };

  const handleRemoveMod = async (principal: string, alias: string) => {
    setModActionId(principal);
    try {
      const ok = await removeGroupModeratorAsync(actor, id, principal);
      if (ok) {
        toast.success(`${alias} är inte längre moderator.`);
        refresh();
      } else {
        toast.error("Kunde inte ändra rollen.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Okänt fel.";
      toast.error(msg);
    } finally {
      setModActionId(null);
    }
  };

  const handleRemoveMember = async (principal: string, alias: string) => {
    setRemovingMemberId(principal);
    try {
      const ok = await removeGroupMemberAsync(actor, id, principal);
      if (ok) {
        toast.success(`${alias} togs bort från gruppen.`);
        refresh();
      } else {
        toast.error("Kunde inte ta bort medlemmen.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Okänt fel.";
      toast.error(msg);
    } finally {
      setRemovingMemberId(null);
    }
  };

  return (
    <div className="container max-w-3xl mx-auto px-4 sm:px-6 py-10 md:py-16">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-6 gap-2 -ml-2 text-muted-foreground hover:text-foreground"
        onClick={() => navigate({ to: "/groups" })}
        data-ocid="group_detail.back.button"
      >
        <ArrowLeft className="h-4 w-4" />
        Tillbaka till grupper
      </Button>

      {/* Group header */}
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-3xl font-serif font-bold tracking-tight">
              {group.name}
            </h2>
            <Badge
              variant={group.visibility === "public" ? "secondary" : "outline"}
              className="gap-1"
            >
              {group.visibility === "public" ? (
                <>
                  <Globe className="h-3 w-3" /> Publik
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3" /> Privat
                </>
              )}
            </Badge>
          </div>
          {group.description && (
            <p className="text-muted-foreground text-sm max-w-lg">
              {group.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Users2 className="h-3.5 w-3.5" />
            {group.members.length} medlemmar
            {isSyncing && (
              <RefreshCw className="h-3 w-3 ml-1 animate-spin opacity-50" />
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isMember && !isOwner && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive gap-2"
              onClick={handleLeave}
              disabled={isLeaving}
              data-ocid="group_detail.leave.button"
            >
              {isLeaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserMinus className="h-4 w-4" />
              )}
              {isLeaving ? "Lämnar..." : "Lämna grupp"}
            </Button>
          )}
          {isOwner && (
            <>
              <AlertDialog
                open={confirmDeleteGroupOpen}
                onOpenChange={setConfirmDeleteGroupOpen}
              >
                <AlertDialogContent data-ocid="group_detail.delete.dialog">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Radera grupp?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Är du säker på att du vill radera gruppen{" "}
                      <strong>"{group.name}"</strong>? Alla medlemmar kommer
                      förlora åtkomsten och åtgärden kan inte ångras.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-ocid="group_detail.delete.cancel_button">
                      Avbryt
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteGroup}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      data-ocid="group_detail.delete.confirm_button"
                    >
                      {isDeletingGroup ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Raderar...
                        </>
                      ) : (
                        "Radera grupp"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={() => setConfirmDeleteGroupOpen(true)}
                disabled={isDeletingGroup}
                data-ocid="group_detail.delete.button"
              >
                {isDeletingGroup ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {isDeletingGroup ? "Raderar..." : "Radera grupp"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="posts">
        <TabsList className="mb-6 w-full sm:w-auto">
          <TabsTrigger
            value="posts"
            className="flex-1 sm:flex-none gap-2"
            data-ocid="group_detail.posts.tab"
          >
            Inlägg ({groupPosts.length})
          </TabsTrigger>
          <TabsTrigger
            value="members"
            className="flex-1 sm:flex-none gap-2"
            data-ocid="group_detail.members.tab"
          >
            Medlemmar ({group.members.length})
          </TabsTrigger>
        </TabsList>

        {/* Posts tab */}
        <TabsContent value="posts">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">Gruppens inlägg</h3>
            {isMember && myPublishedPosts.length > 0 && (
              <AddPostDialog
                group={group}
                myPosts={myPublishedPosts}
                currentPrincipal={currentPrincipal}
                actor={actor}
                onRefresh={refresh}
              />
            )}
          </div>

          {groupPosts.length === 0 ? (
            <div
              className="text-center py-12 text-muted-foreground border-2 border-dashed border-border/40 rounded-xl"
              data-ocid="group_detail.posts.empty_state"
            >
              <p className="font-medium">Inga inlägg i gruppen ännu.</p>
              {isMember && myPublishedPosts.length > 0 && (
                <p className="text-sm mt-1">
                  Lägg till dina publicerade inlägg med knappen ovan.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {groupPosts.map((post) => (
                <GroupPostCard
                  key={post.id.toString()}
                  post={post}
                  inMainFeed={group.inMainFeedPostIds.includes(
                    post.id.toString(),
                  )}
                  canManage={
                    canManage || post.ownerId.toString() === currentPrincipal
                  }
                  groupId={id}
                  actor={actor}
                  onRefresh={refresh}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Members tab */}
        <TabsContent value="members">
          <div className="space-y-2.5">
            {group.members.map((member) => {
              const isMe = member.principal === currentPrincipal;
              const memberIsOwner = member.role === "owner";
              const isModActing = modActionId === member.principal;
              const isRemovingMember = removingMemberId === member.principal;
              return (
                <div
                  key={member.principal}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/40 bg-card hover:bg-muted/10 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                      {member.alias.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.alias}{" "}
                        {isMe && (
                          <span className="text-xs text-muted-foreground">
                            (dig)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <RoleBadge role={member.role} />
                    {canManage && !memberIsOwner && !isMe && (
                      <>
                        {member.role === "moderator" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() =>
                              handleRemoveMod(member.principal, member.alias)
                            }
                            disabled={isModActing}
                            title="Ta bort moderator"
                            data-ocid="group_detail.members.toggle"
                          >
                            {isModActing ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ShieldOff className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        ) : isOwner ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() =>
                              handleMakeMod(member.principal, member.alias)
                            }
                            disabled={isModActing}
                            title="Gör till moderator"
                            data-ocid="group_detail.members.toggle"
                          >
                            {isModActing ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Shield className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-destructive hover:bg-destructive/10"
                          onClick={() =>
                            handleRemoveMember(member.principal, member.alias)
                          }
                          disabled={isRemovingMember}
                          title="Ta bort från grupp"
                          data-ocid="group_detail.members.delete_button"
                        >
                          {isRemovingMember ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserMinus className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Invite section — only for owner/moderator */}
          {canManage && (
            <InviteMemberSection
              group={group}
              publicProfiles={publicProfiles}
              actor={actor}
              onRefresh={refresh}
            />
          )}

          {/* Non-member alias hint */}
          {!isMember && (
            <p className="text-xs text-center text-muted-foreground mt-6">
              Gå med i gruppen för att se fullständig information.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
