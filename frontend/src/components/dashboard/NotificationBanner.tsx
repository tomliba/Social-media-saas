export default function NotificationBanner() {
  return (
    <div className="max-w-7xl mx-auto mb-8">
      <div className="bg-primary/5 border border-primary/10 p-4 rounded-xl flex items-center justify-between cursor-pointer group hover:bg-primary/10 transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">video_library</span>
          </div>
          <div>
            <p className="font-headline font-semibold text-on-primary-container">
              You have 3 videos ready to review
            </p>
            <p className="text-sm text-on-surface-variant">
              Review and approve your latest AI-generated drafts.
            </p>
          </div>
        </div>
        <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">
          arrow_forward
        </span>
      </div>
    </div>
  );
}
