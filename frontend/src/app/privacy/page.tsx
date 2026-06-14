import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Fluvio",
};

// Entity name and contact email are filled in. Counsel should still review
// before relying on this Policy (DRAFT banner remains on the page).
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
      <p className="text-on-surface-variant mb-10">Effective date: June 14, 2026</p>

      <div className="prose prose-neutral max-w-none space-y-6 text-on-surface-variant leading-relaxed">
        <p>
          This Privacy Policy explains how <strong>Fluvio</strong>{" "}
          (&ldquo;Fluvio&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or
          &ldquo;our&rdquo;) collects, uses, and shares information when you use Fluvio
          at usefluvio.com (the &ldquo;Service&rdquo;). By using the Service, you agree
          to the practices described here.
        </p>

        <h2 className="text-xl font-bold text-on-surface">1. Information We Collect</h2>
        <p>
          <strong>Account information.</strong> When you register, we collect your email
          address and name. If you sign in with a third-party provider such as Google,
          we receive the basic profile information that provider shares.
        </p>
        <p>
          <strong>Content you provide.</strong> We collect the prompts, settings,
          images, files, and other material you upload or enter to generate content
          (&ldquo;Input&rdquo;).
        </p>
        <p>
          <strong>Content you generate.</strong> We store the videos, images, and other
          output you create, along with related metadata, so you can access them in your
          library.
        </p>
        <p>
          <strong>Billing information.</strong> Payments are processed by Lemon Squeezy
          as our Merchant of Record. We do not store your full payment-card details; we
          receive limited transaction and subscription information from Lemon Squeezy.
        </p>
        <p>
          <strong>Usage and technical data.</strong> We collect basic technical
          information such as log data, device and browser details, and how you interact
          with the Service, in order to operate and improve it.
        </p>

        <h2 className="text-xl font-bold text-on-surface">
          2. How We Use Your Information
        </h2>
        <p>We use your information to:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>provide, operate, and maintain the Service and your account;</li>
          <li>
            generate the content you request, including sending your Input to
            third-party AI providers;
          </li>
          <li>process payments and manage your subscription and credits;</li>
          <li>
            communicate with you about your account, security, and the Service;
          </li>
          <li>monitor, secure, troubleshoot, and improve the Service; and</li>
          <li>comply with our legal obligations.</li>
        </ul>

        <h2 className="text-xl font-bold text-on-surface">
          3. Legal Bases (EEA / UK users)
        </h2>
        <p>
          Where the GDPR applies, we process your information on the following bases:
          performance of our contract with you (to provide the Service), our legitimate
          interests (to secure and improve the Service), your consent (where we request
          it), and compliance with legal obligations.
        </p>

        <h2 className="text-xl font-bold text-on-surface">
          4. How We Share Information (Sub-Processors)
        </h2>
        <p>
          We do not sell your personal information. We share it with the service
          providers we use to run Fluvio, who process it on our behalf:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-outline-variant text-left text-on-surface">
                <th className="py-2 pr-4 font-semibold">Provider</th>
                <th className="py-2 font-semibold">Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-outline-variant">
                <td className="py-2 pr-4">Google (Gemini)</td>
                <td className="py-2">AI generation of scripts and images</td>
              </tr>
              <tr className="border-b border-outline-variant">
                <td className="py-2 pr-4">OpenAI</td>
                <td className="py-2">AI image generation (fallback)</td>
              </tr>
              <tr className="border-b border-outline-variant">
                <td className="py-2 pr-4">Atlas Cloud</td>
                <td className="py-2">AI image and video generation</td>
              </tr>
              <tr className="border-b border-outline-variant">
                <td className="py-2 pr-4">Fish Audio</td>
                <td className="py-2">Text-to-speech voice generation</td>
              </tr>
              <tr className="border-b border-outline-variant">
                <td className="py-2 pr-4">Pexels</td>
                <td className="py-2">Stock background media</td>
              </tr>
              <tr className="border-b border-outline-variant">
                <td className="py-2 pr-4">Cloudflare (R2)</td>
                <td className="py-2">Storage of generated media</td>
              </tr>
              <tr className="border-b border-outline-variant">
                <td className="py-2 pr-4">Neon</td>
                <td className="py-2">Database hosting</td>
              </tr>
              <tr className="border-b border-outline-variant">
                <td className="py-2 pr-4">Vercel</td>
                <td className="py-2">Application (frontend) hosting</td>
              </tr>
              <tr className="border-b border-outline-variant">
                <td className="py-2 pr-4">Railway</td>
                <td className="py-2">Backend hosting</td>
              </tr>
              <tr className="border-b border-outline-variant">
                <td className="py-2 pr-4">Trigger.dev</td>
                <td className="py-2">Background job processing</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Lemon Squeezy</td>
                <td className="py-2">Payment processing (Merchant of Record)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          We may also disclose information where required by law or to protect our
          rights, our users, or the public.
        </p>

        <h2 className="text-xl font-bold text-on-surface">
          5. AI Processing of Your Content
        </h2>
        <p>
          To generate your output, your Input (such as prompts and uploaded images) is
          transmitted to the third-party AI providers listed above. Their handling of
          that data is governed by their own terms and privacy policies. Please do not
          upload sensitive personal information that you do not want processed by these
          providers.
        </p>

        <h2 className="text-xl font-bold text-on-surface">
          6. International Data Transfers
        </h2>
        <p>
          Some of our providers are located outside your country, including in the
          United States. Where we transfer personal data internationally, we rely on
          appropriate safeguards as required by applicable law.
        </p>

        <h2 className="text-xl font-bold text-on-surface">7. Data Retention</h2>
        <p>
          We retain your account information and generated content for as long as your
          account is active or as needed to provide the Service. We delete or anonymize
          information when it is no longer needed, subject to legal requirements. You can
          delete content from your library and request deletion of your account (see
          &ldquo;Your Rights&rdquo;).
        </p>

        <h2 className="text-xl font-bold text-on-surface">8. Security</h2>
        <p>
          We use reasonable technical and organizational measures to protect your
          information, including access controls and encryption in transit. No method of
          transmission or storage is completely secure, and we cannot guarantee absolute
          security.
        </p>

        <h2 className="text-xl font-bold text-on-surface">9. Your Rights</h2>
        <p>
          Depending on where you live, you may have the right to access, correct, delete,
          or export your personal information, to object to or restrict certain
          processing, and to withdraw consent. Residents of California and certain other
          regions have rights regarding the sale or sharing of personal information; we
          do not sell personal information. To exercise any right, contact us at{" "}
          <a href="mailto:usefluvio@gmail.com" className="text-primary hover:underline">
            usefluvio@gmail.com
          </a>
          , and we will respond as required by applicable law.
        </p>

        <h2 className="text-xl font-bold text-on-surface">10. Cookies</h2>
        <p>
          We use cookies and similar technologies that are necessary to operate the
          Service, such as keeping you signed in. If we introduce optional analytics in
          the future, we will update this Policy and obtain consent where required.
        </p>

        <h2 className="text-xl font-bold text-on-surface">11. Children</h2>
        <p>
          Fluvio is not intended for anyone under 18, and we do not knowingly collect
          information from children. If you believe a child has provided us with personal
          information, contact us and we will delete it.
        </p>

        <h2 className="text-xl font-bold text-on-surface">12. Changes to This Policy</h2>
        <p>
          We may update this Policy from time to time. If we make material changes, we
          will provide notice through the Service or by email. The &ldquo;Effective
          date&rdquo; above indicates when the Policy was last revised.
        </p>

        <h2 className="text-xl font-bold text-on-surface">13. Contact</h2>
        <p>
          For privacy questions or requests, contact us at{" "}
          <a href="mailto:usefluvio@gmail.com" className="text-primary hover:underline">
            usefluvio@gmail.com
          </a>
          .
        </p>
      </div>
    </main>
  );
}
