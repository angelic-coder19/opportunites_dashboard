"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  id: string;
  /** Whether the underlying row is hard-deletable (source === 'manual'). */
  enabled: boolean;
  title: string;
}

export default function DeleteButton({ id, enabled, title }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!enabled) return;
    if (
      !window.confirm(
        `Permanently delete "${title}"? This cannot be undone.`
      )
    )
      return;

    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/opportunities/${id}`, { method: "DELETE" });
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
        disabled={!enabled || pending}
        title={
          enabled
            ? "Permanently delete this row"
            : "Scraped rows cannot be deleted — archive instead"
        }
        className="font-heading rounded-md border border-red-200 px-2 py-1 text-[10px] uppercase tracking-widest text-red-700 hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "…" : "Delete"}
      </button>
      {error && (
        <span className="font-body text-[10px] text-red-600">{error}</span>
      )}
    </span>
  );
}
