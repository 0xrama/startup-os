import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service — Pax",
  description: "Terms of Service for Pax, a product of Integrofy LLC.",
};

export default function TermsPage() {
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
        <h1 className="heading-serif text-4xl mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-12">
          Last Updated: February 16, 2026
        </p>

        <div className="prose-warm space-y-10 text-sm leading-relaxed text-foreground/85">
          {/* 1 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">1. Introduction</h2>
            <p className="mb-3">
              Welcome to Pax! Your use of our services, including the
              services we make available through this website and all related
              websites, mobile sites, data files, visualizations, and
              applications which link to these terms of service (the
              &ldquo;Site&rdquo;) and to all software or services offered by us
              in connection with any of those (collectively, the
              &ldquo;Services&rdquo;), is governed by these terms of service
              (the &ldquo;Terms&rdquo;), so please carefully read them before
              using the Services.
            </p>
            <p className="mb-3">
              For the purposes of these Terms, &ldquo;we,&rdquo;
              &ldquo;our,&rdquo; &ldquo;us,&rdquo; and &ldquo;Integrofy&rdquo;
              refer to Integrofy LLC, the providers and operators of the
              Services. &ldquo;Pax&rdquo; is a product and brand of
              Integrofy LLC.
            </p>
            <p className="mb-3">
              In order to use the Services, you must first agree to these Terms.
              If you are registering for or using the Services on behalf of an
              organization, you are agreeing to these Terms for that
              organization and promising that you have the authority to bind
              that organization to these Terms. In that case, &ldquo;you&rdquo;
              and &ldquo;your&rdquo; will also refer to that organization,
              wherever possible.
            </p>
            <p className="mb-3">
              You must be over 13 years of age to use the Services, and children
              under the age of 13 cannot use or register for the Services. If
              you are over 13 years of age but are not yet of legal age to form
              a binding contract (in many jurisdictions, this age is 18), then
              you must get your parent or guardian to read these Terms and agree
              to them for you before you use the Services.
            </p>
            <p className="font-medium text-foreground">
              BY USING, DOWNLOADING, INSTALLING, OR OTHERWISE ACCESSING THE
              SERVICES OR ANY MATERIALS INCLUDED IN OR WITH THE SERVICES, YOU
              HEREBY AGREE TO BE BOUND BY THESE TERMS. IF YOU DO NOT ACCEPT
              THESE TERMS, THEN YOU MAY NOT USE, DOWNLOAD, INSTALL, OR OTHERWISE
              ACCESS THE SERVICES.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">2. Accounts</h2>
            <p className="mb-3">
              You may need to register an account with us (a &ldquo;Customer
              Account&rdquo;) in order to use certain Services. You agree to
              provide accurate and complete information in the creation of your
              Customer Account and agree to update this information with any
              changes. Your Customer Account is for your personal use only and
              you may not authorize others to use your account.
            </p>
            <p>
              You are responsible for ensuring that your access credentials are
              kept confidential and are not disclosed to any third party, and for
              all activity that occurs under your Customer Account. You agree to
              notify us immediately upon learning of any unauthorized access to
              your Customer Account or any other suspected security breach.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">3. Content</h2>
            <p className="mb-3">
              You will be able to upload, create, host, transmit, share,
              publish or display information (such as data files, written text,
              photographs, or other materials) through use of the Services. All
              such information is referred to below as &ldquo;User
              Content.&rdquo; This includes documents uploaded to the Pax
              Document Vault, LLC profile data entered during onboarding, and
              messages sent to the Pax Assistant.
            </p>
            <p className="mb-3">
              You are solely responsible for the development, content, and use
              of the User Content you upload to Pax and you assume all
              risks associated with them, including intellectual property or
              other legal claims. By storing User Content with Pax, you
              represent that you have all necessary rights to store, use and, if
              applicable, publicize that User Content, and that doing so does
              not conflict with, violate or misappropriate any third party legal
              rights.
            </p>
            <p className="mb-3">
              You agree to immediately take down any User Content that violates
              these Terms. Integrofy doesn&apos;t actively monitor the User
              Content you upload, download or share. However, we reserve the
              right, in our sole discretion, to review and remove User Content
              and/or suspend your access to your account in the event we become
              aware that your use of our Services or User Content violates any
              of our Terms, or any applicable law and/or regulations.
            </p>
            <p>
              <strong>AI-Generated Outputs:</strong> When you use the Pax Assistant, 
              the Services may generate and return responses based on your queries and User Content (&ldquo;Output&rdquo;). 
              As between you and Integrofy, subject to your compliance with these Terms, Integrofy assigns to you all its right, title, and interest in and to the Output. This means you can use the Output for any purpose, 
              provided that you do not use it to violate these Terms, our policies, or any applicable law. Due to the nature of machine learning, Output may not be unique across users, and you acknowledge that other users may receive similar or identical Output.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              4. Proprietary Rights
            </h2>
            <p className="mb-3">
              By submitting, posting or otherwise uploading User Content on or
              through the Services you give Integrofy a worldwide, royalty-free,
              and non-exclusive license to reproduce, adapt, modify, translate,
              publish, publicly perform, publicly display and distribute such
              User Content for the purpose of enabling Integrofy to provide you
              with the Services.
            </p>
            <p className="mb-3">
              Except as provided above, Integrofy acknowledges and agrees that
              it obtains no right, title or interest from you (or your
              licensors) under these Terms in or to any User Content that you
              create, upload, submit, post, transmit, share or display on, or
              through, the Services, including any intellectual property rights
              which subsist in that User Content.
            </p>
            <p>
              You acknowledge and agree that Integrofy (and/or Integrofy&apos;s
              licensors) own all legal right, title and interest in and to the
              Services and Integrofy-Supplied Content and that the Services and
              Integrofy-Supplied Content are protected by copyrights,
              trademarks, patents, or other proprietary rights and laws.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              5. License from Integrofy and Restrictions on Use
            </h2>
            <p className="mb-3">
              Integrofy gives you a personal, worldwide, royalty-free,
              non-assignable and non-exclusive license to use the Services
              solely in the manner permitted by these Terms.
            </p>
            <p className="mb-3">
              You may not (and you may not permit anyone else to):
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
              <li>
                Copy, modify, create a derivative work of, reverse engineer,
                decompile or otherwise attempt to extract the source code of the
                Services or any part thereof;
              </li>
              <li>
                Attempt to disable or circumvent any security mechanisms used by
                the Services;
              </li>
              <li>
                Engage in any activity that interferes with or disrupts the
                Services;
              </li>
              <li>
                Rent, lease, provide access to or sublicense any elements of the
                Services to a third party;
              </li>
              <li>
                Access the Services in a manner intended to avoid incurring fees
                or exceeding usage limits;
              </li>
              <li>
                Access the Services for the purpose of creating a product or
                service competitive with the Services;
              </li>
              <li>
                Use any robot, spider, or other automated means to access the
                Services without our permission.
              </li>
            </ul>
            <p className="mb-3">
              You agree that you will not upload, record, publish, post, link
              to, transmit or distribute User Content, or otherwise utilize the
              Services in a manner that:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>
                Advocates, promotes, incites, or encourages violence or any
                illegal activities;
              </li>
              <li>
                Infringes or violates intellectual property rights of any third
                party or Integrofy;
              </li>
              <li>
                Attempts to mislead others about your identity or impersonates
                another person;
              </li>
              <li>
                Promotes inappropriate, harassing, abusive, profane, hateful,
                defamatory, or otherwise objectionable content;
              </li>
              <li>Is harmful to minors;</li>
              <li>
                Contains malware, viruses, or any other harmful software;
              </li>
              <li>Violates any law, statute, ordinance, or regulation.</li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">6. Pricing Terms</h2>
            <p>
              Subject to the Terms, certain Services may be provided to you
              without charge up to certain usage limits, and usage in excess of
              these limits may require purchase of additional resources and the
              payment of fees. Please see the relevant product pricing page for
              more details regarding pricing for the Services.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              7. Informational Guidance Disclaimer
            </h2>
            <p className="mb-3">
              The Services, including the Pax Assistant (AI chatbot),
              compliance calendar, and filing guidance, provide{" "}
              <strong>informational guidance only</strong>. Nothing provided
              through the Services constitutes legal, tax, or accounting advice.
            </p>
            <p>
              You should always consult a qualified attorney, CPA, or tax
              professional before making any decisions regarding your LLC
              compliance, tax filings, or legal obligations. Integrofy is not a
              law firm, accounting firm, or registered tax preparer, and does
              not file any forms or returns on your behalf.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">8. Privacy & Data Processing</h2>
            <p className="mb-3">
              These Services are provided in accordance with our{" "}
              <Link
                href="/privacy"
                className="text-primary hover:underline"
              >
                Privacy Policy
              </Link>
              . You agree to the use of your User Content and personal
              information in accordance with these Terms and Integrofy&apos;s
              Privacy Policy.
            </p>
            <p>
              To the extent we process any personal data on your behalf subject to applicable data protection laws (such as the GDPR or CCPA), the current version of our{" "}
              <Link
                href="/dpa"
                className="text-primary hover:underline"
              >
                Data Processing Agreement (DPA)
              </Link>
              {" "}is incorporated herein by reference and forms a part of these Terms.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              9. Modification and Termination of Services
            </h2>
            <p className="mb-3">
              Integrofy is constantly innovating in order to provide the best
              possible experience for its users. You acknowledge and agree that
              the form and nature of the Services which Integrofy provides may
              change from time to time without prior notice to you.
            </p>
            <p className="mb-3">
              You may terminate these Terms at any time by canceling your
              account on the Services. You will not receive any refunds if you
              cancel your account.
            </p>
            <p>
              You agree that Integrofy, in its sole discretion and for any or no
              reason, may terminate your account or any part thereof. You agree
              that any termination of your access to the Services may be without
              prior notice, and you agree that Integrofy will not be liable to
              you or any third party for such termination.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              10. Changes to the Terms
            </h2>
            <p>
              These Terms may be amended or updated from time to time without
              notice and may have changed since your last visit to the website
              or use of the Services. However, if we make any <strong>material changes</strong>, 
              we will notify you by sending an email to the address associated with your Customer Account prior to the changes taking effect. 
              By continuing to access or use the Services
              after any revisions become effective, you agree to be bound by the
              revised Terms.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              11. Disclaimer of Warranty
            </h2>
            <p className="font-medium text-foreground mb-3">
              YOU EXPRESSLY UNDERSTAND AND AGREE THAT YOUR USE OF THE SERVICES
              ARE AT YOUR SOLE RISK AND THAT THE SERVICES ARE PROVIDED
              &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE.&rdquo;
            </p>
            <p className="font-medium text-foreground">
              INTEGROFY, ITS SUBSIDIARIES AND AFFILIATES, AND ITS LICENSORS
              MAKE NO EXPRESS WARRANTIES AND DISCLAIM ALL IMPLIED WARRANTIES
              REGARDING THE SERVICES, INCLUDING IMPLIED WARRANTIES OF
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
              NON-INFRINGEMENT. WITHOUT LIMITING THE GENERALITY OF THE
              FOREGOING, INTEGROFY DOES NOT REPRESENT OR WARRANT TO YOU THAT:
              (A) YOUR USE OF THE SERVICES WILL MEET YOUR REQUIREMENTS, (B)
              YOUR USE OF THE SERVICES WILL BE UNINTERRUPTED, TIMELY, SECURE
              OR FREE FROM ERROR, AND (C) USAGE DATA PROVIDED THROUGH THE
              SERVICES WILL BE ACCURATE.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              12. Limitation of Liability
            </h2>
            <p className="font-medium text-foreground mb-3">
              YOU EXPRESSLY UNDERSTAND AND AGREE THAT INTEGROFY, ITS
              SUBSIDIARIES AND AFFILIATES, AND ITS LICENSORS SHALL NOT BE
              LIABLE TO YOU FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
              CONSEQUENTIAL, OR EXEMPLARY DAMAGES WHICH MAY BE INCURRED BY
              YOU, HOWEVER CAUSED AND UNDER ANY THEORY OF LIABILITY. THIS
              SHALL INCLUDE, BUT NOT BE LIMITED TO, ANY LOSS OF PROFIT, ANY
              LOSS OF GOODWILL OR BUSINESS REPUTATION, ANY LOSS OF DATA
              SUFFERED, COST OF PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES,
              OR OTHER INTANGIBLE LOSS.
            </p>
            <p className="font-medium text-foreground">
              IN NO EVENT SHALL INTEGROFY&apos;S TOTAL LIABILITY TO YOU FOR ALL
              DAMAGES, LOSSES, AND CAUSES OF ACTION EXCEED THE AMOUNT THAT
              YOU HAVE ACTUALLY PAID FOR THE SERVICES IN THE PAST TWELVE
              MONTHS, OR ONE HUNDRED DOLLARS ($100.00), WHICHEVER IS GREATER.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">13. Indemnification</h2>
            <p>
              You agree to hold harmless and indemnify Integrofy, and its
              subsidiaries, affiliates, officers, agents, employees,
              advertisers, licensors, suppliers or partners from and against any
              third party claim arising from or in any way related to (a) your
              breach of the Terms, (b) your use of the Services, (c) your
              violation of applicable laws, rules or regulations in connection
              with the Services, or (d) your User Content, including any
              liability or expense arising from all claims, losses, damages,
              suits, judgments, litigation costs and attorneys&apos; fees.
            </p>
          </section>

          {/* 14 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              14. Copyright Policy
            </h2>
            <p className="mb-3">
              We respect the intellectual property rights of others and expect
              our users to do the same. In accordance with the Digital
              Millennium Copyright Act, we will respond expeditiously to claims
              of copyright infringement committed using the Services if such
              claims are reported to us.
            </p>
            <p>
              If you believe your copyright has been infringed, please contact
              us at{" "}
              <a
                href="mailto:legal@integrofy.com"
                className="text-primary hover:underline"
              >
                legal@integrofy.com
              </a>{" "}
              with the relevant details.
            </p>
          </section>

          {/* 15 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">
              15. Third-Party Content and Materials
            </h2>
            <p>
              You may be able to access or use third party websites, resources,
              content, communications or information (&ldquo;Third Party
              Materials&rdquo;) via the Services. You acknowledge sole
              responsibility for and assume all risk arising from your access
              to, reliance upon or use of any such Third Party Materials and
              Integrofy disclaims any liability that you may incur arising from
              such use.
            </p>
          </section>

          {/* 16 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">16. Feedback</h2>
            <p>
              You may choose to or we may invite you to submit comments or ideas
              about the Services. By submitting any feedback, you agree that
              your disclosure is gratuitous, unsolicited and without restriction
              and will not place Integrofy under any fiduciary or other
              obligation, and that we are free to use such feedback without any
              additional compensation to you.
            </p>
          </section>

          {/* 17 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">17. Governing Law</h2>
            <p>
              These Terms and any action related thereto will be governed by the
              laws of the State of Washington without regard to its conflict of
              laws provisions. The exclusive jurisdiction and venue of any action
              with respect to the subject matter of these Terms will be the
              state and federal courts located in King County, Washington.
            </p>
          </section>

          {/* 18 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">18. Miscellaneous</h2>
            <p className="mb-3">
              These Terms, together with our Privacy Policy, constitutes the
              entire agreement between the parties relating to the Services and
              all related activities. If any part of these Terms is held to be
              unlawful, void, or unenforceable, that part shall be deemed
              severed and shall not affect the validity and enforceability of
              the remaining provisions.
            </p>
            <p>
              You may not assign these Terms, or any rights or licenses granted
              hereunder, whether voluntarily, by operation of law, or otherwise
              without our prior written consent.
            </p>
          </section>

          {/* 19 */}
          <section>
            <h2 className="heading-serif text-xl mb-3">19. Contact Us</h2>
            <p className="mb-3">
              If you have any questions about these Terms or if you wish to make
              any complaint or claim with respect to the Services, please
              contact us at:
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
                  href="mailto:legal@integrofy.com"
                  className="text-primary hover:underline"
                >
                  legal@integrofy.com
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
