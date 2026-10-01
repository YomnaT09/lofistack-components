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
};

// To add a component: create src/showcase/<slug>.tsx, import it, add one entry here.
export const registry: GalleryItem[] = [
  {
    slug: "focus-timer-button",
    name: "Focus Timer Button",
    type: "button",
    week: 1,
    description: "A button that morphs into a progress ring and counts down your focus session.",
    Component: FocusTimerButton,
  },
  {
    slug: "glass-profile-card",
    name: "Glass Profile Card",
    type: "card",
    week: 1,
    description: "Frosted glass profile card with a soft tilt on hover.",
    Component: GlassProfileCard,
  },
];

export const getItem = (slug: string) => registry.find((c) => c.slug === slug);
