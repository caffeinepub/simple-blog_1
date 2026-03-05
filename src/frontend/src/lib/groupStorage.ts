// ─── Group Storage (localStorage-based) ──────────────────────────────────────
// Groups are stored in localStorage since the backend does not have a groups API.
// Key: "hklo_groups"

const STORAGE_KEY = "hklo_groups";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GroupVisibility = "public" | "private";
export type GroupMemberRole = "owner" | "moderator" | "member";

export interface GroupMember {
  principal: string;
  alias: string;
  role: GroupMemberRole;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  visibility: GroupVisibility;
  ownerId: string;
  members: GroupMember[];
  postIds: string[];
  /** Post IDs that are also visible in the main feed */
  inMainFeedPostIds: string[];
  createdAt: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readAll(): Group[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Group[];
  } catch {
    return [];
  }
}

function writeAll(groups: Group[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export function getAllGroups(): Group[] {
  return readAll();
}

export function getMyGroups(principalStr: string): Group[] {
  return readAll().filter((g) =>
    g.members.some((m) => m.principal === principalStr),
  );
}

export function getPublicGroups(): Group[] {
  return readAll().filter((g) => g.visibility === "public");
}

export function getGroup(id: string): Group | undefined {
  return readAll().find((g) => g.id === id);
}

export function createGroup(
  name: string,
  description: string,
  visibility: GroupVisibility,
  ownerPrincipal: string,
  ownerAlias: string,
): Group {
  const group: Group = {
    id: generateId(),
    name,
    description,
    visibility,
    ownerId: ownerPrincipal,
    members: [{ principal: ownerPrincipal, alias: ownerAlias, role: "owner" }],
    postIds: [],
    inMainFeedPostIds: [],
    createdAt: Date.now(),
  };
  const all = readAll();
  all.push(group);
  writeAll(all);
  return group;
}

export function deleteGroup(id: string): void {
  const all = readAll().filter((g) => g.id !== id);
  writeAll(all);
}

export function joinGroup(
  id: string,
  principalStr: string,
  alias: string,
): void {
  const all = readAll();
  const idx = all.findIndex((g) => g.id === id);
  if (idx === -1) return;
  const group = all[idx];
  if (group.members.some((m) => m.principal === principalStr)) return;
  group.members.push({ principal: principalStr, alias, role: "member" });
  writeAll(all);
}

export function leaveGroup(id: string, principalStr: string): void {
  const all = readAll();
  const idx = all.findIndex((g) => g.id === id);
  if (idx === -1) return;
  const group = all[idx];
  // Owner cannot leave — they must delete the group
  if (group.ownerId === principalStr) return;
  group.members = group.members.filter((m) => m.principal !== principalStr);
  writeAll(all);
}

export function inviteToGroup(
  id: string,
  targetPrincipal: string,
  targetAlias: string,
): void {
  joinGroup(id, targetPrincipal, targetAlias);
}

export function makeGroupModerator(id: string, targetPrincipal: string): void {
  const all = readAll();
  const idx = all.findIndex((g) => g.id === id);
  if (idx === -1) return;
  const member = all[idx].members.find((m) => m.principal === targetPrincipal);
  if (member && member.role !== "owner") {
    member.role = "moderator";
  }
  writeAll(all);
}

export function removeGroupModerator(
  id: string,
  targetPrincipal: string,
): void {
  const all = readAll();
  const idx = all.findIndex((g) => g.id === id);
  if (idx === -1) return;
  const member = all[idx].members.find((m) => m.principal === targetPrincipal);
  if (member && member.role === "moderator") {
    member.role = "member";
  }
  writeAll(all);
}

export function removeGroupMember(id: string, targetPrincipal: string): void {
  const all = readAll();
  const idx = all.findIndex((g) => g.id === id);
  if (idx === -1) return;
  const group = all[idx];
  if (group.ownerId === targetPrincipal) return; // cannot remove owner
  group.members = group.members.filter((m) => m.principal !== targetPrincipal);
  writeAll(all);
}

export function addPostToGroup(
  id: string,
  postId: string,
  inMainFeed: boolean,
): void {
  const all = readAll();
  const idx = all.findIndex((g) => g.id === id);
  if (idx === -1) return;
  const group = all[idx];
  if (!group.postIds.includes(postId)) {
    group.postIds.push(postId);
  }
  if (inMainFeed && !group.inMainFeedPostIds.includes(postId)) {
    group.inMainFeedPostIds.push(postId);
  }
  if (!inMainFeed) {
    group.inMainFeedPostIds = group.inMainFeedPostIds.filter(
      (pid) => pid !== postId,
    );
  }
  writeAll(all);
}

export function removePostFromGroup(id: string, postId: string): void {
  const all = readAll();
  const idx = all.findIndex((g) => g.id === id);
  if (idx === -1) return;
  const group = all[idx];
  group.postIds = group.postIds.filter((pid) => pid !== postId);
  group.inMainFeedPostIds = group.inMainFeedPostIds.filter(
    (pid) => pid !== postId,
  );
  writeAll(all);
}

export function isGroupMember(id: string, principalStr: string): boolean {
  const group = getGroup(id);
  if (!group) return false;
  return group.members.some((m) => m.principal === principalStr);
}

export function getGroupRole(
  id: string,
  principalStr: string,
): GroupMemberRole | null {
  const group = getGroup(id);
  if (!group) return null;
  const member = group.members.find((m) => m.principal === principalStr);
  return member?.role ?? null;
}
