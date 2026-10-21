"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

export type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

const ConfirmContext = createContext<ConfirmFn | null>(null);

// Promise-based replacement for window.confirm built on <dialog>, so focus
// trapping and Escape-to-cancel follow the platform defaults.
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const confirm = useCallback<ConfirmFn>(
    (options) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (pending && dialog && !dialog.open) dialog.showModal();
  }, [pending]);

  const settle = useCallback(
    (ok: boolean) => {
      pending?.resolve(ok);
      setPending(null);
      if (dialogRef.current?.open) dialogRef.current.close();
    },
    [pending],
  );

  const danger = pending?.tone === "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialogRef}
        onCancel={(event) => {
          event.preventDefault();
          settle(false);
        }}
        aria-labelledby="admin-confirm-title"
        className="w-[min(440px,calc(100vw-2.5rem))] border border-slate-200 bg-white p-0 shadow-[0_20px_60px_rgba(15,23,42,0.25)] backdrop:bg-slate-900/40"
      >
        {pending ? (
          <div className="grid gap-4 p-6">
            <div className="flex items-start gap-3">
              {danger ? (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-700">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                </div>
              ) : null}
              <div className="min-w-0">
                <h2 id="admin-confirm-title" className="text-base font-semibold text-slate-950">{pending.title}</h2>
                {pending.description ? <div className="mt-1.5 text-sm leading-6 text-slate-600">{pending.description}</div> : null}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={() => settle(false)} autoFocus>{pending.cancelLabel ?? "취소"}</Button>
              <Button variant={danger ? "danger" : "primary"} onClick={() => settle(true)}>
                {pending.confirmLabel ?? "확인"}
              </Button>
            </div>
          </div>
        ) : null}
      </dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return confirm;
}
