import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { messagesApi } from '../../api/messages';
import { formatMessageTime } from '../../utils/dateUtils';
import {
  X,
  Send,
  MessageSquare,
  AlertCircle,
  Clock,
  User,
  Building,
  ShieldCheck,
  Calendar,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export const BookingMessageModal = ({ bookingId, isOpen, onClose, initialData = {} }) => {
  const { user } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [error, setError] = useState('');
  const chatContainerRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  const scrollToBottom = (behavior = 'smooth') => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior,
      });
    }
  };

  const fetchMessages = async () => {
    if (!bookingId) return;
    try {
      const data = await messagesApi.getBookingMessages(bookingId);
      setConversation(data);
      const newMsgs = data.messages || [];

      setMessages((prev) => {
        if (
          prev.length === newMsgs.length &&
          !newMsgs.some((m, idx) => m.id !== prev[idx]?.id || m.is_read !== prev[idx]?.is_read)
        ) {
          return prev;
        }

        const hasNewIncoming = newMsgs.length > prev.length;
        if (hasNewIncoming && !isInitialLoadRef.current) {
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

      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        setTimeout(() => scrollToBottom('auto'), 50);
      }

      setError('');
    } catch (err) {
      console.error('Error fetching booking messages:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load booking messages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && bookingId) {
      isInitialLoadRef.current = true;
      setLoading(true);
      fetchMessages();
      const interval = setInterval(fetchMessages, 10000); // 10s auto-refresh
      return () => clearInterval(interval);
    }
  }, [isOpen, bookingId]);

  if (!isOpen) return null;

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || sending) return;

    const trimmed = messageText.trim();
    setSending(true);
    setError('');

    try {
      const newMsg = await messagesApi.sendBookingMessage(bookingId, trimmed);
      setMessages((prev) => [...prev, newMsg]);
      setMessageText('');
      setTimeout(() => scrollToBottom('smooth'), 50);
    } catch (err) {
      console.error('Error sending booking message:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const isCustomer = user?.role === 'CUSTOMER';
  const headerPropertyName = conversation?.property_name || initialData?.property_name || 'Stay Sanctuary';
  const headerBookingNumber = conversation?.booking_number || initialData?.booking_number || `VN-BOOK-${bookingId}`;
  const headerDates = conversation?.stay_dates || initialData?.stay_dates || 'Stay Dates';
  const counterpartyName = isCustomer
    ? conversation?.stay_partner_name || initialData?.stay_partner_name || 'Stay Partner'
    : conversation?.traveler_name || initialData?.traveler_name || 'Traveler';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[600px] max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-[#091B29]/70 shrink-0">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-base font-black font-serif text-[#091B29] dark:text-white">
                {headerPropertyName}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isCustomer ? 'Stay Partner' : 'Guest'}: <strong className="text-slate-800 dark:text-slate-200">{counterpartyName}</strong> • Booking:{' '}
              <strong className="font-mono text-slate-800 dark:text-slate-200">{headerBookingNumber}</strong>
            </p>
            <span className="text-[11px] text-slate-400 block">{headerDates}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Body */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30 dark:bg-[#091B29]/30"
        >
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#087F8C] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Loading booking conversation...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 px-6">
              <div className="w-12 h-12 rounded-2xl bg-[#087F8C]/10 text-[#087F8C] flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                  Direct Stay Communication
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                  Send a message directly to {counterpartyName} regarding check-in times, special requests, directions, or stay coordination.
                </p>
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isMine = m.sender_id === user?.id;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 px-1">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{m.sender_name}</span>
                    <span>•</span>
                    <span>{formatMessageTime(m.created_at)}</span>
                  </div>

                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-2xs ${
                      isMine
                        ? 'bg-gradient-to-r from-orange-500 to-[#EA580C] text-white rounded-tr-xs'
                        : 'bg-white dark:bg-[#0F273D] text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800 rounded-tl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.message}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Message Input Footer */}
        <form
          onSubmit={handleSendMessage}
          className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0F273D] flex items-center space-x-3 shrink-0"
        >
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder={
              isCustomer
                ? 'Type your message to Stay Partner (e.g. Is early check-in possible?)...'
                : 'Type your message to Traveler...'
            }
            disabled={sending || loading}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500 transition-all disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!messageText.trim() || sending || loading}
            className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-[#EA580C] text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {sending ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookingMessageModal;
