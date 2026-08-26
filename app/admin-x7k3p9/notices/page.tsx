import Link from "next/link";
import FormSubmitButton from "@/components/admin/FormSubmitButton";
import { supabaseService } from "@/lib/supabaseServer";
import {
  createNoticeAction,
  deleteNoticeAction,
  updateNoticeAction,
} from "./actions";

export const dynamic = "force-dynamic";

type AdminNoticeRow = {
  id: number;
  title: string;
  content: string;
  posted_at: string | null;
  pinned: boolean | null;
  visibility: string | null;
  created_at: string | null;
};

function todayInKorea() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function duplicateKey(row: AdminNoticeRow) {
  return [
    row.title.trim(),
    row.content.trim(),
    row.posted_at ?? "",
  ].join("\u0000");
}

function statusMessage(status?: string) {
  if (status === "created") return "공지사항을 등록했습니다.";
  if (status === "updated") return "공지사항을 수정했습니다.";
  if (status === "deleted") return "공지사항을 삭제했습니다.";
  return null;
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "10px 12px",
  font: "inherit",
  color: "#0f172a",
  background: "#fff",
};

export default async function AdminNoticesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const message = statusMessage(sp.status);

  const { data, error } = await supabaseService()
    .from("notices")
    .select("id,title,content,posted_at,pinned,visibility,created_at")
    .order("pinned", { ascending: false })
    .order("posted_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(`공지사항 목록 조회 실패: ${error.message}`);
  }

  const rows = (data ?? []) as AdminNoticeRow[];
  const duplicateCounts = new Map<string, number>();
  for (const row of rows) {
    const key = duplicateKey(row);
    duplicateCounts.set(key, (duplicateCounts.get(key) ?? 0) + 1);
  }

  return (
    <main style={{ maxWidth: 980, margin: "40px auto", padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>공지사항 관리</h1>
          <p style={{ margin: "7px 0 0", color: "#64748b" }}>
            공지 작성, 수정, 고정, 삭제를 관리합니다.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link
            href="/notice"
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              padding: "8px 11px",
              textDecoration: "none",
              color: "#0f172a",
              fontWeight: 800,
              background: "#fff",
            }}
          >
            공지 화면 보기
          </Link>
          <Link
            href="/admin-x7k3p9/resources"
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              padding: "8px 11px",
              textDecoration: "none",
              color: "#0f172a",
              fontWeight: 800,
              background: "#fff",
            }}
          >
            관리자 홈
          </Link>
        </div>
      </div>

      {message ? (
        <div
          role="status"
          style={{
            marginTop: 18,
            padding: "11px 13px",
            borderRadius: 10,
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            fontWeight: 800,
          }}
        >
          {message}
        </div>
      ) : null}

      <section
        style={{
          marginTop: 20,
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          padding: 18,
          background: "#fff",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 900 }}>새 공지 등록</h2>
        <form action={createNoticeAction} style={{ display: "grid", gap: 12, marginTop: 14 }}>
          <label style={{ display: "grid", gap: 6, fontWeight: 800 }}>
            제목
            <input
              name="title"
              maxLength={200}
              required
              autoComplete="off"
              style={fieldStyle}
            />
          </label>

          <label style={{ display: "grid", gap: 6, fontWeight: 800 }}>
            내용
            <textarea
              name="content"
              maxLength={20000}
              required
              rows={9}
              style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.6 }}
            />
          </label>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(180px, 240px) 1fr",
              gap: 14,
              alignItems: "end",
            }}
          >
            <label style={{ display: "grid", gap: 6, fontWeight: 800 }}>
              게시일
              <input
                type="date"
                name="posted_at"
                defaultValue={todayInKorea()}
                required
                style={fieldStyle}
              />
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                paddingBottom: 10,
                fontWeight: 800,
              }}
            >
              <input type="checkbox" name="pinned" />
              상단 고정
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <FormSubmitButton label="공지 등록" pendingLabel="등록 중..." />
          </div>
        </form>
      </section>

      <section style={{ marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 900 }}>등록된 공지</h2>
          <span style={{ color: "#64748b", fontSize: 14 }}>{rows.length}개</span>
        </div>

        {rows.length === 0 ? (
          <div
            style={{
              marginTop: 12,
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 18,
              color: "#64748b",
              background: "#fff",
            }}
          >
            등록된 공지사항이 없습니다.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            {rows.map((row) => {
              const duplicates = duplicateCounts.get(duplicateKey(row)) ?? 1;
              return (
                <article
                  key={row.id}
                  style={{
                    border: duplicates > 1 ? "1px solid #f59e0b" : "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: 16,
                    background: "#fff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <strong style={{ fontSize: 17 }}>{row.pinned ? "📌 " : ""}{row.title}</strong>
                        {duplicates > 1 ? (
                          <span
                            style={{
                              borderRadius: 999,
                              padding: "3px 8px",
                              background: "#fffbeb",
                              color: "#92400e",
                              fontSize: 12,
                              fontWeight: 900,
                            }}
                          >
                            동일 공지 {duplicates}개
                          </span>
                        ) : null}
                      </div>
                      <div style={{ marginTop: 5, color: "#64748b", fontSize: 13 }}>
                        ID {row.id} · 게시 {row.posted_at ?? "-"} · {row.visibility ?? "-"}
                      </div>
                    </div>
                    <Link
                      href={`/notice/${row.id}`}
                      style={{ color: "#2563eb", textDecoration: "none", fontWeight: 800 }}
                    >
                      보기
                    </Link>
                  </div>

                  <details style={{ marginTop: 14 }}>
                    <summary style={{ cursor: "pointer", fontWeight: 900 }}>수정 / 삭제</summary>

                    <form action={updateNoticeAction} style={{ display: "grid", gap: 10, marginTop: 14 }}>
                      <input type="hidden" name="id" value={row.id} />
                      <label style={{ display: "grid", gap: 6, fontWeight: 800 }}>
                        제목
                        <input
                          name="title"
                          defaultValue={row.title}
                          maxLength={200}
                          required
                          style={fieldStyle}
                        />
                      </label>
                      <label style={{ display: "grid", gap: 6, fontWeight: 800 }}>
                        내용
                        <textarea
                          name="content"
                          defaultValue={row.content}
                          maxLength={20000}
                          required
                          rows={7}
                          style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.6 }}
                        />
                      </label>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(180px, 240px) 1fr",
                          gap: 14,
                          alignItems: "end",
                        }}
                      >
                        <label style={{ display: "grid", gap: 6, fontWeight: 800 }}>
                          게시일
                          <input
                            type="date"
                            name="posted_at"
                            defaultValue={row.posted_at ?? todayInKorea()}
                            required
                            style={fieldStyle}
                          />
                        </label>
                        <label
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            paddingBottom: 10,
                            fontWeight: 800,
                          }}
                        >
                          <input type="checkbox" name="pinned" defaultChecked={Boolean(row.pinned)} />
                          상단 고정
                        </label>
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <FormSubmitButton label="수정 저장" pendingLabel="저장 중..." />
                      </div>
                    </form>

                    <form
                      action={deleteNoticeAction}
                      style={{
                        marginTop: 14,
                        paddingTop: 14,
                        borderTop: "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <input type="hidden" name="id" value={row.id} />
                      <label style={{ display: "flex", gap: 8, alignItems: "center", color: "#9f1239", fontWeight: 800 }}>
                        <input type="checkbox" name="confirm_delete" required />
                        이 공지를 삭제하는 것을 확인합니다.
                      </label>
                      <FormSubmitButton label="삭제" pendingLabel="삭제 중..." danger />
                    </form>
                  </details>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
