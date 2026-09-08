import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Search,
  Crosshair,
  Check,
  AlertCircle,
  Loader2,
  ZoomIn,
  ZoomOut,
  Compass,
  X
} from 'lucide-react';

// Popular Indian stay destinations for quick one-click pinning
const POPULAR_LOCATIONS = [
  { name: 'Munnar, Kerala', lat: 10.0889, lng: 77.0595, city: 'Munnar', state: 'Kerala', pincode: '685612' },
  { name: 'Calangute, Goa', lat: 15.5439, lng: 73.7554, city: 'Goa', state: 'Goa', pincode: '403516' },
  { name: 'Old Manali, HP', lat: 32.2432, lng: 77.1892, city: 'Manali', state: 'Himachal Pradesh', pincode: '175131' },
  { name: 'Wayanad, Kerala', lat: 11.6854, lng: 76.1320, city: 'Wayanad', state: 'Kerala', pincode: '673121' },
  { name: 'Kochi, Kerala', lat: 9.9312, lng: 76.2673, city: 'Kochi', state: 'Kerala', pincode: '682001' },
  { name: 'Ooty, Tamil Nadu', lat: 11.4102, lng: 76.6950, city: 'Ooty', state: 'Tamil Nadu', pincode: '643001' },
  { name: 'Udaipur, Rajasthan', lat: 24.5854, lng: 73.7125, city: 'Udaipur', state: 'Rajasthan', pincode: '313001' },
  { name: 'Varkala, Kerala', lat: 8.7379, lng: 76.7163, city: 'Varkala', state: 'Kerala', pincode: '695141' },
];

// India Geographic Bounding Box Limits
const INDIA_BOUNDS = {
  minLat: 6.5,
  maxLat: 37.5,
  minLng: 68.0,
  maxLng: 97.5,
};

