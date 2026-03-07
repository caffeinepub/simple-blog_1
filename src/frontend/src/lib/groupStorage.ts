// ─── Group Storage ────────────────────────────────────────────────────────────
// Groups are cached in localStorage and synced with the backend canister.
// Sync functions are async and accept the actor as a parameter.
// Key: "hklo_groups"

import { Principal } from "@dfinity/principal";
import type {
  Group as BackendGroup,
  GroupMember as BackendGroupMember,
  GroupPostEntry as BackendGroupPostEntry,
  backendInterface,
} from "../backend";

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

// ─── Backend type converters ──────────────────────────────────────────────────

function backendRoleToLocal(role: BackendGroupMember["role"]): GroupMemberRole {
  if (role === "owner") return "owner";
  if (role === "moderator") return "moderator";
  return "member";
}

function backendVisibilityToLocal(
  visibility: BackendGroup["visibility"],
): GroupVisibility {
  // The enum value for GroupVisibility.public_ is the string "public"
  return (visibility as string) === "public" ? "public" : "private";
}

function backendGroupToLocal(
  backendGroup: BackendGroup,
  members: BackendGroupMember[],
  posts: BackendGroupPostEntry[],
): Group {
  const localMembers: GroupMember[] = members.map((m) => ({
    principal: m.userPrincipal.toString(),
    alias: m.alias || m.userPrincipal.toString().slice(0, 8),
    role: backendRoleToLocal(m.role),
  }));

  const postIds = posts.map((p) => p.postId);
  const inMainFeedPostIds = posts
    .filter((p) => p.inMainFeed)
    .map((p) => p.postId);

  return {
    id: backendGroup.id,
    name: backendGroup.name,
    description: backendGroup.description,
    visibility: backendVisibilityToLocal(backendGroup.visibility),
    ownerId: backendGroup.ownerId.toString(),
    members: localMembers,
    postIds,
    inMainFeedPostIds,
    createdAt: Number(backendGroup.createdAt) / 1_000_000, // nanoseconds → ms
  };
}

// ─── CRUD (sync localStorage) ─────────────────────────────────────────────────

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

// ─── Async backend-integrated functions ──────────────────────────────────────
// All async functions accept the actor (backendInterface | null) as the first
// parameter. If actor is null, they fall back to the sync localStorage version.

/**
 * Fetch all groups the caller belongs to (plus public groups) from the backend
 * and merge them into the localStorage cache.
 */
export async function fetchAndSyncGroupsFromBackend(
  actor: backendInterface | null,
): Promise<void> {
  if (!actor) return;

  try {
    // Fetch caller groups and public groups in parallel
    const [callerGroups, publicGroupsList] = await Promise.all([
      actor.getAllGroupsForCaller().catch(() => [] as BackendGroup[]),
      actor.getPublicGroups().catch(() => [] as BackendGroup[]),
    ]);

    // Deduplicate by id
    const seen = new Set<string>();
    const allBackendGroups: BackendGroup[] = [];
    for (const g of [...callerGroups, ...publicGroupsList]) {
      if (!seen.has(g.id)) {
        seen.add(g.id);
        allBackendGroups.push(g);
      }
    }

    if (allBackendGroups.length === 0) return;

    // Fetch members and posts for each group in parallel
    const enriched = await Promise.all(
      allBackendGroups.map(async (bg) => {
        const [members, posts] = await Promise.all([
          actor.getGroupMembers(bg.id).catch(() => [] as BackendGroupMember[]),
          actor.getGroupPosts(bg.id).catch(() => [] as BackendGroupPostEntry[]),
        ]);
        return backendGroupToLocal(bg, members, posts);
      }),
    );

    // Merge backend data with existing localStorage data.
    // Backend is authoritative for group metadata and members, but we MERGE
    // post IDs to preserve any locally-optimistic addPostToGroup links that
    // haven't yet propagated to the backend (e.g. because the backend
    // addPostToGroup call failed or is still in-flight).
    const existing = readAll();
    const mergedGroups = enriched.map((backendGroup) => {
      const localGroup = existing.find((lg) => lg.id === backendGroup.id);
      if (localGroup) {
        // Union of backend post IDs and local post IDs
        const allPostIds = Array.from(
          new Set([...backendGroup.postIds, ...localGroup.postIds]),
        );
        const allMainFeedIds = Array.from(
          new Set([
            ...backendGroup.inMainFeedPostIds,
            ...localGroup.inMainFeedPostIds,
          ]),
        );
        return {
          ...backendGroup,
          postIds: allPostIds,
          inMainFeedPostIds: allMainFeedIds,
        };
      }
      return backendGroup;
    });
    writeAll(mergedGroups);
  } catch {
    // Silently fall back to localStorage — network or auth error
  }
}

/**
 * Create a group in the backend and cache it in localStorage.
 */
