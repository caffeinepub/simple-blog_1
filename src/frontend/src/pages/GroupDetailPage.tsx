import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Lock,
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
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Post, PublicProfile } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetAllPublishedPosts,
  useGetCallerUserProfile,
  useGetPublicProfiles,
} from "../hooks/useQueries";
import {
  type Group,
  type GroupMember,
  addPostToGroup,
  deleteGroup,
  getGroup,
  getGroupRole,
  inviteToGroup,
  isGroupMember,
  leaveGroup,
  makeGroupModerator,
  removeGroupMember,
  removeGroupModerator,
  removePostFromGroup,
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
  onRefresh,
}: {
  post: Post;
  inMainFeed: boolean;
  canManage: boolean;
  groupId: string;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const likeCount = Number(post.likedBy?.length ?? 0);
  const dislikeCount = Number(post.dislikedBy?.length ?? 0);

  const handleRemove = () => {
    removePostFromGroup(groupId, post.id.toString());
    toast.success("Inlägget togs bort från gruppen.");
    onRefresh();
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
                title="Ta bort från grupp"
              >
                <Trash2 className="h-3.5 w-3.5" />
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
  onRefresh,
}: {
  group: Group;
  myPosts: Post[];
  currentPrincipal: string;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [inMainFeed, setInMainFeed] = useState(false);

  const availablePosts = myPosts.filter(
    (p) =>
      p.ownerId.toString() === currentPrincipal &&
      !group.postIds.includes(p.id.toString()),
  );

  const handleAdd = () => {
    if (!selectedPostId) {
      toast.error("Välj ett inlägg.");
      return;
    }
    addPostToGroup(group.id, selectedPostId, inMainFeed);
    toast.success("Inlägget lades till i gruppen!");
    setSelectedPostId("");
    setInMainFeed(false);
    setOpen(false);
    onRefresh();
  };

  if (availablePosts.length === 0) return null;

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-2"
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
              <Switch checked={inMainFeed} onCheckedChange={setInMainFeed} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleAdd}>Lägg till</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Invite member dialog ─────────────────────────────────────────────────────

function InviteMemberSection({
  group,
  publicProfiles,
  onRefresh,
}: {
  group: Group;
  publicProfiles: PublicProfile[];
  onRefresh: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return publicProfiles.filter(
      (p) =>
        p.alias.toLowerCase().includes(term) &&
        !group.members.some((m) => m.principal === p.principal.toString()),
    );
  }, [searchTerm, publicProfiles, group.members]);

  const handleInvite = (profile: PublicProfile) => {
    inviteToGroup(group.id, profile.principal.toString(), profile.alias);
    toast.success(`${profile.alias} bjöds in till gruppen!`);
    setSearchTerm("");
    onRefresh();
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
          {filtered.slice(0, 8).map((profile) => (
            <div
              key={profile.principal.toString()}
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
              >
                Bjud in
              </Button>
            </div>
          ))}
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

  const currentPrincipal = identity?.getPrincipal().toString() ?? "";

  const [refreshTick, setRefreshTick] = useState(0);
  const refresh = () => setRefreshTick((t) => t + 1);
  void refreshTick;

  // Read group fresh on each render
  const group = getGroup(id);

  const isMember = group ? isGroupMember(id, currentPrincipal) : false;
  const myRole = group ? getGroupRole(id, currentPrincipal) : null;
  const isOwner = myRole === "owner";
  const canManage = myRole === "owner" || myRole === "moderator";

  if (!group) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Gruppen hittades inte. Den kan ha blivit raderad.
          </AlertDescription>
        </Alert>
        <Button
          variant="ghost"
          className="mt-6 gap-2"
          onClick={() => navigate({ to: "/groups" })}
        >
          <ArrowLeft className="h-4 w-4" /> Tillbaka till grupper
        </Button>
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

  const handleLeave = () => {
    leaveGroup(id, currentPrincipal);
    toast.success(`Du lämnade gruppen "${group.name}".`);
    navigate({ to: "/groups" });
  };

  const handleDeleteGroup = () => {
    deleteGroup(id);
    toast.success(`Gruppen "${group.name}" raderades.`);
    navigate({ to: "/groups" });
  };

  const handleMakeMod = (principal: string, alias: string) => {
    makeGroupModerator(id, principal);
    toast.success(`${alias} är nu moderator.`);
    refresh();
  };

  const handleRemoveMod = (principal: string, alias: string) => {
    removeGroupModerator(id, principal);
    toast.success(`${alias} är inte längre moderator.`);
    refresh();
  };

  const handleRemoveMember = (principal: string, alias: string) => {
    removeGroupMember(id, principal);
    toast.success(`${alias} togs bort från gruppen.`);
    refresh();
  };

  return (
    <div className="container max-w-3xl mx-auto px-4 sm:px-6 py-10 md:py-16">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-6 gap-2 -ml-2 text-muted-foreground hover:text-foreground"
        onClick={() => navigate({ to: "/groups" })}
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
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isMember && !isOwner && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive gap-2"
              onClick={handleLeave}
              data-ocid="group_detail.leave.button"
            >
              <UserMinus className="h-4 w-4" />
              Lämna grupp
            </Button>
          )}
          {isOwner && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={handleDeleteGroup}
              data-ocid="group_detail.delete.button"
            >
              <Trash2 className="h-4 w-4" />
              Radera grupp
            </Button>
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
                            title="Ta bort moderator"
                          >
                            <ShieldOff className="h-3.5 w-3.5" />
                          </Button>
                        ) : isOwner ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() =>
                              handleMakeMod(member.principal, member.alias)
                            }
                            title="Gör till moderator"
                          >
                            <Shield className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-destructive hover:bg-destructive/10"
                          onClick={() =>
                            handleRemoveMember(member.principal, member.alias)
                          }
                          title="Ta bort från grupp"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
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
