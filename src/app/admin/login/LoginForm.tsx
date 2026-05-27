"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push(next);
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(
        res.status === 429
          ? "Too many attempts. Try again in a few minutes."
          : data?.error ?? "Login failed"
      );
    } catch {
      setError("Network error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="font-heading flex flex-col gap-1 text-xs uppercase tracking-widest text-gray-600">
        Password
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="font-body rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#efa522] focus:outline-none focus:ring-2 focus:ring-[#efa522]/40"
        />
      </label>

      {error && (
        <p
          role="alert"
          className="font-body rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="font-heading rounded-xl bg-[#efa522] px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-black transition-colors hover:bg-[#d4901e] focus:outline-none focus:ring-2 focus:ring-[#efa522]/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
