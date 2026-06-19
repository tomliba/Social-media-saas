import SidebarContent, { type SidebarData } from "./SidebarContent";

// Desktop-only fixed sidebar. Hidden below md; the SAME content renders in the
// mobile drawer (MobileNavDrawer). Balance/plan/library counts are polled once
// by DashboardShell and passed in, so there is no duplicate fetching.
export default function Sidebar(data: SidebarData) {
  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-zinc-50 hidden md:flex flex-col py-4 space-y-2">
      <SidebarContent {...data} />
    </aside>
  );
}
