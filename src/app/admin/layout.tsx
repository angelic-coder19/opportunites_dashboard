// src/app/admin/layout.tsx
// Admin shell. Intentionally distinct from the public layout — no hero, no
// big footer. Sticky bar with title + logout. Login page renders without this
// chrome because it returns its own <main> at the top level.

import LogoutButton from "./_components/LogoutButton";
import Link from "next/link";

export const metadata = {
  title: "Admin Console | UAPB RIED",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link
              href="/admin"
              className="font-display text-xl tracking-widest uppercase text-black hover:text-[#efa522] transition-colors"
            >
              UAPB Admin
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              <Link
                href="/admin"
                className="font-heading text-[11px] uppercase tracking-widest text-gray-600 hover:text-[#efa522]"
              >
                Opportunities
              </Link>
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-heading text-[11px] uppercase tracking-widest text-gray-600 hover:text-[#efa522]"
              >
                View public site ↗
              </Link>
            </nav>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
