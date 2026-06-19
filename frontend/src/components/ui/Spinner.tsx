// Self-contained loading spinner. Deliberately an inline SVG ring — NOT an
// icon-font glyph (e.g. `material-symbols-outlined` "progress_activity") — so it
// never depends on the remote Material Symbols stylesheet loading. The arc is
// stroked with `currentColor`, so callers tint it with text-color utilities
// (e.g. `text-primary`, `text-white`).

const SIZES = {
  sm: 16,
  md: 24,
  lg: 48,
} as const;

export function Spinner({
  size = "md",
  className = "",
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const px = SIZES[size];
  return (
    <span role="status" className={`inline-block ${className}`}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spin"
        aria-hidden="true"
      >
        {/* faint full ring for context */}
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="2.5"
          className="opacity-20"
        />
        {/* bright quarter arc that does the spinning */}
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">Loading</span>
    </span>
  );
}
