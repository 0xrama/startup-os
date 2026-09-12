import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — Pax",
  description: "Privacy Policy for Pax, a product of Integrofy LLC.",
};

export default function PrivacyPage() {
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
        <h1 className="heading-serif text-4xl mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-12">
          Last Updated: March 11, 2026 · Effective Date: March 11, 2026
        </p>

        <div className="prose-warm space-y-10 text-sm leading-relaxed text-foreground/85">
          {/* 1 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">1. Introduction</h2>
            <p className="mb-3">
              Pax is self-hosted, single-user software provided by Integrofy LLC
              (&ldquo;Company&rdquo;, &ldquo;Integrofy&rdquo;). The person or
              organization that deploys and operates a Pax instance (the
              &ldquo;Operator&rdquo;) controls the instance, its database, its
              storage, and any integrations configured on it.
            </p>
            <p className="mb-3">
              Integrofy does not host, receive, or process the data stored in a
              self-hosted instance. The Operator selects where the data lives
              and which third-party services, if any, the instance connects to.
            </p>
            <p>
              This Policy explains what the software stores and how the Operator
              can configure it. If you use a Pax instance operated by someone
              else, that Operator is responsible for the data in it.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              2. Information the Software Stores
            </h2>
            <p className="mb-3">
              A Pax instance stores the following in the Operator&apos;s own
              PostgreSQL database and object storage:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
              <li>
                <strong className="text-foreground">User Content</strong> — LLC
                profile data, uploaded documents (Articles of Organization, EIN
                letters, operating agreements, notices, and similar records),
                compliance task data, and messages sent to the Pax Assistant.
              </li>
              <li>
                <strong className="text-foreground">Account information</strong>{" "}
                — the single account&apos;s name, email address, and password
                hash.
              </li>
              <li>
                <strong className="text-foreground">Operational data</strong> —
                audit log entries and AI provider settings.
              </li>
            </ul>

            <h3 className="font-semibold text-sm mt-5 mb-2">
              Information the Software Collects Automatically
            </h3>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
              <li>
                <strong className="text-foreground">Online identifiers</strong>{" "}
                — the instance may log IP address, user agent, and request IDs
                for security and debugging.
              </li>
              <li>
                <strong className="text-foreground">Usage data</strong> — pages
                viewed, access times, and features used, kept in the
                instance&apos;s own database and logs.
              </li>
            </ul>

            <h3 className="font-semibold text-sm mt-5 mb-2">Cookies</h3>
            <p>
              The software uses essential cookies for authentication sessions
              only. It does not set analytics or tracking cookies.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              3. How the Information Is Used
            </h2>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
              <li>Authenticate the single account and keep it secure;</li>
              <li>
                Generate the compliance calendar and task deadlines from the LLC
                profile;
              </li>
              <li>Store and encrypt documents in the Document Vault;</li>
              <li>
                Power the Pax Assistant with context from the LLC profile and
                uploaded documents;
              </li>
              <li>Send compliance reminders by email and/or WhatsApp;</li>
              <li>Maintain an audit log of important actions.</li>
            </ul>

            <h3 className="font-semibold text-sm mt-5 mb-2">
              Training of AI Models
            </h3>
            <p>
              <strong>
                The software does not use your information or User Content to
                train AI models.
              </strong>{" "}
              The Pax Assistant sends your query and relevant context to the
              OpenAI-compatible endpoint the Operator configures, in real time,
              to produce a response. Whether that provider retains data is
              governed by the Operator&apos;s agreement with that provider.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              4. Integrations the Operator Configures
            </h2>
            <p className="mb-3">
              A Pax instance does not contact a fixed set of vendors. The
              Operator chooses and configures each integration. Typical
              integrations include:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
              <li>
                <strong className="text-foreground">
                  OpenAI-compatible AI provider
                </strong>{" "}
                — the query, relevant LLC profile data, and document excerpts
                needed to answer are sent to the endpoint the Operator sets in
                Settings.
              </li>
              <li>
                <strong className="text-foreground">
                  S3-compatible storage
                </strong>{" "}
                — encrypted documents are stored in the bucket the Operator
                configures (for example Cloudflare R2, MinIO, Wasabi, or AWS
                S3), accessed through time-limited presigned URLs.
              </li>
              <li>
                <strong className="text-foreground">Resend (optional)</strong> —
                used to deliver transactional compliance reminder emails.
              </li>
              <li>
                <strong className="text-foreground">
                  WhatsApp / Meta (optional)
                </strong>{" "}
                — if enabled, standard text reminders are sent to the configured
                WhatsApp number. Uploaded documents and assistant chat history
                are never sent to Meta.
              </li>
            </ul>
            <p>
              The Operator is responsible for reviewing the privacy practices of
              each integration they enable.
            </p>

            <div className="callout-warm p-4 mt-4 text-xs">
              <strong>
                Integrofy does not sell personal information and does not
                receive it from self-hosted instances.
              </strong>
            </div>
          </section>

          {/* 5 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">5. Your Choices</h2>
            <p>
              Because the instance holds a single account, the account owner
              controls the data directly: they can delete documents, clear chat
              threads, change reminder channels, and delete the account and all
              associated data from the Account page.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              6. Security of Your Information
            </h2>
            <p>
              Documents are encrypted client-side with AES-256 before they leave
              the browser and are stored in the Operator&apos;s S3-compatible
              bucket. Access is controlled through time-limited presigned URLs.
              The software relies on the security of the Operator&apos;s own
              database, storage, and hosting. No method of transmission over the
              internet is completely secure.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">7. Children</h2>
            <p>
              The Services are not intended for children under 13 years of age,
              and you must be at least 13 years old to use them. The software
              does not knowingly collect personal information from children
              under 13.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">8. Do Not Track</h2>
            <p>
              The software does not currently respond to Do Not Track signals.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">9. Data Retention</h2>
            <p className="mb-3">
              Data is retained for as long as the Operator keeps the instance
              and the account remains active.
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
              <li>
                <strong className="text-foreground">
                  Account and LLC profile data:
                </strong>{" "}
                retained while the account exists and removed when the account
                is deleted from the Account page.
              </li>
              <li>
                <strong className="text-foreground">Uploaded documents:</strong>{" "}
                stored in the encrypted Document Vault while the account is
                active, and removed from the Operator&apos;s storage when
                deleted.
              </li>
              <li>
                <strong className="text-foreground">Chat history:</strong>{" "}
                stored while the account is active and deleted with the account.
              </li>
            </ul>
          </section>

          {/* 10 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              10. Notice to European and UK Users (GDPR)
            </h2>
            <p className="mb-3">
              If you are a resident of the European Economic Area (EEA) or the
              United Kingdom (UK), your personal data is processed under the
              General Data Protection Regulation (GDPR) and UK GDPR by the
              Operator of the instance you use, not by Integrofy.
            </p>
            <p className="mb-3">
              <strong>Legal Basis for Processing:</strong> the Operator
              processes personal data to provide the service. Some processing is
              based on consent (for example, enabling WhatsApp alerts) or
              legitimate interests (for example, keeping the instance secure).
            </p>
            <p className="mb-3">
              <strong>Your Rights:</strong> Under the GDPR, you have the right
              to access, correct, delete, restrict, or object to processing, and
              to data portability. Exercise these rights with the Operator of
              the instance you use.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              11. Notice to California Residents (CCPA)
            </h2>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
              <li>
                <strong>Right to Know:</strong> request access to the personal
                information held about you.
              </li>
              <li>
                <strong>Right to Delete:</strong> request deletion of your
                personal information, subject to certain exceptions.
              </li>
              <li>
                <strong>Right to Non-Discrimination:</strong> you will not be
                discriminated against for exercising your rights.
              </li>
            </ul>
            <p>
              Integrofy does not sell personal information. Exercise CCPA rights
              with the Operator of the instance you use.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              12. Updates To This Privacy Policy
            </h2>
            <p>
              We may update this Policy from time to time. Material changes will
              be reflected by updating the &ldquo;Effective Date&rdquo; above
              and publishing the revised version on this page.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">13. Contact Us</h2>
            <p className="mb-3">Our contact information is as follows:</p>
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
