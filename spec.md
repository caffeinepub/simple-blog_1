# Specification

## Summary
**Goal:** Hardcode the real admin principal ID into the frontend constants file and clean up debug output.

**Planned changes:**
- Replace the placeholder value of `ADMIN_PRINCIPAL_ID` in `frontend/src/config/constants.ts` with `ci3hz-xset5-ahrcc-nhtdc-kfnzc-34wqe-e2yzj-qk2gl-ygiwy-oc5j5-2ae`
- Remove the debug principal ID display from the home page

**User-visible outcome:** The Admin Panel nav link is only visible when logged in as the designated admin principal, and the debug principal display no longer appears on the home page.
