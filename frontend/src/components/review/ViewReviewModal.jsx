import React from 'react';
import { Star, X, Sparkles, ShieldCheck, CheckCircle2, Award, Calendar } from 'lucide-react';

export const ViewReviewModal = ({ booking, review, isOpen, onClose }) => {
  if (!isOpen) return null;

  // Use review object passed directly or from booking
  const activeReview = review || booking?.review;
  if (!activeReview) return null;

  const propertyName = booking?.property?.name || booking?.property_name || 'Sanctuary';
  const bookingNumber = booking?.booking_number || (booking?.id ? `VOY-${booking.id}` : '');
  const ratingValue = Number(activeReview.rating || 5);

  const getRatingLabel = (score) => {
    if (score >= 4.8) return 'Exceptional • 5/5';
    if (score >= 4.0) return 'Very Good • 4/5';
    if (score >= 3.0) return 'Good • 3/5';
    if (score >= 2.0) return 'Fair • 2/5';
    return 'Poor • 1/5';
  };

  const categories = [
    { label: 'Cleanliness & Hygiene', score: activeReview.cleanliness_rating || ratingValue },
    { label: 'Staff & Stay Partner Care', score: activeReview.staff_rating || ratingValue },
    { label: 'Location & Surroundings', score: activeReview.location_rating || ratingValue },
    { label: 'Value for Money', score: activeReview.value_rating || ratingValue },
  ];

  const formattedDate = activeReview.created_at
    ? new Date(activeReview.created_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Recent Stay';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-[#131D2E] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-6 shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-lg font-black font-serif text-[#17324D] dark:text-white">
              Your Stay Rating & Feedback
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-sm mt-0.5">
              {propertyName} {bookingNumber ? `• Booking #${bookingNumber}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overall Star Rating Banner */}
        <div className="text-center space-y-2.5 bg-gradient-to-br from-[#FFF8F0] to-[#FFFDF7] dark:from-[#091B29] dark:to-[#10273B] p-5 rounded-2xl border border-orange-200/60 dark:border-teal-900/40 shadow-xs">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Submitted & Published</span>
          </div>

          <div className="flex items-center justify-center space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-7 h-7 ${
                  star <= Math.round(ratingValue)
                    ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                    : 'text-slate-300 dark:text-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="space-y-0.5">
            <span className="text-2xl font-black font-serif text-[#17324D] dark:text-white block">
              {ratingValue.toFixed(1)} <span className="text-sm font-sans text-slate-400 font-normal">/ 5.0</span>
            </span>
            <span className="inline-block text-xs font-bold text-[#F97316]">
              {getRatingLabel(ratingValue)}
            </span>
          </div>
        </div>

        {/* Category Breakdown Progress */}
        <div className="space-y-3 bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Category Breakdown Scores
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {categories.map((cat, idx) => {
              const score = Number(cat.score || ratingValue);
              const percentage = Math.min(100, (score / 5) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    <span className="truncate pr-1">{cat.label}</span>
                    <span className="font-bold text-[#087F8C] dark:text-[#27B7A8] shrink-0 font-mono">
                      {score.toFixed(1)}/5
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#087F8C] to-[#27B7A8] rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Review Comment Quote */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Your Written Feedback
          </span>
          <div className="p-4 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs">
            <p className="text-xs text-[#17324D] dark:text-slate-200 whitespace-pre-line leading-relaxed italic">
              "{activeReview.comment}"
            </p>
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <span className="flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-[#F97316]" />
                <span>Reviewed on {formattedDate}</span>
              </span>
              <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-bold">
                <ShieldCheck className="w-3 h-3" />
                <span>Verified Guest Stay</span>
              </span>
            </div>
          </div>
        </div>

        {/* Lock notice */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center space-x-2 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
          <Award className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            This review is linked to your completed booking record. Submitted reviews are permanent and cannot be re-rated.
          </span>
        </div>

        {/* Close Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-gradient-to-r from-[#087F8C] to-[#17324D] hover:from-[#076b76] hover:to-[#112437] text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
          >
            Close View
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewReviewModal;
