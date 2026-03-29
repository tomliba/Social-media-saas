const oldWaySteps = [
  { icon: "search", label: "Research & Planning", time: "45m" },
  { icon: "edit_note", label: "Scriptwriting", time: "30m" },
  { icon: "videocam", label: "Recording & Audio", time: "2h" },
  { icon: "movie_edit", label: "Professional Editing", time: "1h" },
  { icon: "publish", label: "Captioning & Posting", time: "20m" },
];

const newWaySteps = [
  { icon: "auto_awesome", label: "Pick a Template", time: "5s" },
  { icon: "smart_toy", label: "10 AI Script Ideas", time: "10s" },
  { icon: "visibility", label: "Quick Review", time: "30s" },
  { icon: "bolt", label: "Hit Create", time: "Done" },
];

export default function ComparisonSection() {
  return (
    <section className="py-24 px-6 mx-auto max-w-screen-2xl">
      <div className="text-center mb-16">
        <h2 className="font-headline font-bold text-4xl md:text-5xl text-on-surface mb-4">
          See it in action
        </h2>
        <p className="text-on-surface-variant text-lg">
          Stop trading hours for minutes of attention.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Old Way */}
        <div className="bg-surface-container-highest/40 p-10 rounded-[1rem] border border-outline-variant/10 relative overflow-hidden opacity-80">
          <div className="absolute top-6 right-6 text-error opacity-40">
            <span className="material-symbols-outlined text-6xl">cancel</span>
          </div>
          <h3 className="font-headline font-bold text-2xl text-on-surface-variant mb-8">
            The old way
          </h3>
          <ul className="space-y-6">
            {oldWaySteps.map((step) => (
              <li
                key={step.label}
                className="flex justify-between items-center text-on-surface-variant line-through"
              >
                <span className="flex items-center gap-3">
                  <span className="material-symbols-outlined">{step.icon}</span>
                  {step.label}
                </span>
                <span className="font-medium text-error">{step.time}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10 pt-6 border-t border-outline-variant/20 flex justify-between items-center">
            <span className="font-bold text-lg">Total Workflow</span>
            <span className="text-error font-black text-2xl tracking-tight">
              4+ HOURS
            </span>
          </div>
        </div>

        {/* New Way */}
        <div className="bg-surface-container-lowest p-10 rounded-[1rem] shadow-xl shadow-primary/5 border border-primary/20 relative overflow-hidden">
          <div className="absolute top-6 right-6 text-primary">
            <span
              className="material-symbols-outlined text-6xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
          </div>
          <h3 className="font-headline font-bold text-2xl text-primary mb-8">
            With The Fluid Curator
          </h3>
          <ul className="space-y-6">
            {newWaySteps.map((step) => (
              <li
                key={step.label}
                className="flex justify-between items-center text-on-surface"
              >
                <span className="flex items-center gap-3 font-semibold">
                  <span className="material-symbols-outlined text-primary">
                    {step.icon}
                  </span>
                  {step.label}
                </span>
                <span className="font-bold text-primary">{step.time}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10 pt-6 border-t border-primary/10 flex justify-between items-center">
            <span className="font-bold text-lg text-on-surface">
              Total Time
            </span>
            <span className="text-primary font-black text-2xl tracking-tight">
              2 MINUTES
            </span>
          </div>
          <div className="mt-8 bg-primary/5 p-4 rounded-md text-center">
            <p className="text-primary font-bold text-sm">
              Saving you ~24 hours of work every month.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
