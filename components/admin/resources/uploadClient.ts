// Browser side of the direct-to-R2 upload (presign → PUT → finalize), shared by
// the board uploader and the event editor.

export class SessionExpired extends Error {}

export async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (res.status === 401) {
    location.href = "/admin-x7k3p9?reason=session";
    throw new SessionExpired();
  }
  const out = await res.json().catch(() => null);
  if (!res.ok || out?.ok === false) throw new Error(out?.error ?? `HTTP ${res.status}`);
  return out;
}

// fetch() cannot report upload progress, so the file itself goes up with XHR.
export function putWithProgress(url: string, file: File, contentType: string, onProgress: (ratio: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`저장소 업로드 실패 (HTTP ${xhr.status})`)));
    xhr.onerror = () => reject(new Error("네트워크 오류로 업로드하지 못했습니다."));
    xhr.send(file);
  });
}

export type DirectUpload = {
  boardSlug: string;
  file: File;
  title: string;
  note?: string;
  visibility: string;
  date?: string;
  onProgress?: (ratio: number) => void;
};

// Uploads one file and registers it; returns the new resources.id.
export async function uploadResource({ boardSlug, file, title, note = "", visibility, date = "", onProgress }: DirectUpload): Promise<number> {
  const contentType = file.type || "application/octet-stream";
  const presigned = await postJson("/api/admin/resources/presign", {
    boardSlug,
    fileName: file.name,
    contentType,
    size: file.size,
    visibility,
  });
  await putWithProgress(presigned.uploadUrl, file, contentType, (ratio) => onProgress?.(ratio));
  const saved = await postJson("/api/admin/resources/finalize", {
    boardSlug,
    key: presigned.key,
    title,
    note,
    visibility,
    date,
    originalFilename: file.name,
  });
  return saved.id as number;
}
