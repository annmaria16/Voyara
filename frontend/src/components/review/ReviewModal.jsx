import React, { useState } from 'react';
import { customerApi } from '../../api/customer';
import { Star, X, Sparkles, CheckCircle2, AlertCircle, Loader2, MessageSquare, ThumbsUp } from 'lucide-react';

export const ReviewModal = ({ booking, isOpen, onClose, onSuccess }) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [cleanliness, setCleanliness] = useState(5);
  const [staff, setStaff] = useState(5);
  const [location, setLocation] = useState(5);
  const [value, setValue] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen || !booking) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim() || comment.trim().length < 5) {
      setError('Please provide a constructive review comment (at least 5 characters).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await customerApi.submitReview({
        property_id: booking.property_id,
        booking_id: booking.booking_id || booking.id,
        rating: Number(rating),
        cleanliness_rating: Number(cleanliness),
        staff_rating: Number(staff),
        location_rating: Number(location),
        value_rating: Number(value),
        comment: comment.trim(),
      });

      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to submit review.');
    } finally {
      setLoading(false);
    }
  };

  const getRatingLabel = (score) => {
    if (score >= 5) return 'Exceptional • 5/5';
    if (score >= 4) return 'Very Good • 4/5';
    if (score >= 3) return 'Average • 3/5';
    if (score >= 2) return 'Disappointing • 2/5';
    return 'Poor • 1/5';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-[#131D2E] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-6 shadow-2xl my-auto animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-bold text-orange-600 dark:text-orange-400">
              <Sparkles className="w-4 h-4" />
              <span>Verified Stay Review</span>
            </div>
            <h3 className="text-lg font-black font-serif text-slate-900 dark:text-white mt-0.5">
              Rate Your Experience
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-sm">
              {booking.property_name || 'Sanctuary'} • Booking #{booking.booking_number}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Thank You for Your Feedback!
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your verified review has been published and linked to your completed stay.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Overall Star Rating */}
            <div className="text-center space-y-2 bg-[#FFF8F0]/70 dark:bg-slate-900/60 p-4 rounded-2xl border border-[#FDBA9A]/30 dark:border-slate-800">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Overall Rating *
              </label>
              <div className="flex items-center justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 text-2xl transition-transform hover:scale-110 cursor-pointer focus:outline-hidden"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          filled
                            ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                            : 'text-slate-300 dark:text-slate-700'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="inline-block text-xs font-bold text-orange-600 dark:text-orange-400">
                {getRatingLabel(hoverRating || rating)}
              </span>
            </div>

            {/* Category Breakdown Ratings */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cleanliness ({cleanliness}/5)
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={cleanliness}
                  onChange={(e) => setCleanliness(Number(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Staff & Hospitality ({staff}/5)
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={staff}
                  onChange={(e) => setStaff(Number(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Location & Scenery ({location}/5)
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={location}
                  onChange={(e) => setLocation(Number(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Value for Money ({value}/5)
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Review Comment Textarea */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Your Review Feedback *</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {comment.length}/2000 chars
                </span>
              </label>
              <textarea
                rows={4}
                required
                maxLength={2000}
                placeholder="Share your stay experience, what you loved most, room comfort, host hospitality, or tips for fellow travellers..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Review...</span>
                  </>
                ) : (
                  <>
                    <ThumbsUp className="w-4 h-4" />
                    <span>Publish Review</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReviewModal;
