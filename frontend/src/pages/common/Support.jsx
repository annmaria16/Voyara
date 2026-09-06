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
} from 'lucide-react';

export const SupportPage = () => {
  const { user, isAdmin } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyingId, setReplyingId] = useState(null);
  const [adminReplyText, setAdminReplyText] = useState('');

  // Form State
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Booking Inquiry');
  const [message, setMessage] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadTickets = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const data = await supportApi.getAdminTickets();
        setTickets(data);
      } else {
        const data = await supportApi.getMyTickets();
        setTickets(data);
      }
    } catch (err) {
      console.error('Failed to load support tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [isAdmin]);

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await supportApi.createTicket({ subject, category, message });
      setSuccessMsg('Your support inquiry has been submitted. Our team will respond shortly.');
      setSubject('');
      setMessage('');
      loadTickets();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit support ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminReply = async (ticketId) => {
    if (!adminReplyText.trim()) return;
    try {
      await supportApi.replyAdminTicket(ticketId, {
        admin_response: adminReplyText.trim(),
        status: 'RESOLVED',
      });
      setReplyingId(null);
      setAdminReplyText('');
      loadTickets();
    } catch (err) {
      alert(err.message || 'Failed to submit response.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black font-serif text-[#102A43] dark:text-white tracking-tight">
              {isAdmin ? 'Platform Support Inquiries' : 'Voyara Help & Support'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isAdmin
                ? 'Review and respond to guest and host questions.'
                : 'Need help with your stay, reservation, or hosting? Submit a ticket below.'}
            </p>
          </div>
        </div>

        {/* User Submission Form (Non-admin) */}
        {!isAdmin && (
          <div className="bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center space-x-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-sans">
                Submit a Support Inquiry
              </h3>
            </div>

            {successMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Question about my check-in time"
                    className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                  >
                    <option value="Booking Inquiry">Booking Inquiry</option>
                    <option value="Stay Experience">Stay Experience</option>
                    <option value="Payment / Verification">Payment / Verification</option>
                    <option value="Host Listing Help">Host Listing Help</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Message / Details *
                </label>
                <textarea
                  required
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please describe how our team can help you..."
                  className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Submitting...' : 'Send Inquiry'}</span>
              </button>
            </form>
          </div>
        )}

        {/* Existing Tickets Feed */}
        <div className="space-y-4">
          <h2 className="text-base font-bold font-serif text-slate-900 dark:text-white">
            {isAdmin ? 'All User Inquiries' : 'My Support Tickets'}
          </h2>

          {loading ? (
            <div className="p-8 bg-white dark:bg-[#131D2E] rounded-3xl border border-slate-200/80 dark:border-slate-800 flex justify-center">
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 text-center space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No support inquiries</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You do not have any open tickets at this time.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                    <div>
                      <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                        {t.category}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white font-sans mt-0.5">
                        {t.subject}
                      </h4>
                      {isAdmin && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          From: {t.user_name} ({t.user_email})
                        </p>
                      )}
                    </div>
                    <StatusBadge status={t.status} size="sm" />
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-[#FFF8F0]/40 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    {t.message}
                  </p>

                  {/* Admin Response Block */}
                  {t.admin_response && (
                    <div className="p-3.5 bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl space-y-1">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Voyara Support Response:</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-200 font-medium">
                        {t.admin_response}
                      </p>
                    </div>
                  )}

                  {/* Admin Reply Action Form */}
                  {isAdmin && (
                    <div className="pt-2">
                      {replyingId === t.id ? (
                        <div className="space-y-2">
                          <textarea
                            rows={2}
                            value={adminReplyText}
                            onChange={(e) => setAdminReplyText(e.target.value)}
                            placeholder="Type admin response to user..."
                            className="w-full p-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAdminReply(t.id)}
                              className="px-3.5 py-1.5 bg-gradient-to-r from-[#F97360] to-orange-500 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                            >
                              Send & Resolve
                            </button>
                            <button
                              onClick={() => setReplyingId(null)}
                              className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setReplyingId(t.id);
                            setAdminReplyText(t.admin_response || '');
                          }}
                          className="px-3 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-emerald-500/30"
                        >
                          {t.admin_response ? 'Edit Response' : 'Reply to Ticket'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
};
