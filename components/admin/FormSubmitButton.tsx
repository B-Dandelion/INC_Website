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
      className={`inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        danger
          ? "border-red-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50"
          : "border-[#174A7E] bg-[#174A7E] text-white hover:bg-[#103A66]"
      }`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
