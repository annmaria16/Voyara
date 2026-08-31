import { ArrowRight, Play, ShieldCheck, Link2, Lock, FileText, Settings, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function Hero() {
  // Drifting ambient orange particles
  const particles = [
    { id: 1, x: "12%", y: "15%", size: 6, delay: 0 },
    { id: 2, x: "88%", y: "22%", size: 8, delay: 1.5 },
    { id: 3, x: "78%", y: "82%", size: 5, delay: 0.8 },
    { id: 4, x: "18%", y: "78%", size: 7, delay: 2.2 },
    { id: 5, x: "50%", y: "8%", size: 6, delay: 1.2 },
    { id: 6, x: "8%", y: "48%", size: 5, delay: 0.4 },
  ];

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-dash-bg pt-28 lg:pt-20 pb-16"
    >
      {/* Subtle Grid Overlay and Glowing Backgrounds */}
      <div className="absolute inset-0 bg-grid-pattern opacity-100 pointer-events-none"></div>
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#FF6B00]/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#FF8A1F]/5 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full z-10 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left Content */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="text-left"
        >
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFF3E8] border border-[#FF6B00]/30 shadow-[0_4px_12px_rgba(255,107,0,0.08)] mb-6">
            <Sparkles size={14} className="text-[#FF6B00] animate-pulse" />
            <span className="text-[#FF6B00] text-xs font-black uppercase tracking-wider">
              AI OUTCOME VERIFICATION PLATFORM
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-dash-text leading-tight tracking-tight">
            Verify AI Outcomes
            <span className="block mt-2 bg-gradient-to-r from-[#FF6B00] to-[#FF8A1F] bg-clip-text text-transparent drop-shadow-[0_4px_15px_rgba(255,107,0,0.15)]">
              Before You Trust Them
            </span>
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-dash-secondary text-base sm:text-lg leading-relaxed max-w-xl font-bold">
            VeriNova helps users verify AI-generated outcomes, claims, documents, and information using evidence-based analysis before making decisions they depend on.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Link
              to="/register"
              className="glow-btn bg-[#FF6B00] hover:bg-[#FF7A00] text-white font-bold px-8 py-4 rounded-xl flex items-center justify-center gap-3 shadow-[0_4px_15px_rgba(255,107,0,0.2)] hover:shadow-[0_6px_25px_rgba(255,107,0,0.35)] transform hover:scale-[1.02] transition-all duration-300"
            >
              Get Started
              <ArrowRight size={20} />
            </Link>

            <button
              onClick={() => {
                const element = document.querySelector("#how-it-works");
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
              }}
              className="border-2 border-[#FF6B00] bg-white text-[#FF6B00] hover:bg-[#FFFCF9] px-8 py-4 rounded-xl flex items-center justify-center gap-3 shadow-sm transition-all duration-300 group cursor-pointer font-bold"
            >
              <span className="p-1 rounded-full bg-[#FFF3E8] text-[#FF6B00] group-hover:bg-[#FF6B00] group-hover:text-white transition-all duration-300">
                <Play size={14} fill="currentColor" />
              </span>
              See How It Works
            </button>
          </div>
        </motion.div>

        {/* Right Circular Operating System Animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="relative flex justify-center items-center w-full min-h-[480px]"
        >
          {/* Main Visual Core Container */}
          <div className="relative w-full max-w-[440px] aspect-square flex items-center justify-center">
            
            {/* Center Glowing Orbit Ring Base */}
            <div className="absolute w-[74%] h-[74%] rounded-full bg-radial-gradient from-[#FF6B00]/5 to-transparent pointer-events-none"></div>

            {/* Breathing Animation Background Pulse */}
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.15, 0.35, 0.15],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute w-[78%] h-[78%] rounded-full border-2 border-[#FF6B00] filter blur-[8px] pointer-events-none"
            />

            {/* Glowing rotating ring - slow outer rotation */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute w-[80%] h-[80%] rounded-full border-2 border-dashed border-[#FF6B00]/30 shadow-[0_0_15px_rgba(255,107,0,0.05)]"
            />

            {/* Inner Rotating Ring */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
              className="absolute w-[66%] h-[66%] rounded-full border border-dashed border-[#FF8A1F]/20"
            />

            {/* SVG Network Connections & Flowing Tracers */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
              <defs>
                <linearGradient id="tracerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF6B00" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#FF7A00" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#FF8A1F" stopOpacity="0.95" />
                </linearGradient>
              </defs>

              {/* Main Dotted Lines branching from Center/Decision */}
              {/* Left Branch */}
              <path
                d="M 220,70 L 105,140 L 95,250 L 220,360"
                fill="none"
                stroke="var(--dash-border)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              {/* Right Branch */}
              <path
                d="M 220,70 L 335,140 L 345,250 L 220,360"
                fill="none"
                stroke="var(--dash-border)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              {/* Center Line */}
              <line
                x1="220"
                y1="70"
                x2="220"
                y2="360"
                stroke="var(--dash-border)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />

              {/* Glowing animated line flow from AI Execution to Verified */}
              <motion.path
                d="M 220,70 Q 220,215 220,360"
                fill="none"
                stroke="url(#tracerGradient)"
                strokeWidth="2.5"
                strokeDasharray="10 15"
                animate={{ strokeDashoffset: [0, -50] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="filter drop-shadow-[0_0_6px_rgba(255,107,0,0.8)]"
              />
              
              <motion.path
                d="M 220,70 Q 105,140 95,250 Q 220,360 220,360"
                fill="none"
                stroke="url(#tracerGradient)"
                strokeWidth="2"
                strokeDasharray="8 12"
                animate={{ strokeDashoffset: [0, -40] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                className="filter drop-shadow-[0_0_4px_rgba(255,138,31,0.6)]"
              />

              <motion.path
                d="M 220,70 Q 335,140 345,250 Q 220,360 220,360"
                fill="none"
                stroke="url(#tracerGradient)"
                strokeWidth="2"
                strokeDasharray="8 12"
                animate={{ strokeDashoffset: [0, -40] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                className="filter drop-shadow-[0_0_4px_rgba(255,138,31,0.6)]"
              />
            </svg>

            {/* ========================================== */}
            {/* FLOATING NODES                             */}
            {/* ========================================== */}

            {/* TOP NODE: AI EXECUTION */}
            <motion.div
              animate={{
                y: [0, -4, 0],
                boxShadow: [
                  "0 4px 20px rgba(255,107,0,0.15)",
                  "0 4px 30px rgba(255,107,0,0.35)",
                  "0 4px 20px rgba(255,107,0,0.15)"
                ]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[8%] z-20 px-6 py-2.5 bg-dash-card border border-dash-primary/40 rounded-xl flex items-center gap-2"
            >
              <Sparkles size={14} className="text-dash-primary animate-pulse" />
              <span className="text-dash-text text-xs font-black tracking-widest uppercase">
                AI EXECUTION
              </span>
            </motion.div>

            {/* TOP LEFT NODE: EVIDENCE COLLECTION (API) */}
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 4.5, delay: 0.3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[22%] left-[4%] z-20 w-11 h-11 rounded-xl bg-dash-card border border-dash-border flex items-center justify-center shadow-lg hover:border-dash-primary transition-colors cursor-pointer group"
              title="Evidence Collection: APIs"
            >
              <Link2 size={18} className="text-dash-secondary group-hover:text-dash-primary transition-colors" />
            </motion.div>

            {/* BOTTOM LEFT NODE: VERIFICATION */}
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 5, delay: 0.6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-[36%] left-[4%] z-20 w-11 h-11 rounded-xl bg-dash-card border border-dash-border flex items-center justify-center shadow-lg hover:border-dash-primary transition-colors cursor-pointer group"
              title="Independent Verification"
            >
              <Lock size={18} className="text-dash-secondary group-hover:text-dash-primary transition-colors" />
            </motion.div>

            {/* TOP RIGHT NODE: EVIDENCE COLLECTION (DB) */}
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 4.5, delay: 0.9, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[22%] right-[4%] z-20 w-11 h-11 rounded-xl bg-dash-card border border-dash-border flex items-center justify-center shadow-lg hover:border-dash-primary transition-colors cursor-pointer group"
              title="Evidence Collection: Database"
            >
              <FileText size={18} className="text-dash-secondary group-hover:text-dash-primary transition-colors" />
            </motion.div>

            {/* BOTTOM RIGHT NODE: VERIFICATION (RULES) */}
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 5, delay: 1.2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-[36%] right-[4%] z-20 w-11 h-11 rounded-xl bg-dash-card border border-dash-border flex items-center justify-center shadow-lg hover:border-dash-primary transition-colors cursor-pointer group"
              title="Confidence Scoring Rules"
            >
              <Settings size={18} className="text-dash-secondary group-hover:text-dash-primary transition-colors" />
            </motion.div>

            {/* BOTTOM NODE: VERIFIED BADGE (Shield circle) */}
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                boxShadow: [
                  "0 8px 30px rgba(255,107,0,0.15)",
                  "0 8px 45px rgba(255,138,31,0.3)",
                  "0 8px 30px rgba(255,107,0,0.15)"
                ]
              }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-[8%] z-20 w-24 h-24 rounded-full border-2 border-[#FF6B00] bg-dash-card flex flex-col items-center justify-center"
            >
              <ShieldCheck size={36} className="text-[#FF6B00] drop-shadow-[0_0_8px_rgba(255,107,0,0.5)]" />
              <span className="text-[10px] font-black text-dash-text mt-1 tracking-widest uppercase">
                VERIFIED
              </span>
            </motion.div>

          </div>

          {/* Drifting background particles */}
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              animate={{
                y: [0, -30, 0],
                x: [0, 20, 0],
                opacity: [0.15, 0.7, 0.15],
              }}
              transition={{
                duration: 5 + particle.size * 0.4,
                repeat: Infinity,
                delay: particle.delay,
                ease: "easeInOut",
              }}
              style={{
                top: particle.y,
                left: particle.x,
                width: particle.size,
                height: particle.size,
              }}
              className="absolute rounded-full bg-[#FF8A1F]/25 shadow-[0_0_6px_rgba(255,107,0,0.3)] pointer-events-none"
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}