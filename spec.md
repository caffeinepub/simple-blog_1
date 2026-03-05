# HKLO Blog

## Current State
A full-featured Swedish multi-author blog platform with: post creation/editing/drafts, rich text editor, comments with emoji/images, reactions (like/dislike), follow system, groups, profiles, notifications, search, admin panel, and share functionality. Backend is Motoko on ICP.

## Requested Changes (Diff)

### Add
- Rule-based content moderation in Motoko backend: a `moderateContent` function that checks text against a blocklist of offensive/hateful/violent words in Swedish and English
- Backend stores a `ModerationResult` type: `{ blocked: Bool; reason: Text }`
- Moderation check runs before `createPost`, `publishDraft`, and `addComment` — if blocked, return a new result variant `#contentBlocked` with the reason
- New backend type `CreatePostResult` extended with `#contentBlocked : Text`
- New backend type `UpdatePostResult` extended with `#contentBlocked : Text`
- Admin notification when content is blocked: a new `ModerationNotification` stored in backend with type, content snippet, author principal, and timestamp
- New backend function `getModerationLog` (admin only) to retrieve blocked content log
- Admin panel section "Innehållsmoderering" showing the moderation log
- Frontend: when a post/comment is blocked, show a clear Swedish error message with the reason

### Modify
- `createPost`: run moderation on title + content before saving; return `#contentBlocked` if flagged
- `publishDraft`: run moderation on title + content before publishing; return `#contentBlocked` if flagged
- `addComment`: run moderation on content before saving; trap with descriptive message if flagged
- `UpdatePostResult` and `CreatePostResult` types: add `#contentBlocked : Text` variant
- Frontend `CreatePostPage`, `EditDraftPage`, `EditPostPage`, `CommentsSection`: handle `#contentBlocked` result and show user-friendly Swedish error toast
- Admin panel: add moderation log tab

### Remove
- Nothing removed

## Implementation Plan
1. Add moderation blocklist and `checkContent` helper function in `main.mo`
2. Add `ModerationLog` type and `moderationLog` map in backend state
3. Add `#contentBlocked : Text` to `CreatePostResult` and `UpdatePostResult`
4. Gate `createPost`, `publishDraft`, `addComment` with moderation check
5. Add `getModerationLog` query function (admin only)
6. Update frontend result handlers in CreatePostPage, EditDraftPage, EditPostPage, CommentsSection to show Swedish error for blocked content
7. Add "Innehållsmoderering" tab in AdminPage showing the log
