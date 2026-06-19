// Full-bleed content wrapper for the Create flow. The chrome (DashboardNav +
// Sidebar) is provided by the parent (dashboard) layout and persists across
// navigations; this only offsets content for the fixed sidebar. Create stays
// out of the (padded) group because its pages manage their own spacing.
export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="md:ml-64">{children}</div>;
}
