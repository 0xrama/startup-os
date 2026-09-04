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
        <h1 className="heading-serif text-4xl mb-2">Data Processing Agreement</h1>
        <p className="text-sm text-muted-foreground mb-12">
          Last Updated: March 11, 2026
        </p>

        <div className="prose-warm space-y-10 text-sm leading-relaxed text-foreground/85">
          {/* 1 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">1. Introduction</h2>
            <p className="mb-3">
              This Data Processing Agreement (&ldquo;DPA&rdquo;) forms an integral part of the{" "}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              between you (the &ldquo;Customer&rdquo; or &ldquo;Data Controller&rdquo;) and Integrofy LLC (&ldquo;Integrofy&rdquo;, &ldquo;we&rdquo;, or &ldquo;Data Processor&rdquo;), collectively referred to as the &ldquo;Parties&rdquo;.
            </p>
            <p>
              This DPA sets out the terms that apply when Integrofy processes personal data on behalf of Customer in connection with the Pax Services. By using the Services, Customer enters into this DPA on behalf of itself.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">2. Definitions</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
              <li>
                <strong className="text-foreground">Applicable Data Protection Law</strong> means all laws and regulations applicable to Integrofy&apos;s processing of Personal Data under the Agreement, including the GDPR, the CCPA, and the UK GDPR.
              </li>
              <li>
                <strong className="text-foreground">CCPA</strong> means the California Consumer Privacy Act of 2018, as amended.
              </li>
              <li>
                <strong className="text-foreground">GDPR</strong> means the General Data Protection Regulation (Regulation (EU) 2016/679).
              </li>
              <li>
                <strong className="text-foreground">Personal Data</strong> means any information relating to an identified or identifiable natural person that Integrofy processes on behalf of Customer.
              </li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">3. Roles and Responsibilities</h2>
            <p className="mb-3">
              <strong>3.1 Relationship of the Parties.</strong> For the purposes of Applicable Data Protection Law, Customer is the Data Controller (or a Processor acting on behalf of another Controller) and Integrofy is the Data Processor processing Personal Data on behalf of Customer.
            </p>
            <p className="mb-3">
              <strong>3.2 Purpose Limitation.</strong> Integrofy will process Personal Data only as necessary to provide the Services, in accordance with the Terms of Service and Customer&apos;s documented written instructions.
            </p>
            <p>
              <strong>3.3 Customer Compliance.</strong> Customer represents and warrants that it has all necessary rights, consents, and legal bases to provide the Personal Data to Integrofy for processing.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">4. Sub-processing</h2>
            <p className="mb-3">
              Customer grants Integrofy a general authorization to engage Sub-processors (including OpenAI, Cloudflare, Resend, Meta, and Polar) to process Personal Data. 
            </p>
            <p>
              Integrofy will impose data protection obligations on its Sub-processors that are at least as protective as those set out in this DPA and remains liable for their acts and omissions as they relate to processing Personal Data.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">5. Data Subject Rights</h2>
            <p>
              Taking into account the nature of the processing, Integrofy will assist Customer by implementing appropriate technical and organizational measures, insofar as this is possible, to enable Customer to fulfill its obligation to respond to requests for exercising Data Subject rights under Applicable Data Protection Law.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">6. Security and Personal Data Breach Notification</h2>
            <p className="mb-3">
              <strong>6.1 Security Measures.</strong> Integrofy implements and maintains appropriate technical and organizational security measures to protect Personal Data against unauthorized or unlawful processing and against accidental or unlawful destruction, loss, alteration, or damage, including but not limited to AES-256 encryption at rest for documents stored in the Document Vault.
            </p>
            <p>
              <strong>6.2 Breach Notification.</strong> Integrofy will notify Customer without undue delay (and in any event within 72 hours) upon becoming aware of a verified Personal Data Breach affecting Customer&apos;s Personal Data.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">7. Data Transfers</h2>
            <p>
              Integrofy may process Personal Data globally, including in the United States. If Customer is transferring Personal Data out of the European Economic Area (EEA), the United Kingdom, or Switzerland, the Parties agree that the applicable Standard Contractual Clauses (SCCs) are incorporated by reference into this DPA and apply to the transfer.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">8. Return or Deletion of Data</h2>
            <p>
              Upon termination or expiration of the Agreement, Integrofy will, at the choice of Customer, delete or return all Personal Data to Customer, except to the extent that Applicable Data Protection Law requires storage of the Personal Data.
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
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/dpa" className="hover:text-foreground transition-colors">DPA</Link>
            <span>© {new Date().getFullYear()} Integrofy LLC</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
