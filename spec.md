# HKLO Blog

## Current State
HKLO är en flerförfattarblogg med kommentarssystem. Post-objektet i backend saknar fält för kommentarsstyrning. CommentsSection renderar alltid kommentarsinmatningsformuläret för inloggade användare. Skapa/redigera-formulären saknar kommentarskontrollinställningar.

## Requested Changes (Diff)

### Add
- Två nya fält på Post-typen i Motoko: `commentsLocked : Bool` (inga nya kommentarer kan postas) och `commentsHidden : Bool` (befintliga kommentarer döljs).
- Ny backend-funktion `setPostCommentSettings(postId, locked, hidden)` — endast inläggets ägare.
- CommentsSection tar emot props `commentsLocked` och `commentsHidden` och agerar därefter.
- UI-sektion "Kommentarsinställningar" i CreatePostPage, EditPostPage och EditDraftPage med två switchar.

### Modify
- `createPost` och `saveDraft` i backend tar emot `commentsLocked` och `commentsHidden` som extra parametrar (default false).
- `updatePost` och `updateDraft` tar emot samma extra parametrar.
- `publishDraft` bevarar kommentarsinställningarna från utkastet.
- CommentsSection: om `commentsHidden=true` dölj hela kommentarsektionen; om `commentsLocked=true` dölj inmatningsformuläret och visa meddelande "Kommentarer är stängda"; befintliga kommentarer visas normalt när `commentsHidden=false`.
- PostDetailPage: skicka `commentsLocked` och `commentsHidden` från post-objektet till CommentsSection.
- backend.d.ts och declarations uppdateras för de nya fälten och funktionerna.

### Remove
- Inget tas bort.

## Implementation Plan
1. Uppdatera Motoko `main.mo`: lägg till `commentsLocked` och `commentsHidden` i `Post`-typen; uppdatera `createPost`, `saveDraft`, `updatePost`, `updateDraft`, `publishDraft` att hantera dessa fält; lägg till `setPostCommentSettings`.
2. Uppdatera `backend.d.ts` och IDL-deklarationerna med nya fält och funktion.
3. Uppdatera `useQueries.ts` för nya hook `useSetPostCommentSettings` samt justera mutationsanrop.
4. Uppdatera CommentsSection-komponenten med props och villkorad rendering.
5. Uppdatera CreatePostPage med kommentarsinställnings-UI.
6. Uppdatera EditPostPage med kommentarsinställnings-UI.
7. Uppdatera EditDraftPage med kommentarsinställnings-UI.
8. Uppdatera PostDetailPage att skicka kommentarsinställningar till CommentsSection.
