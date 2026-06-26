"use client";

import { useState } from "react";
import type { ReactNode } from "react";

// Sales-copy FAQ for the public landing page. Questions/answers are locked
// content — do not reword. Styling mirrors PricingSection (font-headline
// heading, primary accent, surface tokens) so it reads as native chrome.
const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: "Free trial?",
    a: "There's no time limit. Fluvio has a free plan with credits to start, so you can make and download real content before paying. Free exports include a small watermark. Any paid plan removes it and renders in higher quality.",
  },
  {
    q: "How would my videos look?",
    a: "Polished and ready to post. Fluvio renders clean, professional-looking content with sharp visuals, smooth motion, and natural-sounding voiceovers, so what you make looks like it took hours, not minutes. The free plan lets you try it and judge the quality yourself before paying.",
  },
  {
    q: "Do I own what I create? Can I monetize it?",
    a: "Yes. Content you create with Fluvio is yours to use and monetize commercially, on any platform.",
  },
  {
    q: "What can I make with Fluvio?",
    a: "Short-form content from a topic or script: animated character videos with lip sync, AI stories, image posts, and carousels. Pick a character and style, Fluvio writes or cleans up the script, voices it, and renders a ready-to-post video.",
  },
  {
    q: "How do credits work?",
    a: "Every render costs credits depending on the feature and length. Your plan comes with a monthly allowance, and you can buy extra packs anytime if you run out. Lighter content like image posts costs very little, while animated character videos cost more since they're heavier to produce.",
  },
  {
    q: "What are the plans?",
    a: "Free, Creator, and Pro. Each step up gives you a larger monthly credit allowance and unlocks more features. Creator adds AI image carousels, and Pro unlocks animated character videos.",
  },
  {
    q: "How do I manage my plan and billing?",
    a: "You can view your plan and credit balance anytime in your account page, and change or cancel your plan through the billing portal linked there.",
  },
  {
    q: "How do I get help?",
    a: (
      <>
        Email{" "}
        <a
          href="mailto:usefluvio@gmail.com"
          className="text-primary font-semibold hover:underline"
        >
          usefluvio@gmail.com
        </a>{" "}
        with a short description and, for render issues, the project name. A
        screenshot helps us sort it faster.
      </>
    ),
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 px-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-headline font-bold text-4xl text-center mb-12">
          Frequently Asked Questions
        </h2>

        <div className="bg-surface-container-lowest rounded-[1rem] divide-y divide-outline-variant/40 overflow-hidden">
          {FAQS.map((item, i) => {
            const isOpen = openIndex === i;
            const panelId = `faq-panel-${i}`;
            const buttonId = `faq-button-${i}`;

            return (
              <div key={item.q}>
                <h3>
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer group"
                  >
                    <span className="font-headline font-semibold text-lg text-on-surface group-hover:text-primary transition-colors">
                      {item.q}
                    </span>
                    <span
                      className={`material-symbols-outlined text-primary text-2xl shrink-0 transition-transform duration-300 ${
                        isOpen ? "rotate-45" : ""
                      }`}
                      aria-hidden="true"
                    >
                      add
                    </span>
                  </button>
                </h3>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  inert={!isOpen ? true : undefined}
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-5 text-on-surface-variant leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
