import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PricingSection from "@/components/PricingSection";

export const metadata = {
  title: "Pricing — Fluvio",
  description: "Credit-based plans: Free, Creator, and Pro.",
};

export default function PricingPage() {
  return (
    <div className="overflow-x-hidden">
      <Navbar />
      <main className="pt-20">
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
