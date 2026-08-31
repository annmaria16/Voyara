import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function PrivacyPolicy() {
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
              Privacy Policy
            </h1>
            <p className="text-sm text-dash-secondary mt-3 font-semibold">
              Last Updated: August 14, 2026
            </p>
          </header>

          <article className="prose prose-invert max-w-none flex flex-col gap-8 text-[14.5px] leading-relaxed text-dash-secondary font-medium">
            <p className="text-dash-text text-base font-semibold">
              This Privacy Policy explains how VeriNova collects, uses, stores, and protects information when you use the VeriNova platform.
            </p>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                1. Introduction
              </h2>
              <p>
                VeriNova ("we", "our", or "us") provides a platform designed to analyze, verify, and check the outcomes of AI-generated content, documents, claims, and data payloads. We are committed to protecting your privacy and managing your data securely.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                2. Information We Collect
              </h2>
              <p>
                We collect information directly from you when you register an account, submit verification queries, or contact our support team.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                3. Account Information
              </h2>
              <p>
                When you create a VeriNova account, we collect credentials including your Full Name and Email Address. If you register through third-party OAuth providers (Google or GitHub), we retrieve your public profile name, email, and avatar profile photo from the respective provider.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                4. Information Submitted Through the Platform
              </h2>
              <p>
                We collect data payloads, text, claims, and documents that you submit to the platform for AI outcome verification purposes. 
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                5. AI Verification Data
              </h2>
              <p>
                Verification requests are processed via automated algorithms to check authenticity, accuracy, and logic. The outcomes of these queries, including statuses and confidence rankings, are saved associated with your User ID to allow historical lookup.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                6. How We Use Information
              </h2>
              <p>
                We use the collected information to verify outcomes, manage user sessions, prevent malicious activity, respond to support inquiries, and continuously improve VeriNova's accuracy. We do not sell user data to third-party advertisers.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                7. How We Protect Information
              </h2>
              <p>
                We implement industry-standard security safeguards. Your password is securely encrypted using bcrypt hashing algorithms. Sensitive token exchanges are protected by JSON Web Token (JWT) standards.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                8. Data Retention
              </h2>
              <p>
                We retain your account details and verification history as long as your account is active. You may initiate an account deletion request to purge your stored data.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                9. Cookies and Local Storage
              </h2>
              <p>
                We use persistent local storage tokens (`localStorage` and `sessionStorage`) to manage authenticated user sessions and temporarily restore contact form draft values.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                10. Third-Party Services
              </h2>
              <p>
                We integrate third-party identity authentication services (Google Identity Services and GitHub OAuth). The collection and processing of data by these networks are governed by their respective privacy policies.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                11. User Rights
              </h2>
              <p>
                You have the right to access the verification logs saved in your profile, update your profile name, and update your security passwords through the user dashboard interface.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                12. Account Deletion
              </h2>
              <p>
                If you wish to terminate your account and remove all related data, please reach out to our team at adminverinova@gmail.com. We will delete your records in compliance with data management practices.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                13. Children's Privacy
              </h2>
              <p>
                Our services are not intended for or marketed to individuals under the age of 13. If you believe we have accidentally collected data of a minor, please alert us immediately.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                14. Changes to This Privacy Policy
              </h2>
              <p>
                We reserve the right to update or modify this policy at any time to reflect software changes or legislative updates. You are advised to review this policy page periodically.
              </p>
            </section>

            <section className="flex flex-col gap-3 text-left">
              <h2 className="text-lg font-black text-dash-text border-l-2 border-dash-primary pl-3">
                15. Contact Information
              </h2>
              <p>
                If you have questions about this Privacy Policy, please contact our administrator at:
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
