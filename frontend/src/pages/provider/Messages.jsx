import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { messagesApi } from '../../api/messages';
import { getBookingStatusTheme } from '../../utils/bookingStatusTheme';
import { formatMessageTime, formatConversationTime } from '../../utils/dateUtils';
import {
  MessageSquare,
  Send,
  Search,
  Building,
  Calendar,
  ShieldCheck,
  Clock,
  CheckCheck,
  Check,
  AlertCircle,
  Sparkles,
  Info,
  Lock,
  Compass,
  User,
  ArrowLeft,
  ChevronRight,
  RefreshCw,
  Home,
  Users,
  Filter,
} from 'lucide-react';

export const ProviderMessages = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryBookingId = searchParams.get('booking_id');

  const [conversations, setConversations] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState(queryBookingId ? Number(queryBookingId) : null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState('ALL');
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL', 'ACTIVE', 'COMPLETED'
  const [error, setError] = useState('');

  const chatContainerRef = useRef(null);
  const pollingRef = useRef(null);
  const isInitialChatLoadRef = useRef(true);

  const scrollToBottom = (behavior = 'smooth') => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior,
      });
    }
  };

  // 1. Fetch conversations list
  const fetchConversations = async (silent = false) => {
    if (!silent) setLoadingList(true);
    try {
      const data = await messagesApi.getConversations();
      const list = Array.isArray(data) ? data : [];
      setConversations(list);

      // Auto-select booking if specified in query or select the first one
      if (list.length > 0) {
        if (queryBookingId) {
          const match = list.find((c) => c.booking_id === Number(queryBookingId));
          if (match) {
            setSelectedBookingId(match.booking_id);
          } else {
            setSelectedBookingId(list[0].booking_id);
          }
        } else if (!selectedBookingId) {
          setSelectedBookingId(list[0].booking_id);
        }
      }
    } catch (err) {
      console.error('Failed to load host conversations:', err);
      if (!silent) setError('Failed to load guest conversations. Please try again.');
    } finally {
      if (!silent) setLoadingList(false);
    }
  };

  // 2. Fetch specific conversation details & messages
  const fetchActiveChat = async (bookingId, silent = false) => {
    if (!bookingId) return;
    if (!silent) setLoadingChat(true);
    try {
      const data = await messagesApi.getBookingMessages(bookingId);
      setActiveConversation(data);
      const newMsgs = data.messages || [];

      setMessages((prev) => {
        // If message count and read flags are unchanged, return prev to prevent re-renders
        if (
          prev.length === newMsgs.length &&
          !newMsgs.some((m, idx) => m.id !== prev[idx]?.id || m.is_read !== prev[idx]?.is_read)
        ) {
          return prev;
        }

        // Auto-scroll only if new incoming message arrived AND user was already at the bottom
        const hasNewIncoming = newMsgs.length > prev.length;
        if (hasNewIncoming && !isInitialChatLoadRef.current) {
          setTimeout(() => {
            if (chatContainerRef.current) {
              const { scrollHeight, scrollTop, clientHeight } = chatContainerRef.current;
              const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
              if (isNearBottom) {
                scrollToBottom('smooth');
              }
            }
          }, 50);
        }

        return newMsgs;
      });

      if (isInitialChatLoadRef.current) {
        isInitialChatLoadRef.current = false;
        setTimeout(() => scrollToBottom('auto'), 50);
      }

      setError('');
    } catch (err) {
      console.error('Failed to load active conversation:', err);
      if (!silent) setError(err.response?.data?.detail || 'Failed to load messages.');
    } finally {
      if (!silent) setLoadingChat(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, []);

  // When selected booking changes
  useEffect(() => {
    if (selectedBookingId) {
      isInitialChatLoadRef.current = true;
      fetchActiveChat(selectedBookingId);
      setSearchParams({ booking_id: selectedBookingId }, { replace: true });
    }
  }, [selectedBookingId]);

  // Periodic polling for live message updates
  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (selectedBookingId) {
      pollingRef.current = setInterval(() => {
        fetchActiveChat(selectedBookingId, true);
        fetchConversations(true);
      }, 5000); // 5s live sync
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [selectedBookingId]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || sending || !selectedBookingId) return;

    const trimmed = messageText.trim();
    setSending(true);
    setError('');

    try {
      const newMsg = await messagesApi.sendBookingMessage(selectedBookingId, trimmed);
      setMessages((prev) => [...prev, newMsg]);
      setMessageText('');
      setTimeout(() => scrollToBottom('smooth'), 50);
      setConversations((prev) =>
        prev.map((c) =>
          c.booking_id === selectedBookingId
            ? {
                ...c,
                last_message: trimmed,
                last_message_time: new Date().toISOString(),
                unread_count: 0,
              }
            : c
        )
      );
    } catch (err) {
      console.error('Error sending message to guest:', err);
      setError(err.response?.data?.detail || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  // Unique properties list for dropdown filter
  const uniqueProperties = Array.from(
    new Set(conversations.map((c) => JSON.stringify({ id: c.property_id, name: c.property_name })))
  ).map((s) => JSON.parse(s));

  // Filtered conversations
  const filteredConversations = conversations.filter((c) => {
    // Property dropdown filter
    if (selectedPropertyFilter !== 'ALL' && c.property_id !== Number(selectedPropertyFilter)) {
      return false;
    }

    // Search query matching
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      c.property_name?.toLowerCase().includes(q) ||
      c.traveler_name?.toLowerCase().includes(q) ||
      c.booking_number?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    // Filter tab
    if (filterTab === 'ACTIVE') return c.is_messaging_allowed;
    if (filterTab === 'COMPLETED') return c.is_closed || ['CANCELLED', 'FAILED'].includes(c.status);
    return true;
  });

  const activeTheme = activeConversation ? getBookingStatusTheme(activeConversation.status) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-serif text-[#17324D] dark:text-white tracking-tight flex items-center space-x-2.5">
            <MessageSquare className="w-7 h-7 text-[#087F8C] dark:text-[#27B7A8]" />
            <span>Guest Messages</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#607080] dark:text-slate-300 mt-1">
            Direct hospitality communication desk with your verified sanctuary guests.
          </p>
        </div>

        <Link
          to="/provider/bookings"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-white dark:bg-[#0c2233] border border-slate-200 dark:border-slate-800 hover:border-[#087F8C] text-[#17324D] dark:text-slate-200 text-xs font-bold rounded-2xl transition-all shadow-xs"
        >
          <Calendar className="w-4 h-4 text-[#087F8C]" />
          <span>Guest Reservations</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center space-x-3 text-rose-700 dark:text-rose-300 text-xs font-bold animate-fadeIn">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loadingList ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-[#087F8C] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-[#607080] dark:text-slate-300">
            Loading guest conversations...
          </p>
        </div>
      ) : conversations.length === 0 ? (
        /* Empty State */
        <div className="card-voyara rounded-3xl p-12 sm:p-16 text-center border border-slate-100 dark:border-teal-900/40 space-y-4 shadow-sm bg-white dark:bg-[#0F273D]">
          <div className="w-16 h-16 rounded-3xl bg-[#087F8C]/10 text-[#087F8C] dark:text-[#27B7A8] mx-auto flex items-center justify-center">
            <MessageSquare className="w-8 h-8 stroke-[1.5]" />
          </div>
          <h3 className="text-xl font-bold font-serif text-[#17324D] dark:text-white">
            No Guest Messages Yet
          </h3>
          <p className="text-xs sm:text-sm text-[#607080] dark:text-slate-300 max-w-md mx-auto leading-relaxed">
            When travellers book your sanctuaries and their reservations are confirmed, their dedicated communication channels will appear here.
          </p>
          <Link
            to="/provider/bookings"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] hover:from-[#066570] hover:to-[#087F8C] text-white font-bold rounded-2xl text-xs shadow-md shadow-teal-900/20 transition-all cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Manage Reservations</span>
          </Link>
        </div>
      ) : (
        /* Main 2-Column Chat Interface */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-[750px] min-h-[600px]">
          {/* ========================================================= */}
          {/* LEFT SIDE: Conversations List */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 h-full flex flex-col bg-white dark:bg-[#0c2233] rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm overflow-hidden">
            {/* Filter controls */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 space-y-3">
              {/* Property Select if multiple properties */}
              {uniqueProperties.length > 1 && (
                <div className="flex items-center space-x-2">
                  <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    value={selectedPropertyFilter}
                    onChange={(e) => setSelectedPropertyFilter(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-[#17324D] dark:text-slate-200 focus:outline-hidden focus:border-[#087F8C]"
                  >
                    <option value="ALL">All Properties ({conversations.length} chats)</option>
                    {uniqueProperties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search guest, property, or VOY reference..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-hidden focus:border-[#087F8C] text-[#17324D] dark:text-slate-200 placeholder:text-slate-400"
                />
              </div>

              {/* Tabs */}
              <div className="flex items-center space-x-1.5 overflow-x-auto">
                {[
                  { key: 'ALL', label: `All (${conversations.length})` },
                  { key: 'ACTIVE', label: `Active (${conversations.filter((c) => c.is_messaging_allowed).length})` },
                  { key: 'COMPLETED', label: `Past / Closed (${conversations.filter((c) => !c.is_messaging_allowed).length})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFilterTab(tab.key)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      filterTab === tab.key
                        ? 'bg-[#087F8C] text-white shadow-xs'
                        : 'text-[#607080] dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                  No matching guest conversations found.
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = selectedBookingId === conv.booking_id;
                  const theme = getBookingStatusTheme(conv.status);

                  return (
                    <button
                      key={conv.booking_id}
                      type="button"
                      onClick={() => setSelectedBookingId(conv.booking_id)}
                      className={`w-full p-4 text-left transition-all flex items-start space-x-3 cursor-pointer relative ${
                        isSelected
                          ? 'bg-[#EAF3F5]/80 dark:bg-slate-800/70 border-l-4 border-[#087F8C]'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-900/40'
                      }`}
                    >
                      {/* Real Property Thumbnail */}
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700 relative">
                        {conv.property_image ? (
                          <img
                            src={conv.property_image}
                            alt={conv.property_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-[9px] text-center p-1 font-bold">
                            <Building className="w-5 h-5 mb-0.5 text-slate-300" />
                            <span>No Photo</span>
                          </div>
                        )}
                        {/* Booking Status Mini Pill */}
                        <span
                          className={`absolute bottom-0 inset-x-0 text-[8px] font-black text-center uppercase tracking-wider py-0.5 ${
                            conv.is_messaging_allowed
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-700 text-slate-200'
                          }`}
                        >
                          {conv.status}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-[#17324D] dark:text-white truncate font-serif">
                            {conv.property_name}
                          </h4>
                          <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                            {formatConversationTime(conv.last_message_time)}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
                          <User className="w-3 h-3 text-[#087F8C] shrink-0" />
                          <span className="truncate">Guest: <strong>{conv.traveler_name}</strong></span>
                        </div>

                        <p className="text-[11px] text-[#607080] dark:text-slate-300 truncate font-sans">
                          {conv.last_message}
                        </p>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[9px] font-mono font-bold text-slate-400">
                            {conv.booking_number}
                          </span>

                          {conv.unread_count > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-[#F97316] text-white text-[10px] font-black shadow-xs animate-pulse">
                              {conv.unread_count} new
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT SIDE: Active Conversation View */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 h-full flex flex-col bg-white dark:bg-[#0c2233] rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm overflow-hidden relative">
            {loadingChat ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-3 border-[#087F8C] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-medium text-slate-400">Loading guest conversation...</p>
              </div>
            ) : activeConversation ? (
              <>
                {/* Conversation Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-[#FFFDF7]/60 dark:bg-slate-900/40 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center space-x-3.5 min-w-0">
                    {/* Real Property Thumbnail */}
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs">
                      {activeConversation.property_image ? (
                        <img
                          src={activeConversation.property_image}
                          alt={activeConversation.property_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-[8px] font-bold p-1">
                          <Building className="w-4 h-4 text-slate-300" />
                          <span>No Photo</span>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm sm:text-base font-bold font-serif text-[#17324D] dark:text-white truncate">
                          {activeConversation.property_name}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            activeTheme?.badgeClasses || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {activeConversation.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                        <span>Guest: <strong className="text-slate-700 dark:text-slate-200">{activeConversation.traveler_name}</strong></span>
                        <span>•</span>
                        <span className="font-mono font-bold text-[#087F8C] dark:text-[#27B7A8]">{activeConversation.booking_number}</span>
                        <span>•</span>
                        <span>{activeConversation.stay_dates}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    to="/provider/bookings"
                    className="hidden sm:inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold text-[#087F8C] dark:text-[#27B7A8] hover:bg-[#087F8C]/10 border border-[#087F8C]/20 transition-all shrink-0"
                  >
                    <span>Reservation</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Closed / Disabled Lifecycle Banner */}
                {activeConversation.close_reason && (
                  <div className="px-4 py-2.5 bg-amber-500/10 dark:bg-amber-950/40 border-b border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center justify-center space-x-2 shrink-0">
                    <Lock className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>{activeConversation.close_reason}</span>
                  </div>
                )}

                {/* Message Thread */}
                <div
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar bg-slate-50/40 dark:bg-[#0a1b29]/40"
                >
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-[#087F8C]/10 text-[#087F8C] flex items-center justify-center">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-medium max-w-sm">
                        No messages exchanged yet with <strong>{activeConversation.traveler_name}</strong>. Send check-in instructions or welcome notes.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isMe = msg.sender_id === user?.id || msg.sender_role === 'PROVIDER';

                      return (
                        <div
                          key={msg.id || idx}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                        >
                          {/* Sender Label */}
                          <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-medium px-1">
                            <span>{isMe ? 'You (Stay Partner)' : msg.sender_name || 'Guest'}</span>
                            <span>•</span>
                            <span>{formatMessageTime(msg.created_at)}</span>
                          </div>

                          {/* Message Bubble */}
                          <div
                            className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed font-sans shadow-xs whitespace-pre-line ${
                              isMe
                                ? 'bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] text-white rounded-tr-xs'
                                : 'bg-white dark:bg-slate-800 text-[#17324D] dark:text-slate-100 border border-slate-100 dark:border-slate-700/80 rounded-tl-xs'
                            }`}
                          >
                            {msg.message}
                          </div>

                          {/* Read Status */}
                          {isMe && (
                            <div className="flex items-center space-x-1 text-[10px] text-slate-400 pr-1">
                              {msg.is_read ? (
                                <span className="text-emerald-500 font-semibold flex items-center space-x-0.5">
                                  <CheckCheck className="w-3 h-3" />
                                  <span>Read by guest</span>
                                </span>
                              ) : (
                                <span className="flex items-center space-x-0.5">
                                  <Check className="w-3 h-3" />
                                  <span>Sent</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Message Composer (or Disabled state) */}
                <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#0c2233] shrink-0">
                  {activeConversation.is_messaging_allowed ? (
                    <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder={`Reply to ${activeConversation.traveler_name}...`}
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        disabled={sending}
                        className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs focus:outline-hidden focus:border-[#087F8C] text-[#17324D] dark:text-white placeholder:text-slate-400"
                      />
                      <button
                        type="submit"
                        disabled={!messageText.trim() || sending}
                        className={`px-5 py-3 rounded-2xl text-xs font-bold text-white flex items-center space-x-1.5 transition-all shadow-md cursor-pointer ${
                          !messageText.trim() || sending
                            ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                            : 'bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] hover:from-[#066570] hover:to-[#087F8C] shadow-teal-900/20'
                        }`}
                      >
                        {sending ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>Reply</span>
                            <Send className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <div className="py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center justify-center space-x-2">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{activeConversation.close_reason || 'Messaging is currently disabled for this reservation.'}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-300" />
                <p>Select a guest conversation from the left to view messages.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderMessages;
