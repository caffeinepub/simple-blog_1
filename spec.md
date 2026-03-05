# HKLO Blog Platform

## Current State
Full-featured Swedish blog platform with:
- Internet Identity authentication
- Multi-author blog posts with rich text editor
- Draft/publish workflow with preview
- Image uploads in posts and comments
- Follow system (follow/unfollow users, follower counts)
- Like/dislike reactions with animations
- Comments with emoji picker and image uploads
- Notifications for post owners when comments are added
- Admin panel (hardcoded principal for admin access)
- User profiles with alias
- Share functionality (copy link)
- Search on home page (category, title, alias, content, date range)
- Language selector on login page and profile
- "My posts and drafts" page

## Requested Changes (Diff)

### Add
- Group data types in Motoko backend: `Group`, `GroupMember`, `GroupRole`
- Group CRUD: createGroup, getGroup, getAllGroups, getMyGroups, deleteGroup
- Group membership: joinGroup, leaveGroup, inviteToGroup, getGroupMembers
- Group admin role within group: makeGroupModerator, removeGroupModerator
- Group posts: createGroupPost, getGroupPosts (posts can optionally also appear in main feed)
- Frontend: Groups page (accessible from navigation via "Grupper")
- Frontend: Create group form (name, description, visibility: public/private)
- Frontend: Group detail page with member list, invite by alias search, post list
- Frontend: Group management for owners (edit, delete group, manage members)
- Frontend: Group selector in create/edit post form (optional: attach post to a group)
- Frontend: "Mitt flöde" tab on home page shows group posts if opted in

### Modify
- Navigation: Add "Grupper" link
- App.tsx: Add /groups and /groups/:id routes
- UsersPage: Add user's own groups list section
- CreatePostPage / EditPostPage: Add optional group selector
- backend.d.ts: Add group-related type definitions

### Remove
- Nothing removed

## Implementation Plan
1. Add Group types and state to main.mo backend
2. Add group functions: createGroup, getGroup, getAllGroups, getMyGroups, deleteGroup, joinGroup, leaveGroup, inviteToGroup, getGroupMembers, makeGroupModerator, removeGroupModerator, createGroupPost, getGroupPosts
3. Regenerate backend.d.ts to include group types
4. Add group hooks to useQueries.ts
5. Create GroupsPage.tsx (list all public groups + user's groups)
6. Create GroupDetailPage.tsx (view group, members, posts, invite by alias)
7. Add routes in App.tsx for /groups and /groups/:id
8. Add "Grupper" nav link in Layout.tsx
9. Add optional group selector in CreatePostPage and EditPostPage
10. Build and verify
