import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export const CalendarWidget = ({
  bookedDates = [],
  blockedDates = [],
  initialMonth = new Date().toLocaleString('default', { month: 'long' }),
  initialYear = new Date().getFullYear(),
  onMonthChange,
}) => {
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [currentYear, setCurrentYear] = useState(initialYear);
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handlePrevMonth = () => {
    const idx = months.indexOf(currentMonth);
    let newMonth, newYear;
    if (idx === 0) {
      newMonth = months[11];
      newYear = currentYear - 1;
    } else {
      newMonth = months[idx - 1];
      newYear = currentYear;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    if (onMonthChange) onMonthChange(newMonth, newYear);
  };

  const handleNextMonth = () => {
    const idx = months.indexOf(currentMonth);
    let newMonth, newYear;
    if (idx === 11) {
      newMonth = months[0];
      newYear = currentYear + 1;
    } else {
      newMonth = months[idx + 1];
      newYear = currentYear;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    if (onMonthChange) onMonthChange(newMonth, newYear);
  };

  const monthIndex = months.indexOf(currentMonth);
  const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, monthIndex, 1).getDay(); // 0 = Sun

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="w-full select-none">
      {/* Month & Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="w-4 h-4 text-[#F97360]" />
          <span className="text-sm font-bold text-[#102A43] dark:text-white font-sans">
            Availability Overview — {currentMonth} {currentYear}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {daysOfWeek.map((day) => (
          <div key={day} className="text-[10px] font-bold uppercase text-slate-400">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {/* Empty padding cells for first day */}
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="h-7 w-7 mx-auto" />
        ))}

        {daysArray.map((day) => {
          const isBooked = bookedDates.includes(day);
          const isBlocked = blockedDates.includes(day);
          const isSelected = selectedDay === day;

          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={`h-7 w-7 mx-auto rounded-lg text-xs font-semibold flex items-center justify-center transition-all relative cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-r from-[#F97360] to-orange-500 text-white shadow-xs scale-105 font-bold'
                  : isBooked
                  ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 font-bold'
                  : isBlocked
                  ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30 font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {day}
              {isBooked && !isSelected && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-orange-500"></span>
              )}
              {isBlocked && !isSelected && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-rose-500"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mini Legend */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Available</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-[#F97360]"></span>
          <span>{bookedDates.length > 0 ? `${bookedDates.length} Booked Days` : 'Booked'}</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          <span>{blockedDates.length > 0 ? `${blockedDates.length} Blocked Days` : 'Blocked'}</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarWidget;
