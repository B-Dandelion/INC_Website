"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { cn } from "./cn";

export type ToastTone = "success" | "error" | "info";
type ToastItem = { id: number; tone: ToastTone; message: string };
type ToastFn = (message: string, tone?: ToastTone) => void;

const ToastContext = createContext<ToastFn | null>(null);

const toneStyle: Record<ToastTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-slate-200 bg-white text-slate-900",
};

const toneIcon: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />,
  error: <CircleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />,
  info: <Info className="h-4 w-4 shrink-0" aria-hidden="true" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback<ToastFn>(
    (message, tone = "info") => {
      const id = nextId.current++;
      setItems((current) => [...current.slice(-3), { id, tone, message }]);
      // Errors stay until dismissed; other messages fade after a few seconds.
      if (tone !== "error") window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-5 right-5 z-50 grid w-[min(380px,calc(100vw-2.5rem))] gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            role={item.tone === "error" ? "alert" : "status"}
            className={cn("pointer-events-auto flex items-start gap-2.5 border px-4 py-3 text-sm shadow-[0_10px_30px_rgba(15,23,42,0.12)]", toneStyle[item.tone])}
          >
            {toneIcon[item.tone]}
            <p className="min-w-0 flex-1 whitespace-pre-line leading-5">{item.message}</p>
            <button type="button" onClick={() => dismiss(item.id)} className="rounded p-0.5 opacity-70 hover:opacity-100" aria-label="알림 닫기">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastFn {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error("useToast must be used inside <ToastProvider>");
  return toast;
}
