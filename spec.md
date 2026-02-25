# Specification

## Summary
**Goal:** Fix the Admin Panel link visibility for the hardcoded admin principal and improve image/file upload reliability, quality, and UI feedback across the HKLO Blog.

**Planned changes:**
- Set `ADMIN_PRINCIPAL_ID` in `constants.ts` to `'ci3hz-xset5-ahrcc-nhtdc-kfnzc-34wqe-e2yzj-qk2gl-ygiwy-oc5j5-2ae'` and update `Layout.tsx` to show the Admin Panel nav link only when the authenticated user matches this principal
- Improve `useImageUpload.ts`: validate accepted file types (JPEG, PNG, WebP, GIF), enforce a max file size with a user-facing error, increase max dimension to 1600px and JPEG quality to 0.85, and handle empty/corrupt inputs gracefully
- Update `CreatePostPage`, `EditPostPage`, and `PostEditModal` to show upload loading state, thumbnail previews with remove buttons, and inline error messages
- Review `backend/main.mo` to ensure multiple images per post are stored and retrieved without data loss, in stable order, and that empty blobs are rejected
- Fix `ImageGallery` and `PostCard` to reliably convert Uint8Array to blob URLs, revoke blob URLs on unmount, and show a placeholder for empty or malformed image blobs

**User-visible outcome:** The admin user sees the Admin Panel link upon login, image uploads are more reliable with clear feedback (previews, errors, loading states), and images display correctly throughout the blog without memory leaks.
