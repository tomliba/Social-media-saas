/**
 * Build guard: forbid the icon-font loading spinner anywhere in src.
 *
 * The Material Symbols icon font is loaded with `font-display: block` (and is
 * subset), so an icon-font spinner can render as raw ligature text — literally
 * "progress_activity" — during font load, and the misspelled "progressactivity"
 * (no underscore) is an invalid ligature that renders raw text ALWAYS. We were
 * bitten by this repeatedly while migrating spinners in subsets. Loading
 * spinners MUST use the inline-SVG <Spinner> (components/ui/Spinner.tsx).
 *
 * This scans src for either spelling of the forbidden token (case-insensitive)
 * and fails the build if any is found. Run automatically via the `build` script
 * and the `no-iconfont-spinner` vitest test. The token is assembled from
 * fragments below so this guard never trips on its own source.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const SRC_DIR = fileURLToPath(new URL("../src", import.meta.url));
const SCANNED_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".mjs", ".cjs"]);

// Assembled from fragments so this file contains neither literal spelling.
const FORBIDDEN = new RegExp("progress" + "_?" + "activity", "i");

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      yield* walk(full);
    } else if (SCANNED_EXTS.has(extname(name))) {
      yield full;
    }
  }
}

/** Return [{ file, line, text }] for every forbidden-token occurrence in src. */
export function scanForIconFontSpinner(srcDir = SRC_DIR) {
  const offenders = [];
  for (const file of walk(srcDir)) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((text, i) => {
      if (FORBIDDEN.test(text)) {
        offenders.push({ file, line: i + 1, text: text.trim() });
      }
    });
  }
  return offenders;
}

// CLI entry: print offenders and exit non-zero so `npm run build` fails.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const offenders = scanForIconFontSpinner();
  if (offenders.length > 0) {
    console.error(
      "\n✖ Icon-font loading spinner found. Use the inline-SVG <Spinner> " +
        "(components/ui/Spinner.tsx) instead — the icon font can render the raw " +
        "ligature name as text during load.\n"
    );
    for (const o of offenders) {
      console.error(`  ${o.file}:${o.line}\n    ${o.text}`);
    }
    console.error("");
    process.exit(1);
  }
  console.log("✓ No icon-font loading spinners in src.");
}
