import { motion } from "framer-motion";
import { Sparkles, CheckCircle } from "lucide-react";

export default function About() {
  return (
    <section id="about" className="relative py-24 bg-dash-bg overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 right-0 w-[300px] h-[300px] bg-[#FF6B00]/4 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Column: Information */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-left"
          >
            <span className="text-dash-primary text-xs font-bold uppercase tracking-[0.2em]">
              About VeriNova
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-dash-text mt-3 leading-tight">
              Bridging the Trust Gap in AI Operations
            </h2>
            <div className="text-dash-secondary mt-6 text-base leading-relaxed font-semibold flex flex-col gap-5">
              <p>
                VeriNova is designed to make AI-assisted decisions more trustworthy by adding a verification layer between generated outcomes and real-world decisions.
              </p>
              <p>
                As AI becomes part of everyday workflows, users need more than fast answers. They need a way to review evidence, understand confidence, and identify information that deserves further attention.
              </p>
              <p>
                VeriNova helps bridge that gap by providing a structured environment for submitting information, analyzing evidence, reviewing verification results, and maintaining a history of verification activity.
              </p>
            </div>
          </motion.div>

          {/* Right Column: High Fidelity Verification Report Card */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex justify-center"
          >
            <div className="w-full max-w-[450px] bg-dash-card/50 backdrop-blur-md border border-dash-border/60 rounded-3xl p-6 shadow-xl relative overflow-hidden text-left">
              {/* Internal card background glow */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#FF6B00]/5 blur-[30px] rounded-full"></div>

              {/* Certificate Header */}
              <div className="flex justify-between items-center border-b border-dash-border/60 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-black text-dash-text tracking-wide">Verification Audit</h3>
                  <p className="text-xs text-dash-secondary font-mono mt-0.5">TX-9048-VERIFIED</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full text-green-500 text-xs font-bold animate-pulse">
                  <CheckCircle size={12} />
                  <span>PASSED</span>
                </div>
              </div>

              {/* Certificate Metadata fields */}
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center text-sm border-b border-dash-border/40 pb-3">
                  <span className="text-dash-secondary font-semibold">Source Model</span>
                  <span className="text-dash-text font-mono flex items-center gap-1.5 bg-dash-bg px-2 py-0.5 rounded border border-dash-border">
                    <Sparkles size={12} className="text-[#FF6B00]" />
                    Claude 3.5 Sonnet
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm border-b border-dash-border/40 pb-3">
                  <span className="text-dash-secondary font-semibold">Verification Method</span>
                  <span className="text-dash-text font-mono text-xs">API Evidence + Logic Check</span>
                </div>

                <div className="flex justify-between items-center text-sm border-b border-dash-border/40 pb-3">
                  <span className="text-dash-secondary font-semibold">Confidence Score</span>
                  <span className="text-green-500 font-bold font-mono">98.4%</span>
                </div>

                <div className="flex justify-between items-center text-sm border-b border-dash-border/40 pb-3">
                  <span className="text-dash-secondary font-semibold">Evidence Checked</span>
                  <span className="text-dash-text font-mono text-xs">5/5 Sources Verified</span>
                </div>

                <div className="flex flex-col gap-1.5 text-xs pt-2">
                  <span className="text-dash-secondary font-mono font-bold">SHA-256 Ledger Receipt:</span>
                  <div className="bg-dash-bg border border-dash-border font-mono text-[10px] p-2.5 rounded text-dash-secondary break-all select-all">
                    8f6b1a92e10c73d5b1e4c76b92f0ea21a64bd2189ffca21074dae5801ba29ff1
                  </div>
                </div>
              </div>

              {/* Decorative scan line element */}
              <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#FF6B00]/40 to-transparent mt-6"></div>
              <p className="text-center text-dash-secondary text-[10px] font-bold mt-3">
                Protected by VeriNova Zero-Trust Execution Layer
              </p>
            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
}
