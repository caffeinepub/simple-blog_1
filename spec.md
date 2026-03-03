# Specification

## Summary
**Goal:** Fix the image upload failure and broken share function on the HKLO blog.

**Planned changes:**
- Implement aggressive canvas-based image compression in `useImageUpload.ts`: resize images to max 1200px on the longest side, compress to JPEG at quality 0.6, enforce an 800 KB hard limit after compression, and show a Swedish error message if the limit is still exceeded
- Show the compressed image preview (not the original) after processing
- Raise the Motoko backend's per-image blob size limit to 900 KB and return a typed error variant (e.g. `#imageTooLarge`) when a single image exceeds the limit
- Fix the share button in `PostCard.tsx` and `PostDetailPage.tsx` to copy the canonical post URL to the clipboard using the Clipboard API, with a Swedish confirmation toast ("Länk kopierad!") and a fallback prompt for unsupported browsers

**User-visible outcome:** Users can successfully upload standard smartphone photos without seeing the creation error, and the share button correctly copies the post URL and shows a Swedish confirmation message.
