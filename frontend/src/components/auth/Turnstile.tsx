"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit";

/**
 * Invisible Turnstile. On solve, calls onToken(token). Renders nothing visible
 * in managed/invisible mode for legit users. Site key from
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY.
 */
export default function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey) { console.error("[turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY missing"); return; }

    function renderWidget() {
      if (!ref.current || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        size: "invisible",
        callback: (token: string) => onToken(token),
        "error-callback": () => window.turnstile?.reset(widgetId.current ?? undefined),
      });
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      window.onTurnstileLoad = renderWidget;
      if (!document.querySelector(`script[src^="https://challenges.cloudflare.com/turnstile"]`)) {
        const s = document.createElement("script");
        s.src = SCRIPT_SRC;
        s.async = true; s.defer = true;
        document.head.appendChild(s);
      }
    }
  }, [onToken]);

  return <div ref={ref} />;
}
