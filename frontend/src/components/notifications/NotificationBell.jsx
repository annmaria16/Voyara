import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../../api/notifications';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building,
  Info,
  Check,
  X,
  ExternalLink,
  Clock
} from 'lucide-react';

export const NotificationBell = () => {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  const fetchUnreadCount = async () => {
    try {
      const data = await notificationApi.getUnreadCount();
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      // Quiet fail if not authenticated
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationApi.getNotifications({ limit: 20 });
      setNotifications(data);
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await notificationApi.markAsRead(notif.id);
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      } catch (err) {
        // Continue navigation even if read call fails
      }
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now - past;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'PROPERTY_APPROVED':
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case 'PROPERTY_REJECTED':
        return (
          <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <XCircle className="w-4 h-4" />
          </div>
        );
      case 'PROPERTY_NEEDS_REVIEW':
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      case 'PROPERTY_SUBMITTED':
        return (
          <div className="w-8 h-8 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Building className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-slate-500/15 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div ref={containerRef} className="relative select-none">
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-[#FFF8F0] dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-4.5 h-4.5 px-1 bg-gradient-to-r from-rose-500 to-[#F97360] text-white text-[10px] font-black font-mono rounded-full flex items-center justify-center shadow-xs border-2 border-white dark:border-slate-900 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#131D2E] border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[80vh]">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-[#FFF8F0]/40 dark:bg-slate-900/60">
            <div className="flex items-center space-x-2">
              <span className="font-bold font-serif text-sm text-slate-900 dark:text-white">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-orange-500/15 text-orange-600 dark:text-orange-400 rounded-full text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer flex items-center space-x-1"
              >
                <Check className="w-3 h-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 custom-scrollbar flex-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  You're all caught up!
                </p>
                <p className="text-[11px] text-slate-400">
                  No new notifications right now.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start space-x-3 cursor-pointer transition-colors ${
                    notif.is_read
                      ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50 opacity-80'
                      : 'bg-[#FFF8F0]/60 dark:bg-slate-900/80 hover:bg-[#FFF8F0] dark:hover:bg-slate-800 font-medium'
                  }`}
                >
                  {getNotificationIcon(notif.type)}

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className={`text-xs text-slate-900 dark:text-white truncate ${notif.is_read ? 'font-semibold' : 'font-bold'}`}>
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                        {formatTimeAgo(notif.created_at)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
                      {notif.message}
                    </p>
                  </div>

                  {!notif.is_read && (
                    <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
