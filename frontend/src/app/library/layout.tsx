import DashboardNav from "@/components/dashboard/DashboardNav";
import Sidebar from "@/components/dashboard/Sidebar";

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DashboardNav />
      <Sidebar />
      <main className="md:ml-64 pt-20 px-6 pb-24 bg-surface min-h-screen">
        {children}
      </main>
    </>
  );
}
