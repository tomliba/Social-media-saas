import { Spinner } from "@/components/ui/Spinner";

// Honest, static loading indicator for save/wait gaps (e.g. uploading images
// to the library before redirecting). Uses the self-contained <Spinner/>, so it
// never depends on the remote Material Symbols icon font. For waits where it
// helps to narrate progress, use <GeneratingOverlay/> instead.

export function LoadingState({
  title,
  subtext,
  className = "",
}: {
  title: string;
  subtext?: string;
  className?: string;
}) {
  return (
    <section
      className={`max-w-md mx-auto text-center animate-in fade-in duration-300 ${className}`}
    >
      <Spinner size="lg" className="text-primary mb-4" />
      <h2 className="text-xl font-bold font-headline mb-2">{title}</h2>
      {subtext && (
        <p className="text-on-surface-variant text-sm">{subtext}</p>
      )}
    </section>
  );
}
