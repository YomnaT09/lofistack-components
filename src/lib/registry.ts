import type { ComponentType as ReactComponent } from "react";
import FocusTimerButton from "@/showcase/focus-timer-button";
import HabitStreakCard from "@/showcase/habit-streak-card";
import ColorContrastChecker from "@/showcase/color-contrast-checker";
import MorphingPillNavbarDemo from "@/showcase/morphing-pill-navbar-demo";
import PricingToggleSection from "@/showcase/pricing-toggle-section";
import VinylSpinnerLoaderDemo from "@/showcase/vinyl-spinner-loader-demo";

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
  previewWidth?: number; // fixed layout width (px) of the home page preview, for components wider than the card
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
  {
    slug: "color-contrast-checker",
    name: "Color Contrast Checker",
    type: "form",
    week: 2,
    description: "Pick a text and background color and see the WCAG contrast ratio, pass/fail badges and a one-click fix.",
    Component: ColorContrastChecker,
    previewScale: 0.3,
    date: "2026-10-06",
    summary:
      "A small accessibility tool for designers and developers. Choose a text color and a background color and it instantly shows the WCAG contrast ratio, whether the pair passes AA and AAA for normal and large text, and whether it is strong enough for UI parts like icons and borders. If the pair fails, it suggests the closest shade of your text color that passes, and you can copy the result as CSS.",
    features: [
      "Native color pickers plus hex fields that accept 3 or 6 digits, with or without #",
      "Live preview with normal text, large heading text and a bordered UI element",
      "Contrast ratio computed with the WCAG 2.x formula, shown truncated so 4.499 never looks like a pass",
      "Five pass/fail checks: AA and AAA for normal and large text, and UI components (3:1)",
      "Meter that shows where the ratio sits against the 3, 4.5 and 7 thresholds",
      "Smart fix: keeps the hue and nudges the lightness to the nearest passing shade, with a Use it button",
      "Swap button and Copy as CSS button",
      "Invalid hex input is flagged and the last valid color keeps being used",
      "Typed props for colors, text and callbacks; disabled and loading states; labelled inputs, live result announcements and visible keyboard focus",
      "Fully responsive down to 280px wide",
    ],
    howToUse: [
      "Pick a text color and a background color with the swatches, or type hex values.",
      "Read the ratio and the five Pass/Fail checks under the preview.",
      "If AA fails, press Use it to apply the suggested shade.",
      "Press Swap to flip the colors, or Copy as CSS to copy both values.",
    ],
    tech: ["React", "Tailwind CSS", "TypeScript", "WCAG 2.x math"],
    props: [
      { name: "foreground", type: "string", default: '"#e0e7ff"', description: "Text color (3 or 6 digit hex)." },
      { name: "background", type: "string", default: '"#4f46e5"', description: "Background color (3 or 6 digit hex)." },
      { name: "sampleText", type: "string", default: '"The quick brown fox..."', description: "Text shown in the live preview." },
      { name: "title", type: "string", default: '"Color contrast checker"', description: "Heading of the card." },
      { name: "disabled", type: "boolean", default: "false", description: "Disable every control." },
      { name: "loading", type: "boolean", default: "false", description: "Show a skeleton and disable the card." },
      { name: "onChange", type: "(result: ContrastResult) => void", default: "-", description: "Called with the colors, ratio and every pass/fail flag when a color changes." },
      { name: "className", type: "string", default: '""', description: "Extra classes for the outer wrapper." },
    ],
    usage: `import ColorContrastChecker from "@/showcase/color-contrast-checker";

export default function Page() {
  return (
    <ColorContrastChecker
      foreground="#1f2937"
      background="#fef3c7"
      sampleText="Check your brand colors"
      onChange={({ ratio, aaNormal }) =>
        console.log(\`Ratio \${ratio}:1, AA normal text: \${aaNormal ? "pass" : "fail"}\`)
      }
    />
  );
}`,
  },
  {
    slug: "morphing-pill-navbar",
    name: "Morphing Pill Navbar",
    type: "navbar",
    week: 2,
    description: "A floating pill navbar whose highlight glides and stretches between links, and turns into a morphing menu on mobile.",
    Component: MorphingPillNavbarDemo,
    previewScale: 0.45,
    previewWidth: 680,
    files: ["morphing-pill-navbar.tsx", "morphing-pill-navbar-demo.tsx"],
    date: "2026-10-06",
    summary:
      "A floating navigation bar shaped like a pill. A gradient highlight glides to the link you choose and stretches to match its width with a springy motion, while a soft ghost pill follows your hover or keyboard focus. On phones it collapses into a menu button whose three bars turn into a cross, and the pill grows downward to reveal the links.",
    features: [
      "Gradient pill that glides and resizes to the active link with a springy curve",
      "Soft hover and keyboard-focus pill that follows the pointer",
      "Works as a link bar (href) or as buttons, controlled or uncontrolled",
      "Mobile layout below 768px: hamburger that morphs into a cross, and a panel that grows open",
      "Escape closes the mobile menu, and hidden links are removed from the tab order",
      "Per-item disabled state, plus disabled and loading (skeleton) states for the whole bar",
      "aria-current on the active page, labelled landmark, visible focus rings and reduced-motion support",
      "Typed props for items, labels and callbacks",
    ],
    howToUse: [
      "Hover a link to see the soft pill follow, then click to send the gradient pill there.",
      "Use Tab to move through links, and Enter to choose one.",
      "Make the window narrower than 768px (or open it on a phone) to get the menu button.",
      "Press Escape to close the mobile menu.",
    ],
    tech: ["React", "Tailwind CSS", "TypeScript", "CSS transitions"],
    props: [
      { name: "items", type: "NavItem[]", default: "Home, Features, Pricing, Docs, Contact", description: "Links as { id, label, href?, disabled? }." },
      { name: "activeId", type: "string", default: "-", description: "Controlled active item. Leave empty to let the navbar manage it." },
      { name: "defaultActiveId", type: "string", default: "first item", description: "Initially active item when uncontrolled." },
      { name: "logo", type: "string", default: '"Lofi"', description: "Brand text on the left." },
      { name: "ctaLabel", type: "string", default: '"Sign in"', description: "Call-to-action text. Use an empty string to hide it." },
      { name: "ariaLabel", type: "string", default: '"Main"', description: "Accessible name of the navigation landmark." },
      { name: "onNavigate", type: "(item: NavItem) => void", default: "-", description: "Called when a link is chosen." },
      { name: "onCtaClick", type: "() => void", default: "-", description: "Called when the call-to-action is pressed." },
      { name: "disabled", type: "boolean", default: "false", description: "Disable the whole bar." },
      { name: "loading", type: "boolean", default: "false", description: "Show skeleton pills and disable the bar." },
      { name: "className", type: "string", default: '""', description: "Extra classes for the outer wrapper." },
    ],
    usage: `import MorphingPillNavbar from "@/showcase/morphing-pill-navbar";

export default function Layout() {
  return (
    <MorphingPillNavbar
      logo="Acme"
      ctaLabel="Get started"
      defaultActiveId="docs"
      items={[
        { id: "home", label: "Home", href: "/" },
        { id: "docs", label: "Docs", href: "/docs" },
        { id: "blog", label: "Blog", href: "/blog" },
        { id: "soon", label: "Soon", disabled: true },
      ]}
      onNavigate={(item) => console.log("Go to", item.id)}
    />
  );
}`,
  },
  {
    slug: "pricing-toggle-section",
    name: "Pricing Toggle Section",
    type: "section",
    week: 3,
    description: "A pricing section with a sliding Monthly / Yearly switch, count-up prices and a highlighted plan.",
    Component: PricingToggleSection,
    previewScale: 0.33,
    previewWidth: 900,
    date: "2026-10-06",
    summary:
      "A ready-to-drop pricing section. Flip the Monthly / Yearly switch and the gradient thumb slides across while every price counts up or down to its new value, the billed-per-year total updates and a green savings pill lights up. The middle plan is lifted with a glowing ring, and each plan button remembers your choice.",
    features: [
      "Segmented Monthly / Yearly switch with a springy sliding thumb, built as an accessible radio group (arrow keys, Home and End)",
      "Prices count up or down with an ease-out tween; screen readers get the final price, not the animation",
      "Savings pill computed from your plans (Save up to 21%), or set your own text",
      "Yearly view shows the billed-per-year total under each price",
      "Highlighted plan with badge, ring and lift; free plans show Free",
      "Plan buttons with a Selected state and an onSelect callback that receives the plan and period",
      "Responsive: one column on phones, three columns from 768px, no horizontal overflow down to 280px",
      "Typed props for plans, currency, locale and callbacks; disabled and loading (skeleton) states; visible focus; reduced-motion support",
    ],
    howToUse: [
      "Click Yearly (or use the arrow keys on the switch) and watch the prices change.",
      "Switch back to Monthly to see the full price again.",
      "Press a plan button to select it; it turns green and says Selected.",
      "Make the window narrower than 768px to see the plans stack.",
    ],
    tech: ["React", "Tailwind CSS", "TypeScript", "requestAnimationFrame", "Intl.NumberFormat"],
    props: [
      { name: "plans", type: "PricingPlan[]", default: "Starter, Pro, Team", description: "Plans as { id, name, description?, monthlyPrice, yearlyPrice, features, highlighted?, badge?, ctaLabel?, disabled? }. yearlyPrice is per month when billed yearly." },
      { name: "title", type: "string", default: '"Simple pricing, no surprises"', description: "Section heading." },
      { name: "subtitle", type: "string", default: '"Pick a plan and switch to yearly to save..."', description: "Text under the heading." },
      { name: "defaultPeriod", type: '"monthly" | "yearly"', default: '"monthly"', description: "Period selected on first render." },
      { name: "onPeriodChange", type: "(period) => void", default: "-", description: "Called when the switch changes." },
      { name: "currency", type: "string", default: '"USD"', description: "ISO currency code." },
      { name: "locale", type: "string", default: '"en-US"', description: "Locale used to format prices." },
      { name: "saveLabel", type: "string", default: "auto", description: "Savings pill text. Leave empty to compute Save up to X%." },
      { name: "onSelect", type: "(plan, period) => void", default: "-", description: "Called when a plan button is pressed." },
      { name: "disabled", type: "boolean", default: "false", description: "Lock the switch and all plan buttons." },
      { name: "loading", type: "boolean", default: "false", description: "Show skeleton cards and lock the section." },
      { name: "className", type: "string", default: '""', description: "Extra classes for the outer wrapper." },
    ],
    usage: `import PricingToggleSection from "@/showcase/pricing-toggle-section";

export default function Pricing() {
  return (
    <PricingToggleSection
      title="Pick your plan"
      defaultPeriod="yearly"
      currency="EUR"
      locale="de-DE"
      plans={[
        { id: "solo", name: "Solo", monthlyPrice: 12, yearlyPrice: 9, features: ["1 seat", "Email support"] },
        { id: "crew", name: "Crew", monthlyPrice: 40, yearlyPrice: 32, features: ["5 seats", "Chat support"], highlighted: true, badge: "Best value" },
      ]}
      onSelect={(plan, period) => console.log(plan.id, period)}
    />
  );
}`,
  },
  {
    slug: "vinyl-spinner-loader",
    name: "Vinyl Record Loader",
    type: "loader",
    week: 3,
    description: "A spinning vinyl record with a tonearm that travels across the grooves as loading progresses.",
    Component: VinylSpinnerLoaderDemo,
    previewScale: 0.5,
    files: ["vinyl-spinner-loader.tsx", "vinyl-spinner-loader-demo.tsx"],
    date: "2026-10-06",
    summary:
      "A loader that looks like a turntable. The record spins, the sheen stays still so the motion feels real, and the tonearm swings inward as the percentage grows. With no progress value it runs as an endless loader; when loading finishes the record slows to a crawl, the needle lifts and the text switches to the done message.",
    features: [
      "SVG record with grooves, a glowing label and a static sheen over a spinning disc",
      "Tonearm that moves across the record with progress, or drifts slowly in endless mode",
      "Determinate (progress 0 to 100) and indeterminate modes, with a matching progress bar",
      "Finished state: record slows down, needle lifts, done message appears",
      "Pause / resume button (aria-pressed) with an onPausedChange callback",
      "Live region announces status; accent hue and rotation speed are props",
      "Scales to any width up to 340px with no overflow; disabled state; visible focus; reduced-motion slows the spin right down",
      "Typed props for progress, texts, speed, hue and callbacks",
    ],
    howToUse: [
      "Watch the needle move as the percentage rises, then see the record wind down at 100%.",
      "Press Pause to freeze the record and Resume to continue.",
      "Press Endless mode for a loader with no known progress.",
      "Press Replay with progress to run it again.",
    ],
    tech: ["React", "Tailwind CSS", "TypeScript", "SVG", "CSS animations"],
    props: [
      { name: "progress", type: "number", default: "-", description: "0 to 100. Leave empty for endless mode." },
      { name: "title", type: "string", default: '"Mixing your playlist"', description: "Main line while loading." },
      { name: "subtitle", type: "string", default: '"Dropping the needle on track 1"', description: "Second line while loading." },
      { name: "doneLabel", type: "string", default: '"Ready to play"', description: "Text when finished." },
      { name: "secondsPerTurn", type: "number", default: "1.8", description: "Seconds for one full turn of the record." },
      { name: "accentHue", type: "number", default: "275", description: "Hue (0 to 360) for the label, bar and glow." },
      { name: "loading", type: "boolean", default: "true", description: "Set to false to show the finished state." },
      { name: "pausable", type: "boolean", default: "true", description: "Show the Pause / Resume button." },
      { name: "onPausedChange", type: "(paused: boolean) => void", default: "-", description: "Called when the user pauses or resumes." },
      { name: "disabled", type: "boolean", default: "false", description: "Dim the loader and disable the button." },
      { name: "className", type: "string", default: '""', description: "Extra classes for the outer wrapper." },
    ],
    usage: `import VinylSpinnerLoader from "@/showcase/vinyl-spinner-loader";

export default function Uploading({ percent }: { percent: number }) {
  return (
    <VinylSpinnerLoader
      progress={percent}
      title="Uploading album"
      subtitle="12 of 14 tracks"
      doneLabel="Upload complete"
      accentHue={200}
      onPausedChange={(paused) => console.log("paused:", paused)}
    />
  );
}`,
  },
];

export const getItem = (slug: string) => registry.find((c) => c.slug === slug);