export async function createGroupAsync(
  actor: backendInterface | null,
  name: string,
  description: string,
  visibility: GroupVisibility,
  ownerPrincipal: string,
  ownerAlias: string,
): Promise<Group> {
  if (!actor) {
    return createGroup(
      name,
      description,
      visibility,
      ownerPrincipal,
      ownerAlias,
    );
  }

  const backendId = await actor.createGroup(
    name,
    description,
    visibility === "public",
  );

  // Build local representation
  const group: Group = {
    id: backendId,
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
  // Replace any optimistic local version, or just push
  const idx = all.findIndex((g) => g.id === backendId);
  if (idx !== -1) {
    all[idx] = group;
  } else {
    all.push(group);
  }
  writeAll(all);
  return group;
}

/**
 * Delete a group in the backend and remove it from localStorage cache.
 */
export async function deleteGroupAsync(
  actor: backendInterface | null,
  id: string,
): Promise<boolean> {
  if (!actor) {
    deleteGroup(id);
    return true;
  }

  const success = await actor.deleteGroup(id);
  if (success) {
    deleteGroup(id);
  }
  return success;
}

/**
 * Join a public group in the backend and update localStorage cache.
 */
export async function joinGroupAsync(
  actor: backendInterface | null,
  id: string,
  principalStr: string,
  alias: string,
): Promise<boolean> {
  if (!actor) {
    joinGroup(id, principalStr, alias);
    return true;
  }

  const success = await actor.joinGroup(id);
  if (success) {
    joinGroup(id, principalStr, alias);
  }
  return success;
}

/**
 * Leave a group in the backend and update localStorage cache.
 */
export async function leaveGroupAsync(
  actor: backendInterface | null,
  id: string,
  principalStr: string,
): Promise<boolean> {
  if (!actor) {
    leaveGroup(id, principalStr);
    return true;
  }

  const success = await actor.leaveGroup(id);
  if (success) {
    leaveGroup(id, principalStr);
  }
  return success;
}

/**
 * Invite a user to a group via the backend and update localStorage cache.
 */
export async function inviteToGroupAsync(
  actor: backendInterface | null,
  id: string,
  targetPrincipal: string,
  targetAlias: string,
): Promise<boolean> {
  if (!actor) {
    inviteToGroup(id, targetPrincipal, targetAlias);
    return true;
  }

  const principal = Principal.fromText(targetPrincipal);
  const success = await actor.inviteToGroup(id, principal);
  if (success) {
    inviteToGroup(id, targetPrincipal, targetAlias);
  }
  return success;
}

/**
 * Promote a group member to moderator in the backend and update localStorage cache.
 */
export async function makeGroupModeratorAsync(
  actor: backendInterface | null,
  id: string,
  targetPrincipal: string,
): Promise<boolean> {
  if (!actor) {
    makeGroupModerator(id, targetPrincipal);
    return true;
  }

  const principal = Principal.fromText(targetPrincipal);
  const success = await actor.setGroupModerator(id, principal);
  if (success) {
    makeGroupModerator(id, targetPrincipal);
  }
  return success;
}

/**
 * Remove moderator role from a group member in the backend and update localStorage cache.
 */
export async function removeGroupModeratorAsync(
  actor: backendInterface | null,
  id: string,
  targetPrincipal: string,
): Promise<boolean> {
  if (!actor) {
    removeGroupModerator(id, targetPrincipal);
    return true;
  }

  const principal = Principal.fromText(targetPrincipal);
  const success = await actor.removeGroupModerator(id, principal);
  if (success) {
    removeGroupModerator(id, targetPrincipal);
  }
  return success;
}

/**
 * Remove a member from a group in the backend and update localStorage cache.
 */
export async function removeGroupMemberAsync(
  actor: backendInterface | null,
  id: string,
  targetPrincipal: string,
): Promise<boolean> {
  if (!actor) {
    removeGroupMember(id, targetPrincipal);
    return true;
  }

  const principal = Principal.fromText(targetPrincipal);
  const success = await actor.removeGroupMember(id, principal);
  if (success) {
    removeGroupMember(id, targetPrincipal);
  }
  return success;
}

/**
 * Add a post to a group in the backend and update localStorage cache.
 *
 * Always writes to localStorage first (optimistic update) so the post-to-group
 * link is visible in GroupDetailPage even before the backend call completes.
 * If the backend call fails, localStorage is left intact and the error is
 * re-thrown so the caller can show a warning.
 */
export async function addPostToGroupAsync(
  actor: backendInterface | null,
  id: string,
  postId: string,
  inMainFeed: boolean,
): Promise<boolean> {
  // Always update localStorage immediately (optimistic write).
  // This ensures the post appears in GroupDetailPage even if the backend call
  // is slow or fails — and survives the next sync if the group already has
  // the post link merged in (see fetchAndSyncGroupsFromBackend merge logic).
  addPostToGroup(id, postId, inMainFeed);

  if (!actor) {
    return true;
  }

  // Best-effort backend call — re-throw so callers can show a warning toast.
  const success = await actor.addPostToGroup(id, postId, inMainFeed);
  return success;
}

/**
 * Remove a post from a group in the backend and update localStorage cache.
 */
export async function removePostFromGroupAsync(
  actor: backendInterface | null,
  id: string,
  postId: string,
): Promise<boolean> {
  if (!actor) {
    removePostFromGroup(id, postId);
    return true;
  }

  const success = await actor.removePostFromGroup(id, postId);
  if (success) {
    removePostFromGroup(id, postId);
  }
  return success;
}

/**
 * Update the visibility of a group (public ↔ private) in the backend
 * and sync the change to localStorage cache.
 */
export function updateGroupVisibilityLocal(
  id: string,
  visibility: GroupVisibility,
): void {
  const all = readAll();
  const idx = all.findIndex((g) => g.id === id);
  if (idx === -1) return;
  all[idx].visibility = visibility;
  writeAll(all);
}

export async function updateGroupVisibilityAsync(
  actor: backendInterface | null,
  id: string,
  newVisibility: GroupVisibility,
): Promise<boolean> {
  const group = getGroup(id);
  if (!group) return false;

  if (!actor) {
    updateGroupVisibilityLocal(id, newVisibility);
    return true;
  }

  const success = await actor.updateGroup(
    id,
    group.name,
    group.description,
    newVisibility === "public",
  );
  if (success) {
    updateGroupVisibilityLocal(id, newVisibility);
  }
  return success;
}