export const GoogleMapLocationPicker = ({
  latitude = null,
  longitude = null,
  onChange = () => {},
  initialCity = '',
  initialState = '',
  initialAddress = '',
}) => {
  const [currentLat, setCurrentLat] = useState(latitude || 10.0889);
  const [currentLng, setCurrentLng] = useState(longitude || 77.0595);
  const [hasSelected, setHasSelected] = useState(!!(latitude && longitude));
  const [zoomLevel, setZoomLevel] = useState(14);

  // Search & Suggestions State (Swiggy / Google Maps style)
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [reverseGeocoding, setReverseGeocoding] = useState(false);

  // Selected Readable Address Display
  const [readableAddress, setReadableAddress] = useState(initialAddress || '');
  const [readablePlaceName, setReadablePlaceName] = useState('');
  const [readableDetails, setReadableDetails] = useState('');

  const searchContainerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const leafletMarkerRef = useRef(null);

  // Synchronize internal coordinates and animate map when parent updates them (e.g. from Pincode lookup)
  useEffect(() => {
    if (latitude && longitude) {
      const isDifferent =
        Math.abs(latitude - currentLat) > 0.0001 ||
        Math.abs(longitude - currentLng) > 0.0001;

      setCurrentLat(latitude);
      setCurrentLng(longitude);
      setHasSelected(true);

      if (isDifferent && leafletMapRef.current && leafletMarkerRef.current) {
        leafletMapRef.current.flyTo([latitude, longitude], 15, { duration: 1.2 });
        leafletMarkerRef.current.setLatLng([latitude, longitude]);
      }
    }
  }, [latitude, longitude]);

  // Synchronize initial address and region if provided
  useEffect(() => {
    if (initialAddress) {
      setReadableAddress(initialAddress);
      setSearchQuery(initialAddress);
    }
  }, [initialAddress]);

  useEffect(() => {
    if (initialCity || initialState) {
      setReadableDetails(`${initialCity ? initialCity + ', ' : ''}${initialState || ''}`);
    }
  }, [initialCity, initialState]);

  // Click outside listener to close search autocomplete suggestions
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dynamically load Leaflet script & CSS for smooth map interactions
  useEffect(() => {
    let isMounted = true;

    const loadLeaflet = async () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!window.L) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.id = 'leaflet-js';
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      if (isMounted && window.L && mapContainerRef.current) {
        initLeafletMap();
      }
    };

    loadLeaflet().catch((err) => {
      console.warn('Leaflet load notice:', err);
    });

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  const isWithinIndia = (lat, lng) => {
    return (
      lat >= INDIA_BOUNDS.minLat &&
      lat <= INDIA_BOUNDS.maxLat &&
      lng >= INDIA_BOUNDS.minLng &&
      lng <= INDIA_BOUNDS.maxLng
    );
  };

  const initLeafletMap = () => {
    if (!mapContainerRef.current || !window.L || leafletMapRef.current) return;

    const initialLat = currentLat || 10.0889;
    const initialLng = currentLng || 77.0595;

    const map = window.L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: zoomLevel,
      zoomControl: false,
      maxBounds: [
        [INDIA_BOUNDS.minLat - 2, INDIA_BOUNDS.minLng - 2],
        [INDIA_BOUNDS.maxLat + 2, INDIA_BOUNDS.maxLng + 2],
      ],
      maxBoundsViscosity: 0.9,
    });

    // High quality standard OpenStreetMap Carto tiles
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Custom branded pin marker icon
    const customIcon = window.L.divIcon({
      className: 'voyara-map-marker',
      html: `
        <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center;">
          <div style="background: #0f172a; color: #ffffff; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: bold; white-space: nowrap; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); margin-bottom: 2px;">
            📍 Property Location
          </div>
          <div style="width: 32px; height: 32px; border-radius: 50%; background: #F97360; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); border: 2px solid white;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <div style="width: 6px; height: 6px; background: #ea580c; border-radius: 50%; margin-top: 2px;"></div>
        </div>
      `,
      iconSize: [32, 48],
      iconAnchor: [16, 48],
    });

    const marker = window.L.marker([initialLat, initialLng], {
      icon: customIcon,
      draggable: true,
    }).addTo(map);

    // Marker drag handler with automatic reverse geocoding
    marker.on('dragend', () => {
      const position = marker.getLatLng();
      const newLat = parseFloat(position.lat.toFixed(6));
      const newLng = parseFloat(position.lng.toFixed(6));
      handleCoordinateSelection(newLat, newLng, true);
    });

    // Map click handler (moves marker automatically & updates coordinates with reverse geocoding)
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      const newLat = parseFloat(lat.toFixed(6));
      const newLng = parseFloat(lng.toFixed(6));
      marker.setLatLng([newLat, newLng]);
      handleCoordinateSelection(newLat, newLng, true);
    });

    leafletMapRef.current = map;
    leafletMarkerRef.current = marker;

    // If initial coords exist, do an initial reverse geocode to show address
    if (latitude && longitude && !readableAddress) {
      reverseGeocodeCoordinates(latitude, longitude);
    }
  };

  // Reverse Geocoding: Look up human-readable address from Lat/Lng
  const reverseGeocodeCoordinates = async (lat, lng) => {
    setReverseGeocoding(true);
    try {
      const endpoint = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
      const res = await fetch(endpoint, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'Voyara-Location-Picker/1.0',
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const addr = data.address;
          const road = addr.road || addr.street || addr.neighbourhood || addr.suburb || '';
          const cityTown = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
          const district = addr.state_district || addr.district || '';
          const stateName = addr.state || '';
          const postcode = addr.postcode || '';

          // Format clean readable parts
          const placeTitle = data.name || road || cityTown || 'Selected Location';
          const fullAddress = data.display_name || [road, cityTown, district, stateName, postcode].filter(Boolean).join(', ');

          setReadablePlaceName(placeTitle);
          setReadableAddress(fullAddress);
          setReadableDetails(`${cityTown ? cityTown + ', ' : ''}${stateName}${postcode ? ' - ' + postcode : ''}`);

          // Notify parent of all extracted address fields
          onChange({
            latitude: lat,
            longitude: lng,
            formatted_address: fullAddress,
            place_name: placeTitle,
            road: road,
            city: cityTown,
            district: district,
            state: stateName,
            pincode: postcode,
          });
          return;
        }
      }
    } catch (err) {
      console.warn('Reverse geocode lookup warning:', err);
    } finally {
      setReverseGeocoding(false);
    }

    // Fallback if reverse geocode was inconclusive
    onChange({
      latitude: lat,
      longitude: lng,
      formatted_address: `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    });
  };

  const handleCoordinateSelection = (lat, lng, shouldReverseGeocode = false, extra = {}) => {
    if (!isWithinIndia(lat, lng)) {
      setSearchError('Please select a property location within India boundaries.');
      return;
    }

    setSearchError('');
    setCurrentLat(lat);
    setCurrentLng(lng);
    setHasSelected(true);

    if (leafletMarkerRef.current) {
      leafletMarkerRef.current.setLatLng([lat, lng]);
    }
    if (leafletMapRef.current) {
      leafletMapRef.current.panTo([lat, lng]);
    }

    if (shouldReverseGeocode) {
      reverseGeocodeCoordinates(lat, lng);
    } else {
      onChange({
        latitude: lat,
        longitude: lng,
        ...extra,
      });
    }
  };

  // Live Autocomplete Suggestions (Swiggy style searching)
  const handleSearchInputChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setSearchError('');

    if (!val.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const endpoint = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          val.trim()
        )}&countrycodes=in&limit=5&addressdetails=1`;

        const res = await fetch(endpoint, {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'Voyara-Location-Picker/1.0',
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setSuggestions(data);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
          }
        }
      } catch (err) {
        console.warn('Autocomplete fetch warning:', err);
      } finally {
        setSearching(false);
      }
    }, 250);
  };

  // Select a place suggestion from the dropdown (Swiggy / Google Maps flow)
  const handleSelectSuggestion = (place) => {
    setShowSuggestions(false);
    setSearchQuery(place.display_name || place.name);

    const newLat = parseFloat(parseFloat(place.lat).toFixed(6));
    const newLng = parseFloat(parseFloat(place.lon).toFixed(6));

    if (!isWithinIndia(newLat, newLng)) {
      setSearchError('Found place is outside India. Please select an address within India.');
      return;
    }

    const addr = place.address || {};
    const road = addr.road || addr.street || addr.neighbourhood || addr.suburb || '';
    const extractedCity = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
    const extractedDistrict = addr.state_district || addr.district || '';
    const extractedState = addr.state || '';
    const extractedPincode = addr.postcode || '';

    const placeTitle = place.name || road || extractedCity || 'Selected Location';
    const fullAddress = place.display_name;

    setReadablePlaceName(placeTitle);
    setReadableAddress(fullAddress);
    setReadableDetails(`${extractedCity ? extractedCity + ', ' : ''}${extractedState}${extractedPincode ? ' - ' + extractedPincode : ''}`);

    // Smoothly fly map to selected location and place marker
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([newLat, newLng], 15, { duration: 1.2 });
    }
    if (leafletMarkerRef.current) {
      leafletMarkerRef.current.setLatLng([newLat, newLng]);
    }

    handleCoordinateSelection(newLat, newLng, false, {
      formatted_address: fullAddress,
      place_name: placeTitle,
      road: road,
      city: extractedCity,
      district: extractedDistrict,
      state: extractedState,
      pincode: extractedPincode,
    });
  };

  // Manual trigger on Enter or Locate button
  const handleManualSearchSubmit = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError('');
    setShowSuggestions(false);

    try {
      const endpoint = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery.trim()
      )}&countrycodes=in&limit=1&addressdetails=1`;

      const res = await fetch(endpoint, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'Voyara-Location-Picker/1.0',
        },
      });

      const data = await res.json();
      if (data && data.length > 0) {
        handleSelectSuggestion(data[0]);
      } else {
        setSearchError(`No Indian location found for "${searchQuery}". Please check the spelling or click directly on the map.`);
      }
    } catch (err) {
      setSearchError('Location search failed. You can click anywhere on the map to pin your property.');
    } finally {
      setSearching(false);
    }
  };

  const handleZoom = (delta) => {
    if (leafletMapRef.current) {
      const newZoom = leafletMapRef.current.getZoom() + delta;
      leafletMapRef.current.setZoom(newZoom);
      setZoomLevel(newZoom);
    }
  };

  const handlePresetClick = (loc) => {
    setSearchQuery(loc.name);
    setReadablePlaceName(loc.name);
    setReadableAddress(`${loc.name} (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`);
    setReadableDetails(`${loc.city}, ${loc.state}${loc.pincode ? ' - ' + loc.pincode : ''}`);

    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([loc.lat, loc.lng], 14, { duration: 1.0 });
    }
    if (leafletMarkerRef.current) {
      leafletMarkerRef.current.setLatLng([loc.lat, loc.lng]);
    }

    handleCoordinateSelection(loc.lat, loc.lng, false, {
      city: loc.city,
      state: loc.state,
      pincode: loc.pincode,
      formatted_address: loc.name,
      place_name: loc.name,
    });
  };

  return (
    <div className="space-y-3.5 select-none">
      {/* Header and Coordinates Chip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Property Map Location (India Only) *
          </label>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Search your place/area or tap anywhere on the map. The readable address and coordinates will auto-fill.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {hasSelected ? (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-mono font-bold shadow-xs">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{currentLat.toFixed(4)}° N, {currentLng.toFixed(4)}° E</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-xl text-[11px] font-bold">
              <span>GPS Pin Required</span>
            </span>
          )}
        </div>
      </div>

      {/* Swiggy-like Live Autocomplete Search Input */}
      <div ref={searchContainerRef} className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search area, landmark, street, town (e.g. Munnar, Pothamedu, Calangute Beach)..."
              value={searchQuery}
              onChange={handleSearchInputChange}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleManualSearchSubmit();
                }
              }}
              className="w-full pl-10 pr-8 py-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500 font-medium placeholder-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSuggestions([]);
                  setShowSuggestions(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            disabled={searching}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleManualSearchSubmit();
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 shrink-0 flex items-center space-x-1.5"
          >
            {searching ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Crosshair className="w-3.5 h-3.5" />
                <span>Locate on Map</span>
              </>
            )}
          </button>
        </div>

        {/* Floating Autocomplete Dropdown (Swiggy style) */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-[#131D2E] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60 max-h-60 overflow-y-auto custom-scrollbar">
            {suggestions.map((item, idx) => {
              const primaryName = item.name || item.display_name?.split(',')[0] || 'Location';
              const secondaryText = item.display_name;

              return (
                <div
                  key={idx}
                  onClick={() => handleSelectSuggestion(item)}
                  className="p-3 hover:bg-[#FFF8F0]/70 dark:hover:bg-slate-800/80 cursor-pointer transition-colors flex items-start space-x-3"
                >
                  <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {primaryName}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {secondaryText}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {searchError && (
        <p className="text-xs text-rose-500 font-semibold flex items-center space-x-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{searchError}</span>
        </p>
      )}

      {/* Selected Readable Address Box */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-[#131D2E] border border-[#FDBA9A]/40 dark:border-slate-800 shadow-xs space-y-1.5 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Selected Place / Readable Address:
            </span>
          </div>
          {reverseGeocoding && (
            <span className="text-[10px] text-orange-500 font-bold flex items-center space-x-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Fetching address...</span>
            </span>
          )}
        </div>

        <div className="pl-8">
          {readableAddress ? (
            <p className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
              {readableAddress}
            </p>
          ) : (
            <p className="text-xs text-slate-400 font-medium italic">
              Search a place or click on the map to pin your property's address.
            </p>
          )}

          {readableDetails && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Region: {readableDetails}
            </p>
          )}
        </div>
      </div>

      {/* Quick Destination Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
        <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Quick Pin (India):</span>
        {POPULAR_LOCATIONS.map((loc) => (
          <button
            key={loc.name}
            type="button"
            onClick={() => handlePresetClick(loc)}
            className="px-2.5 py-1 rounded-lg bg-[#FFF8F0] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-orange-500 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-orange-500 shrink-0 transition-all cursor-pointer shadow-2xs"
          >
            {loc.name}
          </button>
        ))}
      </div>

      {/* Interactive Map Canvas Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm aspect-16/9 sm:aspect-21/9 bg-slate-900">
        <div ref={mapContainerRef} className="w-full h-full z-0 cursor-crosshair" />

        {/* Map Floating Zoom Controls */}
        <div className="absolute top-3 right-3 z-10 flex flex-col space-y-1.5">
          <button
            type="button"
            onClick={() => handleZoom(1)}
            className="w-8 h-8 rounded-xl bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-200 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(-1)}
            className="w-8 h-8 rounded-xl bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-200 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>

        {/* Map Footer Indicator */}
        <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
          <div className="px-3 py-1.5 bg-slate-900/85 backdrop-blur-md rounded-xl text-white text-[11px] font-medium shadow-md border border-white/10 flex items-center space-x-1.5">
            <Compass className="w-3.5 h-3.5 text-orange-400" />
            <span>Click any location or drag pin anywhere across India</span>
          </div>

          <div className="px-2.5 py-1 bg-emerald-600/90 text-white rounded-lg text-[10px] font-bold shadow-md">
            ✓ India Bounded GPS
          </div>
        </div>
      </div>

      {/* Lat/Long Fine Tuning Inputs */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Latitude (India: 6.5° to 37.5° N)
          </label>
          <input
            type="number"
            step="0.000001"
            value={currentLat}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              handleCoordinateSelection(val, currentLng, true);
            }}
            className="w-full px-3 py-1.5 bg-[#FFF8F0]/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Longitude (India: 68.0° to 97.5° E)
          </label>
          <input
            type="number"
            step="0.000001"
            value={currentLng}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              handleCoordinateSelection(currentLat, val, true);
            }}
            className="w-full px-3 py-1.5 bg-[#FFF8F0]/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden"
          />
        </div>
      </div>
    </div>
  );
};

export default GoogleMapLocationPicker;
