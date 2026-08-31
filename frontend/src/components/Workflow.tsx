import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Search, Scale, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function Workflow() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      title: "Submit",
      desc: "Submit the AI outcome, claim, document, or information you want to verify.",
      icon: Cpu,
    },
    {
      title: "Analyze",
      desc: "VeriNova analyzes the submitted information and evaluates the available evidence.",
      icon: Search,
    },
    {
      title: "Verify",
      desc: "The platform compares the information against relevant evidence and produces a verification result.",
      icon: Scale,
    },
    {
      title: "Review",
      desc: "Review the result, confidence information, and supporting evidence before making a decision.",
      icon: ShieldCheck,
      isCore: true,
    },
    {
      title: "Track",
      desc: "Keep verification activity organized through your dashboard and verification history.",
      icon: CheckCircle2,
    },
  ];

  // Rotate active step every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <section id="how-it-works" className="relative py-24 bg-dash-sidebar border-t border-dash-border overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-dash-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="text-dash-primary text-xs font-bold uppercase tracking-[0.2em]">
            Operational Flow
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-dash-text mt-3 leading-tight">
            How VeriNova Works
          </h2>
          <p className="text-dash-secondary mt-4 text-base leading-relaxed font-semibold">
            Verify information in a simple, structured workflow.
          </p>
        </div>

        {/* Visual Pipeline Layout */}
        <div className="relative flex flex-col items-center">
          
          {/* Horizontal line for desktop, vertical line for mobile */}
          <div className="absolute top-[28px] left-[50%] -translate-x-1/2 w-0.5 h-[calc(100%-60px)] lg:top-[38px] lg:left-6 lg:right-6 lg:w-[calc(100%-48px)] lg:h-0.5 lg:translate-x-0 bg-dash-border -z-10 opacity-70">
            {/* Animated traveling dot along the line */}
            <motion.div
              animate={{
                left: ["0%", "100%"],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "linear",
              }}
              className="hidden lg:block absolute top-1/2 -translate-y-1/2 w-8 h-[2px] bg-gradient-to-r from-transparent via-[#FF6B00] to-transparent shadow-[0_0_10px_#FF6B00]"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 w-full">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = activeStep === idx;
              const isCore = step.isCore;
              return (
                <div
                  key={step.title}
                  onClick={() => setActiveStep(idx)}
                  className="flex flex-col items-center text-center cursor-pointer group"
                >
                  {/* Step Connector Number & Node Bubble */}
                  <div className="relative flex items-center justify-center mb-6">
                    {/* Ring glow */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          layoutId="activeGlow"
                          className="absolute -inset-2.5 rounded-full border-2 border-[#FF6B00] bg-[#FF6B00]/5 shadow-[0_0_20px_rgba(255,107,0,0.3)] pointer-events-none"
                          transition={{ type: "spring", stiffness: 100, damping: 15 }}
                        />
                      )}
                    </AnimatePresence>
 
                    {/* Central Bubble */}
                    <div
                      className={`w-14 h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center border transition-all duration-300 ${
                        isActive
                          ? "bg-[#FF6B00] border-[#FF6B00] text-white shadow-[0_8px_25px_rgba(255,107,0,0.35)]"
                          : isCore
                          ? "bg-[#FFF3E8] border-[#FF6B00] text-[#FF6B00] shadow-[0_0_15px_rgba(255,107,0,0.3)]"
                          : "bg-dash-bg border-dash-border text-dash-primary hover:border-dash-primary/70"
                      }`}
                    >
                      <Icon size={24} className={isActive ? "scale-110" : "group-hover:scale-110 transition-transform"} />
                    </div>

                    {/* Step number badge */}
                    <div
                      className={`absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center border transition-all duration-300 ${
                        activeStep === idx
                          ? "bg-dash-card border-[#FF6B00] text-[#FF6B00]"
                          : isCore
                          ? "bg-[#FFF3E8] border-[#FF6B00] text-[#FF6B00]"
                          : "bg-dash-bg border-dash-border text-dash-secondary group-hover:border-dash-primary/30"
                      }`}
                    >
                      {idx + 1}
                    </div>
                  </div>

                  {/* Text Details with dynamic opacity */}
                  <motion.div
                    animate={{
                      opacity: isActive ? 1 : 0.6,
                      scale: isActive ? 1.02 : 1,
                    }}
                    className="flex flex-col items-center"
                  >
                    <h3
                      className={`text-sm font-black transition-colors leading-tight ${
                        isActive ? "text-dash-primary" : "text-dash-text group-hover:text-[#FF6B00]"
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p className="text-dash-secondary text-[11px] mt-2 max-w-[150px] leading-relaxed font-semibold">
                      {step.desc}
                    </p>
                  </motion.div>

                  {/* Flow Arrow for mobile view */}
                  {idx < steps.length - 1 && (
                    <div className="lg:hidden mt-6 text-dash-border flex flex-col items-center animate-pulse">
                      <span>↓</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
