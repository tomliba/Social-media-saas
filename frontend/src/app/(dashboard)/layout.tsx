import { auth } from "@/lib/auth";
import DashboardShell from "@/components/dashboard/DashboardShell";

// Shared chrome for the whole logged-in app (Create, Library, Accounts,
// Preferences, Autopilot, the /dashboard redirect). DashboardShell renders the
// top nav, the desktop sidebar, and the mobile drawer, and owns the single
// balance/library poll + drawer state. It mounts ONCE here and persists across
// navigations; only the page content below swaps. The per-segment content
// wrappers ((padded), create/) keep the md:ml-64 offset for the fixed sidebar.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <>
      <DashboardShell email={session?.user?.email ?? null} />
      {children}
    </>
  );
}
