# LofiStack Component Gallery

A growing gallery of UI components for the LofiStack 90 Day Build Challenge. Built with Next.js and Tailwind CSS.

Every component has its own direct link: `/components/<slug>`.

## Add a component

1. Create `src/showcase/<slug>.tsx` (default export, add `"use client"` if it uses state).
2. Import it and add one entry in `src/lib/registry.ts`.

The home page card and the `/components/<slug>` page appear automatically.

## Run locally

```bash
npm install
npm run dev
```

## Components

| Week | Type | Component |
|---|---|---|
| 01 | button | Magnetic Hover Button |
| 01 | card | Glass Profile Card |
