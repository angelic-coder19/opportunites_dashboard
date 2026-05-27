"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  OPPORTUNITY_CATEGORIES,
  OPPORTUNITY_STATUSES,
} from "@/types/admin";
import {
  OpportunityWriteSchema,
  type OpportunityWriteInput,
} from "@/lib/validation/opportunity";
import type { AdminOpportunity } from "@/types/admin";

interface Props {
  mode: "create" | "edit";
  initialValues?: AdminOpportunity;
}

interface FormState {
  title: string;
  institution: string;
  category: (typeof OPPORTUNITY_CATEGORIES)[number];
  status: (typeof OPPORTUNITY_STATUSES)[number];
  summary: string;
  deadline: string; // YYYY-MM-DD
  datePosted: string;
  applicationUrl: string;
  contactEmail: string;
  contactPhone: string;
  tagsRaw: string; // comma-separated
  isFeatured: boolean;
}

function isoDate(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

function initialState(initial?: AdminOpportunity): FormState {
  return {
    title: initial?.title ?? "",
    institution: initial?.institution ?? "",
    category:
      (initial?.category as FormState["category"]) ??
      OPPORTUNITY_CATEGORIES[0],
    status: (initial?.status as FormState["status"]) ?? "active",
    summary: initial?.summary ?? "",
    deadline: isoDate(initial?.deadline ?? null),
    datePosted: isoDate(initial?.datePosted ?? null),
    applicationUrl: initial?.applicationUrl ?? "",
    contactEmail: initial?.contactEmail ?? "",
    contactPhone: initial?.contactPhone ?? "",
    tagsRaw: initial?.tags?.join(", ") ?? "",
    isFeatured: initial?.isFeatured ?? false,
  };
}

function tagsFromRaw(raw: string): string[] {
  const seen = new Set<string>();
  for (const t of raw.split(",")) {
    const trimmed = t.trim();
    if (trimmed) seen.add(trimmed);
  }
  return Array.from(seen);
}

const inputClass =
  "font-body w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#efa522] focus:outline-none focus:ring-2 focus:ring-[#efa522]/30";
const labelClass =
  "font-heading flex flex-col gap-1 text-[10px] uppercase tracking-widest text-gray-600";

export default function OpportunityForm({ mode, initialValues }: Props) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(() =>
    initialState(initialValues)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function buildPayload(): OpportunityWriteInput | null {
    // Empty strings → null for Zod transforms; tags handled separately.
    const raw = {
      title: state.title.trim(),
      institution: state.institution.trim(),
      category: state.category,
      status: state.status,
      summary: state.summary.trim() || null,
      deadline: state.deadline || null,
      datePosted: state.datePosted || null,
      applicationUrl: state.applicationUrl.trim() || null,
      contactEmail: state.contactEmail.trim() || null,
      contactPhone: state.contactPhone.trim() || null,
      tags: tagsFromRaw(state.tagsRaw),
      isFeatured: state.isFeatured,
    };
    const parsed = OpportunityWriteSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString();
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return null;
    }
    setErrors({});
    return parsed.data;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    const payload = buildPayload();
    if (!payload) return;

    setPending(true);
    try {
      const url =
        mode === "create"
          ? "/api/opportunities"
          : `/api/opportunities/${initialValues!.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      // For edit, also send updatedAt for the optimistic-lock check.
      const body =
        mode === "edit" && initialValues
          ? { ...payload, updatedAt: initialValues.updatedAt }
          : payload;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setServerError(
            data?.error ??
              "This row was modified in another tab. Reload and try again."
          );
        } else if (data?.issues) {
          const fieldErrors: Record<string, string> = {};
          for (const issue of data.issues as { path?: string[]; message?: string }[]) {
            const key = issue.path?.[0];
            if (key && issue.message && !fieldErrors[key])
              fieldErrors[key] = issue.message;
          }
          setErrors(fieldErrors);
          setServerError("Validation failed — see fields below.");
        } else {
          setServerError(data?.error ?? `HTTP ${res.status}`);
        }
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Network error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {serverError && (
        <div
          role="alert"
          className="font-body rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {serverError}
        </div>
      )}

      <label className={labelClass}>
        Title
        <input
          className={inputClass}
          value={state.title}
          onChange={(e) => set("title", e.target.value)}
          maxLength={300}
          required
        />
        {errors.title && (
          <span className="text-[11px] normal-case tracking-normal text-red-600">
            {errors.title}
          </span>
        )}
      </label>

      <label className={labelClass}>
        Institution
        <input
          className={inputClass}
          value={state.institution}
          onChange={(e) => set("institution", e.target.value)}
          maxLength={300}
          required
        />
        {errors.institution && (
          <span className="text-[11px] normal-case tracking-normal text-red-600">
            {errors.institution}
          </span>
        )}
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-heading text-[10px] uppercase tracking-widest text-gray-600">
          Category
        </legend>
        {OPPORTUNITY_CATEGORIES.map((c) => (
          <label
            key={c}
            className="font-body inline-flex items-center gap-2 text-sm text-gray-800"
          >
            <input
              type="radio"
              name="category"
              checked={state.category === c}
              onChange={() => set("category", c)}
              className="accent-[#efa522]"
            />
            {c}
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-heading text-[10px] uppercase tracking-widest text-gray-600">
          Status
        </legend>
        {OPPORTUNITY_STATUSES.map((s) => (
          <label
            key={s}
            className="font-body inline-flex items-center gap-2 text-sm text-gray-800"
          >
            <input
              type="radio"
              name="status"
              checked={state.status === s}
              onChange={() => set("status", s)}
              className="accent-[#efa522]"
            />
            {s}
          </label>
        ))}
      </fieldset>

      <label className={labelClass}>
        Summary
        <textarea
          className={inputClass}
          rows={4}
          value={state.summary}
          onChange={(e) => set("summary", e.target.value)}
          maxLength={2000}
        />
        <span className="text-[10px] normal-case tracking-normal text-gray-400">
          {state.summary.length}/2000
        </span>
      </label>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <label className={labelClass}>
          Deadline
          <input
            type="date"
            className={inputClass}
            value={state.deadline}
            onChange={(e) => set("deadline", e.target.value)}
          />
        </label>
        <label className={labelClass}>
          Date Posted
          <input
            type="date"
            className={inputClass}
            value={state.datePosted}
            onChange={(e) => set("datePosted", e.target.value)}
          />
        </label>
      </div>

      <label className={labelClass}>
        Application URL
        <input
          type="url"
          className={inputClass}
          placeholder="https://example.com/apply"
          value={state.applicationUrl}
          onChange={(e) => set("applicationUrl", e.target.value)}
        />
        {errors.applicationUrl && (
          <span className="text-[11px] normal-case tracking-normal text-red-600">
            {errors.applicationUrl}
          </span>
        )}
      </label>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <label className={labelClass}>
          Contact Email
          <input
            type="email"
            className={inputClass}
            value={state.contactEmail}
            onChange={(e) => set("contactEmail", e.target.value)}
          />
          {errors.contactEmail && (
            <span className="text-[11px] normal-case tracking-normal text-red-600">
              {errors.contactEmail}
            </span>
          )}
        </label>
        <label className={labelClass}>
          Contact Phone
          <input
            className={inputClass}
            value={state.contactPhone}
            onChange={(e) => set("contactPhone", e.target.value)}
            maxLength={40}
          />
        </label>
      </div>

      <label className={labelClass}>
        Tags (comma-separated)
        <input
          className={inputClass}
          placeholder="Computer Science, Engineering, Undergraduates"
          value={state.tagsRaw}
          onChange={(e) => set("tagsRaw", e.target.value)}
        />
        <span className="text-[10px] normal-case tracking-normal text-gray-400">
          {tagsFromRaw(state.tagsRaw).length} tag(s) (max 20)
        </span>
      </label>

      <label className="font-body inline-flex items-center gap-2 text-sm text-gray-800">
        <input
          type="checkbox"
          checked={state.isFeatured}
          onChange={(e) => set("isFeatured", e.target.checked)}
          className="accent-[#efa522]"
        />
        Featured (pin to top of public dashboard)
      </label>

      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="font-heading rounded-xl bg-[#efa522] px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-black transition-colors hover:bg-[#d4901e] disabled:opacity-60"
        >
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create"
              : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="font-heading rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-gray-700 hover:border-[#efa522] hover:text-[#efa522]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
