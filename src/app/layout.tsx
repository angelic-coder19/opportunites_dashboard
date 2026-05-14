// src/app/layout.tsx

import type { Metadata } from "next";
import Image from "next/image";
import { Bebas_Neue, Archivo, Open_Sans } from "next/font/google";
import "./globals.css";

// ── Google Fonts ────────────────────────────────────────────────────────────
const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-opensans",
  display: "swap",
});

// ── Metadata ────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Opportunities Dashboard | UAPB RIED",
  description:
    "Centralized directory of on-campus and off-campus research opportunities for University of Arkansas at Pine Bluff students.",
};

// ── Layout ──────────────────────────────────────────────────────────────────
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${bebasNeue.variable} ${archivo.variable} ${openSans.variable}`}
    >
      <body className="min-h-screen flex flex-col bg-white text-black antialiased font-body">

        {/* ══════════════════════════════════════════════════════
            MAIN HEADER — gold nav bar + white breadcrumb ribbon
            Both rows live inside <header> so the entire block
            is sticky together as one unit.

            Shield geometry (why ribbon height = 84px):
              Gold bar height  =  72 px
              Shield height    = 156 px
              Overhang below   =  84 px  ← ribbon absorbs exactly this
              White ribbon h   =  84 px  ← shield tip lands at its bottom
        ══════════════════════════════════════════════════════ */}
        <header className="sticky top-0 z-50 shadow-md">

          {/* ── Row 1: Gold navigation bar ───────────────────── */}
          <div className="bg-[#efa522]">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="relative flex items-center h-[80px]">

                {/* Space reserved for the shield */}
                <div className="w-36 shrink-0" />

                {/* Nav links */}
                <nav className="hidden md:flex items-center gap-6">
                  {["About", "Administration", "Admissions", "Academics", "Campus Life"].map(
                    (item) => (
                      <a
                        key={item}
                        href="#"
                        className="font-heading text-black text-[13px] font-bold tracking-widest uppercase hover:text-white transition-colors whitespace-nowrap"
                      >
                        {item}
                      </a>
                    )
                  )}
                </nav>

                {/* Right wordmark */}
                <div className="ml-auto hidden lg:flex flex-col items-end leading-none">
                  <span className="font-display text-black text-2xl tracking-widest uppercase leading-none">
                    University of Arkansas at Pine Bluff
                  </span>
                  <span className="font-heading text-black/60 text-[11px] tracking-widest uppercase mt-0.5">
                    Office of Research, Innovation &amp; Economic Development
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Row 2: White breadcrumb ribbon ───────────────────
              Height = 84px = exact overhang of the shield (156-72).
              The shield tip lands at the very bottom of this ribbon,
              so it never overlaps the hero section or its text.
          ──────────────────────────────────────────────────── */}
          <div className="bg-white border-b border-gray-200" style={{ height: "50px" }}>
            <div className="mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-8 flex items-center">
              <nav
                aria-label="Breadcrumb"
                className="hidden md:flex items-center gap-1.5 font-body text-xs text-gray-500"
                style={{ marginLeft: "148px" }}
              >
                <a
                  href="https://www.uapb.edu"
                  className="hover:text-[#efa522] transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Home
                </a>
                <span className="text-gray-300" aria-hidden="true">/</span>
                <a href="#" className="hover:text-[#efa522] transition-colors">
                  RIED
                </a>
                <span className="text-gray-300" aria-hidden="true">/</span>
                <span className="text-[#efa522] font-semibold" aria-current="page">
                  Opportunities Dashboard
                </span>
              </nav>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
              SHIELD PENDANT LOGO
              Absolutely positioned within <header>, spanning
              both the gold bar and the white ribbon.

              FIX — White border via double-clipPath:
              CSS border is clipped away by clipPath, so we use
              two nested divs that share the same polygon shape:
                • Outer div (white)  126 × 164 px  ← the "border"
                • Inner div (black)  118 × 156 px, inset 4px
              The 4px white ring between them is the visible border.

              Logo: public/images/UAPB-web-logo_Gold.svg
          ════════════════════════════════════════════════════ */}
          <div
            className="absolute top-0 left-6 md:left-10 lg:left-16"
            style={{ zIndex: 70 }}
          >
            {/* Outer white border layer */}
            <div
              style={{
                width: "126px",
                height: "164px",
                clipPath: "polygon(0 0, 100% 0, 100% 74%, 50% 100%, 0 74%)",
                background: "white",
                position: "relative",
              }}
            >
              {/* Inner black shield, inset 4px to expose white border */}
              <div
                style={{
                  position: "absolute",
                  top: "4px",
                  left: "4px",
                  width: "118px",
                  height: "156px",
                  clipPath: "polygon(0 0, 100% 0, 100% 74%, 50% 100%, 0 74%)",
                  background: "#0a0a0a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div className="relative w-[86px] h-[116px]">
                  <Image
                    src="/images/UAPB-web-logo_Gold.svg"
                    alt="University of Arkansas at Pine Bluff official seal"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>

        </header>

        {/* ══════════════════════════════════════════════════════
            HERO BANNER

            FIX — Image clarity (three changes):
              1. quality={100}  — disables Next.js compression (default 75%)
              2. sizes="100vw"  — ensures full-width image variant is served
              3. opacity-80     — was opacity-55; less darkening = sharper look
            The gradient overlay is also lightened on the right so
            the campus architecture reads clearly on desktop.
        ══════════════════════════════════════════════════════ */}
        <section className="relative w-full h-60 md:h-80 bg-black overflow-hidden">

          <Image
            src="/images/uapb-campus.webp"
            alt="UAPB Campus"
            fill
            className="object-cover opacity-80"
            quality={100}
            sizes="100vw"
            priority
          />

          {/* Gradient: strong on left for legibility, fades right for clarity */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-black/10" />

          {/* Hero copy */}
          <div className="absolute inset-0 flex flex-col justify-center px-8 sm:px-14 lg:px-24">
            <p className="font-heading text-[#efa522] text-xs tracking-[0.25em] uppercase mb-2">
              Office of Research, Innovation &amp; Economic Development
            </p>
            <h1 className="font-display text-white text-5xl md:text-7xl leading-none tracking-wider uppercase drop-shadow-lg">
              Opportunities
              <br />
              <span className="text-[#efa522]">Dashboard</span>
            </h1>
            <p className="font-body mt-4 text-white/75 text-sm md:text-base max-w-md leading-relaxed">
              Find on-campus jobs and off-campus summer research programs
              tailored for UAPB students.
            </p>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            MAIN CONTENT
        ══════════════════════════════════════════════════════ */}
        <main className="flex-1">{children}</main>

        {/* ══════════════════════════════════════════════════════
            FOOTER
        ══════════════════════════════════════════════════════ */}
        <footer className="bg-black text-gray-400 mt-20">
          <div className="h-1 bg-[#efa522]" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div>
                <p className="font-display text-[#efa522] text-xl tracking-widest uppercase mb-3">
                  UAPB RIED
                </p>
                <p className="font-body text-xs leading-relaxed">
                  Office of Research, Innovation &amp; Economic Development
                  <br />
                  University of Arkansas at Pine Bluff
                  <br />
                  Pine Bluff, AR 71601
                </p>
              </div>
              <div>
                <p className="font-display text-[#efa522] text-xl tracking-widest uppercase mb-3">
                  Contact
                </p>
                <p className="font-body text-xs leading-relaxed">
                  Phone: (870) 575-8000
                  <br />
                  Email:{" "}
                  <a href="mailto:ried@uapb.edu" className="hover:text-[#efa522] underline">
                    ried@uapb.edu
                  </a>
                </p>
              </div>
              <div>
                <p className="font-display text-[#efa522] text-xl tracking-widest uppercase mb-3">
                  Quick Links
                </p>
                <ul className="font-body text-xs space-y-2">
                  <li>
                    <a
                      href="https://www.uapb.edu"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#efa522] transition-colors"
                    >
                      UAPB Main Website
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-[#efa522] transition-colors">
                      Student Resources
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-[#efa522] transition-colors">
                      Faculty Research
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-10 border-t border-white/10 pt-6 text-center font-body text-xs text-gray-600">
              &copy; {new Date().getFullYear()} University of Arkansas at Pine Bluff. All rights reserved.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}