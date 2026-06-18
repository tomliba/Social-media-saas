import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";

// Gate the entire /admin tree on the admin role (ADMIN_EMAILS → isAdminEmail →
// session.user.role). Non-admins (and logged-out users that slip past
// middleware) get a 404 so the area's existence isn't advertised.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">shield_person</span>
            <h1 className="font-headline font-extrabold text-lg text-zinc-900">
              Fluvio Admin
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-zinc-500">{session.user.email}</span>
            <Link href="/create" className="text-primary font-bold hover:underline">
              ← Back to app
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
