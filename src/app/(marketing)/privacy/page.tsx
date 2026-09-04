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
              This privacy policy (&ldquo;Policy&rdquo;) describes how
              Integrofy LLC (&ldquo;Company&rdquo;, &ldquo;Integrofy&rdquo;,
              &ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses, and shares
              personal information of consumer users of Pax, including
              our website and all associated products and services (together,
              the &ldquo;Services&rdquo;).
            </p>
            <p className="mb-3">
              This Policy applies to personal information that we collect
              through the Site and our Services as well as personal information
              you provide to us directly.
            </p>
            <p>
              Please note that by using the Site or the Services, you accept the
              practices and policies described in this Policy and you consent
              that we will collect, use, and share your personal information as
              described below. If you do not agree to this Policy, please do not
              use the Site or the Services.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              2. Personal Information We Collect
            </h2>
            <p className="mb-3">
              We collect personal information about you in a number of different
              ways:
            </p>

            <h3 className="font-semibold text-sm mt-5 mb-2">
              Personal Information From Users of Pax
            </h3>
            <p className="mb-2">
              When you use Pax, we collect the following personal
              information from you:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
              <li>
                <strong className="text-foreground">User Content</strong> — such as LLC
                profile data, uploaded documents (Articles of Organization, EIN
                letters, operating agreements, etc.), compliance task data, and
                messages sent to the Pax Assistant.
              </li>
              <li>
                <strong className="text-foreground">Account information</strong> — your
                name, email address, and password.
              </li>
              <li>
                <strong className="text-foreground">Billing information</strong> — payment details
                and subscription history processed through our payment provider, Polar.
              </li>
            </ul>

            <h3 className="font-semibold text-sm mt-5 mb-2">
              Information We Collect Automatically
            </h3>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
              <li>
                <strong className="text-foreground">Online identifiers</strong> — your
                device&apos;s operating system type and version, browser type, IP
                address, and general location information such as city, state, or
                geographic area.
              </li>
              <li>
                <strong className="text-foreground">Usage data</strong> — pages viewed,
                access times, features used, and information about how you
                interact with the Services.
              </li>
            </ul>

            <h3 className="font-semibold text-sm mt-5 mb-2">Cookies</h3>
            <p>
              We may log information using &ldquo;cookies.&rdquo; Cookies are
              small data files stored on your device by a website. We use
              essential cookies (such as session cookies for authentication) and
              may use analytics cookies to understand how you use our Services.
              You can instruct your browser to stop accepting cookies or to
              prompt you before accepting cookies.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              3. How We Use Your Personal Information
            </h2>

            <h3 className="font-semibold text-sm mt-4 mb-2">
              To Provide the Services
            </h3>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
              <li>Help establish and verify your identity;</li>
              <li>
                Generate your compliance calendar and task deadlines based on
                your LLC profile;
              </li>
              <li>
                Store and encrypt your documents in the Document Vault;
              </li>
              <li>
                Power the Pax Assistant with context from your LLC
                profile and uploaded documents;
              </li>
              <li>
                Send compliance reminders via email and/or WhatsApp;
              </li>
              <li>
                Process subscription payments and manage your billing;
              </li>
              <li>
                Provide you with effective customer service.
              </li>
            </ul>

            <h3 className="font-semibold text-sm mt-5 mb-2">
              Research and Development
            </h3>
            <p className="mb-3">
              We may use your information for research and development purposes,
              including to analyze and improve the Services. We may create
              aggregated, de-identified, or anonymous data from personal
              information we collect.
            </p>

            <h3 className="font-semibold text-sm mt-5 mb-2">
              Training of AI Models
            </h3>
            <p className="mb-3">
              <strong>We do not use your personal information or User Content to
              train AI models.</strong> The Pax Assistant processes your
              queries in real-time using your LLC profile data and uploaded
              documents for context, but this data is not used for model
              training.
            </p>

            <h3 className="font-semibold text-sm mt-5 mb-2">
              Compliance and Protection
            </h3>
            <p>
              We may use your information to comply with applicable laws,
              protect rights and safety, audit our processes, enforce terms and
              conditions, and prevent fraudulent or illegal activity.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              4. How We Share Your Personal Information
            </h2>
            <p className="mb-3">
              We may disclose personal information with the following categories
              of third parties:
            </p>

            <h3 className="font-semibold text-sm mt-4 mb-2">
              Third Party Service Providers
            </h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
              <li>
                <strong className="text-foreground">OpenAI</strong> — We use
                OpenAI&apos;s API to power the Pax Assistant. When you
                use the assistant, your query and relevant LLC profile data are
                sent to OpenAI&apos;s servers for processing.{" "}
                <a
                  href="https://openai.com/privacy"
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View OpenAI&apos;s privacy policy
                </a>
              </li>
              <li>
                <strong className="text-foreground">Cloudflare R2</strong> — We
                use Cloudflare R2 for encrypted document storage. Your uploaded
                documents are stored with AES-256 encryption and accessed via
                time-limited presigned URLs.
              </li>
              <li>
                <strong className="text-foreground">Polar</strong> — We use
                Polar for subscription billing and payment processing.
              </li>
              <li>
                <strong className="text-foreground">Resend</strong> — We use
                Resend for transactional email delivery, including compliance
                reminders.
              </li>
              <li>
                <strong className="text-foreground">Meta (WhatsApp)</strong> —
                If you opt in to WhatsApp notifications, we use Meta&apos;s
                Cloud API to send compliance reminders to your WhatsApp number. 
                <strong>We only send standard text reminders (e.g., &ldquo;Your LLC annual report is due in 14 days&rdquo;) and never share your sensitive uploaded documents or assistant chat history with Meta.</strong>
              </li>
            </ul>

            <h3 className="font-semibold text-sm mt-5 mb-2">
              Other Disclosures
            </h3>
            <p>
              We may disclose your personal information in connection with legal
              investigations, to comply with laws or respond to subpoenas, to
              protect our rights or property, and to investigate or prevent
              violations of law. We may also share information in connection
              with any merger, financing, acquisition, or dissolution
              transaction.
            </p>

            <div className="callout-warm p-4 mt-4 text-xs">
              <strong>We do not sell your personal information.</strong>
            </div>
          </section>

          {/* 5 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              5. Your Choices
            </h2>

            <h3 className="font-semibold text-sm mt-4 mb-2">
              Email Communications
            </h3>
            <p className="mb-3">
              When you receive promotional communications from us, you may
              indicate a preference to stop receiving further communications by
              following the unsubscribe instructions in the email. We may still
              send you service-related communications including compliance
              reminders you have configured.
            </p>

            <h3 className="font-semibold text-sm mt-5 mb-2">Cookies</h3>
            <p>
              You can instruct your browser to stop accepting cookies or to
              prompt you before accepting cookies. If you do not accept cookies,
              you may not be able to use all portions of the Site or all
              functionality of the Services.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              6. Security of Your Personal Information
            </h2>
            <p>
              Integrofy is committed to protecting the security of your personal
              information. Documents stored in the Pax Document Vault are
              encrypted using AES-256 encryption on Cloudflare R2
              infrastructure. Access is controlled via time-limited presigned
              URLs — your files are never publicly accessible. We use a variety
              of additional security technologies and procedures to help protect
              your personal information from unauthorized access, use, or
              disclosure. No method of transmission over the internet is 100%
              secure, however.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              7. International Users
            </h2>
            <p>
              Please note that our Site and the Services are provided from the
              United States. As Pax is specifically designed for
              non-resident founders operating U.S. LLCs, your personal
              information will be processed in the United States in accordance
              with United States law, regardless of where you are located.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">8. Children</h2>
            <p>
              Our Site and the Services are not intended for children under 13
              years of age, and you must be at least 13 years old to have our
              permission to use the Site or the Services. We do not knowingly
              collect personally identifiable information from children under
              13.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              9. Do Not Track
            </h2>
            <p>
              We currently do not support the Do Not Track browser setting or
              respond to Do Not Track signals.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              10. Data Retention
            </h2>
            <p className="mb-3">
              We retain your personal information only for as long as is necessary for the purposes set out in this Privacy Policy. 
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
              <li>
                <strong className="text-foreground">Account and LLC Profile Data:</strong> Retained for the lifetime of your active subscription. If you cancel your subscription or delete your account, this data is permanently deleted within 30 days of closure.
              </li>
              <li>
                <strong className="text-foreground">Uploaded Documents:</strong> Stored securely in our encrypted Document Vault as long as your account is active. They are immediately inaccessible upon account deletion and purged from our servers within 30 days.
              </li>
              <li>
                <strong className="text-foreground">Chat History:</strong> Messages with the Pax Assistant are retained while your account is active to provide ongoing context, and deleted when your account is closed.
              </li>
            </ul>
          </section>

          {/* 11 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              11. Notice to European and UK Users (GDPR)
            </h2>
            <p className="mb-3">
              If you are a resident of the European Economic Area (EEA) or the United Kingdom (UK), your personal data is processed under the General Data Protection Regulation (GDPR) and UK GDPR.
            </p>
            <p className="mb-3">
              <strong>Legal Basis for Processing:</strong> We process your personal data primarily to perform our contract with you (providing the Services). In some cases, we process data based on your explicit consent (e.g., opting into WhatsApp alerts) or for our legitimate business interests (e.g., improving the platform).
            </p>
            <p className="mb-3">
              <strong>Your Rights:</strong> Under the GDPR, you have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
              <li>Access the personal data we hold about you.</li>
              <li>Request the correction of inaccurate data.</li>
              <li>Request the deletion of your data (&ldquo;Right to be Forgotten&rdquo;).</li>
              <li>Object to or restrict the processing of your data.</li>
              <li>Request data portability (receiving your data in a structured, machine-readable format).</li>
            </ul>
            <p>
              To exercise these rights, please contact us at{" "}
              <a href="mailto:privacy@integrofy.com" className="text-primary hover:underline">
                privacy@integrofy.com
              </a>. Note that standard data transfers outside the EEA are governed by our Data Processing Agreement (DPA) incorporating standard contractual clauses.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              12. Notice to California Residents (CCPA)
            </h2>
            <p className="mb-3">
              If you are a California resident, the California Consumer Privacy Act (CCPA) provides you with specific rights regarding your personal information:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
              <li><strong>Right to Know:</strong> You may request reasonable access to the specific pieces and categories of personal information we have collected about you over the past 12 months.</li>
              <li><strong>Right to Delete:</strong> You have the right to request deletion of your personal information, subject to certain exceptions.</li>
              <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your CCPA rights.</li>
            </ul>
            <p className="mb-3">
              <strong>Do Not Sell My Personal Information:</strong> We do not sell your personal information. We only share it with third-party service providers as necessary to provide the Services, as defined by the CCPA.
            </p>
            <p>
              To exercise your CCPA rights, please contact us at{" "}
              <a href="mailto:privacy@integrofy.com" className="text-primary hover:underline">
                privacy@integrofy.com
              </a>.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              13. Updates To This Privacy Policy
            </h2>
            <p>
              We reserve the right to change this Privacy Policy at any time. If
              we make any <strong>material changes</strong>, we will notify you by sending an email to the address associated with your Customer Account prior to the changes taking effect, in addition to posting the revised version to our website and updating the &ldquo;Effective Date&rdquo; at the top. Non-material changes become effective when posted.
            </p>
          </section>

          {/* 14 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">14. Contact Us</h2>
            <p className="mb-3">
              Our contact information is as follows:
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
