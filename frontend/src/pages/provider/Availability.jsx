import React, { useState, useEffect } from 'react';
import { providerApi } from '../../api/provider';
import { Calendar, Lock, Unlock, AlertCircle, PlusCircle, Trash2, Home, Layers } from 'lucide-react';

export const ProviderAvailability = () => {
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);

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
      setProperties(data);
      if (data.length > 0) {
        setSelectedPropertyId(data[0].id);
        fetchCalendarAndRooms(data[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load properties.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarAndRooms = async (propId) => {
    try {
      const [cal, roomList] = await Promise.all([
        providerApi.getAvailability(propId),
        providerApi.getPropertyRooms(propId),
      ]);
      setCalendarData(cal);
      setRooms(roomList);
      if (roomList.length > 0) {
        setBlockRoomId(roomList[0].id);
      }
    } catch (err) {
      console.error('Error fetching calendar:', err);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handlePropertyChange = (propId) => {
    setSelectedPropertyId(propId);
    fetchCalendarAndRooms(propId);
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
      fetchCalendarAndRooms(selectedPropertyId);
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
      fetchCalendarAndRooms(selectedPropertyId);
    } catch (err) {
      setError(err.message || 'Failed to block room dates.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveClosure = async (closureId) => {
    try {
      await providerApi.removePropertyClosure(closureId);
      fetchCalendarAndRooms(selectedPropertyId);
    } catch (err) {
      alert(err.message || 'Failed to remove closure.');
    }
  };

  const handleRemoveRoomBlock = async (blockId) => {
    try {
      await providerApi.removeRoomBlock(blockId);
      fetchCalendarAndRooms(selectedPropertyId);
    } catch (err) {
      alert(err.message || 'Failed to unblock room.');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black font-serif text-slate-900 dark:text-white">Blackouts & Calendar</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Enforce property closures and room date blackouts strictly checked by the backend.
        </p>
      </div>


      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {properties.length > 0 && (
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 mr-2">
            Selected Property:
          </span>
          {properties.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePropertyChange(p.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedPropertyId === p.id
                  ? 'bg-gradient-to-r from-[#F97360] to-orange-500 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-orange-500/10 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Whole Property Closure Panel */}
        <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-6 sm:p-8 border border-[#FDBA9A]/30 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center space-x-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Home className="w-5 h-5 text-orange-500" />
            <div>
              <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white">Property-Level Closures</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Close entire property for all rooms on chosen dates</p>
            </div>
          </div>

          <form onSubmit={handleCloseProperty} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">From Date</label>
                <input
                  type="date"
                  required
                  value={closureStartDate}
                  onChange={(e) => setClosureStartDate(e.target.value)}
                  className="w-full p-2 bg-[#FFF8F0]/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">To Date</label>
                <input
                  type="date"
                  required
                  value={closureEndDate}
                  onChange={(e) => setClosureEndDate(e.target.value)}
                  className="w-full p-2 bg-[#FFF8F0]/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Reason for Closure</label>
              <input
                type="text"
                placeholder="e.g. Monsoon Renovation, Private Event"
                value={closureReason}
                onChange={(e) => setClosureReason(e.target.value)}
                className="w-full p-2 bg-[#FFF8F0]/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-2.5 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              Block Property Dates
            </button>
          </form>

          {/* Active Closures List */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Active Closures ({calendarData?.closures?.length || 0})
            </span>
            {calendarData?.closures?.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No scheduled closures. Property is fully open.</p>
            ) : (
              calendarData?.closures?.map((cl) => (
                <div
                  key={cl.id}
                  className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-2xl flex items-center justify-between text-xs text-rose-900 dark:text-rose-200"
                >
                  <div>
                    <span className="font-bold block">{cl.start_date} to {cl.end_date}</span>
                    <span className="text-[11px] opacity-80">{cl.reason}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveClosure(cl.id)}
                    className="p-1 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900/40 rounded-lg cursor-pointer"
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
        <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-6 sm:p-8 border border-[#FDBA9A]/30 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center space-x-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Layers className="w-5 h-5 text-emerald-500" />
            <div>
              <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white">Room Unit Blackouts</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Block a specific room without closing the whole property</p>
            </div>
          </div>

          <form onSubmit={handleBlockRoom} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Select Room</label>
              <select
                value={blockRoomId}
                onChange={(e) => setBlockRoomId(e.target.value)}
                className="w-full p-2 bg-[#FFF8F0]/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id} className="dark:bg-slate-900 text-slate-900 dark:text-white">
                    {r.name} ({r.room_type})
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
                  className="w-full p-2 bg-[#FFF8F0]/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">To Date</label>
                <input
                  type="date"
                  required
                  value={blockEndDate}
                  onChange={(e) => setBlockEndDate(e.target.value)}
                  className="w-full p-2 bg-[#FFF8F0]/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Reason for Block</label>
              <input
                type="text"
                placeholder="e.g. VIP Hold, Maintenance"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full p-2 bg-[#FFF8F0]/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading || rooms.length === 0}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              Block Room Dates
            </button>
          </form>

          {/* Active Room Blocks */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Active Room Blocks ({calendarData?.room_blocks?.length || 0})
            </span>
            {calendarData?.room_blocks?.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No room blackouts configured.</p>
            ) : (
              calendarData?.room_blocks?.map((rb) => (
                <div
                  key={rb.id}
                  className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200"
                >
                  <div>
                    <span className="font-bold block">{rb.start_date} to {rb.end_date}</span>
                    <span className="text-[11px] opacity-80">{rb.reason}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveRoomBlock(rb.id)}
                    className="p-1 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/40 rounded-lg cursor-pointer"
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
