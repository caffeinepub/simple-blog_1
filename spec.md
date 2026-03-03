# Specification

## Summary
**Goal:** Enable multi-author post creation, shareable post links, and a preview/login gate for unauthenticated visitors on the HKLO Blog.

**Planned changes:**
- Remove admin/owner restriction on post creation so all authenticated users can create posts and see the "Create Post" navigation link
- Add a "Copy shareable link" button to each post card and post detail page that copies the direct post URL to the clipboard, with a brief confirmation toast
- Allow unauthenticated visitors to fetch published post data from the backend (anonymous actor access for getPost)
- When an unauthenticated visitor opens a shared post link, show a teaser (title, author, date, first image if any, and ~150 words of content with a gradient fade) followed by a login gate with an "Log in with Internet Identity" button and a "Create Internet Identity" link
- After login from the gate, automatically redirect the user back to the same post showing full content

**User-visible outcome:** Any logged-in user can write posts, every post has a shareable link that can be copied, and visitors who open a shared link see a teaser preview with a login prompt before accessing the full content.
