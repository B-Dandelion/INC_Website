import Link from "next/link";
import { fetchBoards } from "@/lib/resourcesDb";

export default async function AdminResourcesHome() {
  const boards = await fetchBoards();

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>자료실 관리자</h1>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <p style={{ opacity: 0.7, marginTop: 6 }}>카테고리를 선택하세요.</p>
        <form action="/api/admin/logout" method="post">
          <button
            type="submit"
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: "7px 10px",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            로그아웃
          </button>
        </form>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, marginTop: 16 }}>
        {boards.map((b) => (
          <Link
            key={b.slug}
            href={`/admin-x7k3p9/resources/${b.slug}`}
            style={{
              border: "1px solid #e5e5e5",
              borderRadius: 12,
              padding: 14,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div style={{ fontWeight: 700 }}>{b.title}</div>
            <div style={{ opacity: 0.65, marginTop: 4 }}>{b.slug}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}