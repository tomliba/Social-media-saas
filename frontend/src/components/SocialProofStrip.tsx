const platforms = [
  { icon: "camera_alt", name: "Instagram" },
  { icon: "music_note", name: "TikTok" },
  { icon: "play_circle", name: "YouTube" },
  { icon: "alternate_email", name: "Threads" },
  { icon: "work", name: "LinkedIn" },
];

export default function SocialProofStrip() {
  return (
    <div className="bg-surface-container-low py-12">
      <div className="mx-auto max-w-screen-2xl px-6 flex flex-col items-center gap-8">
        <p className="font-headline font-bold text-on-surface-variant uppercase tracking-widest text-sm">
          Used by 10,000+ creators on
        </p>
        <div className="flex flex-wrap justify-center gap-10 md:gap-20 opacity-60 grayscale hover:grayscale-0 transition-all">
          {platforms.map((p) => (
            <div key={p.name} className="flex items-center gap-2">
              <span className="material-symbols-outlined text-3xl">
                {p.icon}
              </span>
              <span className="font-bold">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
