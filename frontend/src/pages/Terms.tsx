import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Terms() {
  return (
    <div className="min-h-screen bg-dash-bg text-dash-text flex flex-col justify-between selection:bg-dash-primary/20 selection:text-dash-primary">
      <div>
        <Navbar />
        
        {/* Main Content Area */}
        <main className="max-w-4xl mx-auto px-6 py-28 sm:py-32 text-left">
          
          {/* Back Navigation Button */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-dash-secondary hover:text-dash-primary font-bold mb-8 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Link>

          <header className="mb-12 border-b border-dash-border/60 pb-8">
            <h1 className="text-3xl sm:text-4xl font-black text-dash-text tracking-tight">
              Terms & Conditions
            </h1>
            <p className="text-sm text-dash-secondary mt-3 font-semibold">
              Last Updated: August 14, 2026
            </p>
          </header>

          <article className="prose prose-invert max-w-none flex flex-col gap-8 text-[14.5px] leading-relaxed text-dash-secondary font-medium">
            <p className="text-dash-text text-base font-semibold">
              These Terms & Conditions explain the rules, terms, and guidelines for using the VeriNova outcome verification platform.
            </p>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                1. Acceptance of Terms
              </h2>
              <p>
                By registering an account or accessing VeriNova, you agree to comply with and be bound by these Terms & Conditions. If you do not agree, you must not create an account or use our platform services.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                2. Description of VeriNova
              </h2>
              <p>
                VeriNova is an automated outcome verification platform. The platform allows users to submit claims, details, or documents to verify their authenticity and truth value before trusting them.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                3. User Accounts
              </h2>
              <p>
                To submit outcomes for verification, you must create a user profile. You are responsible for keeping your password secure and monitoring all activities performed under your credentials.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                4. Registration Requirements
              </h2>
              <p>
                During registration, you must provide accurate, current, and complete details. You must agree to the Terms & Conditions and Privacy Policy by completing the mandatory registration consent checkbox.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                5. User Responsibilities
              </h2>
              <p>
                You are solely responsible for all content, information, claims, or files you submit to the platform. You must ensure you possess the legal right and permissions to submit such information.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                6. Acceptable Use
              </h2>
              <p>
                You agree not to use the platform to submit malicious payloads, spam, copyrighted material without permission, or text containing hate speech or harassment. Automated scraping of verification results is strictly prohibited.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                7. AI Verification Results
              </h2>
              <p>
                VeriNova utilizes advanced artificial intelligence models to check and analyze outcome claims. Results are output as confidence scores, reports, and statuses (pending, verified, rejected).
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                8. Important Accuracy Disclaimer
              </h2>
              <p className="text-dash-text font-semibold">
                Because VeriNova is an AI outcome verification platform, you clearly understand and agree that AI-generated verification, confidence metrics, or analytical reports should not automatically be treated as an absolute guarantee of truth, correctness, or fact. Verification scores represent estimates based on training algorithms and should be verified independently before taking critical decisions.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                9. Intellectual Property
              </h2>
              <p>
                All elements of the VeriNova platform, including frontend code, designs, logos, backend systems, and automated checking algorithms, are the property of VeriNova and protected by intellectual property laws.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                10. User Content
              </h2>
              <p>
                By submitting payloads to VeriNova, you grant us a non-exclusive license to process and analyze the content to provide verification results. We do not claim ownership of your submitted data.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                11. Third-Party Services
              </h2>
              <p>
                VeriNova contains integrations with third-party networks. We are not responsible for the performance, uptime, or correctness of external networks or services.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                12. Account Suspension/Termination
              </h2>
              <p>
                We reserve the right to suspend or terminate accounts that violate our Acceptable Use policy, submit spam payloads, or interfere with system networks.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                13. Service Availability
              </h2>
              <p>
                We strive to keep the platform online and operational. However, we do not guarantee continuous, uninterrupted access to verification services and are not liable for system down-times.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                14. Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by law, VeriNova shall not be liable for any direct, indirect, incidental, or consequential damages resulting from your use of, or inability to use, verification outcomes or services.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                15. Changes to Terms
              </h2>
              <p>
                We may revise these Terms & Conditions from time to time. The updated terms will be posted on this page with the revised "Last Updated" date. Continued usage indicates your acceptance.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                16. Governing Law / Jurisdiction
              </h2>
              <p>
                These Terms are governed by the applicable laws of the jurisdiction in which VeriNova operates, unless otherwise required by applicable law.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                17. Contact Information
              </h2>
              <p>
                If you have questions about these Terms & Conditions, please contact our administrator at:
                <br />
                <span className="font-bold text-dash-primary">adminverinova@gmail.com</span>
              </p>
            </section>
          </article>
        </main>
      </div>
      
      <Footer />
    </div>
  );
}
