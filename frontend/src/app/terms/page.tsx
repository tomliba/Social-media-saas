import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Fluvio",
};

// Entity name and contact email are filled in. Counsel should still review
// before relying on these Terms (DRAFT banner remains on the page).
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
      <p className="text-on-surface-variant mb-10">Effective date: June 14, 2026</p>

      <div className="prose prose-neutral max-w-none space-y-6 text-on-surface-variant leading-relaxed">
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use
          of Fluvio (the &ldquo;Service&rdquo;), available at usefluvio.com and
          operated by <strong>Fluvio</strong> (&ldquo;Fluvio&rdquo;,
          &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). By creating an
          account or using the Service, you agree to these Terms. If you do not agree,
          do not use the Service.
        </p>

        <h2 className="text-xl font-bold text-on-surface">1. Eligibility</h2>
        <p>
          You must be at least 18 years old to use the Service. By using Fluvio you
          represent that you are 18 or older and able to enter into a binding contract.
        </p>

        <h2 className="text-xl font-bold text-on-surface">2. The Service</h2>
        <p>
          Fluvio is an AI-powered tool that generates short-form videos, images, and
          related social-media content from prompts, settings, and material you
          provide. Output is produced automatically using third-party AI models. We
          may add, change, or remove features at any time.
        </p>

        <h2 className="text-xl font-bold text-on-surface">3. Accounts</h2>
        <p>
          To use Fluvio you must create an account using an email and password or a
          supported single sign-on provider (such as Google). You are responsible for
          keeping your login credentials secure and for all activity under your
          account. You agree to provide accurate information, keep it current, and
          notify us promptly of any unauthorized use of your account.
        </p>

        <h2 className="text-xl font-bold text-on-surface">
          4. Plans, Credits, and Billing
        </h2>
        <p>
          The Service operates on a credit model across tiers (for example, a free
          tier and paid Creator and Pro tiers). Generating content consumes credits at
          the rates shown in the app, which we may adjust over time.
        </p>
        <p>
          Paid subscriptions are billed in advance on a recurring basis through our
          payment provider. Payments and order processing are handled by{" "}
          <strong>Lemon Squeezy</strong>, which acts as our Merchant of Record. This
          means Lemon Squeezy is the seller of record for your purchase, processes your
          payment, and handles applicable taxes; your purchase is also subject to Lemon
          Squeezy&rsquo;s terms and privacy policy.
        </p>
        <p>
          Subscriptions renew automatically at the end of each billing period unless
          cancelled before renewal. You may cancel at any time, with cancellation
          effective at the end of the current period. We may change prices or plan
          features on a prospective basis with notice; continued use after a change
          takes effect means you accept it.
        </p>

        <h2 className="text-xl font-bold text-on-surface">5. Refunds</h2>
        <p>
          Except where required by law, fees are non-refundable, and credits that have
          already been used are non-refundable, because generating content consumes
          third-party processing at the time of creation. Refund requests are handled
          in accordance with this policy and Lemon Squeezy&rsquo;s processes.
        </p>

        <h2 className="text-xl font-bold text-on-surface">6. Acceptable Use</h2>
        <p>
          You agree not to use the Service to create, upload, or distribute content
          that:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>is illegal or promotes illegal activity;</li>
          <li>
            infringes the intellectual property, privacy, or other rights of any
            person;
          </li>
          <li>is defamatory, harassing, hateful, or threatening;</li>
          <li>sexually exploits or endangers minors in any way;</li>
          <li>
            impersonates any person or misrepresents your affiliation in a deceptive or
            harmful manner;
          </li>
          <li>
            contains malware or attempts to disrupt, probe, or gain unauthorized access
            to the Service or its providers; or
          </li>
          <li>
            violates the usage policies of the third-party AI providers that power the
            Service.
          </li>
        </ul>
        <p>
          You are solely responsible for the content you upload, the content you
          generate, and how you use it.
        </p>

        <h2 className="text-xl font-bold text-on-surface">7. Your Content</h2>
        <p>
          You retain ownership of the material you upload to the Service
          (&ldquo;Input&rdquo;). You grant us a limited, worldwide, non-exclusive
          license to host, process, and transmit your Input as needed to operate and
          provide the Service, including sending it to the third-party providers that
          generate your output.
        </p>

        <h2 className="text-xl font-bold text-on-surface">8. Generated Output</h2>
        <p>
          Subject to your compliance with these Terms and applicable third-party terms,
          you own the content you generate using the Service (&ldquo;Output&rdquo;), to
          the extent such ownership is permissible. Because Output is created by AI
          models:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            it may not be unique, and similar output may be produced for other users;
          </li>
          <li>
            it may be inaccurate, and you are responsible for reviewing it before use;
            and
          </li>
          <li>
            we make no representation that Output is free of third-party rights, and you
            are responsible for ensuring your use of it is lawful.
          </li>
        </ul>

        <h2 className="text-xl font-bold text-on-surface">9. Intellectual Property</h2>
        <p>
          The Service itself, including its software, design, branding, and the
          &ldquo;Fluvio&rdquo; name and logo, is owned by us and protected by applicable
          law. These Terms do not grant you any rights in our intellectual property
          except the limited right to use the Service.
        </p>

        <h2 className="text-xl font-bold text-on-surface">10. Third-Party Services</h2>
        <p>
          The Service relies on third-party providers for AI generation, media,
          storage, hosting, and payments. We are not responsible for third-party
          services, and your use of the Service may also be subject to their terms.
        </p>

        <h2 className="text-xl font-bold text-on-surface">11. Disclaimers</h2>
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo;
          without warranties of any kind, whether express or implied, including
          warranties of merchantability, fitness for a particular purpose, accuracy, or
          non-infringement. We do not warrant that the Service will be uninterrupted or
          error-free, or that Output will meet your expectations.
        </p>

        <h2 className="text-xl font-bold text-on-surface">
          12. Limitation of Liability
        </h2>
        <p>
          To the maximum extent permitted by law, we will not be liable for any
          indirect, incidental, special, consequential, or punitive damages, or for any
          loss of profits, data, or goodwill. Our total liability for any claim relating
          to the Service will not exceed the greater of the amount you paid us in the
          three months before the claim arose or USD 100.
        </p>

        <h2 className="text-xl font-bold text-on-surface">13. Indemnification</h2>
        <p>
          You agree to indemnify and hold us harmless from any claims, damages, losses,
          or expenses (including reasonable legal fees) arising out of your content,
          your use of the Service, or your violation of these Terms or the rights of
          others.
        </p>

        <h2 className="text-xl font-bold text-on-surface">
          14. Suspension and Termination
        </h2>
        <p>
          We may suspend or terminate your access at any time if you violate these Terms
          or use the Service in a way that creates risk or liability for us or others.
          You may stop using the Service and close your account at any time.
        </p>

        <h2 className="text-xl font-bold text-on-surface">15. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. If we make material changes, we
          will provide notice through the Service or by email. Your continued use of the
          Service after changes take effect constitutes acceptance of the updated Terms.
        </p>

        <h2 className="text-xl font-bold text-on-surface">16. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the State of Israel, without regard to
          its conflict-of-law rules. The courts located in Israel will have exclusive
          jurisdiction over any dispute arising from these Terms or the Service, except
          where mandatory local consumer-protection law provides otherwise.
        </p>

        <h2 className="text-xl font-bold text-on-surface">17. Contact</h2>
        <p>
          Questions about these Terms can be sent to{" "}
          <a href="mailto:usefluvio@gmail.com" className="text-primary hover:underline">
            usefluvio@gmail.com
          </a>
          .
        </p>
      </div>
    </main>
  );
}
