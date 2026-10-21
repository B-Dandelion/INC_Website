// Pure helpers shared by the admin event detail screen and its rows.
import type { CSSProperties } from "react";
import { slotFor } from "@/lib/boardRules";

export function trimOrNull(value: string) {
    const trimmed = value.trim();
    return trimmed || null;
}


export function handleUnauthorized(response: Response) {
    if (response.status !== 401) return false;

    alert("관리자 세션이 만료되었습니다. 다시 로그인해 주세요.");
    location.href = "/admin-x7k3p9?reason=session";
    return true;
}

export function youtubeVideoId(value: string) {
    const input = value.trim();
    if (!input) return null;

    try {
        const normalized = /^https?:\/\//i.test(input)
            ? input
            : `https://${input}`;
        const url = new URL(normalized);
        const host = url.hostname.replace(/^www\./, "").toLowerCase();

        let id: string | null = null;

        if (host === "youtu.be") {
            id = url.pathname.split("/").filter(Boolean)[0] ?? null;
        } else if (
            host === "youtube.com" ||
            host === "m.youtube.com" ||
            host === "music.youtube.com"
        ) {
            if (url.pathname === "/watch") {
                id = url.searchParams.get("v");
            } else {
                const match = url.pathname.match(
                    /^\/(?:shorts|embed|live)\/([^/?#]+)/
                );
                id = match?.[1] ?? null;
            }
        }

        return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    } catch {
        return null;
    }
}

export function canonicalYoutubeUrl(value: string) {
    const id = youtubeVideoId(value);
    return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

export function extOf(name?: string | null) {
    const value = (name ?? "").toLowerCase();
    const index = value.lastIndexOf(".");
    return index >= 0 ? value.slice(index + 1) : "";
}

export function isImageLike(mime?: string | null, filename?: string | null) {
    if (typeof mime === "string" && mime.startsWith("image/")) return true;

    return ["png", "jpg", "jpeg", "webp", "gif"].includes(
        extOf(filename)
    );
}

export function isVideoLike(mime?: string | null, filename?: string | null) {
    if (typeof mime === "string" && mime.startsWith("video/")) return true;

    return ["mp4", "mov", "webm", "mkv"].includes(extOf(filename));
}

// Allowed file types per role come from lib/boardRules.ts.
export function fileAcceptForRole(role: string, slug: string) {
    return slotFor(slug, role)?.accept;
}

export const miniBtnStyle: CSSProperties = {
    fontSize: 13,
    height: 32,
    padding: "0 10px",
    borderRadius: 10,
};

