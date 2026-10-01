import type { ComponentType } from "react";
import GlowBorderButton from "@/showcase/glow-border-button";
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
    slug: "glow-border-button",
    name: "Glow Border Button",
    type: "button",
    week: 1,
    description: "Dark button with a spinning rainbow border, glow on hover and a press effect.",
    Component: GlowBorderButton,
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
