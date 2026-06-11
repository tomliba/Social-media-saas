import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Fluvio",
};

// DRAFT starter template — NOT legal advice. Replace the [BRACKETED] fill-ins and
// have counsel review before launch. See the banner rendered on the page.
export default function TermsPage() {
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

      <h1 className="font-headline text-4xl font-bold mb-2">Terms of Service</h1>
      <p className="text-on-surface-variant mb-10">Last updated: [DATE]</p>

      <div className="prose prose-neutral max-w-none space-y-6 text-on-surface-variant leading-relaxed">
        <p>
          These Terms govern your use of Fluvio (the
          &ldquo;Service&rdquo;), operated by <strong>[COMPANY NAME]</strong>. By
          using the Service you agree to these Terms.
        </p>

        <h2 className="text-xl font-bold text-on-surface">Accounts</h2>
        <p>
          You must provide accurate information and are responsible for activity on
          your account. You must be at least [MINIMUM AGE] years old.
        </p>

        <h2 className="text-xl font-bold text-on-surface">Plans, credits &amp; billing</h2>
        <p>
          Paid plans are billed monthly through [PAYMENT PROVIDER e.g. Lemon Squeezy].
          Each plan includes a monthly credit allotment; credits are consumed when you
          generate content and are non-transferable. [State refund / cancellation
          policy and whether unused credits roll over.]
        </p>

        <h2 className="text-xl font-bold text-on-surface">Your content &amp; acceptable use</h2>
        <p>
          You retain ownership of content you create, subject to the rights of any
          third-party model or asset providers. You agree not to use the Service to
          create unlawful, infringing, or harmful content. [Add your acceptable-use
          specifics and AI-content disclaimers.]
        </p>

        <h2 className="text-xl font-bold text-on-surface">Disclaimers &amp; liability</h2>
        <p>
          The Service is provided &ldquo;as is&rdquo; without warranties. To the extent
          permitted by law, [COMPANY NAME] is not liable for indirect or consequential
          damages. [Have counsel set the liability cap and governing law for
          [JURISDICTION].]
        </p>

        <h2 className="text-xl font-bold text-on-surface">Changes &amp; contact</h2>
        <p>
          We may update these Terms; material changes will be notified. Questions?
          Email{" "}
          <a href="mailto:[CONTACT EMAIL]" className="text-primary hover:underline">
            [CONTACT EMAIL]
          </a>
          .
        </p>
      </div>
    </main>
  );
}
