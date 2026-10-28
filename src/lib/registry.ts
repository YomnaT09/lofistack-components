import type { ComponentType as ReactComponent } from "react";
import FocusTimerButton from "@/showcase/focus-timer-button";
import HabitStreakCard from "@/showcase/habit-streak-card";
import ColorContrastChecker from "@/showcase/color-contrast-checker";
import LaptopCatQuiz from "@/showcase/laptop-cat-quiz";
import CatMouseDuel from "@/showcase/cat-mouse-duel";
import GuitarStudio from "@/showcase/guitar-studio";
import ProgressStepsLoader from "@/showcase/progress-steps-loader";
import TiltCard from "@/showcase/tilt-card";

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
    slug: "laptop-cat-quiz",
    name: "Laptop Cat Quiz",
    type: "card",
    week: 2,
    description: "A cat pops out of a laptop. Click it and it asks you questions one by one, reacts to your answers and waves goodbye.",
    Component: LaptopCatQuiz,
    previewScale: 0.5,
    date: "2026-10-06",
    summary:
      "A tiny quiz with a mascot. A laptop sits on screen, and after a moment a cat springs up from behind it. Click the cat and it asks your questions one at a time, as multiple choice or as a typed answer. The cat looks puzzled while you think, happy when you are right and sad when you are wrong, then shows the explanation and your final score. Questions are plain data, so you can swap in your own.",
    features: [
      "Cat springs out from behind the laptop with a bounce, then blinks, twitches an ear and swishes its tail; after the last question it waves goodbye with its paw",
      "Click the cat (or the Ask me button) to start; questions come one at a time with a progress count",
      "Multiple choice with a correct answer, opinion questions with no right answer, or typed answers",
      "Cat moods: puzzled while asking, happy on a correct answer, sad on a wrong one",
      "Explanation after each answer, a final score and Play again",
      "Questions are a typed array: { id, question, options?, answerIndex?, explanation?, placeholder? }",
      "onAnswer and onComplete callbacks give you every answer and the score",
      "Responsive up to 420px wide with no overflow; disabled and loading (skeleton) states; autoReveal off shows an Open the laptop button",
      "Live region and focus move with each step, visible focus rings, reduced-motion support",
    ],
    howToUse: [
      "Wait a second for the cat to pop out of the laptop, then click it (or press Ask me).",
      "Choose an answer, or type one and press Send.",
      "Read the cat's reaction and press Next question.",
      "At the end, check your score and press Play again to restart.",
    ],
    tech: ["React", "Tailwind CSS", "TypeScript", "SVG", "CSS animations"],
    props: [
      { name: "questions", type: "CatQuestion[]", default: "3 simple questions", description: "Questions as { id, question, options?, answerIndex?, explanation?, placeholder? }. No options means a typed answer." },
      { name: "catName", type: "string", default: '"Messi"', description: "Name the cat uses for itself." },
      { name: "introText", type: "string", default: "auto", description: "What the cat says when it pops out." },
      { name: "doneTitle", type: "string", default: '"All done!"', description: "Heading on the final screen." },
      { name: "accentHue", type: "number", default: "265", description: "Hue (0 to 360) of buttons and the screen glow." },
      { name: "autoReveal", type: "boolean", default: "true", description: "Pop the cat out automatically. When false, an Open the laptop button appears." },
      { name: "revealDelayMs", type: "number", default: "700", description: "Delay before the cat pops out." },
      { name: "onAnswer", type: "(question, answer, correct) => void", default: "-", description: "Called after each answer. correct is null for typed or opinion answers." },
      { name: "onComplete", type: "(result: CatQuizResult) => void", default: "-", description: "Called with { score, total, answers } when the last question is done." },
      { name: "disabled", type: "boolean", default: "false", description: "Lock the cat and all buttons." },
      { name: "loading", type: "boolean", default: "false", description: "Keep the cat asleep and show a skeleton." },
      { name: "className", type: "string", default: '""', description: "Extra classes for the outer wrapper." },
    ],
    usage: `import LaptopCatQuiz from "@/showcase/laptop-cat-quiz";

export default function Onboarding() {
  return (
    <LaptopCatQuiz
      catName="Pixel"
      accentHue={180}
      questions={[
        { id: "a", question: "Which tag makes a link?", options: ["<div>", "<a>", "<p>"], answerIndex: 1, explanation: "<a> is the anchor element." },
        { id: "b", question: "What do you want to learn next?", placeholder: "e.g. Next.js" },
      ]}
      onComplete={(r) => console.log(r.score, "/", r.total)}
    />
  );
}`,
  },
  {
    slug: "cat-mouse-duel",
    name: "Cat vs Mouse Duel",
    type: "section",
    week: 3,
    description: "Pick the cat or the mouse, and an AI plays the other one in a quick three-heart fight.",
    Component: CatMouseDuel,
    previewProps: { defaultSide: "cat" },
    previewScale: 0.55,
    date: "2026-10-06",
    summary:
      "A tiny fighting game. First you choose your fighter: play as the cat and the AI controls the mouse, or play as the mouse and the AI controls the cat. Then you trade moves round by round. Every move beats one move and loses to another, so you have to guess what the AI will do. The winner of a round lunges and the other fighter loses a heart. Empty the other side's hearts first and you win.",
    features: [
      "Side picker: play as the cat (AI is the mouse) or as the mouse (AI is the cat)",
      "Three moves in a rock-paper-scissors triangle, with themed names per side (Scratch, Pounce, Leap away for the cat; Bite, Trap, Scurry for the mouse)",
      "AI opponent that sometimes reads your last move; difficulty easy, normal or hard",
      "Hearts for each fighter, a lunge and hit burst on every won round, a clash ring when both pick the same move",
      "Knocked-out fighter falls over with X eyes while the winner cheers",
      "Round log announces what happened, in a live region for screen readers",
      "Play again with the same side, or change side",
      "Typed props for starting side, hit points, difficulty, title and callbacks; disabled and loading states; visible focus; reduced-motion support",
      "Responsive up to 420px wide with no overflow down to 280px",
    ],
    howToUse: [
      "Press Play as Cat or Play as Mouse.",
      "Each round pick one of three moves. The hint under each button says which move it beats.",
      "Win a round to take a heart from the AI; lose one and you lose a heart.",
      "When one side is out of hearts the fight ends. Press Play again or Change side.",
    ],
    tech: ["React", "Tailwind CSS", "TypeScript", "SVG", "CSS animations"],
    props: [
      { name: "defaultSide", type: '"cat" | "mouse"', default: "-", description: "Skip the side picker and start as this side." },
      { name: "hp", type: "number", default: "3", description: "Hearts each fighter starts with." },
      { name: "difficulty", type: '"easy" | "normal" | "hard"', default: '"normal"', description: "How often the AI reads your last move." },
      { name: "title", type: "string", default: '"Cat vs Mouse"', description: "Heading of the card." },
      { name: "onRound", type: "(info) => void", default: "-", description: "Called after every round with { player, ai, outcome }." },
      { name: "onFinish", type: "(result: DuelResult) => void", default: "-", description: "Called once with { side, won, playerHp, aiHp, rounds } when the fight ends." },
      { name: "disabled", type: "boolean", default: "false", description: "Lock every button." },
      { name: "loading", type: "boolean", default: "false", description: "Show a skeleton instead of the game." },
      { name: "className", type: "string", default: '""', description: "Extra classes for the outer wrapper." },
    ],
    usage: `import CatMouseDuel from "@/showcase/cat-mouse-duel";
import GuitarStudio from "@/showcase/guitar-studio";
import ProgressStepsLoader from "@/showcase/progress-steps-loader";

export default function Arcade() {
  return (
    <CatMouseDuel
      title="Cat vs Mouse"
      hp={5}
      difficulty="hard"
      onFinish={(r) => console.log(r.won ? "You won" : "You lost", "in", r.rounds, "rounds")}
    />
  );
}`,
  },
  {
    slug: "progress-steps-loader",
    name: "Progress Steps Loader",
    type: "loader",
    week: 3,
    description: "A step-by-step progress tracker with a spinner on the running step, a filling connector and a retry flow.",
    Component: ProgressStepsLoader,
    previewProps: { autoPlay: true, demoFailAt: 2 },
    previewScale: 0.8,
    date: "2026-10-13",
    summary:
      "A tracker for jobs that happen in stages, such as uploading, processing and publishing. Finished steps get a tick, the running step shows a spinner, and a connector line fills between them. If a step fails it turns red with a Retry button. The demo plays by itself and fails once on purpose so you can try the retry.",
    features: [
      "Four states per step: waiting, running (spinner and description), done (tick) and failed (red, with Retry)",
      "Connector line fills with a gradient as steps finish",
      "Drive it yourself with current and failedIndex, or use autoPlay for a self-running demo",
      "demoFailAt makes one step fail on its first try, to show the retry flow",
      "Live status line for screen readers (Step 2 of 4: Process) and aria-current on the running step",
      "Replay button after it finishes in autoPlay",
      "Typed props for steps, titles, timing and callbacks (onRetry, onComplete)",
      "Responsive: switches to a vertical list below 480px, no overflow down to 280px; reduced-motion support",
    ],
    howToUse: [
      "Watch each step run and tick off by itself.",
      "At step 3 the demo fails on purpose. Press Retry to try again.",
      "When all steps are done, press Replay to run it again.",
    ],
    tech: ["React", "TypeScript", "CSS"],
    props: [
      { name: "steps", type: "LoaderStep[]", default: "4 sample steps", description: "List of { id, label, description? }." },
      { name: "current", type: "number", default: "0", description: "Index of the running step; use steps.length for all done." },
      { name: "failedIndex", type: "number | null", default: "null", description: "Index of a failed step." },
      { name: "autoPlay", type: "boolean", default: "false", description: "Demo mode that moves through the steps on a timer." },
      { name: "stepMs", type: "number", default: "1500", description: "Milliseconds per step in autoPlay." },
      { name: "demoFailAt", type: "number | null", default: "null", description: "In autoPlay, step that fails once." },
      { name: "title", type: "string", default: '"Publishing your post"', description: "Heading above the steps." },
      { name: "doneText", type: "string", default: '"All done"', description: "Message when every step is finished." },
      { name: "onRetry", type: "(index: number) => void", default: "undefined", description: "Called when Retry is pressed." },
      { name: "onComplete", type: "() => void", default: "undefined", description: "Called once when all steps are done." },
      { name: "className", type: "string", default: '""', description: "Extra class on the wrapper." },
    ],
    usage: `import ProgressStepsLoader from "@/showcase/progress-steps-loader";

export default function Example({ stage, error }: { stage: number; error: boolean }) {
  return (
    <ProgressStepsLoader
      title="Importing contacts"
      steps={[
        { id: "read", label: "Read file" },
        { id: "check", label: "Check rows" },
        { id: "save", label: "Save" },
      ]}
      current={stage}
      failedIndex={error ? stage : null}
      onRetry={() => console.log("retry")}
    />
  );
}`,
  },
  {
    slug: "guitar-studio",
    name: "Guitar Studio",
    type: "card",
    week: 4,
    description: "A playable acoustic guitar with chords, a tuner, a tab player, a strum pattern and a song maker, all with real plucked-string sound.",
    Component: GuitarStudio,
    previewScale: 0.4,
    previewWidth: 800,
    date: "2026-10-14",
    summary:
      "A drawn acoustic guitar you can actually play. Press a spot on the neck to sound that fret, or drag across the strings to strum. The sound is made in the browser by simulating a plucked string, so there are no audio files. Six tabs turn it into a small studio: free play, a chord library, a tuner you can detune and tune back, a scrolling tab with a playhead, a looping strum pattern, and a song maker where you put chords into bars and play your own song.",
    features: [
      "Realistic drawing: wood grain top, rosette soundhole, headstock with tuners, silver frets, pearl markers, and thick wound strings against thin plain ones",
      "Plucked-string sound made with the Web Audio API (Karplus-Strong), with a different pitch for every string and fret, plus a soft wood body tone",
      "Strings wobble and fade out when played; drag across the neck to strum, press a fret region to play that note",
      "Chords tab: Am, C, G, Em, D and E with finger dots, muted (x) and open (o) marks, and Strum down or up that sweeps across the strings",
      "Tuner tab: a needle gauge, Detune strings, and − / + to turn each string back to In tune",
      "Tab tab: a 16-step fingerpicking tab with a moving playhead and a tempo slider",
      "Strum tab: an 8-slot down, up or rest pattern that loops on the chosen chord",
      "Song tab: put chords into 8 bars, pick a strum style (Folk, Pop, Slow or Fingerpick), set the tempo and press Play song; the neck shows each chord as it plays",
      "Name and save your songs in the browser (localStorage), reload them later or delete them; three example songs are included",
      "Chord library now has Am, C, G, Em, D, E, F and Dm",
      "Typed props for chords, tab, tempo, sound on or off and an onPluck callback; disabled state; keyboard-reachable buttons and a live note announcement",
      "Responsive: the neck scrolls sideways inside the card on phones, no page overflow down to 280px; reduced-motion support",
    ],
    howToUse: [
      "Press the Play tab and click a spot on the neck, or drag across the strings.",
      "Open Chords, pick a chord and press Strum down.",
      "Open Tuner, press Detune strings, then use − and + until the needle says In tune.",
      "Open Tab or Strum and press Play. Change the tempo with the slider.",
      "Open Song, tap chords to fill the bars, choose a strum style and press Play song. Press Save to keep it.",
    ],
    tech: ["React", "TypeScript", "SVG", "Web Audio API"],
    props: [
      { name: "defaultMode", type: '"play" | "chords" | "tuner" | "tab" | "strum" | "song"', default: '"play"', description: "Which tab opens first." },
      { name: "chords", type: "GuitarChord[]", default: "8 sample chords", description: "List of { name, frets } with frets from low E to high e (-1 muted, 0 open)." },
      { name: "defaultChord", type: "string", default: "first chord", description: "Chord selected at the start." },
      { name: "tab", type: "TabNote[][]", default: "16-step sample", description: "Steps for the tab player; each step is a list of { string, fret }." },
      { name: "tempo", type: "number", default: "90", description: "Beats per minute for Tab, Strum and Song." },
      { name: "songs", type: "GuitarSong[]", default: "3 example songs", description: "Examples for the Song tab: { name, bars, style, tempo }." },
      { name: "storageKey", type: "string", default: '"guitar-studio:songs"', description: "localStorage key for songs saved from the Song tab." },
      { name: "muted", type: "boolean", default: "false", description: "Keep the animation but turn the sound off." },
      { name: "disabled", type: "boolean", default: "false", description: "Disable every control." },
      { name: "onPluck", type: "({ string, fret, frequency }) => void", default: "undefined", description: "Called every time a string sounds." },
      { name: "className", type: "string", default: '""', description: "Extra class on the wrapper." },
    ],
    usage: `import GuitarStudio from "@/showcase/guitar-studio";

export default function Example() {
  return (
    <GuitarStudio
      defaultMode="chords"
      defaultChord="G"
      tempo={80}
      onPluck={({ string, fret }) => console.log(string, fret)}
    />
  );
}`,
  },
  {
    slug: "tilt-card",
    name: "Holo Tilt Card",
    type: "card",
    week: 4,
    description: "A holographic collector card that tilts in 3D toward your pointer while an emerald foil shine and glare slide across it.",
    Component: TiltCard,
    previewProps: { showFoilPicker: true },
    previewScale: 0.62,
    date: "2026-10-28",
    summary:
      "A trading-card style card that leans toward your mouse or finger in 3D. A foil shine moves across the surface as it tilts, sparkles show up near the edges and a soft white glare follows the pointer, just like turning a real holo card in the light. Pick an emerald, gold or ice foil under the card.",
    features: [
      "3D tilt that follows the pointer, with a slight zoom while you hover",
      "Foil shine, sparkles and light glare that move with the tilt",
      "The art inside the window shifts a little the other way, so it feels deeper",
      "Three foils: emerald, gold and ice, with an optional picker",
      "Works with mouse, touch and keyboard (arrow keys tilt, Escape resets)",
      "Smooth: updates CSS variables once per frame, with no React re-render while moving",
      "Typed props for name, HP, art, moves, rarity, foil, tilt strength and glare",
      "Reduced-motion and disabled support, visible focus ring, no overflow down to 280px",
    ],
    howToUse: [
      "Move your mouse over the card, or drag a finger on it, and watch it tilt.",
      "Go to the corners to see the strongest foil shine and sparkles.",
      "Press Tab to focus the card, then use the arrow keys to tilt it. Escape puts it back.",
      "Pick Emerald, Gold or Ice under the card to switch the foil.",
    ],
    tech: ["React", "TypeScript", "CSS 3D transforms"],
    props: [
      { name: "name", type: "string", default: '"Lofi Cat"', description: "Name at the top of the card." },
      { name: "hp", type: "number", default: "90", description: "Number shown as HP." },
      { name: "art", type: "ReactNode", default: '"🐱"', description: "Picture in the art window." },
      { name: "moves", type: "HoloMove[]", default: "2 sample moves", description: "List of { icon, name, power }." },
      { name: "rarity", type: "string", default: '"★ HOLO RARE"', description: "Label at the bottom right." },
      { name: "foil", type: '"emerald" | "gold" | "ice"', default: '"emerald"', description: "Colour of the foil shine." },
      { name: "showFoilPicker", type: "boolean", default: "false", description: "Show buttons to switch the foil." },
      { name: "maxTilt", type: "number", default: "16", description: "Biggest tilt in degrees." },
      { name: "glare", type: "boolean", default: "true", description: "Show the white light glare." },
      { name: "disabled", type: "boolean", default: "false", description: "Turn the tilt and shine off." },
      { name: "onFoilChange", type: "(foil: HoloFoil) => void", default: "undefined", description: "Called when the foil is switched." },
      { name: "className", type: "string", default: '""', description: "Extra class on the wrapper." },
    ],
    usage: `import TiltCard from "@/showcase/tilt-card";

export default function Example() {
  return (
    <TiltCard
      name="Night Owl"
      hp={120}
      art="🦉"
      foil="ice"
      moves={[
        { icon: "🌙", name: "Moon Glide", power: 40 },
        { icon: "🎹", name: "Soft Keys", power: 70 },
      ]}
    />
  );
}`,
  },
];

export const getItem = (slug: string) => registry.find((c) => c.slug === slug);
