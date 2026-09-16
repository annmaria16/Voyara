import React from 'react';
import { Users, Baby, BedDouble, AlertCircle, Plus, Minus, Info } from 'lucide-react';

export const GuestSelector = ({
  adults = 2,
  setAdults,
  childrenCount = 0,
  setChildrenCount,
  childAges = [],
  setChildAges,
  cotsCount = 0,
  setCotsCount,
  extraBedsCount = 0,
  setExtraBedsCount,
  roomQuantity = 1,
  selectedRoom = null,
  propertyRules = null,
}) => {
  const roomRules = selectedRoom?.rules || {};
  const maxRoomCapacity = selectedRoom?.capacity || 2;
  const totalMaxCapacity = maxRoomCapacity * roomQuantity;

  const maxAdultsPerRoom = roomRules.max_adults ?? maxRoomCapacity;
  const maxAdultsAllowed = maxAdultsPerRoom * roomQuantity;

  const isChildrenAllowed = roomRules.children_allowed !== false && propertyRules?.children_allowed !== false;
  const maxChildrenPerRoom = isChildrenAllowed ? (roomRules.max_children ?? maxRoomCapacity) : 0;
  const maxChildrenAllowed = maxChildrenPerRoom * roomQuantity;

  const minChildAge = Math.max(roomRules.min_child_age || 0, propertyRules?.min_child_age || 0);

  const cotAllowed = roomRules.cot_allowed;
  const maxCots = (roomRules.cot_count || 1) * roomQuantity;
  const cotPrice = roomRules.cot_price || 0;

  const extraBedAllowed = roomRules.extra_bed_allowed;
  const maxExtraBeds = (roomRules.extra_bed_max || 1) * roomQuantity;
  const extraBedPrice = roomRules.extra_bed_price || 0;

  const totalGuests = adults + childrenCount;
  const isCapacityExceeded = totalGuests > totalMaxCapacity;

  // Handle adults change
  const handleAdultsChange = (val) => {
    const clamped = Math.max(1, Math.min(maxAdultsAllowed, val));
    setAdults(clamped);
  };

  // Handle children change
  const handleChildrenChange = (val) => {
    if (!isChildrenAllowed && val > 0) return;
    const clamped = Math.max(0, Math.min(maxChildrenAllowed, val));
    setChildrenCount(clamped);

    // Sync child ages array
    const newAges = [...childAges];
    if (clamped > newAges.length) {
      for (let i = newAges.length; i < clamped; i++) {
        newAges.push(minChildAge || 5);
      }
    } else if (clamped < newAges.length) {
      newAges.splice(clamped);
    }
    setChildAges(newAges);
  };

  // Handle child age change
  const handleAgeChange = (index, ageVal) => {
    const parsed = parseInt(ageVal, 10);
    const validAge = isNaN(parsed) ? 0 : Math.max(0, Math.min(17, parsed));
    const newAges = [...childAges];
    newAges[index] = validAge;
    setChildAges(newAges);
  };

  return (
    <div className="space-y-4 p-4 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#17324D] dark:text-slate-300">
          Guests & Bedding Allocation
        </label>
        <span className="text-[11px] text-[#087F8C] dark:text-[#27B7A8] font-bold">
          Max {totalMaxCapacity} total ({maxRoomCapacity}/room × {roomQuantity})
        </span>
      </div>

      {/* Adults Stepper */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-[#17324D] dark:text-white block">Adults</span>
          <span className="text-[10px] text-slate-400 block">Age 18+ (Max {maxAdultsAllowed})</span>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            disabled={adults <= 1}
            onClick={() => handleAdultsChange(adults - 1)}
            className="w-7 h-7 rounded-lg bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span
            data-testid="adults-count"
            className="w-7 text-center font-bold text-sm text-[#17324D] dark:text-white font-mono"
          >
            {adults}
          </span>
          <button
            type="button"
            disabled={adults >= maxAdultsAllowed}
            onClick={() => handleAdultsChange(adults + 1)}
            className="w-7 h-7 rounded-lg bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Children Stepper */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-xs font-bold text-[#17324D] dark:text-white block">Children</span>
          <span className="text-[10px] text-slate-400 block">
            {isChildrenAllowed ? `Age 0-17 (Max ${maxChildrenAllowed})` : 'Children not permitted in this room'}
          </span>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            disabled={childrenCount <= 0}
            onClick={() => handleChildrenChange(childrenCount - 1)}
            className="w-7 h-7 rounded-lg bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span
            data-testid="children-count"
            className="w-7 text-center font-bold text-sm text-[#17324D] dark:text-white font-mono"
          >
            {childrenCount}
          </span>
          <button
            type="button"
            disabled={!isChildrenAllowed || childrenCount >= maxChildrenAllowed}
            onClick={() => handleChildrenChange(childrenCount + 1)}
            className="w-7 h-7 rounded-lg bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dynamic Child Ages Inputs */}
      {childrenCount > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Specify Age for each Child (Required)
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Array.from({ length: childrenCount }).map((_, idx) => {
              const currentAge = childAges[idx] !== undefined ? childAges[idx] : 5;
              const isUnderMinAge = minChildAge > 0 && currentAge < minChildAge;

              return (
                <div key={idx} className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 block">
                    Child {idx + 1} Age
                  </label>
                  <select
                    data-testid="child-age-input"
                    value={currentAge}
                    onChange={(e) => handleAgeChange(idx, e.target.value)}
                    className={`w-full px-2 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#0F273D] border ${
                      isUnderMinAge ? 'border-rose-400 text-rose-600' : 'border-slate-200 dark:border-slate-700 text-[#17324D] dark:text-white'
                    } focus:outline-hidden focus:border-[#087F8C] cursor-pointer`}
                  >
                    {Array.from({ length: 18 }).map((_, age) => (
                      <option key={age} value={age}>
                        {age === 0 ? 'Under 1 yr' : `${age} yr${age > 1 ? 's' : ''} old`}
                      </option>
                    ))}
                  </select>
                  {isUnderMinAge && (
                    <span className="text-[9px] text-rose-500 font-bold block">
                      Min age is {minChildAge} yrs
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Baby Cots Option */}
      {cotAllowed && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center space-x-1.5">
              <Baby className="w-3.5 h-3.5 text-[#087F8C]" />
              <span className="text-xs font-bold text-[#17324D] dark:text-white">Baby Cot</span>
              <span className="text-[9px] text-[#35A66F] font-bold bg-[#DDF3E7] dark:bg-[#35A66F]/20 px-1.5 py-0.2 rounded">
                {cotPrice > 0 ? `+₹${cotPrice}/night` : 'Free'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block">Max {maxCots} cot(s)</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={cotsCount <= 0}
              onClick={() => setCotsCount(Math.max(0, cotsCount - 1))}
              className="w-6 h-6 rounded bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-30 cursor-pointer"
            >
              -
            </button>
            <span className="w-5 text-center font-mono font-bold text-xs">{cotsCount}</span>
            <button
              type="button"
              disabled={cotsCount >= maxCots}
              onClick={() => setCotsCount(Math.min(maxCots, cotsCount + 1))}
              className="w-6 h-6 rounded bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-30 cursor-pointer"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Extra Beds Option */}
      {extraBedAllowed && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center space-x-1.5">
              <BedDouble className="w-3.5 h-3.5 text-[#F97316]" />
              <span className="text-xs font-bold text-[#17324D] dark:text-white">Extra Bed</span>
              <span className="text-[9px] text-[#F97316] font-bold bg-[#F97316]/10 px-1.5 py-0.2 rounded">
                {extraBedPrice > 0 ? `+₹${extraBedPrice}/night` : 'Free'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block">Max {maxExtraBeds} extra bed(s)</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={extraBedsCount <= 0}
              onClick={() => setExtraBedsCount(Math.max(0, extraBedsCount - 1))}
              className="w-6 h-6 rounded bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-30 cursor-pointer"
            >
              -
            </button>
            <span className="w-5 text-center font-mono font-bold text-xs">{extraBedsCount}</span>
            <button
              type="button"
              disabled={extraBedsCount >= maxExtraBeds}
              onClick={() => setExtraBedsCount(Math.min(maxExtraBeds, extraBedsCount + 1))}
              className="w-6 h-6 rounded bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-30 cursor-pointer"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Capacity exceeded warning */}
      {isCapacityExceeded && (
        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-[11px] flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            Total guests ({totalGuests}) exceed the maximum capacity of {totalMaxCapacity} for {roomQuantity} room(s).
          </span>
        </div>
      )}
    </div>
  );
};

export default GuestSelector;
