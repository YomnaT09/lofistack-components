import type { ComponentType } from "react";
import FocusTimerButton from "@/showcase/focus-timer-button";
import GlassProfileCard from "@/showcase/glass-profile-card";

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
    slug: "glass-profile-card",
    name: "Glass Profile Card",
    type: "card",
    week: 1,
    description: "Frosted glass profile card with a soft tilt on hover.",
    Component: GlassProfileCard,
    previewScale: 0.5,
  },
];

export const getItem = (slug: string) => registry.find((c) => c.slug === slug);
