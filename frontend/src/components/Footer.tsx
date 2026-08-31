import { ShieldCheck, ArrowUp } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Footer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      if (location.pathname !== "/") {
        navigate("/", { state: { scrollTo: href } });
      } else {
        const element = document.querySelector(href);
        if (element) {
          const offset = 80;
          const bodyRect = document.body.getBoundingClientRect().top;
          const elementRect = element.getBoundingClientRect().top;
          const elementPosition = elementRect - bodyRect;
          const offsetPosition = elementPosition - offset;

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
          });
        }
      }
    }
  };

  const productLinks = [
    { name: "Features", href: "#features" },
    { name: "Workflow", href: "#how-it-works" },
    { name: "Pricing", href: "#" },
    { name: "API Docs", href: "#" },
  ];

  const companyLinks = [
    { name: "About Us", href: "#about" },
    { name: "FAQ", href: "#faq" },
    { name: "Contact", href: "#contact" },
    { name: "Security", href: "#" },
  ];

  const resourceLinks = [
    { name: "Documentation", href: "#" },
    { name: "GitHub", href: "https://github.com" },
    { name: "Privacy Policy", href: "/privacy-policy" },
    { name: "Terms & Conditions", href: "/terms" },
    { name: "Cookie Policy", href: "#" },
  ];

  return (
    <footer className="relative bg-dash-sidebar border-t border-dash-border pt-16 pb-12 overflow-hidden">
      {/* Footer Top Grid */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 pb-12 border-b border-dash-border/60">
        
        {/* Brand Column */}
        <div className="lg:col-span-2 flex flex-col gap-5 text-left">
          <Link
            to="/"
            className="flex items-center gap-3 cursor-pointer group"
            onClick={(e) => {
              if (isAuthenticated) {
                return;
              }
              if (location.pathname === "/") {
                e.preventDefault();
                handleScrollToTop();
              }
            }}
          >
            <div className="bg-gradient-to-br from-[#FF6B00] to-[#FF8A1F] p-2 rounded-xl shadow-lg shadow-orange-500/10 group-hover:shadow-orange-500/30 transition-all duration-300">
              <ShieldCheck className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-dash-text tracking-wide leading-none group-hover:text-dash-primary transition-colors">
                VeriNova
              </h1>
              <p className="text-dash-secondary text-[9px] tracking-[0.15em] font-bold uppercase mt-1">
                Outcome Verification
              </p>
            </div>
          </Link>
          <p className="text-dash-secondary text-sm leading-relaxed max-w-sm font-semibold">
            VeriNova helps users verify AI-generated outcomes, claims, documents, and information using evidence-based analysis before making decisions they depend on.
          </p>
          {/* Social Icons */}
          <div className="flex gap-4 mt-2">
            {/* GitHub */}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl bg-dash-card border border-dash-border flex items-center justify-center text-dash-secondary hover:text-dash-primary hover:border-dash-primary hover:shadow-[0_4px_12px_rgba(255,107,0,0.15)] transition-all duration-300"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
            </a>

            {/* LinkedIn */}
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl bg-dash-card border border-dash-border flex items-center justify-center text-dash-secondary hover:text-dash-primary hover:border-dash-primary hover:shadow-[0_4px_12px_rgba(255,107,0,0.15)] transition-all duration-300"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect x="2" y="9" width="4" height="12" />
                <circle cx="4" cy="4" r="2" />
              </svg>
            </a>

            {/* Twitter / X */}
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl bg-dash-card border border-dash-border flex items-center justify-center text-dash-secondary hover:text-dash-primary hover:border-dash-primary hover:shadow-[0_4px_12px_rgba(255,107,0,0.15)] transition-all duration-300"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
              </svg>
            </a>

            {/* Slack */}
            <a
              href="https://slack.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl bg-dash-card border border-dash-border flex items-center justify-center text-dash-secondary hover:text-dash-primary hover:border-dash-primary hover:shadow-[0_4px_12px_rgba(255,107,0,0.15)] transition-all duration-300"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="4" />
                <circle cx="8" cy="8" r="2" />
                <circle cx="16" cy="8" r="2" />
                <circle cx="8" cy="16" r="2" />
                <circle cx="16" cy="16" r="2" />
              </svg>
            </a>
          </div>
        </div>

        {/* Links Column 1: Product */}
        <div className="flex flex-col gap-4 text-left">
          <h4 className="text-dash-text font-black text-sm tracking-wider uppercase">Product</h4>
          <ul className="flex flex-col gap-2 text-sm text-dash-secondary font-semibold">
            {productLinks.map((link) => (
              <li key={link.name}>
                <a
                  href={link.href}
                  onClick={(e) => handleLinkClick(e, link.href)}
                  className="hover:text-dash-primary transition-colors duration-200"
                >
                  {link.name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Links Column 2: Company */}
        <div className="flex flex-col gap-4 text-left">
          <h4 className="text-dash-text font-black text-sm tracking-wider uppercase">Company</h4>
          <ul className="flex flex-col gap-2 text-sm text-dash-secondary font-semibold">
            {companyLinks.map((link) => (
              <li key={link.name}>
                <a
                  href={link.href}
                  onClick={(e) => handleLinkClick(e, link.href || "#")}
                  className="hover:text-dash-primary transition-colors duration-200"
                >
                  {link.name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Links Column 3: Resources */}
        <div className="flex flex-col gap-4 text-left">
          <h4 className="text-dash-text font-black text-sm tracking-wider uppercase">Resources</h4>
          <ul className="flex flex-col gap-2 text-sm text-dash-secondary font-semibold">
            {resourceLinks.map((link) => {
              const isExternal = link.href.startsWith("http");
              const isInternalRoute = link.href.startsWith("/");

              if (isInternalRoute) {
                return (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="hover:text-dash-primary transition-colors duration-200"
                    >
                      {link.name}
                    </Link>
                  </li>
                );
              }

              return (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    onClick={(e) => handleLinkClick(e, link.href)}
                    className="hover:text-dash-primary transition-colors duration-200"
                  >
                    {link.name}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

      </div>

      {/* Footer Bottom Row */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-dash-secondary font-semibold">
        <p>© {new Date().getFullYear()} VeriNova Inc. All rights reserved.</p>
        <button
          onClick={handleScrollToTop}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-dash-border rounded-lg text-dash-secondary hover:text-dash-primary hover:border-dash-primary hover:bg-dash-primary/5 transition-all duration-300 cursor-pointer"
        >
          <span>Back to Top</span>
          <ArrowUp size={12} />
        </button>
      </div>
    </footer>
  );
}