import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { LogOut, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect } from "react";
import Logo from "../components/Logo";

export default function Welcome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (user) {
        if (user.role === "admin") {
          navigate("/admin", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [user, navigate]);

  const handleSignOut = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-dash-bg text-dash-text flex flex-col relative overflow-hidden bg-grid-pattern">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#FF6B00]/5 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#FF8A1F]/5 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Header bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <Logo subtitle="Outcome Verification" />
      </header>

      {/* Welcome Card Container */}
      <main className="flex-grow flex items-center justify-center px-6 py-12 z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="glass-panel w-full max-w-md rounded-3xl p-6 sm:p-8 relative overflow-hidden text-center"
        >
          {/* Card subtle back light */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#FF6B00]/5 blur-[25px] rounded-full pointer-events-none"></div>

          {/* User Avatar Circle */}
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-[#FF6B00] to-[#FF8A1F] flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-orange-500/20 mb-6 uppercase">
            {user?.fullname ? user.fullname.charAt(0) : "U"}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-dash-text tracking-tight">
            Welcome to VeriNova
          </h2>
          <p className="text-dash-primary text-sm mt-2 font-bold tracking-wide">
            You are successfully signed in.
          </p>

          {/* Redirecting loading indicator */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 bg-dash-card/30 border border-dash-border/40 rounded-2xl p-6">
            <Loader2 className="w-6 h-6 text-dash-primary animate-spin" />
            <p className="text-xs text-dash-secondary font-bold tracking-wide">
              Redirecting to your dashboard...
            </p>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="glow-btn w-full bg-gradient-to-r from-[#FF6B00] to-[#FF8A1F] hover:opacity-95 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2.5 shadow-md shadow-orange-500/10 hover:shadow-lg transition-all cursor-pointer mt-8"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </motion.div>
      </main>
    </div>
  );
}
