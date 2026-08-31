import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import api from "../services/api";

export default function LegalConsent() {
  const { user, updateUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [accepted, setAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If user is already terms-accepted or not logged in, redirect away
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    } else if (user && user.terms_accepted) {
      if (user.role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accepted) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.post("/user/accept-legal");
      updateUser(res.data);
      toast("Legal terms accepted successfully!", "success");
      
      if (res.data.role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "Failed to confirm agreement. Please try again.";
      setError(errMsg);
      toast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dash-bg text-dash-text flex flex-col relative overflow-hidden bg-grid-pattern">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#FF6B00]/5 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#FF8A1F]/5 rounded-full blur-[150px] pointer-events-none"></div>

      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-[#FF6B00] to-[#FF8A1F] p-2 rounded-xl shadow-lg shadow-orange-500/10">
            <ShieldCheck className="text-white" size={24} />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-black text-dash-text tracking-wide leading-none">
              VeriNova
            </h1>
            <p className="text-dash-secondary text-[10px] tracking-[0.15em] font-bold uppercase mt-1">
              Outcome Verification
            </p>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-6 py-12 z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="glass-panel w-full max-w-md rounded-3xl p-6 sm:p-8 relative overflow-hidden text-center bg-dash-card border border-dash-border"
        >
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#FF6B00]/5 blur-[25px] rounded-full pointer-events-none"></div>

          <h2 className="text-2xl sm:text-3xl font-black text-dash-text tracking-tight mb-2">
            Legal Terms & Policy
          </h2>
          <p className="text-dash-secondary text-sm font-semibold tracking-wide max-w-xs mx-auto leading-relaxed mb-6">
            Before using VeriNova verification platform, please review and accept our Terms of Service and Privacy Policy.
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-3 text-left mb-5">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
              <span className="text-red-500 text-sm font-semibold">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6 text-left">
            <div className="flex items-start gap-3 bg-dash-sidebar/45 border border-dash-border/60 p-4 rounded-xl">
              <input
                type="checkbox"
                id="legal-accept"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-dash-primary focus:ring-dash-primary border-dash-border bg-dash-bg accent-[#FF6B00] cursor-pointer"
              />
              <label htmlFor="legal-accept" className="text-xs font-semibold text-dash-text leading-relaxed select-none cursor-pointer">
                I agree to the{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-dash-primary hover:text-dash-hover font-bold transition-colors"
                >
                  Terms & Conditions
                </a>{" "}
                and{" "}
                <a
                  href="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-dash-primary hover:text-dash-hover font-bold transition-colors"
                >
                  Privacy Policy
                </a>.
              </label>
            </div>

            <button
              type="submit"
              disabled={!accepted || isSubmitting}
              className="glow-btn w-full bg-gradient-to-r from-[#FF6B00] to-[#FF8A1F] hover:opacity-95 text-white disabled:opacity-50 font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2.5 shadow-md shadow-orange-500/10 disabled:shadow-none hover:shadow-lg transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>Accept and Continue</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
