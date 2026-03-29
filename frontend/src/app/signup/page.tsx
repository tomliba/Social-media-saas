"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/">
            <h1 className="text-3xl font-black font-headline tracking-tighter text-gradient inline-block">
              The Fluid Curator
            </h1>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-10 shadow-[0px_20px_40px_rgba(111,51,213,0.06)] border border-outline-variant/10">
          <h2 className="text-2xl font-bold font-headline text-on-surface text-center mb-2">
            Start creating for free
          </h2>
          <p className="text-on-surface-variant text-center mb-8">
            No credit card required. 3 free videos per month.
          </p>

          {/* Google Sign Up */}
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-outline-variant/20 rounded-xl font-headline font-bold text-on-surface hover:border-primary/30 hover:shadow-md transition-all active:scale-[0.98]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign up with Google
          </button>

          {/* What you get */}
          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 text-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-primary text-lg">
                check_circle
              </span>
              3 free AI videos per month
            </div>
            <div className="flex items-center gap-3 text-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-primary text-lg">
                check_circle
              </span>
              10 social media posts
            </div>
            <div className="flex items-center gap-3 text-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-primary text-lg">
                check_circle
              </span>
              All templates and AI scripts
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-on-surface-variant text-sm">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary font-bold hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-on-surface-variant/60 text-xs mt-8">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </main>
  );
}
