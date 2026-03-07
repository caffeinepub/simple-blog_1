# HKLO

## Current State

HKLO is a multi-author blog platform built on ICP with a Motoko backend and React + TypeScript frontend. The current design uses a sticky header with a flat horizontal nav, a centered homepage with a hero text section, and a tab-based layout (Alla inlägg / Mitt flöde) for browsing posts. There is a separate LoginPage at `/login` that handles Internet Identity authentication. All existing features are functional: posting, drafts, groups, search, admin panel, profile, notifications, moderation, comments, reactions, follow/unfollow.

Design uses the Golden Hour palette (amber/teal/parchment) with Playfair Display serif headings and Figtree body text. CSS is in `index.css` with OKLCH tokens.

## Requested Changes (Diff)

### Add

- **Magazine-style homepage layout**: full-width hero section (latest post featured with title/summary overlay), followed by a 2-column article grid, with a right sidebar (Senaste inlägg, Kategorier, Taggar).
- **Collapsible sidebar on mobile**: the sidebar (Senaste inlägg, Kategorier, Taggar) collapses into a toggle/drawer on mobile instead of stacking below the articles.
- **Welcome hero fallback**: when no posts exist, show a warm welcome text section (no image) instead of the hero post.
- **Login button in sticky navbar**: the Login button must always be visible in the sticky header for unauthenticated visitors. Authenticated users continue to see all nav links + logout.
- **Mobile hamburger menu**: the horizontal nav links (Skapa inlägg, Mina inlägg, Användare, Grupper, Profil, Admin) collapse into a hamburger/dropdown menu on mobile/tablet.
- **Article cards with image, title, preview text**: redesigned PostCard with a compact magazine card style (thumbnail top, category badge, title, short preview, author, date).
- **Category and tag display in sidebar**: extract unique categories/tags from published posts and display them as clickable filter pills in the sidebar.
- **"Senaste inlägg" in sidebar**: list 5 most recent post titles with dates as links.

### Modify

- **Layout.tsx**: sticky header now always shows Login button for unauthenticated users (not just on the homepage). Authenticated nav collapses to hamburger on small screens. The Login button triggers Internet Identity login directly from the header (no redirect to `/login` page needed — login function from `useInternetIdentity` hook).
- **HomePage.tsx**: restructure to magazine layout with hero + 2-col grid + sidebar. Keep the existing `AllPostsTab` search functionality but integrate it into the new layout (search bar above the grid, not inside a tab). Keep "Mitt flöde" as a tab option within the main content area. Keep all existing filtering/search logic.
- **App.tsx**: the home route (`/`) should be accessible without authentication (remove ProtectedRoute wrapper on index route) so unauthenticated visitors can read posts. LoginPage at `/login` remains but is now secondary — login happens via navbar button.
- **PostCard.tsx**: update to compact magazine card style matching the reference image (image thumbnail at top, category badge, title, short preview text 2-3 lines, author + date meta, reaction counts).

### Remove

- Separate full-page hero section on HomePage (replaced by the latest-post hero or welcome text).
- Tab switcher as the primary UI pattern on the homepage (tabs become secondary, below the main grid).

## Implementation Plan

1. **Update `App.tsx`**: remove `ProtectedRoute` wrapper from the index route so the home page is publicly viewable. Keep all other protected routes as-is.

2. **Update `Layout.tsx`**:
   - Add login button in header for unauthenticated visitors that calls `login()` from `useInternetIdentity` directly (no redirect to `/login`)
   - Add hamburger menu (Sheet/Drawer) for mobile nav when authenticated
   - Keep sticky behavior, Golden Hour colors, logo, footer

3. **Update `HomePage.tsx`** — full magazine layout:
   - Hero section: latest published post shown as a wide card with title, author, date, short excerpt and "Läs mer" CTA. If no posts, show welcome text (HKLO tagline, community description).
   - Main content area: 2-column responsive article grid using updated PostCard components
   - Right sidebar (desktop): "Senaste inlägg" list (5 items), "Kategorier" pills, "Taggar" pills — all derived from published posts
   - Sidebar on mobile: collapsible panel with a toggle button ("Visa/Dölj sidopanel") using Collapsible or a Sheet
   - Keep search bar above the grid
   - Keep "Mitt flöde" tab accessible (can be a tab below the hero)

4. **Update `PostCard.tsx`**: compact magazine card — image at top (aspect-[4/3]), category badge overlay, serif title, 2-line preview, author + date, reaction pill counts. Ensure `data-ocid` markers remain.

5. **Ensure all existing routes and features remain intact**: groups, admin, drafts, profile, users, comments, moderation — no functional changes.
