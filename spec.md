# HKLO Blog

## Current State
The blog has CreatePostPage, EditPostPage, and EditDraftPage forms with fields for category, title, alias, content, images, and a publish toggle. Groups are stored in localStorage (with backend sync) via groupStorage.ts. The groupStorage module exposes getAllGroups(), getPublicGroups(), and getMyGroups() which filter by membership. There is currently no group selection in any of the post creation or editing forms.

## Requested Changes (Diff)

### Add
- A group selection section in CreatePostPage, EditPostPage, and EditDraftPage, placed directly below the "Publicera omedelbart" toggle
- Two multi-select dropdowns in that section:
  - "Privata grupper" — lists groups where the logged-in user is the owner and visibility is private
  - "Publika grupper" — lists public groups (visibility === "public")
- Each dropdown supports selecting multiple groups
- When one or more groups are selected, the "Publicera omedelbart" toggle is automatically turned off (logical: group-scoped posts are not public for all)
- A "Synlig i huvudflöde" checkbox per group selection (or a global toggle) to let the user decide if the post also appears in the main feed
- After post creation/update, call addPostToGroupAsync for each selected group with the new post ID

### Modify
- CreatePostPage: add group selection state and post-submit group assignment logic
- EditPostPage: add group selection state (pre-populate from existing group memberships) and post-update group assignment logic
- EditDraftPage: add group selection state for when the draft is later published

### Remove
- Nothing removed

## Implementation Plan
1. Create a reusable GroupSelector component that:
   - Accepts the logged-in user's principal string
   - Reads groups from localStorage via getAllGroups()
   - Filters into "my private groups" (owned + private) and "public groups"
   - Renders two labeled multi-select sections (checkboxes or a multi-select UI)
   - Exposes selected group IDs and inMainFeed flag via props/callback
   - When any group is selected, fires an onGroupSelected callback so parent can disable publish toggle
2. Update CreatePostPage to:
   - Add GroupSelector below the publish toggle
   - When groups selected, setPublished(false) automatically
   - After createPost succeeds, call addPostToGroupAsync for each selected group
3. Update EditPostPage similarly
4. Update EditDraftPage similarly (applies when publishing the draft)
