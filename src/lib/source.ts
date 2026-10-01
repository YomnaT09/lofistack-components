import { readFileSync } from "node:fs";
import { join } from "node:path";

export const REPO = "https://github.com/YomnaT09/lofistack-components";

// Read at build time (static export), so the page can show the real component source.
export const getSource = (slug: string) =>
  readFileSync(join(process.cwd(), "src", "showcase", `${slug}.tsx`), "utf8");

export const sourceUrl = (slug: string) => `${REPO}/blob/main/src/showcase/${slug}.tsx`;
