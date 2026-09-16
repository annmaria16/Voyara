import React, { useState, useEffect, useMemo } from 'react';
import { supportApi } from '../../api/support';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import {
  MessageSquare,
  Search,
  Filter,
  RefreshCw,
  Send,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
  X,
  ExternalLink,
  MessageCircle,
  Sparkles,
  ArrowUpDown,
  Tag,
  LifeBuoy
} from 'lucide-react';

export const AdminSupport = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Filters State
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateSort, setDateSort] = useState('desc');

  // Reply Form State
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState('IN_PROGRESS');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [replySuccess, setReplySuccess] = useState('');

  const categories = [
    'ALL',
    'Booking Inquiry',
    'Stay Experience',
    'Payment / Verification',
    'Stay Partner Listing Help',
    'General Inquiry',
    'Other'
  ];

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await supportApi.getAdminTickets({
        status: statusFilter,
        category: categoryFilter,
        search: searchQuery,
        date_sort: dateSort
      });
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load support tickets for admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, categoryFilter, dateSort]);

  // Handle Search Debounce / Enter
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTickets();
  };

  // Open Ticket Details Modal / Drawer
  const handleOpenTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setDetailLoading(true);
    setReplyError('');
    setReplySuccess('');
    setReplyText('');
    setReplyStatus(ticket.status === 'RESOLVED' ? 'RESOLVED' : 'IN_PROGRESS');

    try {
      const fullTicket = await supportApi.getTicketDetails(ticket.id);
      setSelectedTicket(fullTicket);
    } catch (err) {
      console.error('Failed to fetch ticket full details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSendAdminReply = async (e, customStatus = null) => {
    if (e) e.preventDefault();
    if (!replyText.trim()) {
      setReplyError('Please enter a reply message.');
      return;
    }

    setSubmittingReply(true);
    setReplyError('');
    setReplySuccess('');

    const targetStatus = customStatus || replyStatus;

    try {
      const updated = await supportApi.replyAdminTicket(selectedTicket.id, {
        admin_response: replyText.trim(),
        status: targetStatus
      });

      setSelectedTicket(updated);
      setReplyText('');
      setReplySuccess('Reply sent and conversation updated successfully!');
      setTimeout(() => setReplySuccess(''), 3500);

      // Refresh tickets list
      fetchTickets();
    } catch (err) {
      setReplyError(err.response?.data?.detail || err.message || 'Failed to send reply.');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Quick Status Update
  const handleStatusChange = async (newStatus) => {
    if (!selectedTicket) return;
    try {
      const updated = await supportApi.replyAdminTicket(selectedTicket.id, {
        admin_response: selectedTicket.admin_response || 'Status updated by Admin.',
        status: newStatus
      });
      setSelectedTicket(updated);
      fetchTickets();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  // Metrics computation
  const metrics = useMemo(() => {
    const total = tickets.length;
    const newCount = tickets.filter(t => t.status === 'OPEN').length;
    const inProgressCount = tickets.filter(t => t.status === 'IN_PROGRESS').length;
    const resolvedCount = tickets.filter(t => t.status === 'RESOLVED').length;
    return { total, newCount, inProgressCount, resolvedCount };
  }, [tickets]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-[#087F8C]/10 border border-[#087F8C]/30 text-[#087F8C] dark:text-[#27B7A8] text-[11px] font-bold mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#087F8C] dark:text-[#27B7A8]" />
            <span>Admin Help & Support Request Console</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-serif text-[#091B29] dark:text-white tracking-tight">
            Help & Support Requests
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Filter, inspect user details, and reply to traveler & stay partner inquiries directly in real-time.
          </p>
        </div>

        {/* Dedicated Support Email Badge */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-2xl bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/30 text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center space-x-2">
            <Mail className="w-4 h-4 text-orange-500" />
            <span>Help & Support: <strong>adminvoyara@gmail.com</strong></span>
          </div>
          <button
            type="button"
            onClick={fetchTickets}
            className="p-2 bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-[#FFFDF7] dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
            title="Refresh Inquiries"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#087F8C]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-white dark:bg-[#0F273D] border-[#087F8C] shadow-md ring-2 ring-[#087F8C]/20'
              : 'bg-white dark:bg-[#0F273D] border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Requests</span>
            <MessageSquare className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-serif text-[#091B29] dark:text-white mt-1">
            {metrics.total}
          </p>
        </button>

        <button
          onClick={() => setStatusFilter('OPEN')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'OPEN'
              ? 'bg-white dark:bg-[#0F273D] border-amber-500 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-[#0F273D] border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">New / Open</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-serif text-amber-600 dark:text-amber-400 mt-1">
            {metrics.newCount}
          </p>
        </button>

        <button
          onClick={() => setStatusFilter('IN_PROGRESS')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'IN_PROGRESS'
              ? 'bg-white dark:bg-[#0F273D] border-teal-500 shadow-md ring-2 ring-teal-500/20'
              : 'bg-white dark:bg-[#0F273D] border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400">In Progress</span>
            <RefreshCw className="w-4 h-4 text-teal-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-serif text-teal-600 dark:text-teal-400 mt-1">
            {metrics.inProgressCount}
          </p>
        </button>

        <button
          onClick={() => setStatusFilter('RESOLVED')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'RESOLVED'
              ? 'bg-white dark:bg-[#0F273D] border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
              : 'bg-white dark:bg-[#0F273D] border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-serif text-emerald-600 dark:text-emerald-400 mt-1">
            {metrics.resolvedCount}
          </p>
        </button>
      </div>

      {/* 3. Filter Bar (Status, Category, Search, Date Sort) */}
      <div className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by user name, email, subject, or message..."
              className="w-full pl-10 pr-24 py-2.5 bg-slate-50 dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-[#087F8C]"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] hover:from-[#091B29] hover:to-[#087F8C] text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs"
            >
              Search
            </button>
          </form>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Filter */}
            <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-white dark:bg-slate-900">
                    {c === 'ALL' ? 'All Categories' : c}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Sort Toggle */}
            <button
              type="button"
              onClick={() => setDateSort(dateSort === 'desc' ? 'asc' : 'desc')}
              className="flex items-center space-x-1.5 bg-slate-50 dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Toggle Date Order"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>{dateSort === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            </button>

            {/* Reset Filters */}
            {(statusFilter !== 'ALL' || categoryFilter !== 'ALL' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ALL');
                  setCategoryFilter('ALL');
                  setSearchQuery('');
                  setDateSort('desc');
                }}
                className="px-2.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Support Requests Table / List */}
      <div className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-[#087F8C] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 font-medium">Loading Help & Support Requests...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto">
              <LifeBuoy className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-serif">
              No Support Requests Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'ALL' || categoryFilter !== 'ALL'
                ? 'No requests match your current filters. Try changing or clearing filters.'
                : 'There are currently no support inquiries submitted by users.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-[#091B29]/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Subject & Message</th>
                  <th className="py-3 px-4">Date Submitted</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tickets.map((ticket) => {
                  const userRole = ticket.user?.role || ticket.user_role || 'CUSTOMER';
                  const isHost = userRole === 'PROVIDER';
                  const dateStr = ticket.created_at
                    ? new Date(ticket.created_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'N/A';

                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => handleOpenTicket(ticket)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      {/* Ticket ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        #{ticket.id}
                      </td>

                      {/* User Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isHost
                                ? 'bg-teal-500/15 text-[#087F8C] dark:text-[#27B7A8]'
                                : 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                            }`}
                          >
                            {ticket.user?.name?.charAt(0) || ticket.user_name?.charAt(0) || 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-[#091B29] dark:text-white truncate max-w-[140px]">
                                {ticket.user?.name || ticket.user_name || 'Registered User'}
                              </span>
                              <span
                                className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-sm ${
                                  isHost
                                    ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {isHost ? 'Stay Partner' : 'Traveler'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate max-w-[160px]">
                              {ticket.user?.email || ticket.user_email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FFFDF7] dark:bg-[#091B29] text-[#087F8C] dark:text-[#27B7A8] border border-[#087F8C]/20">
                          {ticket.category}
                        </span>
                      </td>

                      {/* Subject & snippet */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-bold text-[#091B29] dark:text-white truncate">
                          {ticket.subject}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {ticket.message}
                        </p>
                        {ticket.messages_count > 1 && (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            <MessageCircle className="w-3 h-3" />
                            <span>{ticket.messages_count} messages in thread</span>
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {dateStr}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={ticket.status} size="sm" />
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenTicket(ticket);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#087F8C]/10 hover:bg-[#087F8C] text-[#087F8C] hover:text-white text-xs font-bold transition-all flex items-center space-x-1 ml-auto cursor-pointer"
                        >
                          <span>Review & Reply</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Interactive Ticket Review & Reply Modal / Drawer */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-white via-[#FFFDF7] to-white dark:from-[#0F273D] dark:via-[#091B29] dark:to-[#0F273D] shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#087F8C]/10 text-[#087F8C] dark:text-[#27B7A8] flex items-center justify-center shrink-0">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-slate-400">
                      Ticket #{selectedTicket.id}
                    </span>
                    <StatusBadge status={selectedTicket.status} size="sm" />
                    <span className="text-[10px] font-bold text-[#087F8C] dark:text-[#27B7A8] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#087F8C]/10">
                      {selectedTicket.category}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold font-serif text-[#091B29] dark:text-white mt-0.5">
                    {selectedTicket.subject}
                  </h2>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Status Switcher Buttons */}
                <div className="hidden sm:flex items-center space-x-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => handleStatusChange('OPEN')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      selectedTicket.status === 'OPEN'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('IN_PROGRESS')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      selectedTicket.status === 'IN_PROGRESS'
                        ? 'bg-[#087F8C] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    In Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('RESOLVED')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      selectedTicket.status === 'RESOLVED'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Resolved
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Two Columns */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (4 cols): User Profile & Ticket Metadata */}
              <div className="lg:col-span-4 space-y-4">
                {/* User Details Card */}
                <div className="p-4 rounded-2xl bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200/80 dark:border-slate-800 space-y-3.5">
                  <div className="flex items-center space-x-2 border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
                    <User className="w-4 h-4 text-[#087F8C]" />
                    <h3 className="text-xs font-bold text-[#091B29] dark:text-white uppercase tracking-wider">
                      User Profile Details
                    </h3>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Full Name</span>
                      <p className="font-bold text-[#091B29] dark:text-white">
                        {selectedTicket.user?.name || selectedTicket.user_name || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Email Address</span>
                      <p className="font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{selectedTicket.user?.email || selectedTicket.user_email || 'N/A'}</span>
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</span>
                      <p className="font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{selectedTicket.user?.phone || selectedTicket.user_phone || 'Not provided'}</span>
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Account Role</span>
                      <div className="mt-0.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                          {selectedTicket.user?.role || selectedTicket.user_role || 'CUSTOMER'}
                        </span>
                      </div>
                    </div>

                    {selectedTicket.user?.created_at && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Member Since</span>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          {new Date(selectedTicket.user.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ticket Reference Info */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#091B29] border border-slate-200/80 dark:border-slate-800 space-y-2.5 text-xs">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Ticket Metadata
                  </h4>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>Submitted:</span>
                    <span className="font-medium text-[#091B29] dark:text-white">
                      {selectedTicket.created_at
                        ? new Date(selectedTicket.created_at).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'N/A'}
                    </span>
                  </div>

                  {selectedTicket.booking_id && (
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span>Booking Ref:</span>
                      <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                        #{selectedTicket.booking_id}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] text-slate-400">
                      All replies submitted here are immediately saved and displayed in the user’s conversation history.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column (8 cols): Complete Conversation Thread & Reply Box */}
              <div className="lg:col-span-8 flex flex-col space-y-4">
                {/* Conversation History Stream */}
                <div className="flex-1 bg-slate-50 dark:bg-[#091B29]/60 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-4 min-h-[260px] max-h-[380px] overflow-y-auto custom-scrollbar">
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800">
                      Support Thread Started
                    </span>
                  </div>

                  {/* Render chronological messages */}
                  {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                    selectedTicket.messages.map((msg, idx) => {
                      const isAdminMsg = msg.sender_role === 'ADMIN';
                      const timeStr = msg.created_at
                        ? new Date(msg.created_at).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '';

                      return (
                        <div
                          key={msg.id || idx}
                          className={`flex flex-col ${isAdminMsg ? 'items-end' : 'items-start'} space-y-1`}
                        >
                          <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 px-1">
                            {isAdminMsg ? (
                              <>
                                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  {msg.sender_name || 'Voyara Concierge Admin'}
                                </span>
                                <span>• {timeStr}</span>
                              </>
                            ) : (
                              <>
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  {msg.sender_name || selectedTicket.user_name || 'User'}
                                </span>
                                <span>• {timeStr}</span>
                              </>
                            )}
                          </div>

                          <div
                            className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed font-medium ${
                              isAdminMsg
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-xs shadow-xs'
                                : 'bg-white dark:bg-[#0F273D] text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 rounded-tl-xs shadow-2xs'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.message}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    // Fallback to initial message
                    <div className="p-3.5 bg-white dark:bg-[#0F273D] rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200">
                      <p className="font-bold text-[#091B29] dark:text-white mb-1">Original Inquiry:</p>
                      <p className="whitespace-pre-wrap">{selectedTicket.message}</p>
                    </div>
                  )}
                </div>

                {/* Reply Feedback Notifications */}
                {replySuccess && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-400 text-xs rounded-xl flex items-center space-x-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{replySuccess}</span>
                  </div>
                )}

                {replyError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-400 text-xs rounded-xl flex items-center space-x-2 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{replyError}</span>
                  </div>
                )}

                {/* Admin Reply Composer Form */}
                <form onSubmit={(e) => handleSendAdminReply(e)} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Compose Admin Response
                    </label>
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your response to the user. This will be added to the conversation history and visible to the user immediately..."
                      className="w-full p-3 bg-slate-50 dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-[#087F8C] resize-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-bold">Set Status:</span>
                      <select
                        value={replyStatus}
                        onChange={(e) => setReplyStatus(e.target.value)}
                        className="bg-slate-100 dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                      >
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="OPEN">Open / Pending</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleSendAdminReply(null, 'RESOLVED')}
                        disabled={submittingReply || !replyText.trim()}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Send & Resolve</span>
                      </button>

                      <button
                        type="submit"
                        disabled={submittingReply || !replyText.trim()}
                        className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-orange-500/20 flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{submittingReply ? 'Sending...' : 'Send Reply'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSupport;
