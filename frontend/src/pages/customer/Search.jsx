import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { customerApi } from '../../api/customer';
import { PropertyCard } from '../../components/property/PropertyCard';
import { Search, Filter, MapPin, SlidersHorizontal, Compass, X, Sparkles, RefreshCw, ArrowRight } from 'lucide-react';

export const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Search state
  const [destination, setDestination] = useState(searchParams.get('destination') || '');
  const [checkIn, setCheckIn] = useState(searchParams.get('check_in') || '');
  const [checkOut, setCheckOut] = useState(searchParams.get('check_out') || '');
  const [guests, setGuests] = useState(searchParams.get('guests') || '1');
  const [propertyType, setPropertyType] = useState(searchParams.get('property_type') || 'All');
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [experience, setExperience] = useState(searchParams.get('experience') || '');

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const debounceTimer = useRef(null);

  const propertyTypes = ['All', 'Hotel', 'Homestay', 'Resort', 'Camp', 'Cottage', 'Villa'];
  const popularDestinations = [
    { label: '🌴 Munnar', query: 'Munnar' },
    { label: '🏖️ Goa', query: 'Goa' },
    { label: '🏔️ Manali', query: 'Manali' },
    { label: '🌿 Kerala', query: 'Kerala' },
    { label: '🏰 Luxury Villas', type: 'Villa' },
    { label: '🏊 Eco Resorts', type: 'Resort' },
  ];

  const allAmenities = [
    'Wi-Fi',
    'Swimming Pool',
    'Breakfast',
    'Mountain View',
    'Beach Access',
    'Campfire',
    'Restaurant',
    'Parking',
    'Air Conditioning',
    'Pet Friendly',
    'Outdoor Activities',
  ];

  const fetchProperties = async (searchDest = destination) => {
    setLoading(true);
    try {
      const params = {};
      if (searchDest.trim()) params.destination = searchDest.trim();
      if (checkIn) params.check_in = checkIn;
      if (checkOut) params.check_out = checkOut;
      if (guests && guests !== '1') params.guests = parseInt(guests, 10);
      if (propertyType && propertyType !== 'All') params.property_type = propertyType;
      if (minPrice) params.min_price = parseFloat(minPrice);
      if (maxPrice) params.max_price = parseFloat(maxPrice);
      if (selectedAmenities.length > 0) params.amenities = selectedAmenities;
      if (experience.trim()) params.experience = experience.trim();

      const results = await customerApi.searchProperties(params);
      setProperties(Array.isArray(results) ? results : []);
    } catch (err) {
      console.error('Search error:', err);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  // Sync state when URL params change
  useEffect(() => {
    const urlDest = searchParams.get('destination') || '';
    setDestination(urlDest);
    fetchProperties(urlDest);
  }, [searchParams]);

  // Handle live search as user types
  const handleDestinationChange = (val) => {
    setDestination(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      const newParams = Object.fromEntries(searchParams.entries());
      if (val.trim()) {
        newParams.destination = val.trim();
      } else {
        delete newParams.destination;
      }
      setSearchParams(newParams);
    }, 350);
  };

  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    const newParams = {};
    if (destination.trim()) newParams.destination = destination.trim();
    if (checkIn) newParams.check_in = checkIn;
    if (checkOut) newParams.check_out = checkOut;
    if (guests && guests !== '1') newParams.guests = guests;
    if (propertyType && propertyType !== 'All') newParams.property_type = propertyType;
    if (minPrice) newParams.min_price = minPrice;
    if (maxPrice) newParams.max_price = maxPrice;
    if (experience.trim()) newParams.experience = experience.trim();

    setSearchParams(newParams);
    setMobileFilterOpen(false);
  };

  const handleAmenityToggle = (amenity) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const resetFilters = () => {
    setDestination('');
    setCheckIn('');
    setCheckOut('');
    setGuests('1');
    setPropertyType('All');
    setMinPrice('');
    setMaxPrice('');
    setSelectedAmenities([]);
    setExperience('');
    setSearchParams({});
  };

  const selectQuickChip = (chip) => {
    const newParams = {};
    if (chip.query) {
      setDestination(chip.query);
      newParams.destination = chip.query;
    }
    if (chip.type) {
      setPropertyType(chip.type);
      newParams.property_type = chip.type;
    }
    setSearchParams(newParams);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/15 dark:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#F97360]" />
            <span>VeriNova Verified Sanctuaries</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-serif text-[#102A43] dark:text-white tracking-tight">
            {destination ? `Stays matching "${destination}"` : 'Explore Stays & Sanctuaries'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium">
            Real-time availability database • {properties.length} handpicked properties across hill stations & coastal retreats
          </p>
        </div>

        <button
          onClick={() => setMobileFilterOpen(true)}
          className="lg:hidden inline-flex items-center space-x-2 px-4 py-2.5 bg-white dark:bg-[#131D2E] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-[#102A43] dark:text-white shadow-xs cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4 text-[#F97360]" />
          <span>Filters ({selectedAmenities.length + (propertyType !== 'All' ? 1 : 0)})</span>
        </button>
      </div>

      {/* Popular Destination Quick Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 shrink-0">
          Popular:
        </span>
        {popularDestinations.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => selectQuickChip(chip)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 hover:border-[#F97360] dark:hover:border-emerald-400 text-xs font-bold text-[#102A43] dark:text-slate-200 hover:text-[#F97360] dark:hover:text-emerald-300 shrink-0 transition-all shadow-2xs cursor-pointer"
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ==========================================
            DESKTOP FILTERS SIDEBAR
        ========================================== */}
        <div className="hidden lg:block lg:col-span-4 xl:col-span-3">
          <form
            onSubmit={handleApplyFilters}
            className="bg-white dark:bg-[#131D2E] rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5 sticky top-24"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#102A43] dark:text-white">Filters</span>
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-[#F97360] hover:underline font-bold cursor-pointer"
              >
                Reset All
              </button>
            </div>

            {/* Destination Search Box */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Destination or Keyword
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#F97360] absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="e.g. Munnar, Goa, Manali..."
                  value={destination}
                  onChange={(e) => handleDestinationChange(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[#102A43] dark:text-white focus:outline-hidden focus:border-[#F97360]"
                />
              </div>
            </div>

            {/* Stay Dates */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Check-in
                </label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#102A43] dark:text-white focus:outline-hidden focus:border-[#F97360]"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Check-out
                </label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#102A43] dark:text-white focus:outline-hidden focus:border-[#F97360]"
                />
              </div>
            </div>

            {/* Property Type */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Property Type
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[#102A43] dark:text-white focus:outline-hidden focus:border-[#F97360] cursor-pointer"
              >
                {propertyTypes.map((t) => (
                  <option key={t} value={t} className="bg-white dark:bg-slate-900 text-[#102A43] dark:text-white">
                    {t === 'All' ? 'All Types' : t}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Price Range (₹ / night)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min ₹"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-[#102A43] dark:text-white focus:outline-hidden focus:border-[#F97360]"
                />
                <input
                  type="number"
                  placeholder="Max ₹"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-[#102A43] dark:text-white focus:outline-hidden focus:border-[#F97360]"
                />
              </div>
            </div>

            {/* Experience Keyword Filter */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Experience Included
              </label>
              <input
                type="text"
                placeholder="e.g. Guided Trek, Campfire"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-[#102A43] dark:text-white focus:outline-hidden focus:border-[#F97360]"
              />
            </div>

            {/* Amenities Checkboxes */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Amenities
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {allAmenities.map((am) => (
                  <label key={am} className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer hover:text-[#F97360]">
                    <input
                      type="checkbox"
                      checked={selectedAmenities.includes(am)}
                      onChange={() => handleAmenityToggle(am)}
                      className="rounded text-[#F97360] focus:ring-[#F97360] accent-[#F97360]"
                    />
                    <span>{am}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-[#e05e4b] hover:to-orange-600 text-white text-xs font-bold rounded-xl shadow-md shadow-[#F97360]/20 transition-all cursor-pointer"
            >
              Apply Search Filters
            </button>
          </form>
        </div>

        {/* ==========================================
            RESULTS LISTING GRID
        ========================================== */}
        <div className="lg:col-span-8 xl:col-span-9">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Searching verified stays & experiences...</p>
            </div>
          ) : properties.length === 0 ? (
            /* No Results Empty State with quick recommendations */
            <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-8 sm:p-14 text-center border border-slate-200/80 dark:border-slate-800 space-y-6 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-[#F97360] mx-auto flex items-center justify-center">
                <Compass className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-black font-serif text-[#102A43] dark:text-white">
                  No Stays Found for "{destination || 'selected filters'}"
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed font-medium">
                  We couldn't find any stays matching your search. Try searching for top destinations like <strong>Munnar</strong>, <strong>Goa</strong>, or <strong>Manali</strong>, or clear your filters.
                </p>
              </div>

              {/* Quick suggestions */}
              <div className="pt-2 flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                {popularDestinations.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectQuickChip(chip)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-[#F97360] hover:text-white text-xs font-bold text-[#102A43] dark:text-slate-200 transition-all cursor-pointer shadow-2xs"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-[#e05e4b] hover:to-orange-600 text-white text-xs font-bold rounded-xl shadow-md shadow-[#F97360]/20 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Show All Stays</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {properties.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;

