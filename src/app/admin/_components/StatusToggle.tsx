"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OpportunityStatus } from "@/types/admin";

interface Props {
  id: string;
  currentStatus: OpportunityStatus;
}

export default function StatusToggle({ id, currentStatus }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toggle between active and archived. Draft rows go to active (the typical
  // "publish" action). Pure restore from archived also goes to active.
  const nextStatus: OpportunityStatus =
    currentStatus === "archived" ? "active" : "archived";

  const label =
    currentStatus === "archived"
      ? "Restore"
      : currentStatus === "draft"
        ? "Publish"
        : "Archive";

  async function onClick() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/opportunities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? `HTTP ${res.status}`);
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button
        onClick={onClick}
        disabled={pending}
        title={`Set status to ${nextStatus}`}
        className="font-heading rounded-md border border-gray-300 px-2 py-1 text-[10px] uppercase tracking-widest text-gray-700 hover:border-[#efa522] hover:text-[#efa522] disabled:opacity-50"
      >
        {pending ? "…" : label}
      </button>
      {error && (
        <span className="font-body text-[10px] text-red-600">{error}</span>
      )}
    </span>
  );
}
