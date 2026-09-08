import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { VerificationBadge } from '../../components/verification/VerificationBadge';
import { VerificationModal } from '../../components/verification/VerificationModal';
import { InvoiceModal } from '../../components/payment/InvoiceModal';
import { BookOpen, AlertCircle, ShieldCheck, CreditCard, FileText } from 'lucide-react';

export const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [invoiceBooking, setInvoiceBooking] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const data = await adminApi.getBookings();
        setBookings(data);
      } catch (err) {
        setError(err.message || 'Failed to load bookings.');
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black font-serif text-[#102A43] dark:text-white">All Platform Bookings</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Live reservation ledger & Razorpay payment reconciliation across all providers and travelers</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
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
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-[#FFF8F0]/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 font-mono font-bold text-[#102A43] dark:text-white">{b.booking_number}</td>
                    <td className="py-3.5">
                      <strong className="text-[#102A43] dark:text-white block">{b.user?.name || 'Customer'}</strong>
                      <span className="text-slate-400 dark:text-slate-500 text-[11px]">{b.user?.email}</span>
                    </td>
                    <td className="py-3.5">
                      <strong className="text-[#102A43] dark:text-white block">{b.property?.name}</strong>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                        {b.booking_rooms?.[0]?.room_name || 'Stay'}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-600 dark:text-slate-300">
                      <div>{b.check_in} to {b.check_out}</div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{b.total_nights} Nights</span>
                    </td>
                    <td className="py-3.5 font-bold text-[#F97360] font-serif text-sm">
                      ₹{b.total_amount?.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5">
                      <div className="space-y-1">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          b.status === 'CANCELLED'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {b.status}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-mono">
                          Razorpay
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <VerificationBadge
                        status={b.status === 'CANCELLED' ? 'NEEDS_REVIEW' : 'VERIFIED'}
                        size="sm"
                        onClick={() => setSelectedBookingId(b.id)}
                        showDetailsHint={true}
                      />
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setInvoiceBooking(b)}
                        className="px-2.5 py-1 bg-[#FFF8F0] dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-slate-700 text-[#F97360] dark:text-orange-400 border border-orange-200 dark:border-slate-700 rounded-lg text-[11px] font-bold transition-all inline-flex items-center space-x-1 cursor-pointer"
                      >
                        <FileText className="w-3 h-3" />
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
