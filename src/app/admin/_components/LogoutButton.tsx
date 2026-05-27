"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="font-heading rounded-lg border border-gray-300 px-3 py-1.5 text-[11px] uppercase tracking-widest text-gray-700 hover:border-[#efa522] hover:text-[#efa522] transition-colors disabled:opacity-60"
    >
      {pending ? "…" : "Log out"}
    </button>
  );
}
