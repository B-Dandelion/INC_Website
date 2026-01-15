"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { useMe } from "../../hooks/useMe";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type BoardOpt = { slug: string; title: string };
type Kind = "pdf" | "image" | "video" | "doc" | "zip" | "link";

function getExt(name: string) {
  const base = (name || "").trim();
  const i = base.lastIndexOf(".");
  if (i <= 0 || i === base.length - 1) return "";
  return base.slice(i + 1).toLowerCase();
}

function kindFromExt(ext: string): Kind | null {
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "webp"].includes(ext)) return "image";
  if (["mp4"].includes(ext)) return "video";
  if (["doc", "docx", "ppt", "pptx", "xls", "xlsx", "hwp"].includes(ext)) return "doc";
  if (["zip"].includes(ext)) return "zip";
  return null;
}

export default function AdminUploadPage() {
  const router = useRouter();
  const { me, loading, isAdmin } = useMe();

  const [msg, setMsg] = useState("");
  const [json, setJson] = useState<any>(null);

  // boards
  const [boards, setBoards] = useState<BoardOpt[]>([]);
  const [boardSlug, setBoardSlug] = useState<string>("");

  // file/kind
  const [pickedFileName, setPickedFileName] = useState<string>("");
  const [autoKind, setAutoKind] = useState<Kind | "">("");
  const [submitting, setSubmitting] = useState(false);

  const titleRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const acceptAttr = useMemo(() => {
    return [
      ".pdf",
      ".png", ".jpg", ".jpeg", ".webp",
      ".mp4",
      ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".hwp",
      ".zip",
    ].join(",");
  }, []);

  // 권한/로그인 상태에 따른 이동 (profiles 조회 제거)
  useEffect(() => {
    if (loading) return;

    if (!me?.isLoggedIn) {
      router.replace("/login?next=%2Fadmin%2Fupload");
      return;
    }
    if (!isAdmin) {
      router.replace("/");
      return;
    }
  }, [loading, me?.isLoggedIn, isAdmin, router]);

  // boards 목록 로드 (관리자 확정 이후)
  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;

    (async () => {
      try {
        const res = await fetch("/api/boards/list", { cache: "no-store" });
        const out = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok || !out?.boards) return;

        const list: BoardOpt[] = out.boards;
        setBoards(list);

        const first = list?.[0]?.slug ?? "";
        setBoardSlug((prev) => prev || (list.some((b) => b.slug === "atm") ? "atm" : first));
      } catch {
        // ignore
      }
    })();

    return () => {
      alive = false;
    };
  }, [isAdmin]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setJson(null);

    if (!file) {
      setPickedFileName("");
      setAutoKind("");
      return;
    }

    const ext = getExt(file.name);
    const k = kindFromExt(ext);

    if (!k) {
      setMsg(`허용되지 않는 파일 형식입니다: .${ext || "(확장자없음)"}`);
      setPickedFileName("");
      setAutoKind("");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setPickedFileName(file.name);
    setAutoKind(k);
    setMsg("");

    const t = titleRef.current;
    if (t && !t.value.trim()) {
      const base = file.name.replace(/\.[^/.]+$/, "");
      t.value = base;
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!autoKind) {
      setMsg("실패: 파일을 선택해 주세요(허용 확장자만 가능).");
      return;
    }
    if (!boardSlug) {
      setMsg("실패: 게시판을 선택해 주세요.");
      return;
    }

    const formEl = e.currentTarget;
    setSubmitting(true);
    setMsg("업로드 중...");
    setJson(null);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        setMsg("실패: 로그인 필요");
        return;
      }

      const fd = new FormData(formEl);

      // 선택/자동 결정값 강제 주입
      fd.set("boardSlug", boardSlug);
      fd.set("kind", autoKind);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
        headers: { Authorization: `Bearer ${token}` },
      });

      const out = await res.json().catch(() => ({}));
      setJson(out);
      setMsg(res.ok ? "성공" : `실패: ${res.status} ${out?.error ? `(${out.error})` : ""}`);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400";
  const labelClass = "text-sm font-medium text-slate-700";
  const selectClass =
    "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400";
  const helperClass = "mt-1 text-xs text-slate-500";

  // 처음 진입 로딩만 스켈레톤
  if (loading && !me) {
    return (
      <main className="min-h-[calc(100vh-120px)] bg-gradient-to-b from-blue-50 to-white px-4 py-10">
        <div className="mx-auto w-full max-w-3xl">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-3">
              <Image src="/inc_logo.png" alt="INC" width={120} height={40} priority />
              <div>
                <h1 className="text-xl font-semibold text-slate-900">자료 업로드</h1>
                <p className="text-sm text-slate-600">권한 확인 중...</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 권한 없으면 useEffect에서 리다이렉트 중
  if (!isAdmin) return null;

  const email = me?.user?.email ?? null;

  return (
    <main className="min-h-[calc(100vh-120px)] bg-gradient-to-b from-blue-50 to-white px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image src="/inc_logo.png" alt="INC" width={120} height={40} priority />
              <div>
                <h1 className="text-xl font-semibold text-slate-900">자료 업로드</h1>
                <p className="text-sm text-slate-600">
                  R2에 파일을 저장하고, DB(resources)에 메타데이터를 기록합니다.
                </p>
              </div>
            </div>

            <div className="text-right text-sm text-slate-600">
              {email ? (
                <div>
                  <div className="font-medium text-slate-900">{email}</div>
                  <div className="text-xs text-slate-500">관리자 로그인됨</div>
                </div>
              ) : (
                <Link
                  href="/login?next=%2Fadmin%2Fupload"
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  로그인
                </Link>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <form onSubmit={onSubmit} encType="multipart/form-data" className="md:col-span-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    문서 제목(내부 title)
                    <input ref={titleRef} name="title" required className={inputClass} />
                  </label>
                </div>

                <div>
                  <label className={labelClass}>
                    게시판
                    <select
                      name="boardSlug"
                      value={boardSlug}
                      onChange={(e) => setBoardSlug(e.target.value)}
                      className={selectClass}
                      disabled={boards.length === 0}
                    >
                      {boards.length === 0 ? (
                        <option value="">게시판 불러오는 중…</option>
                      ) : (
                        boards.map((b) => (
                          <option key={b.slug} value={b.slug}>
                            {b.title} ({b.slug})
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                </div>

                <div>
                  <label className={labelClass}>
                    공개 범위
                    <select name="visibility" defaultValue="public" className={selectClass}>
                      <option value="public">public</option>
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                    </select>
                  </label>
                  <p className={helperClass}>member/admin은 권한 정책 확정 전까진 주의.</p>
                </div>

                <div>
                  <label className={labelClass}>
                    파일 종류(자동)
                    <input className={inputClass} value={autoKind || "파일 선택 필요"} readOnly />
                    <input type="hidden" name="kind" value={autoKind} />
                  </label>
                  <p className={helperClass}>
                    허용: pdf / 이미지(png,jpg,webp) / mp4 / 문서(docx,pptx,xlsx,hwp 등) / zip
                  </p>
                </div>

                <div>
                  <label className={labelClass}>
                    게시일
                    <input name="publishedAt" type="date" className={inputClass} />
                  </label>
                  <p className={helperClass}>달력 선택(YYYY-MM-DD 자동)</p>
                </div>

                <div>
                  <label className={labelClass}>
                    표시 제목(displayname, 선택)
                    <input name="displayname" className={inputClass} />
                  </label>
                  <p className={helperClass}>비워두면 리스트에서 내부 title이 표시됨.</p>
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>
                    파일
                    <input
                      ref={fileRef}
                      name="file"
                      type="file"
                      required
                      accept={acceptAttr}
                      onChange={onFileChange}
                      className={inputClass}
                    />
                  </label>
                  {pickedFileName ? (
                    <p className={helperClass}>선택됨: {pickedFileName}</p>
                  ) : (
                    <p className={helperClass}>파일을 선택하면 종류가 자동으로 결정됩니다.</p>
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="text-sm text-slate-700">{msg}</div>
                <button
                  type="submit"
                  disabled={submitting || !autoKind || !boardSlug}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
                >
                  {submitting ? "업로드 중…" : "Upload"}
                </button>
              </div>
            </form>

            {json && (
              <div className="md:col-span-2">
                <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800">
                    Response
                  </div>
                  <pre className="max-h-[420px] overflow-auto bg-zinc-950 p-4 text-xs text-green-400">
                    {JSON.stringify(json, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-xs text-slate-500">
          업로드 성공 시: R2 저장 + resources 테이블에 r2_key/메타데이터 생성.
        </div>
      </div>
    </main>
  );
}