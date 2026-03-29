"use client";

export default function CalendarHeader() {
  return (
    <div className="max-w-7xl mx-auto mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
      <div>
        <h1 className="text-4xl font-headline font-extrabold tracking-tight mb-2">
          Content Calendar
        </h1>
        <div className="flex items-center gap-4 text-on-surface-variant">
          {/* Week / Month toggle */}
          <div className="flex items-center bg-surface-container-low p-1 rounded-full">
            <button className="px-6 py-2 rounded-full bg-white shadow-sm text-on-surface font-semibold text-sm">
              Week
            </button>
            <button className="px-6 py-2 rounded-full text-sm font-medium">
              Month
            </button>
          </div>
          {/* Date nav */}
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-surface-container-high rounded-full">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <span className="font-semibold text-on-surface">
              Oct 23 - Oct 27
            </span>
            <button className="p-2 hover:bg-surface-container-high rounded-full">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <select className="appearance-none bg-surface-container-lowest border-none py-3 pl-5 pr-12 rounded-full text-sm font-semibold shadow-sm focus:ring-2 focus:ring-primary/40">
            <option>Platform: All</option>
            <option>Instagram</option>
            <option>TikTok</option>
            <option>LinkedIn</option>
          </select>
          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
            expand_more
          </span>
        </div>
        <div className="relative">
          <select className="appearance-none bg-surface-container-lowest border-none py-3 pl-5 pr-12 rounded-full text-sm font-semibold shadow-sm focus:ring-2 focus:ring-primary/40">
            <option>Format: Video</option>
            <option>Carousel</option>
            <option>Caption Only</option>
          </select>
          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
            expand_more
          </span>
        </div>
        <button className="bg-surface-container-highest px-6 py-3 rounded-full text-sm font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">
            filter_list
          </span>
          More Filters
        </button>
      </div>
    </div>
  );
}
