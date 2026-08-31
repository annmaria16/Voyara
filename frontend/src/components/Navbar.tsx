import { ShieldCheck, Menu, X, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", href: "#home" },
    { name: "Features", href: "#features" },
    { name: "How it Works", href: "#how-it-works" },
    { name: "About", href: "#about" },
    { name: "FAQ", href: "#faq" },
    { name: "Contact", href: "#contact" },
  ];

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMenuOpen(false);

    if (location.pathname !== "/") {
      // If we are not on Home, navigate to Home first with the hash in state
      navigate("/", { state: { scrollTo: href } });
    } else {
      // Otherwise, perform standard smooth scroll
      performScroll(href);
    }
  };

  const performScroll = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      const offset = 80; // height of sticky navbar
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  // Scroll if routed from another page with scrollTo state
  useEffect(() => {
    if (location.pathname === "/" && location.state && (location.state as any).scrollTo) {
      const targetHash = (location.state as any).scrollTo;
      // Clear the navigation state so it doesn't scroll again on refresh
      window.history.replaceState({}, document.title);
      setTimeout(() => {
        performScroll(targetHash);
      }, 100);
    }
  }, [location]);

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled || location.pathname !== "/"
          ? "bg-dash-sidebar/95 backdrop-blur-md border-b border-dash-border shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-dash-text"
          : "bg-transparent border-b border-transparent text-dash-text"
      }`}
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center px-6 lg:px-8 py-4">
        {/* Logo */}
        <Link
          to="/"
          onClick={(e) => {
            if (isAuthenticated) {
              return;
            }
            if (location.pathname === "/") {
              e.preventDefault();
              performScroll("#home");
            }
          }}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="bg-gradient-to-br from-[#FF6B00] to-[#FF8A1F] p-2 rounded-xl shadow-lg shadow-orange-500/10 group-hover:shadow-[#FF6B00]/30 transition-all duration-300">
            <ShieldCheck className="text-white" size={24} />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-black text-dash-text tracking-wide leading-none group-hover:text-dash-primary transition-colors">
              VeriNova
            </h1>
            <p className="text-dash-secondary text-[9px] tracking-[0.15em] font-bold uppercase mt-1">
              Outcome Verification
            </p>
          </div>
        </Link>

        {/* Desktop Menu - centered */}
        <ul className="hidden lg:flex gap-8 text-dash-text font-semibold text-sm">
          {navLinks.map((link) => (
            <li key={link.name}>
              <a
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="hover:text-dash-primary transition-colors duration-200 cursor-pointer relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2.5px] after:bg-dash-primary hover:after:w-full after:transition-all after:duration-300"
              >
                {link.name}
              </a>
            </li>
          ))}
        </ul>

        {/* Buttons - right-aligned */}
        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 text-dash-secondary hover:text-dash-primary hover:bg-dash-primary/5 rounded-xl cursor-pointer transition-colors"
            aria-label="Toggle Theme"
          >
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
          
          {isAuthenticated ? (
            <>
              <Link
                to="/"
                className="text-dash-text hover:text-dash-primary px-4 py-2 font-semibold text-sm transition-colors duration-200"
              >
                Home
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate("/", { replace: true });
                }}
                className="relative overflow-hidden group border border-dash-border hover:border-dash-primary bg-dash-card text-dash-text hover:text-dash-primary px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all duration-300 text-center cursor-pointer"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-dash-text hover:text-dash-primary px-4 py-2 font-semibold text-sm transition-colors duration-200"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="relative overflow-hidden group bg-gradient-to-r from-[#FF6B00] to-[#FF8A1F] hover:opacity-90 px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow-[0_4px_12px_rgba(255,107,0,0.2)] hover:shadow-[0_6px_20px_rgba(255,138,31,0.35)] transition-all duration-300 text-center"
              >
                <span className="relative z-10 flex items-center gap-1">Get Started &rarr;</span>
              </Link>
            </>
          )}
        </div>

        {/* Mobile controls & Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 text-dash-secondary hover:text-dash-primary hover:bg-dash-primary/5 rounded-xl cursor-pointer transition-colors"
            aria-label="Toggle Theme"
          >
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden text-dash-primary p-2 hover:bg-dash-primary/5 rounded-lg transition-colors"
            aria-label="Toggle Menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden bg-dash-sidebar border-b border-dash-border absolute top-full left-0 w-full shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-5">
          <ul className="flex flex-col p-6 gap-4 text-dash-text font-semibold">
            {navLinks.map((link) => (
              <li key={link.name} className="border-b border-dash-border/40 pb-2">
                <a
                  href={link.href}
                  onClick={(e) => handleScrollTo(e, link.href)}
                  className="block hover:text-dash-primary transition-colors py-1"
                >
                  {link.name}
                </a>
              </li>
            ))}
            <div className="flex flex-col gap-3 pt-4">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/"
                    onClick={() => setMenuOpen(false)}
                    className="w-full border border-dash-border bg-dash-card rounded-xl py-2.5 text-dash-text hover:bg-dash-primary/5 transition-colors text-center font-bold"
                  >
                    Home
                  </Link>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                      navigate("/", { replace: true });
                    }}
                    className="w-full bg-red-500/10 text-red-500 font-bold rounded-xl py-2.5 hover:bg-red-500/20 transition-colors text-center cursor-pointer"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="w-full border border-dash-border bg-dash-card rounded-xl py-2.5 text-dash-text hover:bg-dash-primary/5 transition-colors text-center font-bold"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="w-full bg-gradient-to-r from-[#FF6B00] to-[#FF8A1F] text-white font-bold rounded-xl py-2.5 shadow-lg shadow-orange-500/10 hover:shadow-orange-500/30 transition-colors text-center"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </ul>
        </div>
      )}
    </nav>
  );
}