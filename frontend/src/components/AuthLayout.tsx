import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "../hooks/useTheme";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-dash-bg text-dash-text flex flex-col relative overflow-hidden bg-grid-pattern">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#FF6B00]/5 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#FF8A1F]/5 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Header bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="bg-gradient-to-br from-[#FF6B00] to-[#FF8A1F] p-2 rounded-xl shadow-lg shadow-orange-500/10 group-hover:shadow-orange-500/30 transition-all duration-300">
            <ShieldCheck className="text-white" size={24} />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-black text-dash-text tracking-wide leading-none group-hover:text-dash-primary transition-colors">
              VeriNova
            </h1>
            <p className="text-dash-secondary text-[10px] tracking-[0.15em] font-bold uppercase mt-1">
              Outcome Verification
            </p>
          </div>
        </Link>

        <button
          onClick={toggleTheme}
          className="p-2 text-dash-secondary hover:text-dash-primary hover:bg-dash-primary/5 rounded-xl cursor-pointer transition-colors"
          aria-label="Toggle Theme"
        >
          {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
      </header>

      {/* Main Form Content Container */}
      <main className="flex-grow flex items-center justify-center px-6 py-12 z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="glass-panel w-full max-w-md rounded-3xl p-6 sm:p-8 relative overflow-hidden"
        >
          {/* Card subtle back light */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#FF6B00]/5 blur-[25px] rounded-full pointer-events-none"></div>

          {/* Heading slot */}
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-dash-text tracking-tight">
              {title}
            </h2>
            <p className="text-dash-secondary text-sm mt-2 leading-relaxed font-semibold">
              {subtitle}
            </p>
          </div>

          {/* Form and Social details */}
          {children}
        </motion.div>
      </main>
    </div>
  );
}
