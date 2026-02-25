# Specification

## Summary
**Goal:** Fix the Admin Panel nav link visibility by replacing the backend role check with a frontend-only hardcoded principal ID check, and add a temporary debug display to identify the admin's principal ID.

**Planned changes:**
- Add a temporary debug display on the home page (visible only when logged in) that shows the authenticated user's current principal ID as a string
- Define a constant `ADMIN_PRINCIPAL_ID` in a frontend config or constants file
- Update `Layout.tsx` to show the Admin Panel nav link only when the logged-in user's principal ID exactly matches `ADMIN_PRINCIPAL_ID` (using a placeholder value until the real principal ID is provided)
- Remove the dependency on the existing `isAdmin` backend role check for the nav link visibility

**User-visible outcome:** When logged in, the user can see their principal ID on the page. The Admin Panel nav link only appears for the user whose principal ID matches the hardcoded constant, and is hidden for all other users and when logged out.
