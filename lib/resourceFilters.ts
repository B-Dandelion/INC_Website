// Shared by the admin list (server) and its filter bar (client), so it must not
// import anything server-only.
export const RESOURCE_KINDS = ["pdf", "image", "video", "slide", "doc", "zip"] as const;
export const VISIBILITIES = ["public", "member", "admin"] as const;
export const ISSUE_BOARD_SLUGS = new Set(["atm", "heartbeat-of-atoms"]);
