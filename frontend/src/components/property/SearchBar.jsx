import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Calendar, Users, Home } from 'lucide-react';

export const SearchBar = ({ initialValues = {}, onSearch, compact = false }) => {
  const [destination, setDestination] = useState(initialValues.destination || '');
  const [checkIn, setCheckIn] = useState(initialValues.check_in || '');
  const [checkOut, setCheckOut] = useState(initialValues.check_out || '');
  const [guests, setGuests] = useState(initialValues.guests || '1');
  const [propertyType, setPropertyType] = useState(initialValues.property_type || 'All');

  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (destination.trim()) params.append('destination', destination.trim());
    if (checkIn) params.append('check_in', checkIn);
    if (checkOut) params.append('check_out', checkOut);
    if (guests && guests !== '1') params.append('guests', guests);
    if (propertyType && propertyType !== 'All') params.append('property_type', propertyType);

    if (onSearch) {
      onSearch({
        destination: destination.trim(),
        check_in: checkIn,
        check_out: checkOut,
        guests: parseInt(guests, 10),
        property_type: propertyType,
      });
    } else {
      navigate(`/search?${params.toString()}`);
    }
  };

  return (
    <form
      onSubmit={handleSearchSubmit}
      className={`w-full rounded-2xl md:rounded-full bg-white/95 dark:bg-[#131D2E]/95 backdrop-blur-md shadow-2xl border border-[#4FD1C5]/30 dark:border-slate-800 p-2.5 sm:p-3.5 transition-all ${
        compact ? 'max-w-4xl' : 'max-w-5xl'
      }`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        {/* Destination */}
        <div className="lg:col-span-4 flex items-center px-4 py-2 bg-[#FFF8F0]/70 dark:bg-slate-900/70 rounded-xl lg:rounded-full border border-[#FDBA9A]/30 dark:border-slate-700/60 hover:border-orange-500/50 dark:hover:border-orange-500/50 transition-colors">
          <MapPin className="w-5 h-5 text-orange-500 shrink-0 mr-3" />
          <div className="w-full">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Destination</label>
            <input
              type="text"
              placeholder="Where are you going? (e.g. Munnar, Goa)"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Check-In */}
        <div className="lg:col-span-2 flex items-center px-4 py-2 bg-[#FFF8F0]/70 dark:bg-slate-900/70 rounded-xl lg:rounded-full border border-[#FDBA9A]/30 dark:border-slate-700/60 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-colors">
          <Calendar className="w-4 h-4 text-emerald-500 shrink-0 mr-2.5" />
          <div className="w-full">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Check-in</label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full bg-transparent text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>
        </div>

        {/* Check-Out */}
        <div className="lg:col-span-2 flex items-center px-4 py-2 bg-[#FFF8F0]/70 dark:bg-slate-900/70 rounded-xl lg:rounded-full border border-[#FDBA9A]/30 dark:border-slate-700/60 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-colors">
          <Calendar className="w-4 h-4 text-emerald-500 shrink-0 mr-2.5" />
          <div className="w-full">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Check-out</label>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full bg-transparent text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>
        </div>

        {/* Guests & Property Type */}
        <div className="lg:col-span-2 flex items-center px-3 py-2 bg-[#FFF8F0]/70 dark:bg-slate-900/70 rounded-xl lg:rounded-full border border-[#FDBA9A]/30 dark:border-slate-700/60 hover:border-orange-500/50 dark:hover:border-orange-500/50 transition-colors">
          <Users className="w-4 h-4 text-orange-500 shrink-0 mr-2" />
          <div className="w-full">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Guests</label>
            <select
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              className="w-full bg-transparent text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden cursor-pointer dark:bg-[#131D2E]"
            >
              <option value="1" className="dark:bg-slate-900 text-slate-900 dark:text-white">1 Guest</option>
              <option value="2" className="dark:bg-slate-900 text-slate-900 dark:text-white">2 Guests</option>
              <option value="3" className="dark:bg-slate-900 text-slate-900 dark:text-white">3 Guests</option>
              <option value="4" className="dark:bg-slate-900 text-slate-900 dark:text-white">4+ Guests</option>
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <div className="lg:col-span-2">
          <button
            type="submit"
            className="w-full h-full py-3 px-5 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl lg:rounded-full shadow-lg hover:shadow-orange-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer group"
          >
            <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-sm">Search</span>
          </button>
        </div>
      </div>
    </form>
  );
};
