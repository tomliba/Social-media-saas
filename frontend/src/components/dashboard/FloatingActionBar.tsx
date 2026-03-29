const actions = [
  {
    icon: "auto_fix_high",
    label: "Magic Edit",
    bgClass: "bg-primary-container/20",
    textClass: "text-primary",
  },
  {
    icon: "calendar_today",
    label: "Smart Plan",
    bgClass: "bg-secondary-container/20",
    textClass: "text-secondary",
  },
  { divider: true },
  {
    icon: "analytics",
    label: "Insights",
    bgClass: "bg-tertiary-container/20",
    textClass: "text-tertiary",
  },
] as const;

export default function FloatingActionBar() {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl rounded-full px-4 py-3 flex items-center gap-6 z-50">
      {actions.map((action, i) => {
        if ("divider" in action) {
          return (
            <div
              key={i}
              className="h-8 w-[1px] bg-outline-variant/30 mx-2"
            />
          );
        }
        return (
          <button
            key={action.label}
            className="flex flex-col items-center gap-1 group"
          >
            <div
              className={`w-10 h-10 rounded-full ${action.bgClass} flex items-center justify-center ${action.textClass} group-hover:scale-110 transition-transform`}
            >
              <span className="material-symbols-outlined">{action.icon}</span>
            </div>
            <span className="text-[10px] font-bold text-on-surface-variant">
              {action.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
