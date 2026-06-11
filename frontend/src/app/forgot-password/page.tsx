"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/auth/request-reset", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
    });
    setSubmitting(false);
    setDone(true);
  }

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-10 border border-outline-variant/10">
        <h1 className="text-2xl font-bold font-headline text-on-surface text-center mb-6">Reset your password</h1>
        {done ? (
          <p className="text-on-surface-variant text-sm text-center">
            If an account with that email exists, we&apos;ve sent a reset link. Check your inbox.
          </p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
              className="px-4 py-3 bg-surface-container-low border border-outline-variant/20 rounded-lg text-sm focus:ring-2 focus:ring-primary/40" />
            <button type="submit" disabled={submitting}
              className="px-6 py-3 bg-primary text-on-primary rounded-xl font-headline font-bold hover:opacity-90 transition disabled:opacity-50">
              {submitting ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
        <div className="mt-6 text-center"><Link href="/login" className="text-sm text-primary font-bold hover:underline">Back to sign in</Link></div>
      </div>
    </main>
  );
}
