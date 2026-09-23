import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  User,
  Clock,
  ShieldCheck,
  DoorClosed,
  Layers,
  AlertTriangle,
  CheckCircle2,
  X,
  BedDouble,
  Tag,
  Info,
  CalendarCheck,
} from 'lucide-react';

export const CalendarWidget = ({
  propertyName = 'Property Calendar',
  propertyId = null,
  calendarData = null,
  loading = false,
  initialMonth = new Date().toLocaleString('default', { month: 'long' }),
  initialYear = new Date().getFullYear(),
  onMonthChange,
  showDateDrawerByDefault = true,
}) => {
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [currentYear, setCurrentYear] = useState(initialYear);
  const [selectedDayNum, setSelectedDayNum] = useState(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Sync state if initialMonth/initialYear change from parent
  useEffect(() => {
    if (initialMonth && initialMonth !== currentMonth) {
      setCurrentMonth(initialMonth);
    }
    if (initialYear && initialYear !== currentYear) {
      setCurrentYear(initialYear);
    }
  }, [initialMonth, initialYear]);

  const handlePrevMonth = () => {
    const idx = months.indexOf(currentMonth);
    let newMonth, newYear, newIdx;
    if (idx === 0) {
      newMonth = months[11];
      newYear = currentYear - 1;
      newIdx = 11;
    } else {
      newMonth = months[idx - 1];
      newYear = currentYear;
      newIdx = idx - 1;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    setSelectedDayNum(null);
    if (onMonthChange) onMonthChange(newMonth, newYear, newIdx + 1);
  };

  const handleNextMonth = () => {
    const idx = months.indexOf(currentMonth);
    let newMonth, newYear, newIdx;
    if (idx === 11) {
      newMonth = months[0];
      newYear = currentYear + 1;
      newIdx = 0;
    } else {
      newMonth = months[idx + 1];
      newYear = currentYear;
      newIdx = idx + 1;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    setSelectedDayNum(null);
    if (onMonthChange) onMonthChange(newMonth, newYear, newIdx + 1);
  };

  const monthIndex = months.indexOf(currentMonth);
  const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, monthIndex, 1).getDay(); // 0 = Sun

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Today checking
  const today = new Date();
  const isActualCurrentMonth =
    today.getMonth() === monthIndex && today.getFullYear() === currentYear;
  const todayDateNum = isActualCurrentMonth ? today.getDate() : null;

  // Selected day object
  const daysList = calendarData?.days || [];
  const selectedDayData = selectedDayNum
    ? daysList.find((d) => d.day === selectedDayNum) || null
    : null;

  const bookedDates = calendarData?.booked_dates || [];
  const blockedDates = calendarData?.blocked_dates || [];
  const summary = calendarData?.summary || {
    booked_days_count: bookedDates.length,
    blocked_days_count: blockedDates.length,
    available_days: daysInMonth - bookedDates.length - blockedDates.length,
    total_units: 0,
  };

  return (
    <div className="w-full select-none space-y-6">
      {/* 1. Header: Property Name, Calendar Title & Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#087F8C] dark:text-[#27B7A8]">
            <CalendarIcon className="w-4 h-4 text-[#087F8C] dark:text-[#27B7A8]" />
            <span>Property Calendar</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#091B29] dark:text-white tracking-tight">
            {calendarData?.property_name || propertyName}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-light">
            Live availability, occupied nights, and blackout schedule for {currentMonth} {currentYear}
          </p>
        </div>

        {/* Month Navigation Control Bar */}
        <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shrink-0 shadow-xs">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-xs cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 text-xs font-serif font-bold text-[#091B29] dark:text-white min-w-[130px] text-center">
            {currentMonth} {currentYear}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-xs cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Loading Indicator */}
      {loading && (
        <div className="py-8 flex items-center justify-center space-x-2 text-xs text-slate-400">
          <div className="w-4 h-4 border-2 border-[#087F8C] border-t-transparent rounded-full animate-spin"></div>
          <span>Loading PostgreSQL property availability...</span>
        </div>
      )}

      {/* 3. Days of Week & Calendar Grid */}
      {!loading && (
        <div className="space-y-2">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
            {daysOfWeek.map((day) => (
              <div
                key={day}
                className="text-[11px] font-bold uppercase tracking-wider text-slate-400 py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
            {/* Empty padding cells for first day */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-10 sm:h-12 w-full" />
            ))}

            {daysArray.map((dayNum) => {
              const dayObj = daysList.find((d) => d.day === dayNum);
              const isBooked = dayObj
                ? dayObj.booked_units > 0
                : bookedDates.includes(dayNum);
              const isBlocked = dayObj
                ? dayObj.blocked_units > 0 && dayObj.booked_units === 0
                : blockedDates.includes(dayNum);
              const isFullyBooked = dayObj?.is_fully_booked || false;
              const isPartiallyBooked = dayObj?.status === 'PARTIALLY_BOOKED';
              const isPartiallyBlocked = dayObj?.status === 'PARTIALLY_BLOCKED';
              const isSelected = selectedDayNum === dayNum;
              const isToday = todayDateNum === dayNum;

              // Color styles
              let cellStyle = 'bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-800 hover:border-teal-400 hover:shadow-xs';
              if (isFullyBooked || (isBooked && !isPartiallyBooked)) {
                cellStyle = 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/40 font-bold shadow-xs';
              } else if (isPartiallyBooked) {
                cellStyle = 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-bold';
              } else if (isBlocked || isPartiallyBlocked) {
                cellStyle = 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40 font-bold shadow-xs';
              }

              if (isSelected) {
                cellStyle = 'ring-2 ring-[#087F8C] ring-offset-2 dark:ring-offset-[#0F273D] font-black ' + cellStyle;
              }

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => setSelectedDayNum(selectedDayNum === dayNum ? null : dayNum)}
                  className={`h-11 sm:h-13 w-full rounded-2xl text-xs sm:text-sm font-semibold flex flex-col items-center justify-between p-1.5 transition-all relative border cursor-pointer ${cellStyle}`}
                >
                  <div className="w-full flex items-center justify-between">
                    <span className={`text-xs ${isToday ? 'px-1.5 py-0.5 rounded-md bg-[#087F8C] text-white font-bold text-[10px]' : ''}`}>
                      {dayNum}
                    </span>
                    {dayObj && dayObj.total_units > 0 && (
                      <span className="text-[9px] font-sans font-medium text-slate-400 opacity-80 hidden sm:inline">
                        {dayObj.available_units}/{dayObj.total_units}
                      </span>
                    )}
                  </div>

                  {/* Dot Indicators */}
                  <div className="flex items-center space-x-1 pb-0.5">
                    {isBooked && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isFullyBooked ? 'bg-orange-600' : 'bg-orange-500'
                        }`}
                        title={
                          dayObj
                            ? `${dayObj.booked_units} unit(s) booked`
                            : 'Booked'
                        }
                      />
                    )}
                    {isBlocked && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-rose-500"
                        title={
                          dayObj?.closures?.length
                            ? dayObj.closures[0].reason
                            : 'Blocked'
                        }
                      />
                    )}
                    {!isBooked && !isBlocked && (
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700 opacity-40" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Mini Legend */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#35A66F]"></span>
          <span>Available ({summary?.available_days || 0} Days)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
          <span>
            {summary?.booked_days_count > 0
              ? `${summary.booked_days_count} Booked Days`
              : '0 Booked Days'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          <span>
            {summary?.blocked_days_count > 0
              ? `${summary.blocked_days_count} Blocked Days`
              : '0 Blocked Days'}
          </span>
        </div>
      </div>

      {/* 5. Date-Detail Drilldown Panel (Requirements 23 - 30) */}
      {selectedDayData && (
        <div className="mt-6 bg-[#FFFDF7] dark:bg-[#091B29] border border-[#087F8C]/30 rounded-3xl p-5 sm:p-7 space-y-6 shadow-md transition-all animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded-full bg-[#087F8C]/10 text-[#087F8C] dark:text-[#27B7A8] text-xs font-bold">
                  {currentMonth} {selectedDayData.day}, {currentYear}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    selectedDayData.status === 'BOOKED'
                      ? 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30'
                      : selectedDayData.status === 'PARTIALLY_BOOKED'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                      : selectedDayData.status === 'BLOCKED' || selectedDayData.status === 'PARTIALLY_BLOCKED'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {selectedDayData.status.replace('_', ' ')}
                </span>
              </div>
              <h4 className="text-base sm:text-lg font-serif font-bold text-[#091B29] dark:text-white">
                {calendarData?.property_name || propertyName}
              </h4>
            </div>

            <button
              type="button"
              onClick={() => setSelectedDayNum(null)}
              className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              title="Close Date Details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 4 Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Active Bookings
              </span>
              <p className="text-xl font-serif font-black text-[#091B29] dark:text-white mt-0.5">
                {selectedDayData.booking_count}
              </p>
            </div>
            <div className="p-3.5 bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Booked Units
              </span>
              <p className="text-xl font-serif font-black text-orange-600 dark:text-orange-400 mt-0.5">
                {selectedDayData.booked_units}
              </p>
            </div>
            <div className="p-3.5 bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Available Units
              </span>
              <p className="text-xl font-serif font-black text-[#35A66F] mt-0.5">
                {selectedDayData.available_units}
              </p>
            </div>
            <div className="p-3.5 bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Inventory
              </span>
              <p className="text-xl font-serif font-black text-slate-700 dark:text-slate-300 mt-0.5">
                {selectedDayData.total_units} Units
              </p>
            </div>
          </div>

          {/* Traveler Bookings List */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-2">
              <User className="w-3.5 h-3.5 text-[#087F8C]" />
              <span>Traveler Bookings ({selectedDayData.bookings?.length || 0})</span>
            </h5>

            {(!selectedDayData.bookings || selectedDayData.bookings.length === 0) ? (
              <div className="p-4 bg-white/60 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400 italic">
                No traveler bookings active for this date.
              </div>
            ) : (
              <div className="space-y-2.5">
                {(selectedDayData.bookings || []).map((b, idx) => (
                  <div
                    key={`${b.booking_number}-${idx}`}
                    className="p-4 bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-[#087F8C] dark:text-[#27B7A8]">
                          #{b.booking_number}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold text-[10px]">
                          {b.status}
                        </span>
                      </div>
                      <p className="font-bold text-[#091B29] dark:text-white">
                        Guest: {b.customer_name}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                        {b.room_name} • <strong className="text-slate-700 dark:text-slate-300">{b.quantity} unit(s)</strong>
                      </p>
                    </div>

                    <div className="text-right sm:text-right text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 shrink-0">
                      <span className="block font-medium">
                        Check-in: <strong className="text-slate-700 dark:text-slate-300">{b.check_in}</strong>
                      </span>
                      <span className="block font-medium">
                        Check-out: <strong className="text-slate-700 dark:text-slate-300">{b.check_out}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Room-by-Room Inventory Breakdown */}
          {selectedDayData.room_inventory && selectedDayData.room_inventory.length > 0 && (
            <div className="space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                <BedDouble className="w-3.5 h-3.5 text-[#087F8C]" />
                <span>Room Inventory Breakdown</span>
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(selectedDayData.room_inventory || []).map((r) => (
                  <div
                    key={r.room_id}
                    className="p-3.5 bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#091B29] dark:text-white">
                        {r.room_name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {r.room_type}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{r.total_units}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-orange-500 block">Booked</span>
                        <span className="font-bold text-orange-600 dark:text-orange-400">{r.booked_units}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#35A66F] block">Available</span>
                        <span className="font-bold text-[#35A66F]">{r.available_units}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blackouts / Closures Section */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-2">
              <DoorClosed className="w-3.5 h-3.5 text-rose-500" />
              <span>Blackouts & Closures</span>
            </h5>

            {(!selectedDayData.closures || selectedDayData.closures.length === 0) &&
            (!selectedDayData.room_blocks || selectedDayData.room_blocks.length === 0) ? (
              <div className="p-3.5 bg-white/60 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400 italic">
                None. No property closures or room unit blackouts for this date.
              </div>
            ) : (
              <div className="space-y-2">
                {(selectedDayData.closures || []).map((c) => (
                  <div
                    key={`closure-${c.id}`}
                    className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl text-xs text-rose-900 dark:text-rose-200 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold block">Whole Property Closure</span>
                      <span className="text-[11px] opacity-80">{c.reason} ({c.start_date} ➔ {c.end_date})</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white font-bold text-[10px]">
                      BLOCKED
                    </span>
                  </div>
                ))}
                {selectedDayData.room_blocks.map((rb) => (
                  <div
                    key={`block-${rb.id}`}
                    className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold block">Room Block: {rb.room_name}</span>
                      <span className="text-[11px] opacity-80">{rb.reason} ({rb.start_date} ➔ {rb.end_date})</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-bold text-[10px]">
                      BLOCKED
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Empty State Clean Message */}
          {selectedDayData.bookings.length === 0 &&
            selectedDayData.closures.length === 0 &&
            selectedDayData.room_blocks.length === 0 && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  No bookings or blackouts for this date. All {selectedDayData.total_units} room units are open and available for traveler reservations.
                </span>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default CalendarWidget;
