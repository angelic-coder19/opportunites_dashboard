"use client";
// src/components/ShareButton.tsx
// Share an opportunity to WhatsApp, X, Facebook, LinkedIn, or copy the link.
// On mobile browsers that support the Web Share API, the native sheet is used
// directly. On desktop the dropdown opens instead.

import { useState, useRef, useEffect } from "react";
import {
  Share2,
  Link2,
  Check,
  X,
} from "lucide-react";

interface ShareButtonProps {
  url: string;
  title: string;
  /** Concise, pre-formatted message body (not the full summary). */
  text?: string;
  /** "icon" (default) = small ghost icon button; "button" = full pill button */
  variant?: "icon" | "button";
}

// Social platform configs
const PLATFORMS = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    color: "#25D366",
    bg: "hover:bg-[#25D366]/10 hover:text-[#128C7E]",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
    href: (url: string, text: string) =>
      `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`,
  },
  {
    key: "twitter",
    label: "X / Twitter",
    color: "#000000",
    bg: "hover:bg-gray-100 hover:text-black",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.261 5.635 5.903-5.635zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    href: (url: string, text: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    key: "facebook",
    label: "Facebook",
    color: "#1877F2",
    bg: "hover:bg-[#1877F2]/10 hover:text-[#1877F2]",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    href: (url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    color: "#0A66C2",
    bg: "hover:bg-[#0A66C2]/10 hover:text-[#0A66C2]",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    href: (url: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
];

export default function ShareButton({
  url,
  title,
  text,
  variant = "icon",
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const shareText = text ?? title;

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function handleClick() {
    // Prefer native Web Share API (shows native sheet on mobile)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url });
        return;
      } catch {
        // User cancelled or API unavailable — fall through to dropdown
      }
    }
    setOpen((v) => !v);
  }

  async function copyLink() {
    const clipboardText = `${shareText}\n\n${url}`;
    try {
      await navigator.clipboard.writeText(clipboardText);
    } catch {
      const el = document.createElement("textarea");
      el.value = clipboardText;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setOpen(false);
  }

  const trigger =
    variant === "button" ? (
      <button
        onClick={handleClick}
        className="font-heading flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold tracking-wide text-gray-700 hover:border-[#efa522] hover:text-[#efa522] transition-colors focus:outline-none focus:ring-2 focus:ring-[#efa522] focus:ring-offset-2"
      >
        <Share2 className="h-4 w-4" />
        Share
      </button>
    ) : (
      <button
        onClick={handleClick}
        aria-label="Share this opportunity"
        className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-[#efa522]"
      >
        <Share2 className="h-4 w-4" />
      </button>
    );

  return (
    <div ref={containerRef} className="relative">
      {trigger}

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-52 rounded-2xl border border-gray-100 bg-white shadow-xl py-2"
          role="menu"
        >
          <div className="flex items-center justify-between px-4 py-1.5 mb-1">
            <span className="font-heading text-[10px] uppercase tracking-widest text-gray-400">
              Share via
            </span>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-0.5 text-gray-300 hover:text-gray-500 transition"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {PLATFORMS.map((p) => (
            <a
              key={p.key}
              href={p.href(url, shareText)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              role="menuitem"
              className={`flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors ${p.bg}`}
            >
              {p.icon}
              <span className="font-body">{p.label}</span>
            </a>
          ))}

          <hr className="my-1.5 border-gray-100" />

          <button
            onClick={copyLink}
            role="menuitem"
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Link2 className="h-4 w-4 text-gray-400" />
            )}
            <span className={`font-body ${copied ? "text-green-600" : ""}`}>
              {copied ? "Copied to clipboard!" : "Copy link"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
