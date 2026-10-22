// lib/adminNav.ts
// Where admin screens send people whose session has expired.
export const ADMIN_BASE = "/admin-x7k3p9";

// A full page load on purpose, not router.push: it drops every piece of admin
// client state and makes the server re-check the session cookie. Called from
// plain fetch helpers that have no router.
export function goToAdminLogin() {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`${ADMIN_BASE}?reason=session`);
}
