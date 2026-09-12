import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Data Processing Agreement (DPA) — Pax",
  description: "Data Processing Agreement for Pax, a product of Integrofy LLC.",
};

export default function DPAPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="heading-serif text-xl">
            Pax
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="heading-serif text-4xl mb-2">
          Data Processing Agreement
        </h1>
        <p className="text-sm text-muted-foreground mb-12">
          Last Updated: March 11, 2026
        </p>

        <div className="prose-warm space-y-10 text-sm leading-relaxed text-foreground/85">
          {/* 1 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">1. Introduction</h2>
            <p className="mb-3">
              This Data Processing Agreement (&ldquo;DPA&rdquo;) forms an
              integral part of the{" "}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              for Pax, a product of Integrofy LLC (&ldquo;Integrofy&rdquo;).
            </p>
            <p>
              Pax is self-hosted software. The person or organization that
              deploys an instance (the &ldquo;Operator&rdquo;) runs it on
              infrastructure they control and chooses. Integrofy does not host
              an instance and does not process the personal data stored in it.
              This DPA therefore describes the responsibilities of the Operator
              and the third-party integrations the Operator may enable.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">2. Definitions</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
              <li>
                <strong className="text-foreground">
                  Applicable Data Protection Law
                </strong>{" "}
                means all laws and regulations applicable to the processing of
                Personal Data under the Agreement, including the GDPR, the CCPA,
                and the UK GDPR.
              </li>
              <li>
                <strong className="text-foreground">CCPA</strong> means the
                California Consumer Privacy Act of 2018, as amended.
              </li>
              <li>
                <strong className="text-foreground">GDPR</strong> means the
                General Data Protection Regulation (Regulation (EU) 2016/679).
              </li>
              <li>
                <strong className="text-foreground">Personal Data</strong> means
                any information relating to an identified or identifiable
                natural person stored in a Pax instance.
              </li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              3. Roles and Responsibilities
            </h2>
            <p className="mb-3">
              <strong>3.1 Relationship of the Parties.</strong> For the purposes
              of Applicable Data Protection Law, the Operator is the Data
              Controller of the Personal Data stored in their instance.
              Integrofy is not a Data Processor of that data.
            </p>
            <p className="mb-3">
              <strong>3.2 Operator Responsibility.</strong> The Operator is
              responsible for running the instance, securing its database and
              storage, configuring which integrations are enabled, and honoring
              data subject requests.
            </p>
            <p>
              <strong>3.3 Operator Compliance.</strong> The Operator represents
              and warrants that it has all necessary rights, consents, and legal
              bases to store and process the Personal Data it places in the
              instance.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">4. Sub-processing</h2>
            <p className="mb-3">
              Sub-processors are chosen and engaged by the Operator, not by
              Integrofy. Typical integrations an Operator may enable include an
              OpenAI-compatible AI provider, an S3-compatible storage provider,
              Resend for email reminders, and Meta (WhatsApp) for WhatsApp
              reminders.
            </p>
            <p>
              The Operator is responsible for reviewing and imposing appropriate
              data protection obligations on any integration they enable.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              5. Data Subject Rights
            </h2>
            <p>
              The Operator is responsible for responding to requests to exercise
              data subject rights. The software provides the Operator with the
              tools to view, export, and delete the data in an instance.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              6. Security and Breach Notification
            </h2>
            <p className="mb-3">
              <strong>6.1 Security Measures.</strong> The software encrypts
              vault documents client-side with AES-256 before storage and serves
              them through time-limited presigned URLs. The Operator is
              responsible for the security of the hosting, database, and storage
              it configures.
            </p>
            <p>
              <strong>6.2 Breach Notification.</strong> Because Integrofy does
              not process instance data, the Operator is responsible for
              notifying affected data subjects and authorities of any breach in
              accordance with Applicable Data Protection Law.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">7. Data Transfers</h2>
            <p>
              Data location and any cross-border transfers depend on the
              infrastructure and integrations the Operator chooses. The Operator
              is responsible for putting appropriate transfer mechanisms in
              place (for example, Standard Contractual Clauses with a chosen
              provider).
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              8. Return or Deletion of Data
            </h2>
            <p>
              The Operator controls deletion, since all data lives in the
              Operator&apos;s own database and storage. Deleting the account
              from the Account page removes the account and its associated data,
              and the Operator can also remove the underlying database and
              bucket.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">9. Contact Us</h2>
            <p className="mb-3">
              Notices regarding this DPA should be directed to:
            </p>
            <div className="card-warm p-5 text-sm">
              <p className="font-semibold">Integrofy LLC</p>
              <p className="text-muted-foreground mt-1">
                1522 Western Ave STE 24183
                <br />
                Seattle, WA 98101
              </p>
              <p className="mt-2">
                Email:{" "}
                <a
                  href="mailto:privacy@integrofy.com"
                  className="text-primary hover:underline"
                >
                  privacy@integrofy.com
                </a>
              </p>
            </div>
          </section>
        </div>
      </article>

      {/* Footer */}
      <footer className="section-divider py-8 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <span className="heading-serif text-base">Pax</span>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/dpa"
              className="hover:text-foreground transition-colors"
            >
              DPA
            </Link>
            <span>© {new Date().getFullYear()} Integrofy LLC</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
