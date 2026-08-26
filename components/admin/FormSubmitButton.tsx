"use client";

import { useFormStatus } from "react-dom";

export default function FormSubmitButton({
  label,
  pendingLabel,
  danger = false,
}: {
  label: string;
  pendingLabel: string;
  danger?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      style={{
        border: danger ? "1px solid #fecaca" : "1px solid #cbd5e1",
        borderRadius: 8,
        padding: "9px 12px",
        background: danger ? "#fff1f2" : "#fff",
        color: danger ? "#be123c" : "#0f172a",
        fontWeight: 800,
        cursor: pending ? "not-allowed" : "pointer",
        opacity: pending ? 0.6 : 1,
      }}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
