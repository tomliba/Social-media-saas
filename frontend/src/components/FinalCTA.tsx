import Link from "next/link";

export default function FinalCTA() {
  return (
    <section className="py-24 px-6">
      <div className="mx-auto max-w-screen-2xl primary-gradient rounded-xl p-12 md:p-24 text-center text-white flex flex-col items-center gap-8 shadow-2xl">
        <h2 className="font-headline font-black text-4xl md:text-6xl max-w-3xl leading-tight">
          Your competitors are posting every day. Are you?
        </h2>
        <p className="text-white/80 text-xl max-w-2xl">
          Join 10,000+ creators who stopped making content and started curating
          their presence.
        </p>
        <Link href="/signup" className="bg-white text-primary font-black text-xl px-12 py-6 rounded-lg hover:scale-105 active:scale-95 transition-all shadow-xl inline-block">
          Start creating for free
        </Link>
      </div>
    </section>
  );
}
