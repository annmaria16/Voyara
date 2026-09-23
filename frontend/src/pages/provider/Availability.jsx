import React, { useState, useEffect } from 'react';
import { providerApi } from '../../api/provider';
import { CalendarWidget } from '../../components/dashboard/CalendarWidget';
import {
  Calendar,
  Lock,
  Unlock,
  AlertCircle,
  PlusCircle,
  Trash2,
  Home,
  Layers,
  ShieldCheck,
  CalendarDays,
  Info,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export const ProviderAvailability = () => {
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [calendarData, setCalendarData] = useState(null);
  const [closuresData, setClosuresData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calLoading, setCalLoading] = useState(false);

  // Month navigation state
  const now = new Date();
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.toLocaleString('default', { month: 'long' }));
  const [calendarMonthNum, setCalendarMonthNum] = useState(now.getMonth() + 1);

  // Closure Form State
  const [closureStartDate, setClosureStartDate] = useState('');
  const [closureEndDate, setClosureEndDate] = useState('');
  const [closureReason, setClosureReason] = useState('Property seasonal closure');

  // Room Block State
  const [blockRoomId, setBlockRoomId] = useState('');
  const [blockStartDate, setBlockStartDate] = useState('');
  const [blockEndDate, setBlockEndDate] = useState('');
  const [blockReason, setBlockReason] = useState('Room maintenance');

  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const data = await providerApi.getProperties();
      setProperties(Array.isArray(data) ? data : []);
      if (data.length > 0) {
        setSelectedPropertyId(data[0].id);
        fetchCalendarAndRooms(data[0].id, calendarYear, calendarMonthNum);
      }
    } catch (err) {
      setError(err.message || 'Failed to load properties.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarAndRooms = async (propId, year, monthNum) => {
    if (!propId) return;
    setCalLoading(true);
    try {
      const [cal, avail, roomList] = await Promise.all([
        providerApi.getPropertyCalendar(propId, {
          year: year || calendarYear,
          month: monthNum || calendarMonthNum,
        }),
        providerApi.getAvailability(propId),
        providerApi.getPropertyRooms(propId),
      ]);
      setCalendarData(cal);
      setClosuresData(avail);
      setRooms(Array.isArray(roomList) ? roomList : []);
      if (roomList.length > 0 && !blockRoomId) {
        setBlockRoomId(roomList[0].id);
      }
    } catch (err) {
      console.error('Error fetching calendar:', err);
    } finally {
      setCalLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handlePropertyChange = (propId) => {
    setSelectedPropertyId(propId);
    fetchCalendarAndRooms(propId, calendarYear, calendarMonthNum);
  };

  const handleMonthChange = (newMonth, newYear, newMonthIdx) => {
    setCalendarMonth(newMonth);
    setCalendarYear(newYear);
    setCalendarMonthNum(newMonthIdx);
    if (selectedPropertyId) {
      fetchCalendarAndRooms(selectedPropertyId, newYear, newMonthIdx);
    }
  };

  const handleCloseProperty = async (e) => {
    e.preventDefault();
    if (!closureStartDate || !closureEndDate) return;
    setActionLoading(true);
    setError('');
    try {
      await providerApi.closePropertyDates(selectedPropertyId, {
        start_date: closureStartDate,
        end_date: closureEndDate,
        reason: closureReason,
      });
      setClosureStartDate('');
      setClosureEndDate('');
      fetchCalendarAndRooms(selectedPropertyId, calendarYear, calendarMonthNum);
    } catch (err) {
      setError(err.message || 'Failed to close property dates.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockRoom = async (e) => {
    e.preventDefault();
    if (!blockStartDate || !blockEndDate || !blockRoomId) return;
    setActionLoading(true);
    setError('');
    try {
      await providerApi.blockRoomDates({
        room_id: parseInt(blockRoomId, 10),
        start_date: blockStartDate,
        end_date: blockEndDate,
        reason: blockReason,
      });
      setBlockStartDate('');
      setBlockEndDate('');
      fetchCalendarAndRooms(selectedPropertyId, calendarYear, calendarMonthNum);
    } catch (err) {
      setError(err.message || 'Failed to block room dates.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveClosure = async (closureId) => {
    try {
      await providerApi.removePropertyClosure(closureId);
      fetchCalendarAndRooms(selectedPropertyId, calendarYear, calendarMonthNum);
    } catch (err) {
      alert(err.message || 'Failed to remove closure.');
    }
  };

  const handleRemoveRoomBlock = async (blockId) => {
    try {
      await providerApi.removeRoomBlock(blockId);
      fetchCalendarAndRooms(selectedPropertyId, calendarYear, calendarMonthNum);
    } catch (err) {
      alert(err.message || 'Failed to unblock room.');
    }
  };

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#091B29] dark:text-white tracking-tight">
            Calendar & Blackouts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-light">
            Enforce property seasonal closures, room unit blackouts, and inspect real-time traveler occupancy.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Property Selector Bar */}
      {properties.length > 0 && (
        <div className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3 shadow-xs flex items-center space-x-3 overflow-x-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap pl-2">
            Selected Property:
          </span>
          <div className="flex items-center space-x-2">
            {properties.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePropertyChange(p.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedPropertyId === p.id
                    ? 'bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] text-white shadow-md shadow-teal-700/20 font-serif'
                    : 'bg-[#FFFDF7] dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Month Availability Calendar Widget for Selected Property */}
      {selectedPropertyId && (
        <div className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-3xl p-6 sm:p-8">
          <CalendarWidget
            propertyName={selectedProperty?.name || 'Property Calendar'}
            propertyId={selectedPropertyId}
            calendarData={calendarData}
            loading={calLoading}
            initialMonth={calendarMonth}
            initialYear={calendarYear}
            onMonthChange={handleMonthChange}
          />
        </div>
      )}

      {/* Grid of Two Dedicated Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Whole Property Closure Panel */}
        <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-[#091B29] dark:text-white">Property-Level Closures</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Close entire property for all rooms on chosen dates</p>
            </div>
          </div>

          <form onSubmit={handleCloseProperty} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">From Date</label>
                <input
                  type="date"
                  required
                  value={closureStartDate}
                  onChange={(e) => setClosureStartDate(e.target.value)}
                  className="w-full p-3 bg-[#FFFDF7] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-[#087F8C]"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">To Date</label>
                <input
                  type="date"
                  required
                  value={closureEndDate}
                  onChange={(e) => setClosureEndDate(e.target.value)}
                  className="w-full p-3 bg-[#FFFDF7] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-[#087F8C]"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Reason for Closure</label>
              <input
                type="text"
                placeholder="e.g. Monsoon Renovation, Private Buyout, Family Event"
                value={closureReason}
                onChange={(e) => setClosureReason(e.target.value)}
                className="w-full p-3 bg-[#FFFDF7] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-[#087F8C]"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-2xl shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? 'Scheduling...' : 'Apply Property Closure'}
            </button>
          </form>

          {/* Active Closures List */}
          <div className="space-y-3 pt-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Active Closures ({closuresData?.closures?.length || 0})
            </span>
            {closuresData?.closures?.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No scheduled closures. Property is open for booking.</p>
            ) : (
              closuresData?.closures?.map((cl) => (
                <div
                  key={cl.id}
                  className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-2xl flex items-center justify-between text-xs text-rose-900 dark:text-rose-200"
                >
                  <div>
                    <span className="font-bold block">{cl.start_date} ➔ {cl.end_date}</span>
                    <span className="text-[11px] opacity-80">{cl.reason}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveClosure(cl.id)}
                    className="p-1.5 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900/40 rounded-xl cursor-pointer"
                    title="Remove Closure"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Room-Level Blackout Panel */}
        <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#087F8C]/10 text-[#087F8C] dark:text-[#27B7A8] flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-[#091B29] dark:text-white">Room Unit Blackouts</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Block a specific room unit without closing entire property</p>
            </div>
          </div>

          <form onSubmit={handleBlockRoom} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Select Room Category</label>
              <select
                value={blockRoomId}
                onChange={(e) => setBlockRoomId(e.target.value)}
                className="w-full p-3 bg-[#FFFDF7] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-[#087F8C] cursor-pointer"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id} className="dark:bg-slate-900 text-slate-900 dark:text-white">
                    {r.name} ({r.room_type}) — {r.quantity} unit(s)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">From Date</label>
                <input
                  type="date"
                  required
                  value={blockStartDate}
                  onChange={(e) => setBlockStartDate(e.target.value)}
                  className="w-full p-3 bg-[#FFFDF7] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-[#087F8C]"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">To Date</label>
                <input
                  type="date"
                  required
                  value={blockEndDate}
                  onChange={(e) => setBlockEndDate(e.target.value)}
                  className="w-full p-3 bg-[#FFFDF7] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-[#087F8C]"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Reason for Block</label>
              <input
                type="text"
                placeholder="e.g. VIP Hold, Deep Cleaning, Maintenance"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full p-3 bg-[#FFFDF7] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-[#087F8C]"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading || rooms.length === 0}
              className="w-full py-3 bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] hover:from-[#0F9D9A] hover:to-[#27B7A8] text-white font-bold rounded-2xl shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? 'Blocking...' : 'Block Room Unit Dates'}
            </button>
          </form>

          {/* Active Room Blocks */}
          <div className="space-y-3 pt-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Active Room Blocks ({closuresData?.room_blocks?.length || 0})
            </span>
            {closuresData?.room_blocks?.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No room unit blackouts configured.</p>
            ) : (
              closuresData?.room_blocks?.map((rb) => (
                <div
                  key={rb.id}
                  className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200"
                >
                  <div>
                    <span className="font-bold block">{rb.start_date} ➔ {rb.end_date}</span>
                    <span className="text-[11px] opacity-80">{rb.reason}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveRoomBlock(rb.id)}
                    className="p-1.5 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/40 rounded-xl cursor-pointer"
                    title="Remove Block"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderAvailability;
