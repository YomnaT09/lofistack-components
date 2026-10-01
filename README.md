# LofiStack Component Gallery

A growing gallery of UI components for the LofiStack 90 Day Build Challenge. Built with Next.js and Tailwind CSS.

Every component has its own direct link: `/components/<slug>`.

## Add a component

1. Create `src/showcase/<slug>.tsx` (default export, add `"use client"` if it uses state).
2. Import it and add one entry in `src/lib/registry.ts` with a summary, features, how-to-use steps and tech list.

The home page card, the `/components/<slug>` page with its Details and Source sections appear automatically.

## Run locally

```bash
npm install
npm run dev
```

## Components

| Week | Type | Component |
|---|---|---|
| 01 | button | Focus Timer Button |
| 01 | card | Habit Streak Card |
