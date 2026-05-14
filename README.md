# UAPB Opportunities Dashboard

A centralized directory for UAPB students to discover on-campus and off-campus summer research opportunities, built for the **Office of Research, Innovation & Economic Development (RIED)**.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router, `src/app`) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS — utility classes only |
| Data | Local JSON mock (`src/data/opportunities.json`) |
| Icons | lucide-react |

## Folder Structure

```
src/
├── app/
│   ├── layout.tsx          ← Global layout: Navbar, hero banner, Footer
│   ├── page.tsx            ← Smart container: state, filtering logic
│   └── globals.css         ← Tailwind directives + brand tokens
├── components/
│   ├── OpportunityCard.tsx ← Individual program card (accessible)
│   ├── SearchAndFilter.tsx ← Search input + category toggles
│   ├── CountdownBadge.tsx  ← Live "X Days Left" badge
│   └── EmptyState.tsx      ← Shown when no results match
├── data/
│   └── opportunities.json  ← Mock dataset (6 opportunities)
├── lib/
│   └── utils.ts            ← Date helpers, search matcher
└── types/
    └── index.ts            ← TypeScript interfaces
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Colour Scheme

| Token | Value | Usage |
|---|---|---|
| Gold | `#efa522` | Accent bars, buttons, active states, highlights |
| Black | `#0a0a0a` | Navbar, footer, text |
| White | `#ffffff` | Page background, card backgrounds |

## Adding Real Opportunities

Edit `src/data/opportunities.json` and add entries following the `Opportunity` interface in `src/types/index.ts`. Each entry requires:

- `id` — unique UUID string
- `title`, `institution`, `summary`
- `applicationUrl`, `datePosted`, `deadline` (YYYY-MM-DD)
- `category` — `"Off-campus summer research program"` or `"On-campus job"`
- `tags` — optional array of keyword strings

## Adding the UAPB Campus Image

In `src/app/layout.tsx`, find the comment `UAPB campus image placeholder` and replace the placeholder `<div>` with:

```tsx
import Image from "next/image";

<Image
  src="/images/uapb-campus.jpg"
  alt="UAPB Campus"
  fill
  className="object-cover opacity-60"
  priority
/>
```

Then place your image at `public/images/uapb-campus.jpg`.
