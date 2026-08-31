import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, MessageSquare, Send, CheckCircle, AlertTriangle } from "lucide-react";
import api from "../services/api";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../hooks/useAuth";

export default function Contact() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    subject: "",
    message: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Auto-scroll to contact section if redirect section matches
  useEffect(() => {
    if (searchParams.get("section") === "contact") {
      const element = document.getElementById("contact");
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
  }, [searchParams]);

  // Restore saved message on mount
  useEffect(() => {
    const savedSubject = sessionStorage.getItem("saved_contact_subject");
    const savedMessage = sessionStorage.getItem("saved_contact_message");
    if (savedSubject || savedMessage) {
      setFormData((prev) => ({
        ...prev,
        subject: savedSubject || "",
        message: savedMessage || "",
      }));
    }
  }, []);

  // Pre-populate authenticated user profile information
  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData((prev) => ({
        ...prev,
        fullname: user.fullname || "",
        email: user.email || "",
      }));
    }
  }, [user, isAuthenticated]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullname.trim()) {
      newErrors.fullname = "Full Name is required.";
    } else if (formData.fullname.trim().length < 3) {
      newErrors.fullname = "Full Name must be at least 3 characters.";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required.";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required.";
    } else if (formData.message.trim().length < 10) {
      newErrors.message = "Message must be at least 10 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSubmitError(null);
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      // Save subject and message so they aren't lost
      sessionStorage.setItem("saved_contact_subject", formData.subject);
      sessionStorage.setItem("saved_contact_message", formData.message);
      
      toast("Please log in or create an account to contact VeriNova.", "error");
      navigate("/login?redirect=contact");
      return;
    }

    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await api.post("/contact", {
        subject: formData.subject,
        message: formData.message,
      });
      setIsSuccess(true);
      toast("Your message has been sent successfully.", "success");
      setFormData({
        fullname: user?.fullname || "",
        email: user?.email || "",
        subject: "",
        message: "",
      });
      sessionStorage.removeItem("saved_contact_subject");
      sessionStorage.removeItem("saved_contact_message");
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "Unable to send your message. Please try again.";
      setSubmitError(errMsg);
      toast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="relative py-24 bg-dash-sidebar border-t border-dash-border overflow-hidden">
      {/* Background glow orb */}
      <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-[#FF6B00]/4 rounded-full blur-[130px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto px-6 relative z-10 text-left">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Column: text details */}
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-dash-primary text-xs font-bold uppercase tracking-[0.2em]">
              Start Verifying Today
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-dash-text mt-3 leading-tight">
              Let's Talk
            </h2>
            <p className="text-dash-secondary mt-5 text-base leading-relaxed font-semibold">
              Have questions about integrating VeriNova into your workflows, or want to learn how we can help you build trust in your AI-driven operations? Get in touch with our team.
            </p>

            <div className="mt-8 flex flex-col gap-5">
              <div className="flex items-center gap-4 text-dash-text">
                <div className="w-10 h-10 rounded-xl bg-dash-card border border-dash-border flex items-center justify-center text-dash-primary shadow-sm">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-xs text-dash-secondary font-bold uppercase">Email Support</p>
                  <p className="text-sm font-black hover:text-dash-primary transition-colors cursor-pointer">
                    adminverinova@gmail.com
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-dash-text">
                <div className="w-10 h-10 rounded-xl bg-dash-card border border-dash-border flex items-center justify-center text-dash-primary shadow-sm">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <p className="text-xs text-dash-secondary font-bold uppercase">Direct Support</p>
                  <p className="text-sm font-black">24/7 Slack & Teams verification channels</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Contact form box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="w-full flex justify-center"
          >
            <div className="w-full max-w-[500px] bg-dash-card/50 backdrop-blur-md border border-dash-border rounded-2xl p-8 relative overflow-hidden shadow-xl">
              <AnimatePresence mode="wait">
                {!isSuccess ? (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <h3 className="text-xl font-black text-dash-text mb-2">Send us a message</h3>

                    {submitError && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-3">
                        <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                        <span className="text-red-500 text-sm font-semibold">{submitError}</span>
                      </div>
                    )}

                    {/* Name field */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="fullname" className="text-xs font-black text-dash-secondary uppercase tracking-wider">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="fullname"
                        name="fullname"
                        value={formData.fullname}
                        onChange={handleInputChange}
                        readOnly={isAuthenticated}
                        placeholder=""
                        className={`w-full border rounded-xl px-4 py-3 text-sm placeholder-dash-secondary/50 focus:outline-none focus:border-dash-primary focus:ring-1 focus:ring-dash-primary/30 transition-all font-semibold ${
                          isAuthenticated
                            ? "bg-dash-sidebar/40 text-dash-secondary cursor-not-allowed border-dash-border/60"
                            : "bg-dash-bg text-dash-text " + (errors.fullname ? "border-red-500" : "border-dash-border")
                        }`}
                      />
                      {errors.fullname && (
                        <span className="text-red-500 text-xs flex items-center gap-1.5 mt-1 font-semibold">
                          <AlertTriangle size={12} /> {errors.fullname}
                        </span>
                      )}
                    </div>

                    {/* Email field */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="email" className="text-xs font-black text-dash-secondary uppercase tracking-wider">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        readOnly={isAuthenticated}
                        placeholder=""
                        className={`w-full border rounded-xl px-4 py-3 text-sm placeholder-dash-secondary/50 focus:outline-none focus:border-dash-primary focus:ring-1 focus:ring-dash-primary/30 transition-all font-semibold ${
                          isAuthenticated
                            ? "bg-dash-sidebar/40 text-dash-secondary cursor-not-allowed border-dash-border/60"
                            : "bg-dash-bg text-dash-text " + (errors.email ? "border-red-500" : "border-dash-border")
                        }`}
                      />
                      {errors.email && (
                        <span className="text-red-500 text-xs flex items-center gap-1.5 mt-1 font-semibold">
                          <AlertTriangle size={12} /> {errors.email}
                        </span>
                      )}
                    </div>

                    {/* Subject field */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="subject" className="text-xs font-black text-dash-secondary uppercase tracking-wider">
                        Subject
                      </label>
                      <input
                        type="text"
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        placeholder=""
                        className={`w-full bg-dash-bg border rounded-xl px-4 py-3 text-sm text-dash-text placeholder-dash-secondary/50 focus:outline-none focus:border-dash-primary focus:ring-1 focus:ring-dash-primary/30 transition-all font-semibold ${
                          errors.subject ? "border-red-500" : "border-dash-border"
                        }`}
                      />
                      {errors.subject && (
                        <span className="text-red-500 text-xs flex items-center gap-1.5 mt-1 font-semibold">
                          <AlertTriangle size={12} /> {errors.subject}
                        </span>
                      )}
                    </div>

                    {/* Message field */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="message" className="text-xs font-black text-dash-secondary uppercase tracking-wider">
                        Message
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        rows={4}
                        placeholder=""
                        className={`w-full bg-dash-bg border rounded-xl px-4 py-3 text-sm text-dash-text placeholder-dash-secondary/50 focus:outline-none focus:border-dash-primary focus:ring-1 focus:ring-dash-primary/30 transition-all resize-none font-semibold ${
                          errors.message ? "border-red-500" : "border-dash-border"
                        }`}
                      />
                      {errors.message && (
                        <span className="text-red-500 text-xs flex items-center gap-1.5 mt-1 font-semibold">
                          <AlertTriangle size={12} /> {errors.message}
                        </span>
                      )}
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="glow-btn bg-gradient-to-r from-[#FF6B00] to-[#FF8A1F] hover:opacity-95 text-white disabled:opacity-50 font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-3.5 shadow-md shadow-orange-500/10 hover:shadow-lg transition-all cursor-pointer mt-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Message</span>
                          <Send size={16} />
                        </>
                      )}
                    </button>
                  </motion.form>
                ) : (
                  <motion.div
                    key="success"
                    className="flex flex-col items-center justify-center py-12 text-center"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 120, damping: 14 }}
                  >
                    <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-500 mb-6 shadow-[0_4px_12px_rgba(34,197,94,0.15)]">
                      <CheckCircle size={36} className="animate-bounce" />
                    </div>
                    <h3 className="text-2xl font-black text-dash-text">Message Sent</h3>
                    <p className="text-dash-secondary text-sm mt-3 max-w-sm leading-relaxed font-semibold">
                      Your message has been sent successfully.
                    </p>
                    <button
                      onClick={() => setIsSuccess(false)}
                      className="mt-8 text-xs font-black uppercase tracking-wider text-dash-primary border border-dash-border px-6 py-2.5 rounded-xl hover:bg-dash-primary/5 transition-colors cursor-pointer"
                    >
                      Send Another Message
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
}
