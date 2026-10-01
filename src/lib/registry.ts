import type { ComponentType as ReactComponent } from "react";
import FocusTimerButton from "@/showcase/focus-timer-button";
import HabitStreakCard from "@/showcase/habit-streak-card";

export type ComponentType_ =
  | "button" | "form" | "card" | "modal" | "navbar"
  | "table" | "loader" | "section" | "chart" | "input";

export type PropDoc = { name: string; type: string; default: string; description: string };

export type GalleryItem = {
  slug: string;
  name: string;
  type: ComponentType_;
  week: number;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: ReactComponent<any>;
  previewProps?: Record<string, unknown>; // props used for the demo on the home page and component page
  props: PropDoc[];
  usage: string; // copy-paste example shown on the component page
  previewScale?: number; // shrink big components so they fit the home page card
  date: string; // YYYY-MM-DD the component was added
  summary: string; // longer explanation shown on the component page
  features: string[];
  howToUse: string[];
  tech: string[];
  files?: string[]; // files in src/showcase to show under "Source"; defaults to <slug>.tsx
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
    date: "2026-10-01",
    summary:
      "A start button that turns into a full focus timer. Pick a session length, hit Start focus, and the pill morphs into a glowing orb with a live countdown, a ring of 60 ticks that light up as time passes, and colors that shift from indigo to amber. Finish a session and it celebrates with confetti and counts it.",
    features: [
      "Pill button morphs into a circular timer orb (animated width, height and radius)",
      "5, 15 and 25 minute presets; the presets lock while a session runs",
      "Pause and resume by tapping the orb, plus a Reset button",
      "SVG progress arc with a glowing spark and 60 ticks that light up",
      "Color shifts from indigo to magenta to amber as the session progresses",
      "Confetti burst when a session completes, and a Sessions today counter that is saved in the browser: it survives reloads and starts again at 0 each new day",
      "Countdown is computed from a wall-clock deadline, so it stays accurate in background tabs",
      "Fully responsive: fills small screens up to 340px wide and scales the timer down below 380px, with no horizontal overflow",
      "Typed props for labels, presets, color, persistence and callbacks; disabled and loading states; visible keyboard focus; reduced-motion support",
    ],
    howToUse: [
      "Choose 5, 15 or 25 min.",
      "Click Start focus. The button becomes the timer.",
      "Tap the orb to pause or resume. Use Reset to start over.",
      "When it hits 00:00, tap the orb to begin another session.",
    ],
    tech: ["React", "Tailwind CSS", "SVG", "CSS keyframes"],
    props: [
      { name: "presets", type: "number[]", default: "[5, 15, 25]", description: "Session lengths in minutes shown as chips." },
      { name: "defaultMinutes", type: "number", default: "25", description: "Preset selected first." },
      { name: "startLabel", type: "string", default: '"Start focus"', description: "Text on the idle button." },
      { name: "doneLabel", type: "string", default: '"Done!"', description: "Text shown when a session ends." },
      { name: "sessionsLabel", type: "string", default: '"Sessions today"', description: "Label of the counter." },
      { name: "accentHue", type: "number", default: "250", description: "Starting hue (0-360) of the ring colors." },
      { name: "persist", type: "boolean", default: "true", description: "Keep the daily session count in localStorage." },
      { name: "storageKey", type: "string", default: '"focus-timer-button:v1"', description: "localStorage key used when persist is on." },
      { name: "disabled", type: "boolean", default: "false", description: "Disable every control." },
      { name: "loading", type: "boolean", default: "false", description: "Show a spinner on the button and disable it." },
      { name: "onStart", type: "(minutes: number) => void", default: "-", description: "Called when a session starts." },
      { name: "onPause", type: "(secondsLeft: number) => void", default: "-", description: "Called when the timer is paused." },
      { name: "onComplete", type: "(sessionsToday: number) => void", default: "-", description: "Called when a session finishes." },
      { name: "onReset", type: "() => void", default: "-", description: "Called when the timer is reset." },
      { name: "className", type: "string", default: '""', description: "Extra classes for the outer wrapper." },
    ],
    usage: `import FocusTimerButton from "@/showcase/focus-timer-button";

export default function Page() {
  return (
    <FocusTimerButton
      presets={[10, 25, 50]}
      defaultMinutes={25}
      startLabel="Begin deep work"
      accentHue={170}
      onComplete={(n) => console.log(\`Sessions today: \${n}\`)}
    />
  );
}`,
  },
  {
    slug: "habit-streak-card",
    name: "Habit Streak Card",
    type: "card",
    week: 1,
    description: "A working weekly habit tracker with editable habit, streak counter, completion ring and saved progress.",
    Component: HabitStreakCard,
    previewScale: 0.5,
    date: "2026-10-01",
    summary:
      "A weekly habit tracker you can actually use. Name your habit, tap the days you did it, and the card works out your current streak, your best run this week and your completion percentage. Your progress is saved in the browser, so it is still there tomorrow.",
    features: [
      "Editable habit name",
      "Seven day buttons (M to S) that toggle done and not done; today is outlined",
      "Current streak counts consecutive done days ending today (or yesterday if today is not done yet)",
      "Animated completion ring with percentage and x/7 days",
      "Best run this week, a motivating message, and the glow turns gold at 7/7",
      "Progress and habit name are saved in localStorage",
      "Uses the viewer's local timezone: the week runs Monday to Sunday on their own clock and resets at their local midnight, even if the page stays open",
      "Fully responsive: fills small screens up to 320px wide with no horizontal overflow",
      "Typed props for habit, labels, persistence and an onChange callback; disabled and loading states; keyboard focus, full weekday names for screen readers and reduced-motion support",
    ],
    howToUse: [
      "Click the habit title to rename it.",
      "Tap a day to mark it done, tap again to undo.",
      "Watch the streak, ring and message update.",
      "Use Reset week to start a fresh week.",
    ],
    tech: ["React", "Tailwind CSS", "SVG", "localStorage"],
    previewProps: { defaultDone: [true, true, false, false, false, false, false] },
    props: [
      { name: "habit", type: "string", default: '"Deep work, 2 hours"', description: "Habit name (editable by the user)." },
      { name: "title", type: "string", default: '"This week\'s habit"', description: "Small caption above the habit name." },
      { name: "dayLabels", type: "string[]", default: '["M","T","W","T","F","S","S"]', description: "Seven day labels, Monday first." },
      { name: "defaultDone", type: "boolean[]", default: "all false", description: "Days ticked at first, Monday first. Ignored once progress is saved." },
      { name: "editable", type: "boolean", default: "true", description: "Allow renaming the habit." },
      { name: "resetLabel", type: "string", default: '"Reset week"', description: "Text of the reset button." },
      { name: "persist", type: "boolean", default: "true", description: "Keep progress in localStorage." },
      { name: "storageKey", type: "string", default: '"habit-streak-card:v1"', description: "localStorage key used when persist is on." },
      { name: "disabled", type: "boolean", default: "false", description: "Disable every control." },
      { name: "loading", type: "boolean", default: "false", description: "Show a skeleton and disable the card." },
      { name: "onChange", type: "(state: HabitState) => void", default: "-", description: "Called with { habit, done, streak } on every change." },
      { name: "className", type: "string", default: '""', description: "Extra classes for the outer wrapper." },
    ],
    usage: `import HabitStreakCard from "@/showcase/habit-streak-card";

export default function Page() {
  return (
    <HabitStreakCard
      habit="Read 20 pages"
      dayLabels={["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]}
      storageKey="reading-habit"
      onChange={({ streak }) => console.log("Streak:", streak)}
    />
  );
}`,
  },
];

export const getItem = (slug: string) => registry.find((c) => c.slug === slug);
