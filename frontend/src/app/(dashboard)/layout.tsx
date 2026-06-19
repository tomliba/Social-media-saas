import DashboardNav from "@/components/dashboard/DashboardNav";
import Sidebar from "@/components/dashboard/Sidebar";

// Shared chrome for the whole logged-in app (Create, Library, Accounts,
// Preferences, Autopilot, the /dashboard redirect). Because DashboardNav and
// Sidebar live in this single parent layout, they mount ONCE and persist across
// navigations between any of those routes — only the page content below swaps.
// Previously each segment had its own identical layout, so the entire shell
// (and the Sidebar's balance/library polling) was torn down and rebuilt on every
// click. The inner content wrapper differs per segment, so it stays in the
// nested layouts ((padded) for the standard pages, create/ for full-bleed).
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DashboardNav />
      <Sidebar />
      {children}
    </>
  );
}
