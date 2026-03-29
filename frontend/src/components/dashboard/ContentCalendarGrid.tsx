"use client";

function PlatformBadge({
  label,
  bg,
}: {
  label: string;
  bg: string;
}) {
  return (
    <div
      className={`w-5 h-5 rounded-full ${bg} flex items-center justify-center text-[8px] text-white ring-1 ring-white font-bold`}
    >
      {label}
    </div>
  );
}

function VideoCard({
  title,
  duration,
  platforms,
  statusColor = "bg-emerald-500",
  gradient,
}: {
  title: string;
  duration: string;
  platforms: { label: string; bg: string }[];
  statusColor?: string;
  gradient: string;
}) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <div className="relative aspect-[9/16] rounded-lg overflow-hidden mb-3">
        <div className={`w-full h-full ${gradient}`} />
        <div
          className={`absolute top-2 left-2 ${statusColor} w-3 h-3 rounded-full border-2 border-white`}
        />
        <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-md px-2 py-1 rounded-md text-[10px] text-white font-bold">
          {duration}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-4xl opacity-80">
            play_circle
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold truncate pr-4">{title}</p>
        <div className="flex -space-x-2">
          {platforms.map((p) => (
            <PlatformBadge key={p.label} {...p} />
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyDaySlot() {
  return (
    <div className="border-2 border-dashed border-outline-variant/30 rounded-xl h-40 flex flex-col items-center justify-center text-on-surface-variant/40 hover:bg-surface-container-low transition-colors cursor-pointer">
      <span className="material-symbols-outlined text-3xl mb-2">add</span>
      <span className="text-xs font-bold">Schedule</span>
    </div>
  );
}

function CarouselCard() {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <div className="relative h-48 mb-3 flex items-center justify-center group">
        {/* Fanned slides */}
        <div className="absolute w-24 h-32 bg-zinc-200 rounded-lg shadow-sm -rotate-6 translate-x-[-15px] group-hover:-rotate-12 transition-transform" />
        <div className="absolute w-24 h-32 bg-zinc-300 rounded-lg shadow-sm rotate-3 translate-x-[15px] group-hover:rotate-6 transition-transform" />
        <div className="relative w-28 h-36 rounded-lg overflow-hidden shadow-md">
          <div className="w-full h-full bg-gradient-to-br from-amber-100 via-rose-100 to-violet-200" />
          <div className="absolute top-2 left-2 bg-primary w-3 h-3 rounded-full border-2 border-white" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold truncate">Aesthetic Design Tips</p>
          <p className="text-[10px] text-on-surface-variant">
            5 Slides &bull; 14:00 PM
          </p>
        </div>
        <PlatformBadge label="in" bg="bg-blue-600" />
      </div>
    </div>
  );
}

function ScheduledVideoCard() {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <div className="relative aspect-video rounded-lg overflow-hidden mb-3">
        <div className="w-full h-full bg-gradient-to-br from-zinc-700 via-emerald-900 to-zinc-800" />
        <div className="absolute top-2 left-2 bg-primary w-3 h-3 rounded-full border-2 border-white" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-3xl opacity-80">
            schedule
          </span>
        </div>
      </div>
      <p className="text-xs font-bold">Coding Setup Reel</p>
      <p className="text-[10px] text-on-surface-variant">
        Tomorrow &bull; 09:30 AM
      </p>
    </div>
  );
}

function CaptionDraftCard() {
  return (
    <div className="bg-surface-container-lowest border-l-4 border-outline-variant rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-outline" />
        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
          Caption Draft
        </span>
      </div>
      <div className="space-y-2">
        <div className="h-2 w-full bg-surface-container-low rounded" />
        <div className="h-2 w-5/6 bg-surface-container-low rounded" />
        <div className="h-2 w-4/6 bg-surface-container-low rounded" />
      </div>
      <p className="mt-4 text-[11px] italic text-on-surface-variant line-clamp-2">
        &ldquo;Behind every great project is an even better workspace. Today
        I&apos;m sharing...&rdquo;
      </p>
      <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-on-surface-variant">
        <span>324 words</span>
        <span className="material-symbols-outlined text-sm">edit_note</span>
      </div>
    </div>
  );
}

function RenderingCard({
  title,
  progress,
  icon,
  statusLabel,
}: {
  title: string;
  progress: number;
  icon: string;
  statusLabel: string;
}) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-3 shadow-sm overflow-hidden relative">
      <div className="animate-pulse bg-surface-container-low aspect-square rounded-lg mb-3 flex flex-col items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-amber-500 mb-2">
          {icon}
        </span>
        <span className="text-[10px] font-bold text-amber-600 uppercase">
          {statusLabel}
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-bold">
          <span>{title}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-surface-container-low rounded-full">
          <div
            className="h-full bg-amber-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function DayHeader({
  day,
  date,
  badge,
}: {
  day: string;
  date: number;
  badge?: { label: string; className: string };
}) {
  return (
    <div className="flex items-center justify-between px-2 mb-4">
      <span className="font-headline font-bold text-lg">
        {day}{" "}
        <span className="text-on-surface-variant font-medium">{date}</span>
      </span>
      {badge && (
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-bold ${badge.className}`}
        >
          {badge.label}
        </span>
      )}
    </div>
  );
}

export default function ContentCalendarGrid() {
  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
      {/* Monday */}
      <div className="space-y-4">
        <DayHeader
          day="Mon"
          date={23}
          badge={{
            label: "2 POSTS",
            className: "bg-emerald-100 text-emerald-700",
          }}
        />
        <VideoCard
          title="Morning Routine Concept"
          duration="0:30"
          gradient="bg-gradient-to-br from-emerald-200 via-amber-100 to-stone-300"
          platforms={[
            {
              label: "IG",
              bg: "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600",
            },
            { label: "TT", bg: "bg-black" },
          ]}
        />
        <VideoCard
          title="Tech News Summary"
          duration="0:15"
          gradient="bg-gradient-to-br from-violet-900 via-purple-800 to-fuchsia-700"
          platforms={[{ label: "TT", bg: "bg-black" }]}
        />
      </div>

      {/* Tuesday */}
      <div className="space-y-4">
        <DayHeader
          day="Tue"
          date={24}
          badge={{
            label: "EMPTY",
            className: "text-on-surface-variant bg-transparent",
          }}
        />
        <EmptyDaySlot />
      </div>

      {/* Wednesday */}
      <div className="space-y-4">
        <DayHeader
          day="Wed"
          date={25}
          badge={{
            label: "2 SCHED",
            className: "bg-primary-container text-on-primary-container",
          }}
        />
        <CarouselCard />
        <ScheduledVideoCard />
      </div>

      {/* Thursday */}
      <div className="space-y-4">
        <DayHeader
          day="Thu"
          date={26}
          badge={{
            label: "1 DRAFT",
            className:
              "bg-surface-container-highest text-on-surface-variant",
          }}
        />
        <CaptionDraftCard />
      </div>

      {/* Friday */}
      <div className="space-y-4">
        <DayHeader
          day="Fri"
          date={27}
          badge={{
            label: "2 RENDERING",
            className: "bg-amber-100 text-amber-700",
          }}
        />
        <RenderingCard
          title="Vlog_Final_v2"
          progress={72}
          icon="sync"
          statusLabel="Processing..."
        />
        <RenderingCard
          title="Asset_Package_4"
          progress={15}
          icon="cloud_upload"
          statusLabel="Uploading Assets"
        />
      </div>
    </div>
  );
}
