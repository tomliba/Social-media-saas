import { describe, it, expect } from "vitest";
// @ts-expect-error — plain .mjs guard script, no type declarations needed.
import { scanForIconFontSpinner } from "../../scripts/check-no-iconfont-spinner.mjs";

// Mirrors the build guard (scripts/check-no-iconfont-spinner.mjs, also wired
// into `npm run build`). Loading spinners must use the inline-SVG <Spinner>;
// the icon font can render the raw ligature name as text during load, and the
// misspelled no-underscore variant is an invalid ligature that always shows raw
// text. This fails if either spelling reappears anywhere in src.
describe("no icon-font loading spinners in src", () => {
  it("finds zero occurrences of the icon-font spinner ligature", () => {
    const offenders = scanForIconFontSpinner();
    expect(
      offenders,
      offenders.length
        ? "Use <Spinner> instead of an icon-font spinner at:\n" +
            offenders.map((o: { file: string; line: number }) => `  ${o.file}:${o.line}`).join("\n")
        : ""
    ).toEqual([]);
  });
});
