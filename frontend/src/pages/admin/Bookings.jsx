import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { VerificationBadge } from '../../components/verification/VerificationBadge';
import { VerificationModal } from '../../components/verification/VerificationModal';
import { InvoiceModal } from '../../components/payment/InvoiceModal';
import {
  BookOpen,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  FileText,
  Calendar,
  Users,
  Search,
  Filter,
} from 'lucide-react';

export const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [invoiceBooking, setInvoiceBooking] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const data = await adminApi.getBookings();
        setBookings(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || 'Failed to load bookings.');
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const filteredBookings = bookings.filter((b) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'CONFIRMED' && b.status === 'CONFIRMED') ||
      (statusFilter === 'CANCELLED' && b.status === 'CANCELLED');

    const matchesSearch =
      !searchQuery.trim() ||
      b.booking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.property?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const totalGross = bookings
    .filter((b) => b.status !== 'CANCELLED')
    .reduce((acc, curr) => acc + (curr.total_amount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#087F8C]/10 border border-[#087F8C]/30 text-[#087F8C] dark:text-[#27B7A8] text-xs font-bold mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#087F8C] dark:text-[#27B7A8]" />
            <span>Platform Financial Ledger</span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-[#091B29] dark:text-white tracking-tight">
            Bookings & Settlement Monitor
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time reservation ledger, VeriNova verification checkpoints, and Razorpay settlements.
          </p>
        </div>

        {/* Quick Gross Card */}
        <div className="p-4 bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm flex items-center space-x-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Gross Verified Volume</span>
            <span className="text-xl font-serif font-black text-orange-500">
              ₹{totalGross.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 custom-scrollbar">
          {['ALL', 'CONFIRMED', 'CANCELLED'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === s
                  ? 'bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] text-white shadow-md shadow-teal-900/20'
                  : 'bg-white dark:bg-[#0F273D] text-slate-700 dark:text-slate-300 hover:bg-[#FFFDF7] dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
              }`}
            >
              {s === 'ALL' ? 'All Bookings' : s} ({bookings.filter((b) => s === 'ALL' || b.status === s).length})
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search booking #, guest, stay..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs text-[#091B29] dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-[#087F8C]"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="w-8 h-8 border-3 border-[#087F8C] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-16 text-center border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-xs">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-lg font-serif font-bold text-[#091B29] dark:text-white">No bookings matched</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Try adjusting the filter or search query.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3">Reference</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Property & Room</th>
                  <th className="pb-3">Stay Dates</th>
                  <th className="pb-3">Total Amount</th>
                  <th className="pb-3">Payment</th>
                  <th className="pb-3">VeriNova Audit</th>
                  <th className="pb-3 text-right">Tax Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 font-mono font-bold text-[#091B29] dark:text-white">
                      {b.booking_number || `VOY-${b.id}`}
                    </td>
                    <td className="py-4">
                      <strong className="text-[#091B29] dark:text-white block">{b.user?.name || 'Customer'}</strong>
                      <span className="text-slate-400 dark:text-slate-500 text-[11px]">{b.user?.email}</span>
                    </td>
                    <td className="py-4">
                      <strong className="text-[#091B29] dark:text-white block">{b.property?.name}</strong>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                        {b.booking_rooms?.[0]?.room_name || 'Sanctuary Suite'}
                      </span>
                    </td>
                    <td className="py-4 text-slate-600 dark:text-slate-300">
                      <div>{b.check_in} ➔ {b.check_out}</div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{b.total_nights || 1} Night(s)</span>
                    </td>
                    <td className="py-4 font-serif font-black text-orange-500 text-sm">
                      ₹{b.total_amount?.toLocaleString('en-IN')}
                    </td>
                    <td className="py-4">
                      <div className="space-y-1">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          b.status === 'CANCELLED'
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {b.status}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-mono">
                          Razorpay
                        </span>
                      </div>
                    </td>
                    <td className="py-4">
                      <VerificationBadge
                        status={b.status === 'CANCELLED' ? 'NEEDS_REVIEW' : 'VERIFIED'}
                        size="sm"
                        onClick={() => setSelectedBookingId(b.id)}
                        showDetailsHint={true}
                      />
                    </td>
                    <td className="py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setInvoiceBooking(b)}
                        className="px-3.5 py-1.5 bg-[#FFFDF7] dark:bg-slate-800 hover:bg-[#087F8C]/10 dark:hover:bg-slate-700 text-[#087F8C] dark:text-[#27B7A8] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-1 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedBookingId && (
        <VerificationModal
          bookingId={selectedBookingId}
          isOpen={!!selectedBookingId}
          onClose={() => setSelectedBookingId(null)}
        />
      )}

      {invoiceBooking && (
        <InvoiceModal
          booking={invoiceBooking}
          isOpen={!!invoiceBooking}
          onClose={() => setInvoiceBooking(null)}
        />
      )}
    </div>
  );
};

export default AdminBookings;
