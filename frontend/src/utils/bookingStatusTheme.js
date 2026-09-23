import React from 'react';
import {
  CheckCircle2,
  Clock,
  UserCheck,
  Sparkles,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Info,
  LogOut,
  AlertCircle
} from 'lucide-react';

/**
 * Normalizes and returns comprehensive theme styling, badges, column styles,
 * and milestone details for any booking status.
 *
 * Distinct Color Palette:
 * - CONFIRMED / VERIFIED: Vibrant Emerald Green 🟢
 * - COMPLETED: Royal Purple / Deep Violet 🟣
 * - PENDING / PAYMENT_PENDING: Golden Amber / Warm Yellow 🟡
 * - CHECKED_IN: Electric Sky Blue / Azure 🔵
 * - CHECKED_OUT: Deep Indigo / Slate 🔷
 * - CANCELLED: Coral / Rose Pink-Red 🌸
 * - FAILED: Deep Crimson Alert Red 🔴
 */
export const getBookingStatusTheme = (rawStatus) => {
  const status = (rawStatus || 'PENDING').toUpperCase();

  switch (status) {
    case 'CONFIRMED':
    case 'VERIFIED':
      return {
        key: 'CONFIRMED',
        label: status === 'VERIFIED' ? 'VERIFIED STAY' : 'CONFIRMED',
        icon: CheckCircle2,
        // Overall card theme (Green)
        cardBorder: 'border-emerald-500/50 dark:border-emerald-500/45 hover:border-emerald-500/70',
        cardBg: 'bg-emerald-50/20 dark:bg-[#071f16]',
        cardAccentBar: 'from-emerald-400 via-green-500 to-teal-600',
        glowClass: 'shadow-emerald-500/10 hover:shadow-emerald-500/15 ring-1 ring-emerald-500/20',
        // Top Badges & Pills
        badgeClasses: 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 shadow-xs font-bold',
        dotClass: 'bg-emerald-500',
        bookingPillClasses: 'bg-gradient-to-r from-emerald-600 to-teal-800 text-white shadow-xs',
        verinovaPillClasses: 'text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/35',
        // Full Column Details Grid Theme (Emerald / Green)
        columnBg: 'bg-emerald-100/70 dark:bg-emerald-950/60',
        columnBorder: 'border-emerald-300/90 dark:border-emerald-700/60',
        columnHeaderClass: 'text-emerald-900 dark:text-emerald-300 font-extrabold',
        columnValueClass: 'text-[#17324D] dark:text-white',
        columnSubtextClass: 'text-emerald-950/80 dark:text-emerald-200/90',
        // Price Highlight
        priceClass: 'text-emerald-700 dark:text-emerald-400 font-black',
        // Milestone theme
        milestoneActiveBar: 'bg-emerald-500 dark:bg-emerald-400 shadow-xs shadow-emerald-500/30',
        milestoneActiveText: 'text-emerald-800 dark:text-emerald-300 font-bold',
        milestoneTrack: 'bg-emerald-200/60 dark:bg-emerald-950/40',
        milestoneProgress: 3, // Booked, Verified, Confirmed
        banner: null,
      };

    case 'COMPLETED':
      return {
        key: 'COMPLETED',
        label: 'JOURNEY COMPLETED',
        icon: CheckCircle2,
        // Overall card theme (Royal Purple / Violet)
        cardBorder: 'border-purple-500/50 dark:border-purple-500/45 hover:border-purple-500/70',
        cardBg: 'bg-purple-50/20 dark:bg-[#190e2b]',
        cardAccentBar: 'from-purple-500 via-fuchsia-500 to-violet-600',
        glowClass: 'shadow-purple-500/10 hover:shadow-purple-500/15 ring-1 ring-purple-500/20',
        badgeClasses: 'bg-purple-500/20 text-purple-800 dark:text-purple-300 border-purple-500/40 shadow-xs font-bold',
        dotClass: 'bg-purple-500',
        bookingPillClasses: 'bg-gradient-to-r from-purple-700 to-indigo-900 text-white shadow-xs',
        verinovaPillClasses: 'text-purple-800 dark:text-purple-300 bg-purple-500/15 border-purple-500/35',
        // Full Column Details Grid Theme (Royal Purple / Violet)
        columnBg: 'bg-purple-100/70 dark:bg-purple-950/60',
        columnBorder: 'border-purple-300/90 dark:border-purple-700/60',
        columnHeaderClass: 'text-purple-900 dark:text-purple-300 font-extrabold',
        columnValueClass: 'text-[#17324D] dark:text-white',
        columnSubtextClass: 'text-purple-950/80 dark:text-purple-200/90',
        priceClass: 'text-purple-700 dark:text-purple-400 font-black',
        milestoneActiveBar: 'bg-purple-500 dark:bg-purple-400 shadow-xs shadow-purple-500/30',
        milestoneActiveText: 'text-purple-800 dark:text-purple-300 font-bold',
        milestoneTrack: 'bg-purple-200/60 dark:bg-purple-950/40',
        milestoneProgress: 7, // 100% completed all 7 milestones
        banner: {
          icon: Sparkles,
          text: 'Journey complete! Thank you for travelling with Voyara. Share your review to inspire others.',
          bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800/60',
        },
      };

    case 'PENDING':
    case 'PAYMENT_PENDING':
      return {
        key: 'PENDING',
        label: 'PENDING CONFIRMATION',
        icon: Clock,
        // Overall card theme (Golden Amber / Warm Yellow)
        cardBorder: 'border-amber-400/60 dark:border-amber-500/50 hover:border-amber-400/80',
        cardBg: 'bg-amber-50/25 dark:bg-[#201606]',
        cardAccentBar: 'from-amber-400 via-yellow-400 to-orange-500',
        glowClass: 'shadow-amber-500/10 hover:shadow-amber-500/15 ring-1 ring-amber-500/20',
        badgeClasses: 'bg-amber-500/20 text-amber-900 dark:text-amber-300 border-amber-500/40 shadow-xs font-bold',
        dotClass: 'bg-amber-500 animate-pulse',
        bookingPillClasses: 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-xs',
        verinovaPillClasses: 'text-amber-900 dark:text-amber-300 bg-amber-500/15 border-amber-500/35',
        // Full Column Details Grid Theme (Amber / Yellow)
        columnBg: 'bg-amber-100/75 dark:bg-amber-950/60',
        columnBorder: 'border-amber-300/90 dark:border-amber-700/60',
        columnHeaderClass: 'text-amber-900 dark:text-amber-300 font-extrabold',
        columnValueClass: 'text-[#17324D] dark:text-white',
        columnSubtextClass: 'text-amber-950/80 dark:text-amber-200/90',
        priceClass: 'text-amber-700 dark:text-amber-400 font-black',
        milestoneActiveBar: 'bg-amber-500 dark:bg-amber-400 shadow-xs shadow-amber-500/30',
        milestoneActiveText: 'text-amber-800 dark:text-amber-300 font-bold',
        milestoneTrack: 'bg-amber-200/60 dark:bg-amber-950/40',
        milestoneProgress: 2, // Booked, Pending Verification
        banner: {
          icon: Clock,
          text: 'This reservation is awaiting final confirmation from the Stay Partner. Your dates are provisionally held.',
          bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800/60',
        },
      };

    case 'CHECKED_IN':
      return {
        key: 'CHECKED_IN',
        label: 'CURRENTLY CHECKED IN',
        icon: UserCheck,
        // Overall card theme (Electric Sky Blue / Cyan)
        cardBorder: 'border-blue-500/55 dark:border-blue-500/50 hover:border-blue-400/80',
        cardBg: 'bg-blue-50/20 dark:bg-[#07192e]',
        cardAccentBar: 'from-blue-500 via-cyan-400 to-sky-600',
        glowClass: 'shadow-blue-500/15 hover:shadow-blue-500/20 ring-1 ring-blue-500/30',
        badgeClasses: 'bg-blue-500/20 text-blue-800 dark:text-blue-300 border-blue-500/40 shadow-xs font-bold',
        dotClass: 'bg-blue-500 animate-ping',
        bookingPillClasses: 'bg-gradient-to-r from-blue-600 to-cyan-700 text-white shadow-xs',
        verinovaPillClasses: 'text-blue-800 dark:text-blue-300 bg-blue-500/15 border-blue-500/35',
        // Full Column Details Grid Theme (Sky Blue / Cyan)
        columnBg: 'bg-blue-100/70 dark:bg-blue-950/60',
        columnBorder: 'border-blue-300/90 dark:border-blue-700/60',
        columnHeaderClass: 'text-blue-900 dark:text-blue-300 font-extrabold',
        columnValueClass: 'text-[#17324D] dark:text-white',
        columnSubtextClass: 'text-blue-950/80 dark:text-blue-200/90',
        priceClass: 'text-blue-700 dark:text-blue-400 font-black',
        milestoneActiveBar: 'bg-blue-500 dark:bg-blue-400 shadow-xs shadow-blue-500/30',
        milestoneActiveText: 'text-blue-800 dark:text-blue-300 font-bold',
        milestoneTrack: 'bg-blue-200/60 dark:bg-blue-950/40',
        milestoneProgress: 5, // Booked, Verified, Confirmed, Checked-In, Stay
        banner: {
          icon: UserCheck,
          text: 'You are currently checked in! Enjoy your sanctuary stay. If you need any assistance, message your stay partner.',
          bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800/60',
        },
      };

    case 'CHECKED_OUT':
      return {
        key: 'CHECKED_OUT',
        label: 'CHECKED OUT',
        icon: LogOut,
        // Overall card theme (Indigo / Slate Blue)
        cardBorder: 'border-indigo-400/50 dark:border-indigo-500/45 hover:border-indigo-400/70',
        cardBg: 'bg-indigo-50/20 dark:bg-[#101429]',
        cardAccentBar: 'from-indigo-500 via-blue-600 to-violet-600',
        glowClass: 'shadow-indigo-500/10 hover:shadow-indigo-500/15',
        badgeClasses: 'bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border-indigo-500/40 shadow-xs font-bold',
        dotClass: 'bg-indigo-500',
        bookingPillClasses: 'bg-gradient-to-r from-indigo-700 to-purple-800 text-white shadow-xs',
        verinovaPillClasses: 'text-indigo-800 dark:text-indigo-300 bg-indigo-500/15 border-indigo-500/35',
        // Full Column Details Grid Theme (Indigo)
        columnBg: 'bg-indigo-100/70 dark:bg-indigo-950/60',
        columnBorder: 'border-indigo-300/90 dark:border-indigo-700/60',
        columnHeaderClass: 'text-indigo-900 dark:text-indigo-300 font-extrabold',
        columnValueClass: 'text-[#17324D] dark:text-white',
        columnSubtextClass: 'text-indigo-950/80 dark:text-indigo-200/90',
        priceClass: 'text-indigo-700 dark:text-indigo-400 font-black',
        milestoneActiveBar: 'bg-indigo-500 dark:bg-indigo-400 shadow-xs shadow-indigo-500/30',
        milestoneActiveText: 'text-indigo-800 dark:text-indigo-300 font-bold',
        milestoneTrack: 'bg-indigo-200/60 dark:bg-indigo-950/40',
        milestoneProgress: 6, // Booked, Verified, Confirmed, Checked-In, Stay, Checkout
        banner: {
          icon: Sparkles,
          text: 'Your stay has concluded! How was your journey? Share a verified review to help fellow travellers.',
          bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800/60',
        },
      };

    case 'CANCELLED':
      return {
        key: 'CANCELLED',
        label: 'CANCELLED',
        icon: XCircle,
        // Overall card theme (Coral / Rose Red)
        cardBorder: 'border-rose-400/60 dark:border-rose-500/50 hover:border-rose-400/80',
        cardBg: 'bg-rose-50/25 dark:bg-[#250d18]',
        cardAccentBar: 'from-rose-400 via-pink-500 to-rose-600',
        glowClass: 'shadow-rose-500/10 hover:shadow-rose-500/15',
        badgeClasses: 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/40 shadow-xs font-bold',
        dotClass: 'bg-rose-500',
        bookingPillClasses: 'bg-gradient-to-r from-rose-700 to-rose-900 text-white shadow-xs',
        verinovaPillClasses: 'text-rose-800 dark:text-rose-300 bg-rose-500/15 border-rose-500/35',
        // Full Column Details Grid Theme (Coral / Rose Red)
        columnBg: 'bg-rose-100/75 dark:bg-rose-950/60',
        columnBorder: 'border-rose-300/90 dark:border-rose-800/60',
        columnHeaderClass: 'text-rose-900 dark:text-rose-300 font-extrabold',
        columnValueClass: 'text-[#17324D] dark:text-white line-through opacity-85',
        columnSubtextClass: 'text-rose-950/80 dark:text-rose-200/90',
        priceClass: 'text-rose-700 dark:text-rose-400 font-black',
        milestoneActiveBar: 'bg-rose-400 dark:bg-rose-500/90',
        milestoneActiveText: 'text-rose-700 dark:text-rose-300 font-bold',
        milestoneTrack: 'bg-rose-200/60 dark:bg-rose-950/40',
        milestoneProgress: 0,
        banner: {
          icon: AlertCircle,
          text: 'This reservation has been cancelled. Internal refund and settlement terms apply.',
          bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-800/60',
        },
      };

    case 'FAILED':
    default:
      return {
        key: 'FAILED',
        label: 'BOOKING FAILED',
        icon: AlertTriangle,
        // Overall card theme (Deep Crimson Red Alert)
        cardBorder: 'border-red-500/70 dark:border-red-500/65 hover:border-red-500/90',
        cardBg: 'bg-red-50/30 dark:bg-[#2c080d]',
        cardAccentBar: 'from-red-600 via-rose-600 to-red-800',
        glowClass: 'shadow-red-500/15 hover:shadow-red-500/25 ring-1 ring-red-500/30',
        badgeClasses: 'bg-red-500/25 text-red-800 dark:text-red-200 border-red-500/50 shadow-xs font-black',
        dotClass: 'bg-red-500 animate-pulse',
        bookingPillClasses: 'bg-gradient-to-r from-red-700 to-rose-900 text-white shadow-xs',
        verinovaPillClasses: 'text-red-800 dark:text-red-300 bg-red-500/20 border-red-500/40',
        // Full Column Details Grid Theme (Deep Crimson Red)
        columnBg: 'bg-red-100/80 dark:bg-red-950/70',
        columnBorder: 'border-red-400/90 dark:border-red-700/70',
        columnHeaderClass: 'text-red-900 dark:text-red-300 font-extrabold',
        columnValueClass: 'text-[#17324D] dark:text-white',
        columnSubtextClass: 'text-red-950/80 dark:text-red-200/90',
        priceClass: 'text-red-700 dark:text-red-400 font-black',
        milestoneActiveBar: 'bg-red-500 dark:bg-red-500 shadow-xs shadow-red-500/30',
        milestoneActiveText: 'text-red-800 dark:text-red-400 font-bold',
        milestoneTrack: 'bg-red-200/60 dark:bg-red-950/40',
        milestoneProgress: 1, // Only initial step
        banner: {
          icon: AlertTriangle,
          text: 'Payment or verification failed during booking creation. No charges were captured, or a refund is queued.',
          bg: 'bg-red-50 dark:bg-red-950/50 text-red-900 dark:text-red-200 border-red-300 dark:border-red-800/70',
        },
      };
  }
};
