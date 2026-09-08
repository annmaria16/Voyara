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
  RefreshCw
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
      setSuccessMsg('Your support request has been submitted to the Voyara Concierge desk. Ticket #' + newTicket.id + ' is now logged.');
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
    <div className="max-w-7xl mx-auto space-y-8">
      {/* 1. Header Banner with Direct Support Email */}
      <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-white via-[#F0FDF8] to-[#E6F7F2] dark:from-[#0B1528] dark:via-[#0F1D38] dark:to-[#081020] p-6 sm:p-8 md:p-10 transition-colors duration-200">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/15 dark:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-300" />
            <span>24/7 VeriNova Concierge & Guest Protection</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-serif text-[#102A43] dark:text-white tracking-tight">
            Voyara Help, Trust & Support
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
            Have a question regarding your upcoming stay, experience add-on, listing approval, or reservation verification? Our concierge team is here 24/7.
          </p>

          {/* Prominent Help & Support Email Banner */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl bg-white dark:bg-[#131D2E] border border-orange-500/30 text-xs font-bold text-slate-800 dark:text-white shadow-xs">
              <Mail className="w-4 h-4 text-[#F97360]" />
              <span>Help & Support: <strong className="text-[#F97360]">adminvoyara@gmail.com</strong></span>
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              • Direct email or submit an inquiry below
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 cols): Ticket Form & FAQs */}
        <div className="lg:col-span-7 space-y-6">
          {/* User Submission Form */}
          <div className="bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-serif">
                  Submit a Support Request
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                Logged in as: {user ? (user.name || user.email) : 'Guest'}
              </span>
            </div>

            {successMsg && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-400 text-xs rounded-2xl flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-400 text-xs rounded-2xl flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitTicket} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Check-in inquiry for Munnar stay"
                    className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-[#F97360]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-[#F97360] cursor-pointer"
                  >
                    <option value="Booking Inquiry">Booking Inquiry</option>
                    <option value="Stay Experience">Stay Experience</option>
                    <option value="Payment / Verification">Payment / Verification</option>
                    <option value="Host Listing Help">Host Listing Help</option>
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Booking Reference ID (Optional)
                </label>
                <input
                  type="number"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  placeholder="e.g. 1024 (leave blank if general inquiry)"
                  className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-[#F97360]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Message / Details *
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your inquiry, request, or question in detail..."
                  className="w-full p-3 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-[#F97360] resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-slate-400">
                  Requests are saved to PostgreSQL and answered by Admin.
                </p>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-[#e05e4b] hover:to-orange-600 text-white text-xs font-bold rounded-xl shadow-md shadow-[#F97360]/20 transition-all disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Submitting...' : 'Send Request to Concierge'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Quick Contact Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 bg-white dark:bg-[#131D2E] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-[#F97360] flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Help & Support Desk</h4>
                <p className="text-[11px] font-bold text-[#F97360] truncate">adminvoyara@gmail.com</p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">24/7 Verified Support</span>
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-[#131D2E] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Emergency Hotline</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">+91 (800) 869-2721</p>
                <span className="text-[10px] text-emerald-600 font-bold">Priority On-Stay Help</span>
              </div>
            </div>
          </div>

          {/* Frequently Asked Questions */}
          <div className="bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
            <h3 className="text-base font-bold font-serif text-[#102A43] dark:text-white">
              Frequently Asked Questions
            </h3>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = activeFaq === idx;
                return (
                  <div
                    key={idx}
                    className="border border-slate-200/70 dark:border-slate-800 rounded-2xl overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveFaq(isOpen ? null : idx)}
                      className="w-full p-4 text-left flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="p-4 bg-[#FFF8F0]/40 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
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
          <div className="bg-gradient-to-br from-[#102A43] to-[#0B1D33] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>VeriNova™ Stay Protection</span>
            </div>
            <h3 className="text-lg font-bold font-serif">How Voyara Protects Your Stay</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every booking created on Voyara is mathematically verified through our transactional engine:
            </p>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong className="block text-white">Row-Level Inventory Lock</strong>
                  <span className="text-slate-300 text-[11px]">Prevents simultaneous double-booking in PostgreSQL.</span>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center text-[#F97360] shrink-0 mt-0.5">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong className="block text-white">Authoritative Pricing</strong>
                  <span className="text-slate-300 text-[11px]">Strict backend rate computation with zero hidden surges.</span>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-lg bg-teal-500/20 flex items-center justify-center text-teal-300 shrink-0 mt-0.5">
                  <FileCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong className="block text-white">Verified Host Compliance</strong>
                  <span className="text-slate-300 text-[11px]">Host identity, property deeds, and safety vetted.</span>
                </div>
              </div>
            </div>
          </div>

          {/* User's Support Requests & Conversation History Feed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold font-serif text-slate-900 dark:text-white flex items-center space-x-2">
                <span>My Support Requests</span>
                {user && (
                  <span className="text-xs font-bold text-slate-400">
                    ({tickets.length})
                  </span>
                )}
              </h2>
              {user && (
                <button
                  type="button"
                  onClick={loadTickets}
                  className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              )}
            </div>

            {!user ? (
              <div className="bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3 shadow-xs">
                <LifeBuoy className="w-8 h-8 text-orange-500 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Registered User History</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Please sign in to view your logged support requests and conversation history with Admin.
                </p>
              </div>
            ) : loading ? (
              <div className="p-8 bg-white dark:bg-[#131D2E] rounded-3xl border border-slate-200/80 dark:border-slate-800 flex justify-center">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : tickets.length === 0 ? (
              <div className="bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 text-center space-y-2 shadow-xs">
                <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">No active inquiries</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
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
                      className="bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3"
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
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white font-sans mt-0.5">
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
                                      className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[90%] ${
                                        isAdmin
                                          ? 'bg-emerald-500/10 dark:bg-emerald-950/30 text-slate-800 dark:text-slate-200 border border-emerald-500/30 rounded-tl-xs'
                                          : 'bg-gradient-to-r from-[#F97360] to-orange-500 text-white rounded-tr-xs shadow-xs'
                                      }`}
                                    >
                                      <p className="whitespace-pre-wrap">{m.message}</p>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl text-xs text-slate-700 dark:text-slate-300">
                                {t.message}
                              </div>
                            )}
                          </div>

                          {/* Quick Follow-up Reply Box */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
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
                                className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-[#F97360]"
                              />
                              <button
                                type="button"
                                onClick={() => handleSendUserReply(t.id)}
                                disabled={replyingTicketId === t.id || !(userReplyText[t.id] || '').trim()}
                                className="px-3.5 py-2.5 bg-[#F97360] hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer shrink-0 flex items-center space-x-1"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>{replyingTicketId === t.id ? 'Sending...' : 'Reply'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-[#FFF8F0]/40 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 line-clamp-2">
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
