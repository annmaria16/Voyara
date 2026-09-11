import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { customerApi } from '../../api/customer';
import { PropertyCard } from '../../components/property/PropertyCard';
import {
  Search,
  MapPin,
  Building2,
  IndianRupee,
  RotateCcw,
  ShieldCheck,
  Compass,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Exactly 3 Customer-Facing Filter States
  const [destination, setDestination] = useState(searchParams.get('destination') || '');
  const [propertyType, setPropertyType] = useState(searchParams.get('property_type') || 'All Types');
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const debounceTimer = useRef(null);

  const PROPERTY_TYPE_OPTIONS = [
    'All Types',
    'Hotel',
    'Homestay',
    'Resort',
    'Camp',
    'Cottage',
    'Villa',
  ];

  // Fetch properties from real PostgreSQL backend
  const fetchProperties = async (overrideParams = null) => {
    setLoading(true);
    setError('');
    try {
      const currentDest = overrideParams?.destination !== undefined ? overrideParams.destination : destination;
      const currentType = overrideParams?.property_type !== undefined ? overrideParams.property_type : propertyType;
      const currentMin = overrideParams?.min_price !== undefined ? overrideParams.min_price : minPrice;
      const currentMax = overrideParams?.max_price !== undefined ? overrideParams.max_price : maxPrice;

      const params = {};
      if (currentDest && currentDest.trim()) params.destination = currentDest.trim();
      if (currentType && currentType !== 'All Types' && currentType !== 'All') {
        params.property_type = currentType;
      }
      if (currentMin && !isNaN(parseFloat(currentMin))) {
        params.min_price = parseFloat(currentMin);
      }
      if (currentMax && !isNaN(parseFloat(currentMax))) {
        params.max_price = parseFloat(currentMax);
      }

      const results = await customerApi.searchProperties(params);
      setProperties(Array.isArray(results) ? results : []);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to search properties. Please try again.');
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  // Sync state from URL parameters on load or URL change
  useEffect(() => {
    const urlDest = searchParams.get('destination') || '';
    const urlType = searchParams.get('property_type') || 'All Types';
    const urlMin = searchParams.get('min_price') || '';
    const urlMax = searchParams.get('max_price') || '';

    setDestination(urlDest);
    setPropertyType(urlType);
    setMinPrice(urlMin);
    setMaxPrice(urlMax);

    fetchProperties({
      destination: urlDest,
      property_type: urlType,
      min_price: urlMin,
      max_price: urlMax,
    });
  }, [searchParams]);

  // Push filter changes into URL parameters
  const applyFiltersToUrl = (newFilters) => {
    const params = {};
    const dest = newFilters.destination !== undefined ? newFilters.destination : destination;
    const type = newFilters.property_type !== undefined ? newFilters.property_type : propertyType;
    const min = newFilters.min_price !== undefined ? newFilters.min_price : minPrice;
    const max = newFilters.max_price !== undefined ? newFilters.max_price : maxPrice;

    if (dest && dest.trim()) params.destination = dest.trim();
    if (type && type !== 'All Types' && type !== 'All') params.property_type = type;
    if (min && !isNaN(parseFloat(min))) params.min_price = min;
    if (max && !isNaN(parseFloat(max))) params.max_price = max;

    setSearchParams(params);
  };

  // Live text input handler with debouncing
  const handleDestinationChange = (val) => {
    setDestination(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      applyFiltersToUrl({ destination: val });
    }, 400);
  };

  const handlePropertyTypeChange = (val) => {
    setPropertyType(val);
    applyFiltersToUrl({ property_type: val });
  };

  const handlePriceChange = (minVal, maxVal) => {
    setMinPrice(minVal);
    setMaxPrice(maxVal);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      applyFiltersToUrl({ min_price: minVal, max_price: maxVal });
    }, 500);
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    applyFiltersToUrl({
      destination,
      property_type: propertyType,
      min_price: minPrice,
      max_price: maxPrice,
    });
  };

  const handleClearFilters = () => {
    setDestination('');
    setPropertyType('All Types');
    setMinPrice('');
    setMaxPrice('');
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(
    destination.trim() ||
    (propertyType && propertyType !== 'All Types' && propertyType !== 'All') ||
    minPrice ||
    maxPrice
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-[#087F8C]/10 text-[#087F8C] dark:text-[#27B7A8] text-xs font-bold mb-2 border border-[#087F8C]/20">
            <ShieldCheck className="w-4 h-4 text-[#35A66F]" />
            <span>VeriNova Verified Sanctuaries • India</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black font-serif text-[#17324D] dark:text-white tracking-tight">
            Find Your Place
          </h1>
          <p className="text-xs sm:text-sm text-[#607080] dark:text-slate-300 mt-1 font-medium">
            Explore authentic handpicked stays across Indian destinations, resorts, and homestays.
          </p>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#F97316] hover:bg-orange-50 dark:hover:bg-slate-800 transition-all cursor-pointer self-start md:self-auto shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Filters</span>
          </button>
        )}
      </div>

      {/* =========================================================================
          SIMPLIFIED CUSTOMER SEARCH FILTER BAR (ONLY THE 3 SPECIFIED FILTERS)
          1. Destination, Property or Host
          2. Property Type
          3. Price Range (₹ / night)
      ========================================================================= */}
      <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-teal-900/40 shadow-xl shadow-slate-900/5 space-y-5">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          {/* Row 1: Destination, Property or Stay Partner (Full width) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#17324D] dark:text-slate-200">
              Destination, Property or Stay Partner
            </label>
            <div className="relative">
              <MapPin className="w-5 h-5 text-[#F97316] absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={destination}
                onChange={(e) => handleDestinationChange(e.target.value)}
                placeholder="Search destination, property or stay partner"
                className="w-full pl-11 pr-4 py-3 bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold text-[#17324D] dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-[#087F8C] focus:ring-2 focus:ring-[#087F8C]/20 transition-all shadow-xs"
              />
            </div>
          </div>

          {/* Row 2: Property Type & Price Range (Side-by-Side on desktop, Stack on mobile) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Filter 2: Property Type */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#17324D] dark:text-slate-200">
                Property Type
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-[#087F8C] dark:text-[#27B7A8] absolute left-3.5 top-3.5 pointer-events-none" />
                <select
                  value={propertyType}
                  onChange={(e) => handlePropertyTypeChange(e.target.value)}
                  className="w-full pl-10 pr-8 py-3 bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-semibold text-[#17324D] dark:text-white focus:outline-hidden focus:border-[#087F8C] focus:ring-2 focus:ring-[#087F8C]/20 cursor-pointer shadow-xs appearance-none"
                >
                  {PROPERTY_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="bg-white dark:bg-[#091B29] text-[#17324D] dark:text-white">
                      {opt}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-3.5 pointer-events-none text-slate-400 text-xs">▼</div>
              </div>
            </div>

            {/* Filter 3: Price Range (₹ / night) */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#17324D] dark:text-slate-200">
                Price Range (₹ / night)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Min price"
                    value={minPrice}
                    onChange={(e) => handlePriceChange(e.target.value, maxPrice)}
                    className="w-full pl-7 pr-3 py-3 bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-semibold text-[#17324D] dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-[#087F8C] focus:ring-2 focus:ring-[#087F8C]/20 shadow-xs"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Max price"
                    value={maxPrice}
                    onChange={(e) => handlePriceChange(minPrice, e.target.value)}
                    className="w-full pl-7 pr-3 py-3 bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-semibold text-[#17324D] dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-[#087F8C] focus:ring-2 focus:ring-[#087F8C]/20 shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* Search Button */}
            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full py-3 px-5 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-[#F97316]/25 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
              >
                <Search className="w-4 h-4 shrink-0" />
                <span>Search</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center space-x-3 text-rose-700 dark:text-rose-300 text-xs font-bold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#607080] dark:text-slate-400">
          {loading
            ? 'Searching stays...'
            : `${properties.length} ${properties.length === 1 ? 'Sanctuary' : 'Sanctuaries'} Found`}
        </span>
        {hasActiveFilters && (
          <span className="text-xs text-[#087F8C] dark:text-[#27B7A8] font-bold">
            Filtered results
          </span>
        )}
      </div>

      {/* =========================================================================
          RESULTS LISTING GRID / EMPTY / LOADING STATES
      ========================================================================= */}
      <div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card-voyara rounded-3xl overflow-hidden space-y-4 p-4 bg-white dark:bg-[#0F273D] border border-slate-100 dark:border-teal-900/40">
                <div className="aspect-4/3 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-5 w-3/4 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                  <div className="h-3 w-1/2 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                  <div className="h-3 w-full rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : properties.length === 0 ? (
          /* Empty State */
          <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-10 sm:p-16 text-center border border-slate-200/80 dark:border-teal-900/40 space-y-5 shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-orange-500/10 text-[#F97316] mx-auto flex items-center justify-center">
              <Compass className="w-8 h-8 stroke-[1.5]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black font-serif text-[#17324D] dark:text-white">
                No stays found for your search.
              </h3>
              <p className="text-xs sm:text-sm text-[#607080] dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                No verified properties matched your current filter criteria. Try adjusting your destination, property type, or price range.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white text-xs font-bold rounded-xl shadow-md shadow-[#F97316]/20 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;



