export default function HeroSection() {
  return (
    <section className="pt-32 pb-20 px-6 mx-auto max-w-screen-2xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      {/* Left: Copy */}
      <div className="flex flex-col gap-6 lg:pr-12">
        <h1 className="font-headline font-extrabold text-5xl md:text-7xl leading-[1.1] tracking-tight text-on-surface">
          Make a week of content{" "}
          <span className="text-gradient">before lunch</span>
        </h1>
        <p className="text-on-surface-variant text-xl md:text-2xl leading-relaxed max-w-xl">
          Pick a template. AI writes the script. Choose your character. Get a
          finished video in 2 minutes.
        </p>
        <div className="flex flex-col gap-3 pt-4">
          <button className="primary-gradient text-white text-lg font-bold px-10 py-5 rounded-lg w-fit hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20">
            Start creating — it&apos;s free
          </button>
          <p className="flex items-center gap-2 text-on-surface-variant text-sm font-medium ml-4">
            <span
              className="material-symbols-outlined text-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified
            </span>
            No credit card needed
          </p>
        </div>
      </div>

      {/* Right: Phone mockup */}
      <div className="relative flex justify-center lg:justify-end">
        <div className="relative w-[320px] h-[640px] bg-inverse-surface rounded-[3rem] p-3 shadow-2xl ring-8 ring-surface-variant">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-inverse-surface rounded-b-2xl z-20" />
          {/* Screen */}
          <div className="w-full h-full rounded-[2.2rem] overflow-hidden bg-surface-container relative">
            {/* Placeholder for hero image - gradient with character silhouette */}
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary-container/30 to-secondary/20 flex items-center justify-center">
              <div className="text-center p-6">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{
                    fontSize: "80px",
                    fontVariationSettings: "'FILL' 1",
                  }}
                >
                  smart_display
                </span>
                <p className="text-on-surface-variant text-sm mt-4 font-medium">
                  AI Video Preview
                </p>
              </div>
            </div>
            {/* Overlay card */}
            <div className="absolute bottom-6 left-6 right-6 p-4 glass-nav rounded-xl border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-primary-container text-lg">
                    person
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface">
                    Doctor Curses
                  </p>
                  <p className="text-[10px] text-on-surface-variant">
                    AI Explainer Series
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Decorative blobs */}
        <div className="absolute -z-10 -top-20 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -z-10 -bottom-10 -left-10 w-60 h-60 bg-secondary/10 rounded-full blur-3xl" />
      </div>
    </section>
  );
}
