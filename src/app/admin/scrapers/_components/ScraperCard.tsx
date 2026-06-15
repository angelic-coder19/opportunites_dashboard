"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ─── REUFinder / Pathways generic trigger card ────────────────────────────────

interface GenericScraperCardProps {
  label: string;
  sourceKey: "reufinder" | "pathways";
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastRunAdded: number | null;
  totalInDb: number;
}

export function GenericScraperCard({
  label,
  sourceKey,
  lastRunAt,
  lastRunStatus,
  lastRunAdded,
  totalInDb,
}: GenericScraperCardProps) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function runNow() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/scrape/${sourceKey}`, { method: "POST" });
      const data = await res.json();
      if (res.status === 409 || data.busy) {
        setResult(`Already running: ${data.error ?? "Try again in a moment."}`);
      } else if (data.ok) {
        setResult(`Done — ${data.added ?? 0} added, ${data.skipped ?? 0} skipped.`);
        router.refresh();
      } else {
        setResult(`Error: ${data.error ?? "Unknown error"}`);
      }
    } catch (err) {
      setResult(`Network error: ${String(err)}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg tracking-widest uppercase text-black">
            {label}
          </h2>
          <p className="font-body mt-0.5 text-xs text-gray-500">
            {totalInDb} opportunities in database
          </p>
        </div>
        {lastRunStatus && <StatusPill status={lastRunStatus} />}
      </div>

      {lastRunAt && (
        <p className="font-body mb-4 text-xs text-gray-500">
          Last run:{" "}
          {new Date(lastRunAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}{" "}
          {lastRunAdded !== null && `· ${lastRunAdded} added`}
        </p>
      )}

      <button
        onClick={runNow}
        disabled={running}
        className="font-heading rounded-xl bg-[#efa522] px-4 py-2 text-sm font-bold uppercase tracking-wide text-black transition-colors hover:bg-[#d4901e] disabled:opacity-60"
      >
        {running ? "Running…" : "Run Now"}
      </button>

      {result && (
        <p
          className={`font-body mt-3 text-xs ${result.startsWith("Error") ? "text-red-600" : "text-green-700"}`}
        >
          {result}
        </p>
      )}
    </div>
  );
}

// ─── ColorStack card with OTP auth flow ───────────────────────────────────────

interface ColorStackCardProps {
  connected: boolean;
  sessionValid: boolean;
  connectedEmail: string | null;
  allowedEmails: string[];
  sessionCookieName: string;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastRunAdded: number | null;
  totalInDb: number;
}

type OtpStep = "idle" | "sent" | "verifying" | "done";

