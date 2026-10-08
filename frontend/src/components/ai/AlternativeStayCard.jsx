import React from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Car,
  Star,
  Bed,
  CheckCircle2,
  ArrowRight,
  Home,
  Check,
  Tag,
  Info
} from 'lucide-react';
import {
  formatPropertyName,
  formatLocationName,
  formatRoomName,
  formatPropertyType
} from '../../utils/formatters';

export const AlternativeStayCard = ({
  stay,
  onSelect,
  isRecommended = false,
  className = ''
}) => {
  if (!stay) return null;

  const propName = formatPropertyName(stay.property_name);
  const city = formatLocationName(stay.city);
  const state = formatLocationName(stay.state);
  const roomName = formatRoomName(stay.room_name);
  const propType = formatPropertyType(stay.property_type || 'Resort');
  const rating = Number(stay.rating || 4.8);
  const totalPrice = Number(stay.total_price || 0);
  const nightlyPrice = Number(stay.nightly_price || 0);

  return (
    <div
      className={`rounded-2xl transition-all duration-300 overflow-hidden flex flex-col justify-between ${
        isRecommended
          ? 'bg-gradient-to-br from-white via-teal-50/20 to-teal-100/30 dark:from-slate-800 dark:via-slate-800/95 dark:to-teal-950/40 border-2 border-[#087F8C] dark:border-teal-400 shadow-md ring-2 ring-teal-500/10'
          : 'bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-white/10 hover:border-[#087F8C] dark:hover:border-teal-400 shadow-xs hover:shadow-md'
      } ${className}`}
    >
      {/* Top Image & Floating Badges */}
      <div className="relative h-44 w-full overflow-hidden group">
        {stay.property_image ? (
          <img
            src={stay.property_image}
            alt={propName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
            <Home className="w-12 h-12" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Floating Top Left Badge: Recommended, Option # or Over Budget */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          {isRecommended ? (
            <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm flex items-center space-x-1">
              <span>⭐ Recommended Match</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold font-mono shadow-sm">
              Option #{stay.option_index || 1}
            </span>
          )}
          {stay.is_over_budget && (
            <span className="px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-extrabold uppercase shadow-sm">
              Over Budget
            </span>
          )}
          <span className="px-2 py-0.5 rounded-lg bg-white/90 dark:bg-slate-900/90 text-[#17324D] dark:text-white text-[10px] font-bold shadow-xs">
            {propType}
          </span>
        </div>

        {/* Rating Floating Top Right */}
        {rating > 0 && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-white text-xs font-bold flex items-center space-x-1 shadow-sm">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{rating.toFixed(1)}</span>
          </div>
        )}

        {/* Property Name on Gradient */}
        <div className="absolute bottom-3 left-3 right-3 text-white z-10">
          <h4 className="font-extrabold text-sm sm:text-base leading-snug drop-shadow-sm truncate">
            {propName}
          </h4>
          <div className="flex items-center space-x-1.5 text-xs text-white/90 drop-shadow-xs mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-teal-300 shrink-0" />
            <span className="truncate">{city}, {state}</span>
          </div>
        </div>
      </div>

      {/* Body Information */}
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between text-xs">
        
        <div className="space-y-2.5">
          {/* Distance & Driving Time Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {stay.distance_label && stay.distance_label !== 'Same destination' && (
              <span className="inline-flex items-center text-[11px] font-bold text-[#087F8C] dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200/60 dark:border-teal-800/40">
                <MapPin className="w-3 h-3 mr-1 shrink-0" />
                <span>{stay.distance_label}</span>
              </span>
            )}
            {stay.travel_time_text && (
              <span className="inline-flex items-center text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
                <Car className="w-3 h-3 mr-1 text-slate-500 shrink-0" />
                <span>{stay.travel_time_text}</span>
              </span>
            )}
            {stay.available_units > 0 && (
              <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                <CheckCircle2 className="w-3 h-3 mr-1 shrink-0" />
                <span>{stay.available_units} room{stay.available_units > 1 ? 's' : ''} available</span>
              </span>
            )}
          </div>

          {/* Room Type & Guest Fit */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 space-y-1">
            <div className="font-bold text-xs text-[#17324D] dark:text-white flex items-center space-x-1.5">
              <Bed className="w-3.5 h-3.5 text-[#087F8C]" />
              <span className="truncate">{roomName}{stay.room_quantity > 1 ? ` × ${stay.room_quantity}` : ''}</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {stay.fits_description || `Fits ${stay.adults || 2} adults`}
            </div>
            {stay.check_in && stay.check_out && (
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                📅 {stay.check_in} – {stay.check_out} ({stay.total_nights || 1} night{stay.total_nights > 1 ? 's' : ''})
              </div>
            )}
            {stay.diff_reason && (
              <div className={`text-[10px] font-medium flex items-center space-x-1 pt-0.5 ${stay.is_over_budget ? 'text-rose-600 dark:text-rose-400' : 'text-amber-700 dark:text-amber-300'}`}>
                <Info className="w-3 h-3 shrink-0" />
                <span className="truncate">{stay.diff_reason}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer: Pricing & Action Buttons */}
        <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-2.5">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-base sm:text-lg font-black font-mono text-[#087F8C] dark:text-teal-400">
                ₹{totalPrice.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-400">
                ₹{nightlyPrice.toLocaleString('en-IN')}/night ({stay.total_nights || 1} nt{stay.total_nights > 1 ? 's' : ''})
              </div>
            </div>

            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider font-mono">
              ✓ Verified Stay
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link
              to={`/properties/${stay.property_id}`}
              target="_blank"
              rel="noreferrer"
              className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-center text-xs transition"
            >
              View Details
            </Link>

            <button
              onClick={() => onSelect && onSelect(stay)}
              className="py-2 px-3 rounded-xl bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] hover:from-[#0F9D9A] hover:to-[#087F8C] text-white font-bold text-xs shadow-xs hover:shadow-md transition flex items-center justify-center space-x-1"
            >
              <span>Book Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AlternativeStayCard;
