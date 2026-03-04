# HKLO Blog

## Current State

HKLO is a full-stack multi-author blog platform with:
- Internet Identity login/logout
- Blog post creation (with category/title suggestions, alias, images, autosave drafts)
- Post detail view with share, like/dislike (reaction buttons with animation), and edit/delete for post owner
- My Drafts page listing draft posts with publish/edit/delete
- Profile page with alias, language selector (46 countries/flags), follower count
- Admin panel (admin linked to hardcoded principal `ci3hz-xset5-ahrcc-nhtdc-kfnzc-34wqe-e2yzj-qk2gl-ygiwy-oc5j5-2ae`)
- Users page for following/unfollowing authors
- Home page with "Alla inlägg" and "Mitt flöde" tabs + search panel
- Navigation: Hem, Skapa inlägg, Mina utkast, Användare, Profil, Admin (if admin), Logga ut

**Missing (last build attempt failed):**
- Comment system on posts
- Notifications when a comment is posted on your post
- "Mina utkast" renamed to "Mina inlägg och utkast" in nav, page now shows both published posts AND drafts, with posts that have notifications sorted to the top

## Requested Changes (Diff)

### Add

- **Comment model** in backend: commentId, postId, authorPrincipal, authorAlias, content, images (multiple), createdAt, isDeleted
- **Backend functions**: addComment, editComment, deleteComment, getCommentsForPost, getNotifications, markNotificationRead, clearAllNotifications
- **Notification model**: notificationId, recipientPrincipal, postId, postTitle, commenterAlias, createdAt, isRead
- **Comments section** on PostDetailPage (authenticated users only): list of comments with author alias, date, images, emoji; comment form with text, emoji picker (full with categories+search), image upload (multiple, inline display)
- **Comment owner controls**: edit button and delete button visible only to comment author
- **Notification badge** on navigation — icon with unread count badge, clicking opens a notification dropdown/popover listing recent notifications (e.g. "X kommenterade ditt inlägg 'Titel'"), with mark-all-read and link to post
- **"Mina inlägg och utkast" page** — rename nav item from "Mina utkast" to "Mina inlägg och utkast"; show both published posts by the current user AND their drafts; posts/drafts with unread notifications sorted to the top with a visual indicator

### Modify

- Nav label: "Mina utkast" → "Mina inlägg och utkast"
- MyDraftsPage: renamed to show both published posts (owned by caller) and drafts; add notification badge on posts with new comments; sort notified posts to top
- PostDetailPage: add comments section below reactions

### Remove

Nothing removed.

## Implementation Plan

1. **Backend**: Add Comment and Notification types, stable storage maps, and the following new functions:
   - `addComment(postId, content, authorAlias, images)` → commentId; creates Notification for post owner if commenter ≠ owner
   - `editComment(commentId, content, images)` → result (only owner)
   - `deleteComment(commentId)` → result (only owner)
   - `getCommentsForPost(postId)` → Array<Comment>
   - `getNotifications()` → Array<Notification> for caller
   - `markNotificationRead(notificationId)` → void
   - `clearAllNotifications()` → void
   - `getUnreadNotificationCount()` → Nat

2. **Frontend**:
   - Add `useComments`, `useAddComment`, `useEditComment`, `useDeleteComment`, `useGetNotifications`, `useMarkNotificationRead`, `useClearAllNotifications`, `useGetUnreadNotificationCount` hooks
   - Build `CommentsSection.tsx` component used in PostDetailPage
   - Build `EmojiPicker.tsx` component (full emoji picker with categories + search using emoji-mart or similar)
   - Build `NotificationBell.tsx` for nav — shows unread count badge, popover with notification list
   - Rename nav item and update MyDraftsPage to show published + drafts with notification sorting