export function ColorStackCard({
  connected: initialConnected,
  sessionValid: initialSessionValid,
  connectedEmail,
  allowedEmails,
  sessionCookieName,
  lastRunAt,
  lastRunStatus,
  lastRunAdded,
  totalInDb,
}: ColorStackCardProps) {
  const [connected, setConnected] = useState(initialConnected);
  const [sessionValid, setSessionValid] = useState(initialSessionValid);
  const [email, setEmail] = useState(
    connectedEmail ?? allowedEmails[0] ?? ""
  );
  const [otpStep, setOtpStep] = useState<OtpStep>("idle");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
    null
  );
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [cookiePaste, setCookiePaste] = useState("");
  const router = useRouter();

  async function sendOtp() {
    setMessage(null);
    if (!email.trim()) {
      setMessage({ text: "Enter your ColorStack-registered email.", ok: false });
      return;
    }
    setOtpStep("sent");
    try {
      const res = await fetch("/api/admin/colorstack/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!data.ok) {
        setMessage({ text: data.message, ok: false });
        setOtpStep("idle");
      } else {
        setMessage({ text: data.message, ok: true });
      }
    } catch (err) {
      setMessage({ text: String(err), ok: false });
      setOtpStep("idle");
    }
  }

  async function verifyOtp() {
    if (!otp.trim()) return;
    setOtpStep("verifying");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/colorstack/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: otp.trim(), email: email.trim() }),
      });
      const data = await res.json();
      setMessage({ text: data.message, ok: data.ok });
      if (data.ok) {
        setOtpStep("done");
        setConnected(true);
        setSessionValid(true);
        router.refresh();
      } else {
        setOtpStep("sent");
      }
    } catch (err) {
      setMessage({ text: String(err), ok: false });
      setOtpStep("sent");
    }
  }

  async function pasteCookie() {
    if (!cookiePaste.trim()) return;
    setMessage(null);
    try {
      const res = await fetch("/api/admin/colorstack/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookie: cookiePaste.trim() }),
      });
      const data = await res.json();
      setMessage({ text: data.message, ok: data.ok });
      if (data.ok) {
        setConnected(true);
        setSessionValid(true);
        setPasteMode(false);
        router.refresh();
      }
    } catch (err) {
      setMessage({ text: String(err), ok: false });
    }
  }

  async function disconnect() {
    await fetch("/api/admin/colorstack/disconnect", { method: "POST" });
    setConnected(false);
    setSessionValid(false);
    setOtpStep("idle");
    setOtp("");
    setMessage(null);
    router.refresh();
  }

  async function syncNow() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/admin/colorstack/sync", { method: "POST" });
      const data = await res.json();
      if (data.authError || res.status === 401) {
        setSessionValid(false);
        setConnected(false);
        setSyncResult("ColorStack session expired — reconnect with OTP or paste a fresh cookie.");
      } else if (res.status === 409 || data.busy) {
        setSyncResult(`Already running: ${data.error ?? "Try again in a moment."}`);
      } else if (data.ok) {
        setSyncResult(`Done — ${data.added ?? 0} added, ${data.skipped ?? 0} skipped.`);
        router.refresh();
      } else {
        setSyncResult(`Error: ${data.error ?? "Unknown"}`);
      }
    } catch (err) {
      setSyncResult(String(err));
    } finally {
      setSyncing(false);
    }
  }

  const showConnected = connected && sessionValid;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg tracking-widest uppercase text-black">
            ColorStack
          </h2>
          <p className="font-body mt-0.5 text-xs text-gray-500">
            {totalInDb} opportunities in database
          </p>
          {connectedEmail && showConnected && (
            <p className="font-body mt-1 text-xs text-gray-500">
              Connected as {connectedEmail}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastRunStatus && <StatusPill status={lastRunStatus} />}
          <span
            className={`font-heading inline-block rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${
              showConnected
                ? "border-green-200 bg-green-50 text-green-700"
                : connected && !sessionValid
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-gray-200 bg-gray-100 text-gray-500"
            }`}
          >
            {showConnected
              ? "Connected"
              : connected && !sessionValid
                ? "Expired"
                : "Not connected"}
          </span>
        </div>
      </div>

      {lastRunAt && (
        <p className="font-body mb-4 text-xs text-gray-500">
          Last sync:{" "}
          {new Date(lastRunAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}{" "}
          {lastRunAdded !== null && `· ${lastRunAdded} added`}
        </p>
      )}

      {showConnected ? (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={syncNow}
            disabled={syncing}
            className="font-heading rounded-xl bg-[#efa522] px-4 py-2 text-sm font-bold uppercase tracking-wide text-black transition-colors hover:bg-[#d4901e] disabled:opacity-60"
          >
            {syncing ? "Syncing…" : "Sync Now"}
          </button>
          <button
            onClick={disconnect}
            className="font-heading rounded-xl border border-gray-300 px-4 py-2 text-sm uppercase tracking-wide text-gray-700 hover:border-red-300 hover:text-red-600"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {connected && !sessionValid && (
            <p className="font-body rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              A stored cookie exists but ColorStack rejected it. Reconnect below
              — no need to disconnect first unless you want to clear the old
              cookie.
            </p>
          )}

          {otpStep === "idle" && (
            <div className="space-y-3">
              <div>
                <label className="font-heading mb-1 block text-[10px] uppercase tracking-widest text-gray-500">
                  ColorStack email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@uapb.edu"
                  className="font-body w-full max-w-sm rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#efa522] focus:outline-none"
                />
                <p className="font-body mt-1 text-[11px] text-gray-400">
                  Must be registered with ColorStack. Allowed:{" "}
                  {allowedEmails.join(", ")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={sendOtp}
                  disabled={!email.trim()}
                  className="font-heading rounded-xl bg-[#efa522] px-4 py-2 text-sm font-bold uppercase tracking-wide text-black transition-colors hover:bg-[#d4901e] disabled:opacity-60"
                >
                  Send OTP
                </button>
                <button
                  onClick={() => setPasteMode((p) => !p)}
                  className="font-heading rounded-xl border border-gray-300 px-4 py-2 text-sm uppercase tracking-wide text-gray-600 hover:border-[#efa522] hover:text-[#efa522]"
                >
                  Paste cookie manually
                </button>
              </div>
            </div>
          )}

          {otpStep === "sent" && (
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="font-heading mb-1 block text-[10px] uppercase tracking-widest text-gray-500">
                  Enter OTP sent to {email}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="font-body w-36 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#efa522] focus:outline-none"
                />
              </div>
              <button
                onClick={verifyOtp}
                disabled={!otp.trim()}
                className="font-heading rounded-xl bg-[#efa522] px-4 py-2 text-sm font-bold uppercase tracking-wide text-black transition-colors hover:bg-[#d4901e] disabled:opacity-60"
              >
                Verify
              </button>
              <button
                onClick={() => {
                  setOtpStep("idle");
                  setOtp("");
                  setMessage(null);
                }}
                className="font-heading rounded-xl border border-gray-300 px-4 py-2 text-sm uppercase tracking-wide text-gray-600"
              >
                Cancel
              </button>
            </div>
          )}

          {otpStep === "verifying" && (
            <p className="font-body text-sm text-gray-600">Verifying…</p>
          )}

          {pasteMode && otpStep === "idle" && (
            <div className="space-y-2">
              <label className="font-heading block text-[10px] uppercase tracking-widest text-gray-500">
                Paste session cookie from browser DevTools
              </label>
              <p className="font-body text-xs text-gray-500">
                Chrome DevTools → Application → Cookies → app.colorstack.io.
                Paste the <strong>value</strong> of{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-[11px]">
                  {sessionCookieName}
                </code>{" "}
                (we add the name automatically), or paste all cookies as{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-[11px]">
                  name=value; name2=value2
                </code>
                . The cookie is verified against ColorStack before saving.
              </p>
              <textarea
                value={cookiePaste}
                onChange={(e) => setCookiePaste(e.target.value)}
                rows={3}
                placeholder={`${sessionCookieName}=eyJ…`}
                className="font-body w-full rounded-lg border border-gray-300 p-2 text-xs focus:border-[#efa522] focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={pasteCookie}
                  disabled={!cookiePaste.trim()}
                  className="font-heading rounded-xl bg-[#efa522] px-4 py-2 text-sm font-bold uppercase tracking-wide text-black transition-colors hover:bg-[#d4901e] disabled:opacity-60"
                >
                  Verify &amp; Save Cookie
                </button>
                <button
                  onClick={() => {
                    setPasteMode(false);
                    setCookiePaste("");
                    setMessage(null);
                  }}
                  className="font-heading rounded-xl border border-gray-300 px-4 py-2 text-sm uppercase tracking-wide text-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {message && (
        <p
          className={`font-body mt-3 text-xs ${message.ok ? "text-green-700" : "text-red-600"}`}
        >
          {message.text}
        </p>
      )}
      {syncResult && (
        <p
          className={`font-body mt-3 text-xs ${syncResult.startsWith("Error") || syncResult.includes("expired") ? "text-red-600" : "text-green-700"}`}
        >
          {syncResult}
        </p>
      )}
    </div>
  );
}

// ─── Workday card with browser bridge / cURL / token connect ───────────────

type WorkdayConnectTab = "browser" | "curl" | "token";

interface WorkdayCardProps {
  connected: boolean;
  connectMode: "curl" | "token" | "bridge" | null;
  hasServerSession: boolean;
  sessionValid: boolean;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastRunAdded: number | null;
  totalInDb: number;
}

export function WorkdayCard({
  connected: initialConnected,
  connectMode: initialConnectMode,
  hasServerSession: initialHasServerSession,
  sessionValid: initialSessionValid,
  lastRunAt,
  lastRunStatus,
  lastRunAdded,
  totalInDb,
}: WorkdayCardProps) {
  const [connected, setConnected] = useState(initialConnected);
  const [connectMode, setConnectMode] = useState(initialConnectMode);
  const [hasServerSession, setHasServerSession] = useState(initialHasServerSession);
  const [sessionValid, setSessionValid] = useState(initialSessionValid);
  const [tab, setTab] = useState<WorkdayConnectTab>("browser");
  const [tokenInput, setTokenInput] = useState("");
  const [curlInput, setCurlInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [bridgeLoading, setBridgeLoading] = useState(false);
  const [bridgeScript, setBridgeScript] = useState<string | null>(null);
  const [bridgeExpiresAt, setBridgeExpiresAt] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const router = useRouter();

  async function connectToken() {
    if (!tokenInput.trim()) return;
    setConnecting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/workday/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "token", token: tokenInput.trim() }),
      });
      const data = await res.json();
      setMessage({ text: data.message, ok: data.ok });
      if (data.ok) {
        setConnected(true);
        setConnectMode("token");
        setHasServerSession(true);
        setSessionValid(true);
        setTokenInput("");
        router.refresh();
      }
    } catch (err) {
      setMessage({ text: String(err), ok: false });
    } finally {
      setConnecting(false);
    }
  }

  async function connectCurl() {
    if (!curlInput.trim()) return;
    setConnecting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/workday/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "curl", curl: curlInput.trim() }),
      });
      const data = await res.json();
      setMessage({ text: data.message, ok: data.ok });
      if (data.ok) {
        setConnected(true);
        setConnectMode("curl");
        setHasServerSession(true);
        setSessionValid(true);
        setCurlInput("");
        router.refresh();
      }
    } catch (err) {
      setMessage({ text: String(err), ok: false });
    } finally {
      setConnecting(false);
    }
  }

  async function loadBridgeScript() {
    setBridgeLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/workday/bridge-code");
      const data = await res.json();
      if (!data.ok) {
        setMessage({ text: data.message ?? "Could not generate bridge code.", ok: false });
        return;
      }
      setBridgeScript(data.script);
      setBridgeExpiresAt(data.expiresAt);
      setMessage({
        text: "Script ready — paste it into the Workday browser console (see steps below).",
        ok: true,
      });
    } catch (err) {
      setMessage({ text: String(err), ok: false });
    } finally {
      setBridgeLoading(false);
    }
  }

  async function copyBridgeScript() {
    if (!bridgeScript) return;
    await navigator.clipboard.writeText(bridgeScript);
    setMessage({ text: "Script copied to clipboard.", ok: true });
  }

  async function disconnect() {
    await fetch("/api/admin/workday/disconnect", { method: "POST" });
    setConnected(false);
    setConnectMode(null);
    setHasServerSession(false);
    setSessionValid(false);
    setBridgeScript(null);
    setBridgeExpiresAt(null);
    setMessage(null);
    setSyncResult(null);
    router.refresh();
  }

  async function syncNow() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/admin/workday/sync", { method: "POST" });
      const data = await res.json();
      if (data.authError || res.status === 401) {
        setSessionValid(false);
        setSyncResult("Workday session expired — reconnect with cURL or Browser connect.");
      } else if (res.status === 409 || data.busy) {
        setSyncResult(`Already running: ${data.error ?? "Try again in a moment."}`);
      } else if (data.ok) {
        setSyncResult(
          `Done — ${data.added ?? 0} added, ${data.skipped ?? 0} skipped, ${data.filtered ?? 0} non-UAPB filtered.`
        );
        router.refresh();
      } else {
        setSyncResult(`Error: ${data.error ?? data.message ?? "Unknown"}`);
      }
    } catch (err) {
      setSyncResult(String(err));
    } finally {
      setSyncing(false);
    }
  }

  const isServerConnected = hasServerSession && sessionValid;
  const isBridgeConnected = connectMode === "bridge";
  const statusLabel = isServerConnected
    ? connectMode === "curl"
      ? "Connected (cURL)"
      : "Connected (server)"
    : isBridgeConnected
      ? "Connected (browser)"
      : connected && !sessionValid
        ? "Expired"
        : "Not connected";

  const tabBtn = (id: WorkdayConnectTab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`font-heading rounded-lg px-3 py-1.5 text-[10px] uppercase tracking-widest transition-colors ${
        tab === id
          ? "bg-[#efa522] text-black"
          : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg tracking-widest uppercase text-black">
            Workday Talent Marketplace
          </h2>
          <p className="font-body mt-0.5 text-xs text-gray-500">
            {totalInDb} opportunities in database · UAPB on-campus jobs only
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastRunStatus && <StatusPill status={lastRunStatus} />}
          <span
            className={`font-heading inline-block rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${
              isServerConnected || isBridgeConnected
                ? "border-green-200 bg-green-50 text-green-700"
                : connected && !sessionValid
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-gray-200 bg-gray-100 text-gray-500"
            }`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      {lastRunAt && (
        <p className="font-body mb-4 text-xs text-gray-500">
          Last sync:{" "}
          {new Date(lastRunAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}{" "}
          {lastRunAdded !== null && `· ${lastRunAdded} added`}
        </p>
      )}

      {isServerConnected || isBridgeConnected ? (
        <div className="space-y-3">
          {isBridgeConnected && (
            <p className="font-body rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
              Sync runs from your browser. Open Jobs Hub on Workday, generate a new script below,
              paste it in DevTools → Console, scroll the job list once, then run the script again.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {isServerConnected && (
              <button
                onClick={syncNow}
                disabled={syncing}
                className="font-heading rounded-xl bg-[#efa522] px-4 py-2 text-sm font-bold uppercase tracking-wide text-black transition-colors hover:bg-[#d4901e] disabled:opacity-60"
              >
                {syncing ? "Syncing…" : "Sync Now"}
              </button>
            )}
            {isBridgeConnected && (
              <>
                <button
                  onClick={loadBridgeScript}
                  disabled={bridgeLoading}
                  className="font-heading rounded-xl bg-[#efa522] px-4 py-2 text-sm font-bold uppercase tracking-wide text-black transition-colors hover:bg-[#d4901e] disabled:opacity-60"
                >
                  {bridgeLoading ? "Generating…" : "Generate sync script"}
                </button>
                {bridgeScript && (
                  <button
                    onClick={copyBridgeScript}
                    className="font-heading rounded-xl border border-gray-300 px-4 py-2 text-sm uppercase tracking-wide text-gray-700 hover:border-[#efa522]"
                  >
                    Copy script
                  </button>
                )}
              </>
            )}
            <button
              onClick={disconnect}
              className="font-heading rounded-xl border border-gray-300 px-4 py-2 text-sm uppercase tracking-wide text-gray-700 hover:border-red-300 hover:text-red-600"
            >
              Disconnect
            </button>
          </div>
          {bridgeScript && (
            <div>
              {bridgeExpiresAt && (
                <p className="font-body mb-1 text-[11px] text-gray-500">
                  Code expires {new Date(bridgeExpiresAt).toLocaleTimeString()}
                </p>
              )}
              <textarea
                readOnly
                value={bridgeScript}
                rows={8}
                className="font-mono w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-[10px] leading-relaxed"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {connected && !sessionValid && (
            <p className="font-body rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Stored session was rejected. Token-only often fails from the server — use Browser
              connect or paste the full searchJobs cURL.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {tabBtn("browser", "Browser (recommended)")}
            {tabBtn("curl", "Paste cURL")}
            {tabBtn("token", "Token only")}
          </div>

          {tab === "browser" && (
            <div className="space-y-3">
              <ol className="font-body list-decimal space-y-1 pl-4 text-xs text-gray-600">
                <li>
                  Log into{" "}
                  <a
                    href="https://wd5.myworkday.com/uasys/d/task/2998$42366.htmld"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#efa522] underline"
                  >
                    Workday Jobs Hub
                  </a>{" "}
                  in Chrome.
                </li>
                <li>Click &quot;Generate connect script&quot; below, then copy it.</li>
                <li>Open DevTools → Console on the Workday tab and paste the script.</li>
                <li>Scroll or filter jobs once, then paste and run the script again.</li>
              </ol>
              <button
                onClick={loadBridgeScript}
                disabled={bridgeLoading}
                className="font-heading rounded-xl bg-[#efa522] px-4 py-2 text-sm font-bold uppercase tracking-wide text-black transition-colors hover:bg-[#d4901e] disabled:opacity-60"
              >
                {bridgeLoading ? "Generating…" : "Generate connect script"}
              </button>
              {bridgeScript && (
                <>
                  {bridgeExpiresAt && (
                    <p className="font-body text-[11px] text-gray-500">
                      Code expires {new Date(bridgeExpiresAt).toLocaleTimeString()}
                    </p>
                  )}
                  <textarea
                    readOnly
                    value={bridgeScript}
                    rows={10}
                    className="font-mono w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-[10px] leading-relaxed"
                  />
                  <button
                    onClick={copyBridgeScript}
                    className="font-heading rounded-xl border border-gray-300 px-4 py-2 text-sm uppercase tracking-wide text-gray-700 hover:border-[#efa522]"
                  >
                    Copy script
                  </button>
                </>
              )}
            </div>
          )}

          {tab === "curl" && (
            <div className="space-y-3">
              <p className="font-body text-xs text-gray-500">
                On Jobs Hub, open DevTools → Network → click a{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-[11px]">searchJobs</code>{" "}
                request → right-click → Copy → Copy as cURL. Paste the entire command below. This
                includes all headers the server needs and enables automatic daily sync.
              </p>
              <textarea
                value={curlInput}
                onChange={(e) => setCurlInput(e.target.value)}
                rows={6}
                placeholder="curl 'https://wd5.myworkday.com/uasys/internalapi/.../searchJobs?...' -H 'session-secure-token: ...' ..."
                className="font-mono w-full rounded-lg border border-gray-300 p-2 text-[10px] focus:border-[#efa522] focus:outline-none"
              />
              <button
                onClick={connectCurl}
                disabled={connecting || !curlInput.trim()}
                className="font-heading rounded-xl bg-[#efa522] px-4 py-2 text-sm font-bold uppercase tracking-wide text-black transition-colors hover:bg-[#d4901e] disabled:opacity-60"
              >
                {connecting ? "Verifying…" : "Connect with cURL"}
              </button>
            </div>
          )}

          {tab === "token" && (
            <div className="space-y-3">
              <p className="font-body text-xs text-gray-500">
                Paste only the{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-[11px]">session-secure-token</code>{" "}
                header value. This often fails from the server; use Browser or cURL if connect fails.
              </p>
              <textarea
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                rows={3}
                placeholder="Paste session-secure-token value here…"
                className="font-body w-full rounded-lg border border-gray-300 p-2 text-xs focus:border-[#efa522] focus:outline-none"
              />
              <button
                onClick={connectToken}
                disabled={connecting || !tokenInput.trim()}
                className="font-heading rounded-xl border border-gray-300 px-4 py-2 text-sm uppercase tracking-wide text-gray-700 hover:border-[#efa522] disabled:opacity-60"
              >
                {connecting ? "Verifying…" : "Connect with token"}
              </button>
            </div>
          )}
        </div>
      )}

      {message && (
        <p className={`font-body mt-3 text-xs ${message.ok ? "text-green-700" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
      {syncResult && (
        <p
          className={`font-body mt-3 text-xs ${
            syncResult.startsWith("Error") || syncResult.includes("expired")
              ? "text-red-600"
              : "text-green-700"
          }`}
        >
          {syncResult}
        </p>
      )}
    </div>
  );
}

// ─── Shared status pill ───────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: "bg-green-50 text-green-700 border-green-200",
    failed: "bg-red-50 text-red-700 border-red-200",
    running: "bg-blue-50 text-blue-700 border-blue-200",
    skipped: "bg-gray-100 text-gray-500 border-gray-200",
  };
  return (
    <span
      className={`font-heading inline-block rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${map[status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}
    >
      {status}
    </span>
  );
}
