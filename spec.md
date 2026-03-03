# Specification

## Summary
**Goal:** Add autosave drafts, a "My Drafts" section, and an unpublish confirmation dialog to the HKLO Blogg application.

**Planned changes:**
- Add a `draft` status to the backend post data model; draft posts are not visible in the public feed and are only accessible by their owner
- Add `saveDraft`, `updateDraft`, `getDraftsByUser`, and `deleteDraft` backend mutations/queries
- In the Create Post page, implement autosave every 30 seconds that saves/updates a draft when any field has content, with a subtle "Draft saved" indicator
- Add a "Save as Draft" button next to the "Skapa inlägg" button in the Create Post form that saves immediately and navigates to My Drafts
- Create a "My Drafts" page accessible from the header navigation (authenticated users only), listing the user's drafts with title, last saved timestamp, and content preview; each draft card has Edit, Publish, and Delete (with confirmation) actions
- When the "Publicera omedelbart" toggle is turned off on an already-published post, show a confirmation dialog with three options: "Delete permanently", "Save as Draft", and "Cancel"; the toggle does not change state until the user confirms
- Add React Query hooks (`useSaveDraft`, `useUpdateDraft`, `useGetMyDrafts`, `useDeleteDraft`) with proper cache invalidation

**User-visible outcome:** Users can save unfinished posts as drafts (manually or via autosave), manage their drafts in a dedicated "My Drafts" section, and safely unpublish or delete published posts through a confirmation dialog when toggling off the publish switch.
