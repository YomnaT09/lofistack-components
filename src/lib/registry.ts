import type { ComponentType } from "react";
import FocusTimerButton from "@/showcase/focus-timer-button";
import HabitStreakCard from "@/showcase/habit-streak-card";

export type ComponentType_ =
  | "button" | "form" | "card" | "modal" | "navbar"
  | "table" | "loader" | "section" | "chart" | "input";

export type GalleryItem = {
  slug: string;
  name: string;
  type: ComponentType_;
  week: number;
  description: string;
  Component: ComponentType;
  previewScale?: number; // shrink big components so they fit the home page card
};

// To add a component: create src/showcase/<slug>.tsx, import it, add one entry here.
export const registry: GalleryItem[] = [
  {
    slug: "focus-timer-button",
    name: "Focus Timer Button",
    type: "button",
    week: 1,
    description: "A glowing button that morphs into an aurora timer orb with a live tick ring, color shift and confetti finish.",
    Component: FocusTimerButton,
    previewScale: 0.42,
  },
  {
    slug: "habit-streak-card",
    name: "Habit Streak Card",
    type: "card",
    week: 1,
    description: "A working weekly habit tracker with editable habit, streak counter, completion ring and saved progress.",
    Component: HabitStreakCard,
    previewScale: 0.5,
  },
];

export const getItem = (slug: string) => registry.find((c) => c.slug === slug);
