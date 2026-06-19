// Standard content wrapper shared by the padded dashboard pages (Library,
// Accounts, Preferences, Autopilot, and the /dashboard redirect). The chrome
// (DashboardNav + Sidebar) is provided by the parent (dashboard) layout and
// persists across navigations; this layer only offsets content for the fixed
// sidebar/topbar. Create lives outside this group because it is full-bleed.
export default function PaddedDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="md:ml-64 pt-20 px-6 pb-24 bg-surface min-h-screen">
      {children}
    </main>
  );
}
