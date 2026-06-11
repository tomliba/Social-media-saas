import { redirect } from "next/navigation";

// The app is create-only: the format picker (/create) is the landing surface
// for logged-in users. The old calendar "home" was removed; keep this route as
// a redirect so any existing /dashboard links/bookmarks still resolve.
export default function DashboardPage() {
  redirect("/create");
}
