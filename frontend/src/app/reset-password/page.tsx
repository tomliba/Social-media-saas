"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "done" | "error">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 10) { setError("Password must be at least 10 characters."); return; }
    setSubmitting(true); setError(null);
    const res = await fetch("/api/auth/reset", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }),
    });
    setSubmitting(false);
    if (res.ok) setStatus("done");
    else { setStatus("error"); setError("This reset link is invalid or has expired."); }
  }

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-10 border border-outline-variant/10">
        <h1 className="text-2xl font-bold font-headline text-on-surface text-center mb-6">Choose a new password</h1>
        {status === "done" ? (
          <p className="text-on-surface-variant text-sm text-center">
            Your password has been reset. <Link href="/login" className="text-primary font-bold hover:underline">Sign in</Link>.
          </p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            {error && <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm text-center">{error}</div>}
            <input type="password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (10+ characters)"
              className="px-4 py-3 bg-surface-container-low border border-outline-variant/20 rounded-lg text-sm focus:ring-2 focus:ring-primary/40" />
            <button type="submit" disabled={submitting}
              className="px-6 py-3 bg-primary text-on-primary rounded-xl font-headline font-bold hover:opacity-90 transition disabled:opacity-50">
              {submitting ? "Saving…" : "Reset password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetForm /></Suspense>;
}
