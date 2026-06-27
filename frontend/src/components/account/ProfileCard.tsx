"use client";

import { useState } from "react";
import { saveProfile } from "@/app/actions/profile";
import { COUNTRIES } from "@/lib/countries";

interface ProfileCardProps {
  email: string;
  initialUsername: string;
  initialCountry: string; // ISO alpha-2, or ""
}

export default function ProfileCard({ email, initialUsername, initialCountry }: ProfileCardProps) {
  const [username, setUsername] = useState(initialUsername);
  const [country, setCountry] = useState(initialCountry);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = username !== initialUsername || country !== initialCountry;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await saveProfile({ username, country });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      // initial* are server-rendered; a soft reset of the dirty flag is enough
      // until the next navigation re-reads from the DB.
      setTimeout(() => setSaved(false), 2500);
    } else {
      setError(res.error ?? "Could not save. Please try again.");
    }
  }

  const inputCls =
    "w-full px-4 py-3 bg-surface-container-low border border-outline-variant/20 rounded-lg text-sm text-on-surface focus:ring-2 focus:ring-primary/40 focus:outline-none";

  return (
    <section className="bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/10 shadow-[0px_20px_40px_rgba(111,51,213,0.04)] md:col-span-2">
      <div className="flex items-center gap-2 mb-6">
        <span className="material-symbols-outlined text-primary">person</span>
        <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-headline">
          Profile
        </h2>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Email — read-only */}
        <label className="block">
          <span className="block text-xs font-bold text-on-surface-variant mb-1.5">Email</span>
          <input
            type="email"
            value={email}
            readOnly
            disabled
            className={`${inputCls} opacity-60 cursor-not-allowed`}
          />
          <span className="block text-[11px] text-on-surface-variant/60 mt-1">
            The email you signed up with — can&apos;t be changed here.
          </span>
        </label>

        {/* Username */}
        <label className="block">
          <span className="block text-xs font-bold text-on-surface-variant mb-1.5">Username</span>
          <input
            type="text"
            value={username}
            maxLength={40}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Pick a username"
            className={inputCls}
          />
        </label>

        {/* Country */}
        <label className="block">
          <span className="block text-xs font-bold text-on-surface-variant mb-1.5">Country</span>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={inputCls}
          >
            <option value="">Not set</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        {/* Save row */}
        <div className="md:col-span-2 flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving || !dirty}
            className="px-6 py-3 bg-primary text-on-primary rounded-full font-label font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition disabled:opacity-50 disabled:shadow-none"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && (
            <span className="text-sm font-bold text-emerald-600 flex items-center gap-1">
              <span className="material-symbols-outlined text-base">check_circle</span>
              Saved
            </span>
          )}
          {error && <span className="text-sm font-bold text-error">{error}</span>}
        </div>
      </form>
    </section>
  );
}
