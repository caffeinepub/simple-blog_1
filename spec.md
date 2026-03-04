# HKLO Blog

## Current State
A multi-author Swedish blog platform with:
- Internet Identity login with principal-based admin (`ci3hz-xset5-ahrcc-nhtdc-kfnzc-34wqe-e2yzj-qk2gl-ygiwy-oc5j5-2ae`)
- Posts with images, categories, like/dislike reactions with animations
- Search/filter on home page
- Shareable post links with teaser for unauthenticated visitors
- Draft/autosave system with unpublish dialog
- User profiles with alias
- Language selector (SV, EN, DE, FR, ZH, ES)
- Admin panel for post/author management
- Authorization via access-control mixin

## Requested Changes (Diff)

### Add
- **Follow system backend**: follow/unfollow a user (by principal), get follower count (not follower list), get list of users the caller follows, check if caller follows a specific user
- **User discovery**: get all public user profiles (alias + principal) so users can browse/follow others; only name/alias is exposed publicly
- **"Mitt flöde" tab on Home**: a dedicated tab on the Home page showing only posts from users the caller follows, sorted newest first
- **Follow button on PostCard**: next to author alias — "Följ" / "Följer" toggle button; hidden when viewing own post
- **Users page**: new `/users` route listing all users with aliases and their follower count, with a Follow/Unfollow button per user; includes search by alias
- **Follower count in Profile**: show follower count on the profile page; never reveal who the followers are

### Modify
- `main.mo`: add follow state (`followers: Map<Principal, Set<Principal>>`), add `followUser`, `unfollowUser`, `isFollowing`, `getFollowerCount`, `getFollowedUsers`, `getPublicProfiles` functions
- `HomePage.tsx`: add "Alla inlägg" / "Mitt flöde" tabs; Mitt flöde loads posts from followed users only
- `PostCard.tsx`: add Follow/Unfollow button next to author alias
- `ProfilePage.tsx`: display follower count
- `Layout.tsx` / `App.tsx`: add navigation link and route for Users page

### Remove
- Nothing removed

## Implementation Plan
1. Update `main.mo` with follow state and 6 new query/update functions
2. Regenerate `backend.d.ts` bindings
3. Add `UsersPage.tsx` — searchable list of all users with follow buttons
4. Add `/users` route in `App.tsx` and navigation link in `Layout.tsx`
5. Update `PostCard.tsx` — add Follow/Unfollow toggle button next to author alias
6. Update `HomePage.tsx` — add tabs ("Alla inlägg" / "Mitt flöde") and implement feed filtering
7. Update `ProfilePage.tsx` — fetch and display follower count
