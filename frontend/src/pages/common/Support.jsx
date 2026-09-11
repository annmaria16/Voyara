import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supportApi } from '../../api/support';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import {
  MessageSquare,
  Send,
  HelpCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  PhoneCall,
  Mail,
  Lock,
  Zap,
  ChevronDown,
  ChevronUp,
  FileCheck,
  LifeBuoy,
  MessageCircle,
  User,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Headphones,
  Calendar,
  Compass
} from 'lucide-react';

export const SupportPage = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  // Active Expanded Ticket for Chat Thread
  const [expandedTicketId, setExpandedTicketId] = useState(null);
  const [userReplyText, setUserReplyText] = useState({});
  const [replyingTicketId, setReplyingTicketId] = useState(null);
  const [replyError, setReplyError] = useState('');

  // Form State
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Booking Inquiry');
  const [message, setMessage] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadTickets = async () => {
    setLoading(true);
    try {
      if (user) {
        const data = await supportApi.getMyTickets();
        setTickets(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load user support tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadTickets();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!user) {
      setErrorMsg('Please log in to submit a support inquiry.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        subject: subject.trim(),
        category: category.trim(),
        message: message.trim(),
        booking_id: bookingId ? parseInt(bookingId, 10) : null
      };

      const newTicket = await supportApi.createTicket(payload);
      setSuccessMsg(`Your support request has been submitted to the Voyara Concierge desk. Ticket #${newTicket.id} is now logged.`);
      setSubject('');
      setMessage('');
      setBookingId('');
      loadTickets();
      // Auto-expand new ticket
      if (newTicket?.id) {
        setExpandedTicketId(newTicket.id);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to submit support request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendUserReply = async (ticketId) => {
    const text = (userReplyText[ticketId] || '').trim();
    if (!text) return;

    setReplyingTicketId(ticketId);
    setReplyError('');

    try {
      const updated = await supportApi.replyUserTicket(ticketId, { message: text });
      setUserReplyText((prev) => ({ ...prev, [ticketId]: '' }));

      // Update local state with the updated ticket
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? updated : t))
      );
    } catch (err) {
      setReplyError(err.response?.data?.detail || err.message || 'Failed to send reply.');
    } finally {
      setReplyingTicketId(null);
    }
  };

  const faqs = [
    {
      q: 'How does Voyara guarantee my room reservation against double-booking?',
      a: 'Every reservation on Voyara utilizes database-level atomic row locking in PostgreSQL. When you reserve a room, PostgreSQL locks that room inventory for the duration of the transaction, ensuring zero overlapping bookings.',
    },
    {
      q: 'What is the VeriNova™ Stay Verification framework?',
      a: 'VeriNova performs automated multi-point integrity checks on property operational status, host legal PAN verification, room capacity limits, and authoritative server-side price calculations before confirming any reservation.',
    },
    {
      q: 'How do I contact customer support directly?',
      a: 'You can submit a ticket right on this page or email us directly at adminvoyara@gmail.com. Our concierge desk monitors inquiries 24/7.',
    },
    {
      q: 'How do cancellations and refunds work?',
      a: 'Cancellations made via your Bookings page follow the property’s verified cancellation policy. Refunds are automatically audited by VeriNova and processed back to your original payment method.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* 1. Hero Header Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl border border-teal-500/20 bg-gradient-to-br from-[#091B29] via-[#0F273D] to-[#087F8C] p-8 sm:p-10 text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-radial from-teal-400/15 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-radial from-orange-500/10 via-transparent to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold shadow-xs backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>24/7 VeriNova Concierge & Guest Protection</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-serif tracking-tight text-white leading-tight">
            Voyara Help, Trust & <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-emerald-300 to-amber-200">Support</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed max-w-2xl">
            Have a question regarding your upcoming stay, experience add-on, listing approval, or reservation verification? Our dedicated concierge team is active 24/7.
          </p>

          {/* Contact Direct Badge */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <a
              href="mailto:adminvoyara@gmail.com"
              className="inline-flex items-center space-x-2.5 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-bold text-white shadow-xs backdrop-blur-md transition-all group"
            >
              <Mail className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
              <span>Direct Concierge: <strong className="text-orange-400 font-mono">adminvoyara@gmail.com</strong></span>
            </a>
            <span className="text-xs font-medium text-slate-300">
              • Direct email or submit an inquiry ticket below
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 cols): Ticket Form & FAQs */}
        <div className="lg:col-span-7 space-y-6">
          {/* User Submission Form */}
          <div className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#091B29] dark:text-white font-serif">
                    Submit a Support Request
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Direct channel to Voyara Operations & Concierge Desk
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                User: {user ? (user.name || user.email) : 'Guest'}
              </span>
            </div>

            {successMsg && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs rounded-2xl flex items-center gap-3 font-semibold shadow-xs">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs rounded-2xl flex items-center gap-3 font-semibold shadow-xs">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitTicket} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Subject <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Check-in inquiry for Munnar stay"
                    className="w-full p-3 bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-[#087F8C] focus:ring-1 focus:ring-[#087F8C] transition-all"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Category <span className="text-orange-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-3 bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-[#087F8C] focus:ring-1 focus:ring-[#087F8C] transition-all cursor-pointer"
                  >
                    <option value="Booking Inquiry">Booking Inquiry</option>
                    <option value="Stay Experience">Stay Experience</option>
                    <option value="Payment / Verification">Payment / Verification</option>
                    <option value="Stay Partner Listing Help">Stay Partner Listing Help</option>
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Booking Reference ID (Optional)
                </label>
                <input
                  type="number"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  placeholder="e.g. 1024 (leave blank if general inquiry)"
                  className="w-full p-3 bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-[#087F8C] focus:ring-1 focus:ring-[#087F8C] transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Message / Details <span className="text-orange-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your inquiry, request, or question in detail..."
                  className="w-full p-3 bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-[#087F8C] focus:ring-1 focus:ring-[#087F8C] transition-all resize-none leading-relaxed"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Requests are cryptographically logged and answered by Concierge.</span>
                </p>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-[#c2410c] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer group"
                >
                  <Send className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  <span>{submitting ? 'Submitting...' : 'Send to Concierge'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Quick Contact Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-[#091B29] dark:text-white">Help & Support Desk</h4>
                <p className="text-xs font-bold text-orange-600 dark:text-orange-400 font-mono truncate">adminvoyara@gmail.com</p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  24/7 Verified Support
                </span>
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <PhoneCall className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-[#091B29] dark:text-white">Emergency Hotline</h4>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">+91 (800) 869-2721</p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  Priority On-Stay Help
                </span>
              </div>
            </div>
          </div>

          {/* Frequently Asked Questions */}
          <div className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold font-serif text-[#091B29] dark:text-white">
                Frequently Asked Questions
              </h3>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = activeFaq === idx;
                return (
                  <div
                    key={idx}
                    className="border border-slate-200/70 dark:border-slate-800/80 rounded-2xl overflow-hidden transition-all duration-200"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveFaq(isOpen ? null : idx)}
                      className={`w-full p-4 text-left flex items-center justify-between text-xs font-bold transition-colors cursor-pointer ${
                        isOpen
                          ? 'bg-teal-50/50 dark:bg-teal-950/20 text-[#087F8C] dark:text-teal-300'
                          : 'text-[#091B29] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <span className="pr-4">{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-[#087F8C] dark:text-teal-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="p-4 bg-[#FFFDF7] dark:bg-[#091B29]/60 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): VeriNova Protection & My Tickets Conversation Feed */}
        <div className="lg:col-span-5 space-y-6">
          {/* VeriNova Protection Card */}
          <div className="bg-gradient-to-br from-[#091B29] via-[#0F273D] to-[#087F8C] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-teal-500/20 space-y-5">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>VeriNova™ Stay Protection</span>
            </div>
            <h3 className="text-lg font-bold font-serif">How Voyara Protects Your Stay</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every booking created on Voyara is mathematically verified through our transactional engine:
            </p>

            <div className="space-y-3.5 pt-2 text-xs">
              <div className="flex items-start space-x-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <strong className="block text-white font-bold">Row-Level Inventory Lock</strong>
                  <span className="text-slate-300 text-[11px]">Prevents simultaneous double-booking in PostgreSQL.</span>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="w-7 h-7 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400 shrink-0 mt-0.5">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <strong className="block text-white font-bold">Authoritative Pricing</strong>
                  <span className="text-slate-300 text-[11px]">Strict backend rate computation with zero hidden surges.</span>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="w-7 h-7 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-300 shrink-0 mt-0.5">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <strong className="block text-white font-bold">Verified Stay Partner Compliance</strong>
                  <span className="text-slate-300 text-[11px]">Stay Partner identity, property deeds, and safety vetted.</span>
                </div>
              </div>
            </div>
          </div>

          {/* User's Support Requests & Conversation History Feed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold font-serif text-[#091B29] dark:text-white flex items-center space-x-2">
                <span>My Support Requests</span>
                {user && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-[#087F8C] dark:text-teal-400">
                    {tickets.length}
                  </span>
                )}
              </h2>
              {user && (
                <button
                  type="button"
                  onClick={loadTickets}
                  className="text-xs font-bold text-[#087F8C] dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              )}
            </div>

            {!user ? (
              <div className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-8 text-center space-y-3 shadow-sm">
                <LifeBuoy className="w-10 h-10 text-orange-500 mx-auto opacity-80" />
                <h4 className="text-sm font-bold text-[#091B29] dark:text-white font-serif">Registered User History</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Please sign in to view your logged support requests and live conversation history with Concierge.
                </p>
              </div>
            ) : loading ? (
              <div className="p-10 bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-3 border-[#087F8C] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-slate-400">Loading support conversations...</span>
              </div>
            ) : tickets.length === 0 ? (
              <div className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-8 text-center space-y-2.5 shadow-sm">
                <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-[#091B29] dark:text-white font-serif">No active inquiries</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                  You have not submitted any support tickets yet. Use the form to reach out to our concierge desk.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((t) => {
                  const isExpanded = expandedTicketId === t.id;
                  const dateStr = t.created_at
                    ? new Date(t.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : '';

                  return (
                    <div
                      key={t.id}
                      className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm space-y-3 transition-all hover:border-teal-500/30"
                    >
                      {/* Ticket Header */}
                      <div
                        onClick={() => setExpandedTicketId(isExpanded ? null : t.id)}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3 cursor-pointer select-none"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                              {t.category}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">• #{t.id}</span>
                            {t.booking_id && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                (Booking #{t.booking_id})
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-[#091B29] dark:text-white font-sans mt-0.5">
                            {t.subject}
                          </h4>
                          <span className="text-[10px] text-slate-400">{dateStr}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <StatusBadge status={t.status} size="sm" />
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* Snippet / Full Thread */}
                      {isExpanded ? (
                        <div className="space-y-3 pt-1">
                          {/* Thread Stream */}
                          <div className="space-y-2.5 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                            {t.messages && t.messages.length > 0 ? (
                              t.messages.map((m, idx) => {
                                const isAdmin = m.sender_role === 'ADMIN';
                                const time = m.created_at
                                  ? new Date(m.created_at).toLocaleTimeString('en-IN', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  : '';

                                return (
                                  <div
                                    key={m.id || idx}
                                    className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'} space-y-1`}
                                  >
                                    <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 px-1">
                                      {isAdmin ? (
                                        <>
                                          <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                            {m.sender_name || 'Voyara Concierge'}
                                          </span>
                                          <span>• {time}</span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="font-bold text-slate-700 dark:text-slate-300">
                                            {m.sender_name || 'You'}
                                          </span>
                                          <span>• {time}</span>
                                        </>
                                      )}
                                    </div>

                                    <div
                                      className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[90%] shadow-xs ${
                                        isAdmin
                                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#091B29] dark:text-emerald-100 border border-emerald-500/20 rounded-tl-xs'
                                          : 'bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] text-white rounded-tr-xs shadow-teal-500/10'
                                      }`}
                                    >
                                      <p className="whitespace-pre-wrap">{m.message}</p>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="p-3 bg-slate-50 dark:bg-[#091B29] rounded-2xl text-xs text-slate-700 dark:text-slate-300">
                                {t.message}
                              </div>
                            )}
                          </div>

                          {/* Quick Follow-up Reply Box */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                            {replyError && (
                              <p className="text-[11px] text-rose-500 font-semibold">{replyError}</p>
                            )}
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={userReplyText[t.id] || ''}
                                onChange={(e) =>
                                  setUserReplyText((prev) => ({
                                    ...prev,
                                    [t.id]: e.target.value
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSendUserReply(t.id);
                                  }
                                }}
                                placeholder="Type a follow-up reply..."
                                className="flex-1 p-2.5 bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-[#087F8C]"
                              />
                              <button
                                type="button"
                                onClick={() => handleSendUserReply(t.id)}
                                disabled={replyingTicketId === t.id || !(userReplyText[t.id] || '').trim()}
                                className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-[#c2410c] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer shrink-0 flex items-center space-x-1.5"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>{replyingTicketId === t.id ? 'Sending...' : 'Reply'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-[#FFFDF7] dark:bg-[#091B29]/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 line-clamp-2">
                          {t.admin_response ? `Latest Reply: ${t.admin_response}` : t.message}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;

