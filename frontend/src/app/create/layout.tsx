import DashboardNav from "@/components/dashboard/DashboardNav";
import Sidebar from "@/components/dashboard/Sidebar";

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DashboardNav />
      <Sidebar />
      <div className="md:ml-64">{children}</div>
    </>
  );
}
