"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

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

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [msg, setMsg] = useState("");
  const [json, setJson] = useState<any>(null);
  const [email, setEmail] = useState<string | null>(null);

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
    // 파일 선택창 필터(완전한 보안은 아니고 UX용)
    return [
      ".pdf",
      ".png", ".jpg", ".jpeg", ".webp",
      ".mp4",
      ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".hwp",
      ".zip",
    ].join(",");
  }, []);

  // 0) 권한 확인: allowed true면 화면을 계속 보여주고(깜빡임 방지)
  useEffect(() => {
    let alive = true;

    const run = async (soft = false) => {
      try {
        if (!soft) setChecking(true);

        const { data, error } = await supabase.auth.getUser();
        if (!alive) return;

        const user = error ? null : data.user;
        if (!user) {
          setAllowed(false);
          setEmail(null);
          if (!soft) router.replace("/login?next=%2Fadmin%2Fupload");
          return;
        }

        setEmail(user.email ?? null);

        const { data: profile, error: profErr } = await supabase
          .from("profiles")
          .select("role, approved")
          .eq("id", user.id)
          .maybeSingle();

        if (!alive) return;

        const ok = !profErr && !!profile && profile.role === "admin" && profile.approved === true;
        setAllowed(ok);

        if (!ok && !soft) router.replace("/");
      } catch {
        if (!alive) return;
        setAllowed(false);
        if (!soft) router.replace("/");
      } finally {
        if (!alive) return;
        if (!soft) setChecking(false);
      }
    };

    run(false);

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setEmail(u?.email ?? null);

      if (event === "SIGNED_OUT") {
        setAllowed(false);
        router.replace("/login?next=%2Fadmin%2Fupload");
        return;
      }

      // TOKEN_REFRESHED 같은 이벤트로 페이지가 깜빡이지 않게 "soft" 재검사
      run(true);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  // 1) boards 목록 로드 (allowed 이후)
  useEffect(() => {
    if (!allowed) return;
    let alive = true;

    (async () => {
      try {
        // 네가 만든 경로가 다르면 여기만 바꿔
        const res = await fetch("/api/boards/list", { cache: "no-store" });
        const out = await res.json().catch(() => ({}));
        if (!alive) return;

        if (!res.ok || !out?.boards) return;

        const list: BoardOpt[] = out.boards;
        setBoards(list);

        // 기본값 세팅
        const first = list?.[0]?.slug ?? "";
        setBoardSlug((prev) => prev || (list.some(b => b.slug === "atm") ? "atm" : first));
      } catch {
        // 무시: boards 없으면 선택 불가로 남겨둠
      }
    })();

    return () => {
      alive = false;
    };
  }, [allowed]);

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
      // input 초기화
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setPickedFileName(file.name);
    setAutoKind(k);
    setMsg("");

    // 제목이 비어 있으면 파일명(확장자 제거)로 자동 채움(원치 않으면 삭제)
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

      // 자동 결정값 강제 주입 (disabled 필드는 FormData에 안 들어가므로)
      fd.set("boardSlug", boardSlug);
      fd.set("kind", autoKind);

      // 서버에서 원본 파일명을 저장하고 싶으면 같이 보내두자(서버가 받게 만들면 됨)
      if (pickedFileName) fd.set("originalFilename", pickedFileName);

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

  // 권한 확인 중: allowed가 아직 false일 때만 로딩 화면(깜빡임 최소화)
  if (checking && !allowed) {
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

  if (!allowed) return null;

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
                    문서 제목
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
                  <p className={helperClass}>member/admin은 잠금 표시/권한 정책 붙이기 전까진 주의.</p>
                </div>

                <div>
                  <label className={labelClass}>
                    파일 종류(자동)
                    <input
                      className={inputClass}
                      value={autoKind || "파일 선택 필요"}
                      readOnly
                    />
                    {/* 서버로 보내기 */}
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
                    비고(선택)
                    <input name="note" className={inputClass} />
                  </label>
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