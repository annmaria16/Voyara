import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQ() {
  const faqs: FAQItem[] = [
    {
      question: "What is VeriNova?",
      answer: "VeriNova is an outcome verification platform designed to help users review AI-generated outcomes, claims, documents, and information before relying on them.",
    },
    {
      question: "What can I verify?",
      answer: "You can use VeriNova to review supported AI-generated outcomes, claims, information, documents, and other verification requests supported by the platform.",
    },
    {
      question: "Does VeriNova guarantee that information is correct?",
      answer: "No. VeriNova is designed to provide evidence-based verification insights and confidence information. Users should consider the available evidence and use appropriate human judgment for important decisions.",
    },
    {
      question: "Can I see my previous verification requests?",
      answer: "Yes. Authenticated users can access their verification history through the user dashboard.",
    },
    {
      question: "Is my verification activity stored?",
      answer: "Verification activity associated with your account can be stored so you can review previous requests and results.",
    },
    {
      question: "How can I contact VeriNova?",
      answer: "You can contact the VeriNova team through the Contact section on this website.",
    },
  ];

  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section id="faq" className="relative py-24 bg-dash-sidebar border-t border-dash-border overflow-hidden">
      {/* Background glow */}
      <div className="absolute bottom-1/4 left-1/4 w-[350px] h-[350px] bg-[#FF8A1F]/4 rounded-full blur-[110px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto px-6 relative z-10 text-left">
        
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="text-dash-primary text-xs font-bold uppercase tracking-[0.2em]">
            Got Questions?
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-dash-text mt-3 leading-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-dash-secondary mt-4 text-base leading-relaxed font-semibold">
            Everything you need to know about setting up outcome verification and ensuring trust in generative systems.
          </p>
        </div>

        {/* Accordions */}
        <div className="flex flex-col gap-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={faq.question}
                className="bg-dash-card/40 hover:bg-dash-card/70 rounded-2xl border border-dash-border overflow-hidden transition-all duration-300 shadow-sm"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-dash-primary/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 pr-4">
                    <HelpCircle size={20} className={isOpen ? "text-dash-primary animate-pulse" : "text-dash-secondary"} />
                    <span className="text-dash-text font-black text-base sm:text-lg">
                      {faq.question}
                    </span>
                  </div>
                  <div
                    className={`w-8 h-8 rounded-full border border-dash-border flex items-center justify-center text-dash-secondary hover:text-dash-primary transition-all duration-300 ${
                      isOpen ? "rotate-180 border-dash-primary text-dash-primary" : ""
                    }`}
                  >
                    <ChevronDown size={16} />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="p-6 pt-0 border-t border-dash-border/40 text-dash-secondary text-sm leading-relaxed font-semibold">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
