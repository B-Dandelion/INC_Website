import { Suspense } from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
      {children}
    </Suspense>
  );
}