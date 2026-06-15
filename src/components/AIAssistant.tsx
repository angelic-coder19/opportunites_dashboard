"use client";
// src/components/AIAssistant.tsx
// Floating AI chat assistant. Matches UAPB brand: gold trigger, black header,
// Open Sans messages, Bebas Neue / Archivo for headings/labels.

import { useState, useRef, useEffect, useCallback } from "react";
import { X, MessageCircle, Send, Bot, User, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
}

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content:
    "Hi! I'm the UAPB Opportunities Assistant 👋\n\nI can help you explore research programs, on-campus jobs, application tips, and navigate this dashboard. What would you like to know?",
};

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom whenever messages change or panel opens
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg]
            .filter((m) => !m.isError)
            .map(({ role, content }) => ({ role, content })),
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error, isError: true },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "This service is not available at the moment. Please try again later or contact us at ried@uapb.edu.",
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      {/* ── Chat panel ──────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed bottom-20 right-4 sm:right-6 z-50 flex flex-col w-[calc(100vw-2rem)] max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-gray-200"
          style={{ height: "min(520px, calc(100vh - 120px))" }}
          role="dialog"
          aria-label="UAPB Opportunities Assistant"
        >
          {/* Header — black with gold accent */}
          <div className="flex items-center justify-between bg-[#0a0a0a] px-4 py-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efa522]">
                <Bot className="h-4 w-4 text-black" strokeWidth={2.5} />
              </div>
              <div>
                <p className="font-display text-sm tracking-widest uppercase text-white leading-none">
                  UAPB Assistant
                </p>
                <p className="font-body text-[10px] text-gray-400 mt-0.5">
                  Opportunities · RIED
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Gold separator */}
          <div className="h-0.5 bg-[#efa522] shrink-0" />

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className={`shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-[10px] ${
                    msg.role === "user"
                      ? "bg-[#efa522] text-black"
                      : "bg-[#0a0a0a] text-white"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="h-3.5 w-3.5" />
                  ) : (
                    <Bot className="h-3.5 w-3.5" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap font-body ${
                    msg.role === "user"
                      ? "bg-[#efa522] text-black rounded-br-sm"
                      : msg.isError
                      ? "bg-red-50 text-red-700 border border-red-200 rounded-bl-sm"
                      : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex items-end gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0a0a0a] text-white">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-white border border-gray-100 px-3.5 py-3 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="shrink-0 border-t border-gray-200 bg-white px-3 py-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about opportunities…"
                rows={1}
                disabled={loading}
                className="font-body flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#efa522] focus:outline-none focus:ring-1 focus:ring-[#efa522] disabled:opacity-60 max-h-24"
                style={{ lineHeight: "1.5" }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                aria-label="Send message"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#efa522] text-black transition-colors hover:bg-[#d4901e] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" strokeWidth={2.5} />
                )}
              </button>
            </div>
            <p className="font-body mt-1.5 text-center text-[10px] text-gray-400">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      )}

      {/* ── Floating trigger button ─────────────────────────────── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Open AI assistant"}
        className={`fixed bottom-4 right-4 sm:right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#efa522] focus:ring-offset-2 ${
          open
            ? "bg-[#0a0a0a] text-[#efa522]"
            : "bg-[#efa522] text-black"
        }`}
      >
        {open ? (
          <X className="h-6 w-6" strokeWidth={2.5} />
        ) : (
          <MessageCircle className="h-6 w-6" strokeWidth={2.5} />
        )}

        {/* Pulse ring when closed */}
        {!open && (
          <span className="absolute inset-0 rounded-full bg-[#efa522] animate-ping opacity-30" />
        )}
      </button>
    </>
  );
}
