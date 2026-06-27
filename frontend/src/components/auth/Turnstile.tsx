"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

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

export interface TurnstileHandle {
  /** Discard the current token and re-run the challenge to mint a fresh one. */
  reset: () => void;
}

/**
 * Cloudflare Turnstile, MANAGED widget rendered with appearance
 * "interaction-only": invisible for legit users (a token is issued silently),
 * but the widget BECOMES VISIBLE when Cloudflare decides an interactive
 * challenge is required — so challenged users can actually solve it.
 * (`size:"invisible"` hid even mandatory challenges, so those users never got a
 * token and signup failed.) `onToken` fires each time a token is (re)issued.
 * Site key from NEXT_PUBLIC_TURNSTILE_SITE_KEY.
 */
const Turnstile = forwardRef<TurnstileHandle, { onToken: (token: string) => void }>(
  function Turnstile({ onToken }, ref) {
    const elRef = useRef<HTMLDivElement>(null);
    const widgetId = useRef<string | null>(null);

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (window.turnstile && widgetId.current) window.turnstile.reset(widgetId.current);
      },
    }), []);

    useEffect(() => {
      const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
      if (!siteKey) { console.error("[turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY missing"); return; }

      function renderWidget() {
        if (!elRef.current || !window.turnstile || widgetId.current) return;
        widgetId.current = window.turnstile.render(elRef.current, {
          sitekey: siteKey,
          appearance: "interaction-only", // hidden unless an interactive challenge is required
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

    // Empty (0-height) until a challenge needs to show; centered when it does.
    return <div ref={elRef} className="flex justify-center [&:not(:empty)]:mt-4" />;
  }
);

export default Turnstile;
