import React, { useState } from 'react';
import {
  MapPin,
  Calendar,
  Users,
  Sliders,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Search,
  Check,
  Building,
  Bed,
  DollarSign,
  HeartHandshake,
  Star
} from 'lucide-react';
import VoyaraRobotAvatar from './VoyaraRobotAvatar';

export const GuidedBookingStepper = ({ onComplete, onSkip, className = '' }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [childAges, setChildAges] = useState([]);
  const [roomsCount, setRoomsCount] = useState(1);
  const [togetherPreference, setTogetherPreference] = useState('together');
  const [roomType, setRoomType] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [budgetType, setBudgetType] = useState('TOTAL');
  const [selectedAmenities, setSelectedAmenities] = useState([]);

  // Popular destination presets with photos matching Reference Design 1
  const popularDestinations = [
    {
      name: 'Goa',
      state: 'Goa',
      tag: 'Beach & Relaxation',
      image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Manali',
      state: 'Himachal Pradesh',
      tag: 'Mountains & Adventure',
      image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Munnar',
      state: 'Kerala',
      tag: 'Tea Hills & Nature',
      image: 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Jaipur',
      state: 'Rajasthan',
      tag: 'Heritage & History',
      image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Udaipur',
      state: 'Rajasthan',
      tag: 'Lakes & Palaces',
      image: 'https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Wayanad',
      state: 'Kerala',
      tag: 'Rainforest & Treehouses',
      image: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=600&auto=format&fit=crop&q=80'
    }
  ];

  const toggleAmenity = (amenity) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const handleNext = () => {
    if (currentStep === 1 && !destination) {
      alert('Please enter or select a destination');
      return;
    }
    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Assemble structured natural language prompt and structured context for Voyara AI
      let promptParts = [`Book a stay in ${destination}`];
      if (roomType) promptParts.push(`for a ${roomType}`);
      if (adults) promptParts.push(`for ${adults} adult${adults > 1 ? 's' : ''}`);
      if (children > 0) {
        promptParts.push(`and ${children} child${children > 1 ? 'ren' : ''}`);
        if (childAges.length > 0) {
          promptParts.push(`aged ${childAges.join(', ')}`);
        }
      }
      if (checkIn && checkOut) {
        promptParts.push(`from ${checkIn} to ${checkOut}`);
      }
      if (budgetMax) {
        promptParts.push(`under ₹${budgetMax}${budgetType === 'PER_NIGHT' ? ' per night' : ''}`);
      }
      if (selectedAmenities.length > 0) {
        promptParts.push(`with ${selectedAmenities.join(', ')}`);
      }
      if (togetherPreference === 'separate') {
        promptParts.push(`with separate rooms`);
      } else if (togetherPreference === 'together') {
        promptParts.push(`with everyone together in one room`);
      }

      const naturalLanguageMessage = promptParts.join(' ') + '.';

      const contextData = {
        destination,
        check_in: checkIn || null,
        check_out: checkOut || null,
        adults: Number(adults) || 2,
        children: Number(children) || 0,
        child_ages: childAges,
        requested_rooms_count: roomsCount,
        together_preference: togetherPreference,
        room_type: roomType || null,
        budget_max: budgetMax ? Number(budgetMax) : null,
        budget_type: budgetType,
        amenities: selectedAmenities
      };

      if (onComplete) {
        onComplete(naturalLanguageMessage, contextData);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

  return (
    <div className={`bg-white dark:bg-[#0E273C] border border-[#E0ECEF] dark:border-white/10 rounded-3xl p-5 sm:p-7 shadow-lg relative overflow-hidden ${className}`}>
      
      {/* Top Banner with AI Assistant Avatar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-white/10">
        <div className="flex items-center space-x-3.5">
          <VoyaraRobotAvatar size={48} animate={true} />
          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#087F8C]" />
              <h2 className="text-base sm:text-lg font-extrabold text-[#17324D] dark:text-white tracking-tight">
                AI Booking Assistant
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Let's plan your perfect trip, step by step.
            </p>
          </div>
        </div>

        {/* Speech Bubble from Reference Design */}
        <div className="hidden sm:flex items-center space-x-2 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-[#087F8C] dark:text-teal-300 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-xs">
          <span>I'm here to help! ✨</span>
        </div>
      </div>

      {/* Main Grid: Left Vertical Stepper + Right Interactive Step Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6">
        
        {/* Left Vertical Stepper (Reference Design 1) */}
        <div className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-white/10 pb-4 lg:pb-0 lg:pr-4 space-y-3">
          {[
            { num: 1, label: 'Destination', sub: 'Where to go' },
            { num: 2, label: 'Dates', sub: 'Check-in & out' },
            { num: 3, label: 'Guests & Rooms', sub: 'Adults & layout' },
            { num: 4, label: 'Preferences', sub: 'Budget & amenities' }
          ].map((s) => {
            const isActive = currentStep === s.num;
            const isDone = currentStep > s.num;
            return (
              <button
                key={s.num}
                onClick={() => setCurrentStep(s.num)}
                className={`w-full flex items-center space-x-3 p-2.5 rounded-2xl text-left transition ${
                  isActive
                    ? 'bg-teal-50 dark:bg-teal-950/50 text-[#087F8C] dark:text-teal-300 font-bold border border-teal-200/80 dark:border-teal-800/60 shadow-2xs'
                    : isDone
                    ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                    : 'text-slate-400 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition ${
                    isActive
                      ? 'bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] text-white shadow-xs'
                      : isDone
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : s.num}
                </div>
                <div className="min-w-0">
                  <div className="text-xs truncate">{s.label}</div>
                  <div className="text-[10px] text-slate-400 font-normal truncate">{s.sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Step Content */}
        <div className="lg:col-span-9 flex flex-col justify-between space-y-6 min-h-[360px]">
          
          {/* STEP 1: DESTINATION */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-[#17324D] dark:text-white">
                  Where would you like to go?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tell me your destination or choose from popular verified sanctuaries in India.
                </p>
              </div>

              {/* Search Bar Input */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Munnar, Goa, Manali, Udaipur, Jaipur..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl text-xs text-[#17324D] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#087F8C] transition shadow-2xs"
                />
              </div>

              {/* Popular Destinations Photo Cards Grid */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Popular Destinations
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {popularDestinations.map((dest) => (
                    <button
                      key={dest.name}
                      type="button"
                      onClick={() => setDestination(dest.name)}
                      className={`relative group rounded-2xl overflow-hidden text-left border transition-all h-28 flex flex-col justify-end p-2.5 ${
                        destination.toLowerCase() === dest.name.toLowerCase()
                          ? 'border-2 border-[#087F8C] ring-2 ring-teal-500/20 shadow-md scale-[1.02]'
                          : 'border-slate-200 dark:border-white/10 hover:border-[#087F8C] shadow-2xs'
                      }`}
                    >
                      <img
                        src={dest.image}
                        alt={dest.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="relative z-10">
                        <div className="text-white font-bold text-xs flex items-center space-x-1">
                          <span>📍</span>
                          <span>{dest.name}</span>
                        </div>
                        <div className="text-white/80 text-[10px] font-medium truncate">
                          {dest.tag}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DATES */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-[#17324D] dark:text-white">
                  When will you be traveling?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select your check-in and check-out dates for your stay in {destination || 'your destination'}.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#087F8C]" />
                    <span>Check-In Date</span>
                  </label>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-[#17324D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#087F8C]" />
                    <span>Check-Out Date</span>
                  </label>
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-[#17324D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Quick Date Presets
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Next Weekend (2 Nights)', days: 2 },
                    { label: 'Upcoming Week (5 Nights)', days: 5 },
                    { label: 'October Getaway (10-12 Oct)', cIn: '2026-10-10', cOut: '2026-10-12' }
                  ].map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => {
                        if (preset.cIn && preset.cOut) {
                          setCheckIn(preset.cIn);
                          setCheckOut(preset.cOut);
                        } else {
                          const today = new Date();
                          const nextSat = new Date();
                          nextSat.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7 || 7));
                          const nextSun = new Date(nextSat);
                          nextSun.setDate(nextSat.getDate() + preset.days);
                          setCheckIn(nextSat.toISOString().split('T')[0]);
                          setCheckOut(nextSun.toISOString().split('T')[0]);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#087F8C] transition"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: GUESTS & ROOM CONFIGURATION */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-[#17324D] dark:text-white">
                  Guests & Room Configuration
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Specify traveler party size and whether you prefer to stay together or in separate rooms.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Adults Counter */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 space-y-2">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200">Adults (12+ yrs)</div>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setAdults((prev) => Math.max(1, prev - 1))}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 font-bold text-sm"
                    >
                      -
                    </button>
                    <span className="font-bold text-sm text-[#17324D] dark:text-white">{adults}</span>
                    <button
                      type="button"
                      onClick={() => setAdults((prev) => prev + 1)}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 font-bold text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Children Counter */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 space-y-2">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200">Children (0-11 yrs)</div>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setChildren((prev) => {
                          const n = Math.max(0, prev - 1);
                          setChildAges((ages) => ages.slice(0, n));
                          return n;
                        });
                      }}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 font-bold text-sm"
                    >
                      -
                    </button>
                    <span className="font-bold text-sm text-[#17324D] dark:text-white">{children}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setChildren((prev) => {
                          const n = prev + 1;
                          setChildAges((ages) => [...ages, 6]);
                          return n;
                        });
                      }}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 font-bold text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Room Layout Preference */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 space-y-2">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200">Layout Choice</div>
                  <div className="flex rounded-lg bg-white dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setTogetherPreference('together')}
                      className={`flex-1 py-1 text-[10px] font-bold rounded-md transition ${
                        togetherPreference === 'together'
                          ? 'bg-[#087F8C] text-white'
                          : 'text-slate-500'
                      }`}
                    >
                      Together
                    </button>
                    <button
                      type="button"
                      onClick={() => setTogetherPreference('separate')}
                      className={`flex-1 py-1 text-[10px] font-bold rounded-md transition ${
                        togetherPreference === 'separate'
                          ? 'bg-[#087F8C] text-white'
                          : 'text-slate-500'
                      }`}
                    >
                      Separate
                    </button>
                  </div>
                </div>
              </div>

              {/* Child Ages inputs if children > 0 */}
              {children > 0 && (
                <div className="p-3 bg-teal-50/50 dark:bg-teal-950/30 rounded-xl border border-teal-200/60 dark:border-teal-800/40 space-y-2">
                  <div className="text-xs font-bold text-[#087F8C] dark:text-teal-300">
                    Specify Child Ages (for accurate child policies & free bed benefits):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: children }).map((_, idx) => (
                      <div key={idx} className="flex items-center space-x-1.5 text-xs">
                        <span className="text-slate-500 font-medium">Child {idx + 1}:</span>
                        <select
                          value={childAges[idx] ?? 6}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setChildAges((prev) => {
                              const next = [...prev];
                              next[idx] = val;
                              return next;
                            });
                          }}
                          className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-bold"
                        >
                          {Array.from({ length: 12 }).map((__, age) => (
                            <option key={age} value={age}>
                              {age} yrs
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: PREFERENCES & BUDGET */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-[#17324D] dark:text-white">
                  Preferences & Budget
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Set optional budget ceilings, preferred room types, or amenities.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Preferred Room Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                    <Bed className="w-3.5 h-3.5 text-[#087F8C]" />
                    <span>Preferred Room Type</span>
                  </label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-[#17324D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                  >
                    <option value="">Any verified room</option>
                    <option value="Deluxe Room">Deluxe Room</option>
                    <option value="Superior Room">Superior Room</option>
                    <option value="Family Suite">Family Suite</option>
                    <option value="Luxury Villa">Luxury Villa</option>
                    <option value="Standard Room">Standard Room</option>
                  </select>
                </div>

                {/* Maximum Budget */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-[#087F8C]" />
                    <span>Maximum Budget (₹)</span>
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(e.target.value)}
                      placeholder="e.g. 8000"
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-[#17324D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                    />
                    <select
                      value={budgetType}
                      onChange={(e) => setBudgetType(e.target.value)}
                      className="px-2.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-[#17324D] dark:text-white font-semibold"
                    >
                      <option value="TOTAL">Total</option>
                      <option value="PER_NIGHT">Per Night</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Popular Amenities
                </span>
                <div className="flex flex-wrap gap-2">
                  {['Swimming Pool', 'Free WiFi', 'Breakfast Included', 'Mountain View', 'Air Conditioning', 'Spa'].map((am) => {
                    const isSel = selectedAmenities.includes(am);
                    return (
                      <button
                        key={am}
                        type="button"
                        onClick={() => toggleAmenity(am)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition flex items-center space-x-1.5 ${
                          isSel
                            ? 'bg-teal-50 border-[#087F8C] text-[#087F8C] dark:bg-teal-950/60 dark:text-teal-300 font-bold'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {isSel && <Check className="w-3 h-3" />}
                        <span>{am}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons (Back / Skip / Next) */}
          <div className="pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center space-x-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onSkip}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Skip for now
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] hover:from-[#0F9D9A] hover:to-[#087F8C] text-white font-bold text-xs shadow-md hover:shadow-lg transition flex items-center space-x-2"
            >
              <span>{currentStep === 4 ? 'Search with Voyara AI' : 'Next'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default GuidedBookingStepper;
