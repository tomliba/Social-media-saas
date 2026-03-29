import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 z-50 w-full glass-nav shadow-[0px_20px_40px_rgba(124,58,237,0.06)]">
      <div className="mx-auto max-w-screen-2xl px-6 py-4 flex justify-between items-center">
        <Link
          href="/"
          className="text-xl font-black text-violet-600 font-headline tracking-tight"
        >
          The Fluid Curator
        </Link>

        <div className="hidden md:flex items-center space-x-8 font-headline font-semibold tracking-tight">
          <Link
            href="#"
            className="text-neutral-500 hover:text-violet-500 transition-all duration-300"
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="text-neutral-500 hover:text-violet-500 transition-all duration-300"
          >
            Pricing
          </Link>
          <Link
            href="#testimonials"
            className="text-neutral-500 hover:text-violet-500 transition-all duration-300"
          >
            Testimonials
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <button className="hidden md:block text-neutral-500 hover:text-violet-500 font-semibold transition-all duration-300 px-4 py-2">
            Login
          </button>
          <button className="primary-gradient text-white font-bold px-6 py-2.5 rounded-full hover:opacity-90 active:scale-95 transition-all shadow-md">
            Get Started
          </button>
        </div>
      </div>
    </nav>
  );
}
