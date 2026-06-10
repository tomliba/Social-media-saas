import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — The Fluid Curator",
};

// DRAFT starter template — NOT legal advice. Replace the [BRACKETED] fill-ins and
// have counsel review before launch. See the banner rendered on the page.
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <Link href="/" className="text-primary text-sm font-semibold hover:underline">
        ← Back home
      </Link>

      <div className="mt-6 mb-8 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>DRAFT — for review.</strong> This is a starter template, not legal
        advice. Fill in the bracketed details and have a lawyer review it before
        relying on it.
      </div>

      <h1 className="font-headline text-4xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-on-surface-variant mb-10">Last updated: [DATE]</p>

      <div className="prose prose-neutral max-w-none space-y-6 text-on-surface-variant leading-relaxed">
        <p>
          This Privacy Policy describes how <strong>[COMPANY NAME]</strong>{" "}
          (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses, and shares
          information when you use The Fluid Curator (the &ldquo;Service&rdquo;).
        </p>

        <h2 className="text-xl font-bold text-on-surface">Information we collect</h2>
        <p>
          Account information (name, email), content you create with the Service,
          usage and device data, and payment information processed by our payment
          provider, [PAYMENT PROVISION e.g. Lemon Squeezy]. We do not store full
          card numbers.
        </p>

        <h2 className="text-xl font-bold text-on-surface">How we use information</h2>
        <p>
          To provide and improve the Service, process payments and credits,
          communicate with you, and maintain security. [Add any analytics / AI model
          providers you send data to, e.g. for script and image generation.]
        </p>

        <h2 className="text-xl font-bold text-on-surface">Sharing</h2>
        <p>
          We share information with service providers that help us run the Service
          (hosting, payments, AI generation, email) under appropriate agreements. We
          do not sell personal information. [Confirm and list subprocessors.]
        </p>

        <h2 className="text-xl font-bold text-on-surface">Data retention &amp; your rights</h2>
        <p>
          We retain data while your account is active and as required by law. Depending
          on your location ([JURISDICTION], e.g. GDPR/CCPA), you may have rights to
          access, correct, or delete your data. Contact us to exercise them.
        </p>

        <h2 className="text-xl font-bold text-on-surface">Contact</h2>
        <p>
          Questions? Email{" "}
          <a href="mailto:[CONTACT EMAIL]" className="text-primary hover:underline">
            [CONTACT EMAIL]
          </a>
          . [COMPANY NAME], [COMPANY ADDRESS].
        </p>
      </div>
    </main>
  );
}
