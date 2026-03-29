import Link from "next/link";

const links = [
  { label: "Features", href: "#" },
  { label: "Pricing", href: "#pricing" },
  { label: "Privacy Policy", href: "#" },
  { label: "Terms of Service", href: "#" },
  { label: "Contact", href: "#" },
];

export default function Footer() {
  return (
    <footer className="bg-neutral-50 w-full py-12 mt-20">
      <div className="mx-auto max-w-screen-2xl px-6 flex flex-col md:flex-row justify-between items-center gap-8 font-body text-sm text-neutral-500">
        <div className="text-lg font-bold text-neutral-900">
          The Fluid Curator
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="hover:text-violet-500 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="text-center md:text-right">
          © 2024 The Fluid Curator. Designed for intentional creators.
        </div>
      </div>
    </footer>
  );
}
