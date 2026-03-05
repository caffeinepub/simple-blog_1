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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "@tanstack/react-router";
import { Globe, Lock, Plus, Trash2, Users2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "../hooks/useQueries";
import {
  type Group,
  createGroup,
  deleteGroup,
  getAllGroups,
  getPublicGroups,
  isGroupMember,
  joinGroup,
} from "../lib/groupStorage";

// ─── Create Group Dialog ──────────────────────────────────────────────────────

function CreateGroupDialog({
  onCreated,
  currentPrincipal,
  currentAlias,
}: {
  onCreated: () => void;
  currentPrincipal: string;
  currentAlias: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Gruppnamn krävs.");
      return;
    }
    createGroup(
      name.trim(),
      description.trim(),
      isPrivate ? "private" : "public",
      currentPrincipal,
      currentAlias || "Anonym",
    );
    toast.success(`Gruppen "${name.trim()}" skapades!`);
    setName("");
    setDescription("");
    setIsPrivate(false);
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-ocid="groups.create.open_modal_button">
          <Plus className="h-4 w-4" />
          Skapa grupp
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            Skapa ny grupp
          </DialogTitle>
          <DialogDescription>
            Skapa en grupp och bjud in andra användare via deras alias.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="group-name">Gruppnamn</Label>
            <Input
              id="group-name"
              placeholder="Ange ett gruppnamn..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-ocid="groups.create.name.input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-description">Beskrivning (valfritt)</Label>
            <Textarea
              id="group-description"
              placeholder="Beskriv vad gruppen handlar om..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              data-ocid="groups.create.description.textarea"
            />
          </div>

          <div
            className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20"
            data-ocid="groups.create.visibility.select"
          >
            <div className="space-y-0.5">
              <Label className="text-sm font-medium cursor-pointer">
                {isPrivate ? (
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" /> Privat grupp
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" /> Publik grupp
                  </span>
                )}
              </Label>
              <p className="text-xs text-muted-foreground">
                {isPrivate
                  ? "Endast inbjudna medlemmar kan se innehållet"
                  : "Alla kan hitta och gå med i gruppen"}
              </p>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            data-ocid="groups.create.cancel_button"
          >
            Avbryt
          </Button>
          <Button
            onClick={handleCreate}
            data-ocid="groups.create.submit_button"
          >
            Skapa grupp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Group Card ───────────────────────────────────────────────────────────────

function GroupCard({
  group,
  index,
  currentPrincipal,
  currentAlias,
  onRefresh,
}: {
  group: Group;
  index: number;
  currentPrincipal: string;
  currentAlias: string;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const isMember = isGroupMember(group.id, currentPrincipal);
  const isOwner = group.ownerId === currentPrincipal;

  const handleJoin = () => {
    joinGroup(group.id, currentPrincipal, currentAlias || "Anonym");
    toast.success(`Du gick med i gruppen "${group.name}"!`);
    onRefresh();
  };

  const handleDelete = () => {
    deleteGroup(group.id);
    toast.success(`Gruppen "${group.name}" raderades.`);
    onRefresh();
  };

  return (
    <Card
      className="border-border/40 hover:border-primary/30 transition-colors"
      data-ocid={`groups.item.${index + 1}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base font-semibold truncate">
              {group.name}
            </CardTitle>
            {group.description && (
              <CardDescription className="mt-1 text-sm line-clamp-2">
                {group.description}
              </CardDescription>
            )}
          </div>
          <Badge
            variant={group.visibility === "public" ? "secondary" : "outline"}
            className="shrink-0 gap-1 text-xs"
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
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users2 className="h-4 w-4" />
            <span>{group.members.length} medlemmar</span>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                onClick={handleDelete}
                data-ocid={`groups.item.delete_button.${index + 1}`}
                title="Radera grupp"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {isMember ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate({ to: `/groups/${group.id}` })}
                data-ocid={`groups.item.view_button.${index + 1}`}
              >
                Visa grupp
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleJoin}
                data-ocid={`groups.item.join_button.${index + 1}`}
              >
                Gå med
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GroupsPage() {
  const { identity } = useInternetIdentity();
  const { data: userProfile } = useGetCallerUserProfile();
  const currentPrincipal = identity?.getPrincipal().toString() ?? "";
  const currentAlias = userProfile?.name?.trim() ?? "";

  // Force re-render when groups change
  const [refreshTick, setRefreshTick] = useState(0);
  const refresh = () => setRefreshTick((t) => t + 1);

  // Read groups fresh on each render/refresh
  const allGroups = getAllGroups();
  const myGroups = allGroups.filter((g) =>
    g.members.some((m) => m.principal === currentPrincipal),
  );
  const publicGroups = getPublicGroups().filter(
    (g) => !g.members.some((m) => m.principal === currentPrincipal),
  );

  // Suppress lint warning about refreshTick — it drives re-reads
  void refreshTick;

  return (
    <div className="container max-w-3xl mx-auto px-4 sm:px-6 py-10 md:py-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground tracking-tight">
            Grupper
          </h2>
          <p className="text-muted-foreground mt-1">
            Skapa och gå med i grupper för att dela inlägg med utvalda
            användare.
          </p>
        </div>
        <CreateGroupDialog
          onCreated={refresh}
          currentPrincipal={currentPrincipal}
          currentAlias={currentAlias}
        />
      </div>

      {/* My groups */}
      <section className="mb-10">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users2 className="h-5 w-5 text-primary" />
          Mina grupper
          {myGroups.length > 0 && (
            <Badge variant="secondary">{myGroups.length}</Badge>
          )}
        </h3>

        {myGroups.length === 0 ? (
          <div
            className="text-center py-10 text-muted-foreground border-2 border-dashed border-border/40 rounded-xl"
            data-ocid="groups.my.empty_state"
          >
            <Users2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Du är inte med i några grupper ännu.</p>
            <p className="text-sm mt-1">
              Skapa en ny grupp eller gå med i en publik grupp.
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-ocid="groups.list">
            {myGroups.map((group, idx) => (
              <GroupCard
                key={group.id}
                group={group}
                index={idx}
                currentPrincipal={currentPrincipal}
                currentAlias={currentAlias}
                onRefresh={refresh}
              />
            ))}
          </div>
        )}
      </section>

      {/* Public groups */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Publika grupper
          {publicGroups.length > 0 && (
            <Badge variant="secondary">{publicGroups.length}</Badge>
          )}
        </h3>

        {publicGroups.length === 0 ? (
          <div
            className="text-center py-10 text-muted-foreground border-2 border-dashed border-border/40 rounded-xl"
            data-ocid="groups.public.empty_state"
          >
            <Globe className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Inga publika grupper hittades.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {publicGroups.map((group, idx) => (
              <GroupCard
                key={group.id}
                group={group}
                index={myGroups.length + idx}
                currentPrincipal={currentPrincipal}
                currentAlias={currentAlias}
                onRefresh={refresh}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
