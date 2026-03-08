# HKLO Blog – Reverse Engineering & Bug Fix Spec

## Current State

HKLO is a full-stack multi-author blog on ICP (Motoko + React). Current version (91) has these active features:
- Blog core: create/edit/delete posts and drafts, rich text, image uploads
- Groups: create, join, invite, moderator roles, public/private, visibility toggle
- Publish to group: GroupSelector in CreatePostPage and EditDraftPage
- Content moderation: frontend + backend rule-based filter
- Comments: add/edit/delete with emoji picker and images
- Notifications: in-app bell for comments and moderation events
- Admin panel: manage posts, authors, admins, moderation log
- User profiles: alias, follow/unfollow, follower counts
- Search: free-text + category + date range filter on home page
- Timeline magazine layout: hero, 2-column grid, sidebar, mobile collapsible sidebar
- Principal ID display on profile page

## Requested Changes (Diff)

### Add
- Nothing new – this is a bug fix pass only

### Modify

**Bug 1 (Critical) – Publicera utkast mot privat grupp fungerar inte**

Root cause: `GroupSelector` filters `privateGroups` as:
```
g.visibility === "private" && g.ownerId === principalStr
```
This only shows groups the user OWNS. But if the user is a MEMBER (not owner) of a private group, the group is never shown in the selector and cannot be chosen. A user who was invited to someone else's private group cannot publish to it.

Fix: Show private groups where `isMember(principalStr)` is true (includes owner + members). Keep public groups as-is.

**Bug 2 (Critical) – Publicera utkast navigerar aldrig om GroupSelector-synk väntar**

Root cause: In `EditDraftPage.handlePublish`, after `publishDraftMutation.mutateAsync(draft.id)`, `queryClient.invalidateQueries` is called immediately. Then `addPostToGroupAsync` is called. However `GroupDetailPage` reads groups from localStorage. The sync from backend happens on mount of GroupDetailPage – but the *post* is only in `allPosts` (React Query cache) after the invalidation refetch completes. If React Query hasn't refetched yet when GroupDetailPage mounts, `groupPosts` will be empty even though localStorage has the post ID.

Fix: In `GroupDetailPage`, when computing `groupPosts`, also check if the posts query is still loading. Show a spinner on the posts tab while loading rather than "Inga inlägg".

**Bug 3 (Medium) – GroupSelector i CreatePostPage skickar group-koppling när `published=false`**

Root cause: In `CreatePostPage.handleSubmit`, when `published=false`, `useCreatePost` calls `actor.saveDraft()` which returns a draft ID. The code then calls `addPostToGroupAsync(actor, groupId, postIdStr, ...)`. But `addPostToGroup` in backend expects a *published post* ID, not a draft ID. Adding a draft ID to a group's post list means the post will never appear in `groupPosts` (which filters against `allPosts` – published posts only).

Fix: When `published=false` and groups are selected, skip the `addPostToGroup` call. Instead show a toast: "Utkastet sparades. Välj grupp när du publicerar det." Groups should only be linked at publish time.

**Bug 4 (Medium) – EditDraftPage validateForm: tom author blockerar publicering för profil-alias-användare**

Root cause: `validateForm()` checks `!author.trim()`. But when `hasProfileAlias=true`, the `author` state stays at its initial empty string (it is never set from profile alias – `setAuthor` is only called in the `useEffect` that runs when draft loads). If the effect runs before `profileFetched`, `author` gets the profileAlias. But if `profileFetched` is late, `author` is still whatever `draft.author` is. The form should always use the effective alias.

Fix: In `validateForm`, use `effectiveAuthor = hasProfileAlias ? profileAlias : author.trim()` (same pattern as `CreatePostPage`). The condition `!author.trim()` should only apply when `!hasProfileAlias`.

**Bug 5 (Low) – Innehållsmoderering: backend är skiftlägeskänslig, HTML strippas inte i backend**

Root cause: `containsBlockedContent` in `main.mo` calls `text.contains(#text word)` which is case-sensitive. "Skit" passes where "skit" blocks. Also, the combined text sent includes raw Quill HTML (`<p>skit</p>`), but Motoko checks for plain "skit" in the HTML-wrapped string. Frontend moderation in `contentModeration.ts` does strip HTML and lowercases – so frontend catches it. But if someone bypasses the frontend, backend doesn't.

Note: This is a backend issue and cannot be fixed in frontend. The frontend `checkPostContent` already strips HTML and lowercases. No change needed unless we regenerate backend.

**Bug 6 (Low) – GroupSelector private groups filter är för strikt**

See Bug 1 above – same issue. Fix in GroupSelector component.

### Remove
- Nothing removed

## Implementation Plan

1. **GroupSelector.tsx**: Change `privateGroups` filter from `g.ownerId === principalStr` to `g.members.some(m => m.principal === principalStr)`. This ensures both owners AND members of private groups see the group in the selector.

2. **GroupDetailPage.tsx**: In the posts tab, show a loading state while `isLoading` is true (from `useGetAllPublishedPosts`). This prevents the "no posts" flash after publishing when React Query hasn't refetched yet.

3. **CreatePostPage.tsx**: In `handleSubmit`, skip `addPostToGroupAsync` when `published=false`. Add toast informing user that group linking happens at publish time. 

4. **EditDraftPage.tsx**: Fix `validateForm` to use `effectiveAuthor = hasProfileAlias ? profileAlias : author.trim()` instead of `!author.trim()`.

5. All fixes are frontend-only. No backend changes needed.
