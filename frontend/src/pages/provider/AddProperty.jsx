import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { providerApi } from '../../api/provider';
import { MultiImageUploadPicker } from '../../components/common/MultiImageUploadPicker';
import { GoogleMapLocationPicker } from '../../components/common/GoogleMapLocationPicker';
import { NumberStepperInput } from '../../components/common/NumberStepperInput';
import {
  Home,
  MapPin,
  Phone,
  Mail,
  Image,
  Plus,
  Trash2,
  ArrowLeft,
  Check,
  AlertCircle,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Loader2,
  Sparkles,
  Bed,
  Users,
  Layers,
  IndianRupee,
  X,
} from 'lucide-react';

const ROOM_TYPE_OPTIONS = [
  'Deluxe Room',
  'Standard Room',
  'Executive Suite',
  'Luxury Suite',
  'Family Villa',
  'Private Cottage',
  'Glamping Tent',
  'Studio Apartment',
  'Treehouse Suite',
  'Dormitory Bed',
];

const AVAILABLE_ROOM_AMENITIES = [
  'King Bed',
  'Queen Bed',
  'Twin Beds',
  'Attached Bathroom',
  'Air Conditioning',
  'Free Wi-Fi',
  'Private Balcony',
  'Mountain View',
  'Ocean View',
  'Smart TV',
  'Mini Fridge',
  'Work Desk',
  'Bathtub',
  'Electric Kettle',
  'Hot Water',
  'Room Service',
];

export const AddProperty = () => {
  const navigate = useNavigate();

  // 1. Property Form Field States
  const [name, setName] = useState('');
  const [propertyType, setPropertyType] = useState('Resort');
  const [description, setDescription] = useState('');
  const [pincode, setPincode] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [locationDetails, setLocationDetails] = useState('');
  const [latitude, setLatitude] = useState(10.0889);
  const [longitude, setLongitude] = useState(77.0595);
  const [hasLocationSelected, setHasLocationSelected] = useState(false);

  // 2. Contact & Timings
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutTime, setCheckOutTime] = useState('11:00');
  const [cancellationRefundPercentage, setCancellationRefundPercentage] = useState(50);

  // 3. Property Amenities & Photos
  const [amenities, setAmenities] = useState(['Wi-Fi', 'Breakfast', 'Mountain View']);
  const [customPropAmenity, setCustomPropAmenity] = useState('');
  const [images, setImages] = useState([]);

  // 4. Pincode Lookup & Localities State
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState('');
  const [pincodeVerified, setPincodeVerified] = useState(false);
  const [availablePostOffices, setAvailablePostOffices] = useState([]);
  const [selectedPostOffice, setSelectedPostOffice] = useState('');
  const [geocodingPincode, setGeocodingPincode] = useState(false);
  const [locationFeedback, setLocationFeedback] = useState('');
  const geocodeRequestIdRef = useRef(0);
  const streetDebounceRef = useRef(null);

  // 5. Rooms / Units Configuration State
  const [rooms, setRooms] = useState([
    {
      name: '',
      room_type: 'Deluxe Room',
      description: '',
      capacity: 2,
      quantity: 1,
      base_price: 2500,
      amenities: ['King Bed', 'Attached Bathroom', 'Air Conditioning', 'Free Wi-Fi'],
      images: [],
    },
  ]);
  const [customRoomAmenities, setCustomRoomAmenities] = useState({});

  // 6. Submission & UI States
  const [loading, setLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Field Touched Tracking for Live Validation
  const [touched, setTouched] = useState({});

  const propertyTypes = ['Hotel', 'Homestay', 'Resort', 'Camp', 'Cottage', 'Villa'];
  const defaultAmenitiesList = [
    'Wi-Fi',
    'Swimming Pool',
    'Breakfast',
    'Mountain View',
    'Beach Access',
    'Campfire',
    'Bonfire',
    'Restaurant',
    'Air Conditioning',
    'Room Service',
    'Pet Friendly',
    'Outdoor Activities',
    'Parking',
  ];

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // --- Room Operations Handlers ---
  const handleAddRoom = () => {
    setRooms((prev) => [
      ...prev,
      {
        name: '',
        room_type: 'Deluxe Room',
        description: '',
        capacity: 2,
        quantity: 1,
        base_price: 2500,
        amenities: ['King Bed', 'Attached Bathroom', 'Air Conditioning', 'Free Wi-Fi'],
        images: [],
      },
    ]);
  };

  const handleRemoveRoom = (index) => {
    if (rooms.length <= 1) return;
    setRooms((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateRoom = (index, field, value) => {
    setRooms((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // --- Property & Room Operations Handlers ---
  const handleTogglePropAmenity = (amenityName) => {
    setAmenities((prev) => {
      const exists = prev.some((a) => a.toLowerCase() === amenityName.toLowerCase());
      if (exists) {
        return prev.filter((a) => a.toLowerCase() !== amenityName.toLowerCase());
      } else {
        return [...prev, amenityName];
      }
    });
  };

  const handleAddCustomPropAmenity = () => {
    const val = customPropAmenity.trim();
    if (!val) return;
    if (!amenities.some((a) => a.toLowerCase() === val.toLowerCase())) {
      setAmenities((prev) => [...prev, val]);
    }
    setCustomPropAmenity('');
  };

  const handleRemovePropAmenity = (am) => {
    setAmenities((prev) => prev.filter((a) => a.toLowerCase() !== am.toLowerCase()));
  };

  const handleToggleRoomAmenity = (roomIndex, amenityName) => {
    setRooms((prev) => {
      const next = [...prev];
      const room = { ...next[roomIndex] };
      const currentAmenities = [...(room.amenities || [])];
      const exists = currentAmenities.some((a) => a.toLowerCase() === amenityName.toLowerCase());
      if (exists) {
        room.amenities = currentAmenities.filter((a) => a.toLowerCase() !== amenityName.toLowerCase());
      } else {
        room.amenities = [...currentAmenities, amenityName];
      }
      next[roomIndex] = room;
      return next;
    });
  };

  const handleAddCustomRoomAmenity = (roomIndex) => {
    const customVal = (customRoomAmenities[roomIndex] || '').trim();
    if (!customVal) return;
    setRooms((prev) => {
      const next = [...prev];
      const room = { ...next[roomIndex] };
      const currentAmenities = [...(room.amenities || [])];
      if (!currentAmenities.some((a) => a.toLowerCase() === customVal.toLowerCase())) {
        room.amenities = [...currentAmenities, customVal];
      }
      next[roomIndex] = room;
      return next;
    });
    setCustomRoomAmenities((prev) => ({ ...prev, [roomIndex]: '' }));
  };

  const handleRemoveRoomAmenity = (roomIndex, amenityName) => {
    setRooms((prev) => {
      const next = [...prev];
      const room = { ...next[roomIndex] };
      const currentAmenities = [...(room.amenities || [])];
      room.amenities = currentAmenities.filter((a) => a.toLowerCase() !== amenityName.toLowerCase());
      next[roomIndex] = room;
      return next;
    });
  };

  const handleUpdateRoomImages = (roomIndex, newImagesArray) => {
    setRooms((prev) => {
      const next = [...prev];
      next[roomIndex] = { ...next[roomIndex], images: newImagesArray };
      return next;
    });
  };

  // --- Live Field Validation Rules ---
  const errors = useMemo(() => {
    const errs = {};

    // 1. Name
    if (!name.trim()) {
      errs.name = 'Property name is required.';
    } else if (name.trim().length < 3) {
      errs.name = 'Property name must be at least 3 characters.';
    }

    // 2. Property Type
    if (!propertyType) {
      errs.propertyType = 'Property type is required.';
    }

    // 3. Description
    if (!description.trim()) {
      errs.description = 'Property description is required.';
    } else if (description.trim().length < 20) {
      errs.description =
        'Description must be at least 20 characters (current: ' + description.trim().length + ').';
    }

    // 4. Pincode
    if (!pincode.trim()) {
      errs.pincode = '6-digit Indian Pincode is required.';
    } else if (!/^[1-9][0-9]{5}$/.test(pincode.trim())) {
      errs.pincode = 'Enter a valid 6-digit Indian pincode (e.g. 685612, 403516).';
    }

    // 5. Street Address
    if (!address.trim()) {
      errs.address = 'Street address is required.';
    } else if (address.trim().length < 5) {
      errs.address = 'Please provide a complete street address (at least 5 characters).';
    }

    // 6. City
    if (!city.trim()) {
      errs.city = 'City or destination is required.';
    }

    // 7. State
    if (!state.trim()) {
      errs.state = 'State is required.';
    }

    // 8. Country
    if (!country.trim()) {
      errs.country = 'Country is required.';
    }

    // 9. Location
    if (latitude === null || longitude === null) {
      errs.location = 'Please select your property position on the map.';
    } else if (latitude < 6.5 || latitude > 37.5 || longitude < 68.0 || longitude > 97.5) {
      errs.location = 'Selected coordinates must be within India boundaries.';
    }

    // 10. Contact Phone (Strict 10-digit Indian Mobile Number)
    const cleanPhone = contactPhone.replace(/\D/g, '');
    if (!cleanPhone) {
      errs.contactPhone = '10-digit Indian mobile number is required.';
    } else if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      errs.contactPhone = 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
    }

    // 11. Contact Email
    if (!contactEmail.trim()) {
      errs.contactEmail = 'Contact email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      errs.contactEmail = 'Please enter a valid email address.';
    }

    // 12. Property Photos
    if (images.length === 0) {
      errs.images = 'At least one property photo is required.';
    }

    // 13. Rooms Validation
    if (!rooms || rooms.length === 0) {
      errs.rooms = 'At least one room type must be added to your property.';
    } else {
      rooms.forEach((r, idx) => {
        const roomNum = idx + 1;
        if (!r.name.trim()) {
          errs[`room_${idx}_name`] = `Room #${roomNum}: Room Name is required.`;
        } else if (r.name.trim().length < 3) {
          errs[`room_${idx}_name`] = `Room #${roomNum}: Name must be at least 3 characters.`;
        }

        if (!r.room_type) {
          errs[`room_${idx}_type`] = `Room #${roomNum}: Room Type is required.`;
        }

        if (!r.description.trim()) {
          errs[`room_${idx}_desc`] = `Room #${roomNum}: Room Description is required.`;
        } else if (r.description.trim().length < 10) {
          errs[`room_${idx}_desc`] = `Room #${roomNum}: Description must be at least 10 characters.`;
        }

        const cap = typeof r.capacity === 'number' ? r.capacity : parseInt(r.capacity, 10);
        if (r.capacity === '' || r.capacity === undefined || r.capacity === null || isNaN(cap) || cap < 1) {
          errs[`room_${idx}_capacity`] = `Room #${roomNum}: Guest capacity must be at least 1 guest.`;
        }

        const qty = typeof r.quantity === 'number' ? r.quantity : parseInt(r.quantity, 10);
        if (r.quantity === '' || r.quantity === undefined || r.quantity === null || isNaN(qty) || qty < 1) {
          errs[`room_${idx}_quantity`] = `Room #${roomNum}: Number of available units must be at least 1 unit.`;
        }

        if (!r.base_price || r.base_price < 100) {
          errs[`room_${idx}_price`] = `Room #${roomNum}: Price per night must be at least ₹100.`;
        }

        if (!r.images || r.images.length === 0) {
          errs[`room_${idx}_images`] = `Room #${roomNum}: At least one room photo is required.`;
        }
      });
    }

    return errs;
  }, [
    name,
    propertyType,
    description,
    pincode,
    address,
    city,
    state,
    country,
    latitude,
    longitude,
    contactPhone,
    contactEmail,
    images,
    rooms,
  ]);

  const isFormValid = Object.keys(errors).length === 0;

  // Helper to geocode street address strictly confined to the entered Indian pincode & region
  const geocodeStreetAndPincode = async (streetText, pinText, cityText, stateText, selectedLocality = '') => {
    const cleanPin = (pinText || '').trim();
    const cleanStreet = (streetText || '').trim();
    const cleanCity = (cityText || '').trim();
    const cleanState = (stateText || '').trim();

    if (!cleanPin && !cleanStreet) return;

    setGeocodingPincode(true);
    const reqId = ++geocodeRequestIdRef.current;

    try {
      const queriesToTry = [];

      if (cleanPin && /^[1-9][0-9]{5}$/.test(cleanPin)) {
        if (cleanStreet && cleanStreet.length >= 3) {
          // 1. Structured query: street + postalcode in India
          queriesToTry.push(
            `https://nominatim.openstreetmap.org/search?format=json&street=${encodeURIComponent(
              cleanStreet
            )}&postalcode=${encodeURIComponent(cleanPin)}&countrycodes=in&limit=3&addressdetails=1`
          );
          // 2. Freeform query with street + pincode + city + state
          queriesToTry.push(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              [cleanStreet, cleanPin, cleanCity, cleanState, 'India'].filter(Boolean).join(', ')
            )}&countrycodes=in&limit=3&addressdetails=1`
          );
          // 3. Freeform query with street + pincode
          queriesToTry.push(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              `${cleanStreet}, ${cleanPin}, India`
            )}&countrycodes=in&limit=3&addressdetails=1`
          );
          // 4. Locality + street + pincode
          if (selectedLocality && selectedLocality !== cleanStreet) {
            queriesToTry.push(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                [cleanStreet, selectedLocality, cleanPin, 'India'].filter(Boolean).join(', ')
              )}&countrycodes=in&limit=3&addressdetails=1`
            );
          }
        }

        // 5. Locality under that pincode
        if (selectedLocality) {
          queriesToTry.push(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              [selectedLocality, cleanPin, cleanState, 'India'].filter(Boolean).join(', ')
            )}&countrycodes=in&limit=3&addressdetails=1`
          );
        }
        // 6. Direct postalcode lookup in India
        queriesToTry.push(
          `https://nominatim.openstreetmap.org/search?format=json&postalcode=${encodeURIComponent(
            cleanPin
          )}&countrycodes=in&limit=3&addressdetails=1`
        );
        // 7. Pincode + City + State freeform
        queriesToTry.push(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            [cleanCity, cleanState, cleanPin, 'India'].filter(Boolean).join(', ')
          )}&countrycodes=in&limit=3&addressdetails=1`
        );
      } else if (cleanStreet && cleanStreet.length >= 4 && (cleanCity || cleanState)) {
        queriesToTry.push(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            [cleanStreet, cleanCity, cleanState, 'India'].filter(Boolean).join(', ')
          )}&countrycodes=in&limit=3&addressdetails=1`
        );
      }

      let found = false;
      for (const url of queriesToTry) {
        try {
          const res = await fetch(url, {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'Voyara-Pincode-Street-Geocoding/1.0',
            },
          });

          if (res.ok) {
            const data = await res.json();
            if (reqId !== geocodeRequestIdRef.current) return;

            if (Array.isArray(data) && data.length > 0) {
              const validMatch =
                data.find((item) => {
                  const lat = parseFloat(item.lat);
                  const lon = parseFloat(item.lon);
                  return lat >= 6.5 && lat <= 37.5 && lon >= 68.0 && lon <= 97.5;
                }) || data[0];

              const newLat = parseFloat(parseFloat(validMatch.lat).toFixed(6));
              const newLng = parseFloat(parseFloat(validMatch.lon).toFixed(6));

              if (newLat >= 6.5 && newLat <= 37.5 && newLng >= 68.0 && newLng <= 97.5) {
                setLatitude(newLat);
                setLongitude(newLng);
                setHasLocationSelected(true);
                setLocationFeedback(
                  cleanStreet
                    ? `📍 Map centered on "${cleanStreet}" (Pincode: ${cleanPin || 'India'})`
                    : `📍 Map centered on Pincode ${cleanPin}`
                );
                found = true;
                break;
              }
            }
          }
        } catch (subErr) {
          console.warn('Geocoding attempt warning:', subErr);
        }
      }

      if (!found && reqId === geocodeRequestIdRef.current && cleanPin) {
        setLocationFeedback(`📍 Map focused on area with Pincode ${cleanPin}`);
      }
    } catch (e) {
      console.warn('Geocoding street/pincode warning:', e);
    } finally {
      if (reqId === geocodeRequestIdRef.current) {
        setGeocodingPincode(false);
      }
    }
  };

  // Trigger Pincode lookup when 6 digits are entered
  const handlePincodeChange = async (val) => {
    const clean = val.replace(/\D/g, '').slice(0, 6);
    setPincode(clean);
    setPincodeError('');
    setPincodeVerified(false);
    setAvailablePostOffices([]);
    setSelectedPostOffice('');
    setLocationFeedback('');

    if (clean.length === 6) {
      setPincodeLoading(true);
      try {
        const data = await providerApi.lookupPincode(clean);
        if (data && data.status === 'success') {
          setPincodeVerified(true);

          const targetState = data.state || '';
          const targetDistrict = data.district || (data.places && data.places[0]) || '';
          const targetPlaces = data.places || [];

          if (targetState) setState(targetState);
          if (targetDistrict) setCity(targetDistrict);
          if (data.country) setCountry(data.country);

          setAvailablePostOffices(targetPlaces);

          const defaultPlace = targetPlaces.length > 0 ? targetPlaces[0] : targetDistrict;
          setSelectedPostOffice(defaultPlace);

          const currentStreet = address.trim() || `${defaultPlace}, ${targetDistrict}`;
          if (!address.trim()) {
            setAddress(currentStreet);
          }

          geocodeStreetAndPincode(currentStreet, clean, targetDistrict, targetState, defaultPlace);
        }
      } catch (err) {
        setPincodeError('Could not verify pincode. Please check the 6-digit postal code.');
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  // Handle Street Address changes with live debounced map recentering
  const handleStreetAddressChange = (val) => {
    setAddress(val);
    setLocationFeedback('');

    if (streetDebounceRef.current) {
      clearTimeout(streetDebounceRef.current);
    }

    if (val.trim().length >= 3) {
      streetDebounceRef.current = setTimeout(() => {
        geocodeStreetAndPincode(val, pincode, city, state, selectedPostOffice);
      }, 500);
    }
  };

  const handleSelectPostOffice = (placeName) => {
    if (placeName) {
      setSelectedPostOffice(placeName);
      const newAddr = `${placeName}, ${city || state}`;
      setAddress(newAddr);
      geocodeStreetAndPincode(placeName, pincode, city, state, placeName);
    }
  };

  const handleMapChange = (loc) => {
    if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
      setLatitude(loc.latitude);
      setLongitude(loc.longitude);
      setHasLocationSelected(true);
    }

    if (loc.formatted_address) {
      setAddress(loc.formatted_address);
    } else if (loc.place_name) {
      setAddress(loc.place_name);
    }

    if (loc.city && (!city || city === '')) {
      setCity(loc.city);
    }
    if (loc.state && (!state || state === '')) {
      setState(loc.state);
    }
    if (loc.pincode && !pincode && /^[1-9][0-9]{5}$/.test(loc.pincode)) {
      setPincode(loc.pincode);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setSubmitAttempted(true);
    setError('');
    setSuccessMessage('');

    if (!isFormValid) {
      const firstErrorKey = Object.keys(errors)[0];
      setError(`Please complete all required fields correctly (${errors[firstErrorKey]}).`);
      window.scrollTo({ top: 80, behavior: 'smooth' });
      return;
    }

    setLoading(true);

    try {
      const fullStreetAddress =
        pincode && !address.includes(pincode)
          ? `${address.trim()} (Pincode: ${pincode.trim()})`
          : address.trim();

      const payload = {
        name: name.trim(),
        property_type: propertyType,
        description: description.trim(),
        address: fullStreetAddress,
        city: city.trim(),
        state: state.trim(),
        country: country.trim() || 'India',
        location_details: locationDetails.trim() || undefined,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        contact_phone: contactPhone.trim(),
        contact_email: contactEmail.trim(),
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        cancellation_refund_percentage: parseInt(cancellationRefundPercentage, 10) || 50,
        amenities,
        images: (images || []).map((img) => (typeof img === 'string' ? img : img.image_url)).filter(Boolean),
        rooms: rooms.map((r) => ({
          name: r.name.trim(),
          room_type: r.room_type.trim(),
          description: r.description.trim(),
          capacity: parseInt(r.capacity, 10) || 2,
          quantity: parseInt(r.quantity, 10) || 1,
          base_price: parseFloat(r.base_price) || 1000,
          amenities: r.amenities || [],
          images: (r.images || []).map((img) => (typeof img === 'string' ? img : img.image_url)).filter(Boolean),
        })),
      };

      await providerApi.createProperty(payload);
      setSuccessMessage('Property successfully created! Redirecting to My Places...');
      setTimeout(() => {
        navigate('/provider/properties');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to register property.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Back Navigation */}
      <button
        type="button"
        onClick={() => navigate('/provider/properties')}
        className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#087F8C] dark:text-[#27B7A8] hover:underline cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to My Places</span>
      </button>

      {/* Main Form Container */}
      <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-8">
        {/* Page Header */}
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-orange-500">
            List Your Property
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#091B29] dark:text-white mt-1">
            Add New Property
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-light">
            Enter your property details, location, amenities, photos, and room types.
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Validation Errors Summary */}
        {submitAttempted && !isFormValid && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-rose-700 dark:text-rose-300 text-xs space-y-1.5">
            <span className="font-bold flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Please complete the required fields before submitting ({Object.keys(errors).length} issue(s)):</span>
            </span>
            <ul className="list-disc pl-6 space-y-0.5 text-[11px]">
              {Object.entries(errors).map(([k, msg]) => (
                <li key={k}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold">{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-10 text-xs">
          {/* SECTION 1: PROPERTY INFORMATION */}
          <div className="space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <h2 className="text-base font-bold text-[#091B29] dark:text-white flex items-center space-x-2">
                <Home className="w-4 h-4 text-orange-500" />
                <span>Property Information</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Property Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Misty Valley Retreat"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => handleBlur('name')}
                  className={`w-full p-2.5 bg-white dark:bg-slate-900 border rounded-xl font-medium text-slate-900 dark:text-white focus:outline-hidden transition-colors ${
                    (touched.name || submitAttempted) && errors.name
                      ? 'border-rose-500 bg-rose-50/20'
                      : 'border-slate-200 dark:border-slate-800 focus:border-orange-500'
                  }`}
                />
                {(touched.name || submitAttempted) && errors.name && (
                  <p className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.name}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Property Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                >
                  {propertyTypes.map((t) => (
                    <option key={t} value={t} className="dark:bg-slate-900 text-slate-900 dark:text-white">
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Description <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400">
                  {description.trim().length} chars (min 20)
                </span>
              </div>
              <textarea
                rows={3}
                required
                placeholder="Describe the atmosphere, surroundings, views, architectural style, and highlights of your stay..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => handleBlur('description')}
                className={`w-full p-2.5 bg-white dark:bg-slate-900 border rounded-xl text-slate-900 dark:text-white focus:outline-hidden transition-colors ${
                  (touched.description || submitAttempted) && errors.description
                    ? 'border-rose-500 bg-rose-50/20'
                    : 'border-slate-200 dark:border-slate-800 focus:border-orange-500'
                }`}
              />
              {(touched.description || submitAttempted) && errors.description && (
                <p className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.description}</span>
                </p>
              )}
            </div>
          </div>

          {/* SECTION 2: LOCATION */}
          <div className="space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <h2 className="text-base font-bold text-[#091B29] dark:text-white flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-orange-500" />
                <span>Location</span>
              </h2>
            </div>

            {/* Pincode & City/State lookup */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Pincode */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Postal Pincode <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="e.g. 685612"
                    value={pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    onBlur={() => handleBlur('pincode')}
                    className={`w-full p-2.5 bg-white dark:bg-slate-900 border rounded-xl font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden ${
                      (touched.pincode || submitAttempted) && errors.pincode
                        ? 'border-rose-500 bg-rose-50/20'
                        : pincodeVerified
                        ? 'border-emerald-500 bg-emerald-50/10'
                        : 'border-slate-200 dark:border-slate-800 focus:border-orange-500'
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                    {pincodeLoading && <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />}
                    {pincodeVerified && !pincodeLoading && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                </div>

                {(touched.pincode || submitAttempted) && errors.pincode && (
                  <p className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.pincode}</span>
                  </p>
                )}

                {pincodeError && (
                  <p className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{pincodeError}</span>
                  </p>
                )}
              </div>

              {/* City */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  City / Destination <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Munnar"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onBlur={() => handleBlur('city')}
                  className={`w-full p-2.5 bg-white dark:bg-slate-900 border rounded-xl font-medium text-slate-900 dark:text-white focus:outline-hidden ${
                    (touched.city || submitAttempted) && errors.city
                      ? 'border-rose-500 bg-rose-50/20'
                      : 'border-slate-200 dark:border-slate-800 focus:border-orange-500'
                  }`}
                />
                {(touched.city || submitAttempted) && errors.city && (
                  <p className="text-[11px] text-rose-500 font-semibold mt-1">
                    {errors.city}
                  </p>
                )}
              </div>

              {/* State */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  State <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kerala"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  onBlur={() => handleBlur('state')}
                  className={`w-full p-2.5 bg-white dark:bg-slate-900 border rounded-xl font-medium text-slate-900 dark:text-white focus:outline-hidden ${
                    (touched.state || submitAttempted) && errors.state
                      ? 'border-rose-500 bg-rose-50/20'
                      : 'border-slate-200 dark:border-slate-800 focus:border-orange-500'
                  }`}
                />
                {(touched.state || submitAttempted) && errors.state && (
                  <p className="text-[11px] text-rose-500 font-semibold mt-1">
                    {errors.state}
                  </p>
                )}
              </div>
            </div>

            {/* Locality suggestions if found */}
            {availablePostOffices.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Select Locality under Pincode {pincode}:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {availablePostOffices.map((poName) => {
                    const isSelected = selectedPostOffice === poName;
                    return (
                      <button
                        key={poName}
                        type="button"
                        onClick={() => handleSelectPostOffice(poName)}
                        className={`px-3 py-1 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                          isSelected
                            ? 'bg-orange-500 text-white border-orange-500 font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-orange-500 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{poName}</span>
                        {isSelected && <Check className="w-3 h-3 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Street Address & Country */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-3">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Street Address / Locality <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Auto-centers map pin</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pallivasal Tea Estate Road, Chithirapuram PO"
                  value={address}
                  onChange={(e) => handleStreetAddressChange(e.target.value)}
                  onBlur={() => {
                    handleBlur('address');
                    if (address.trim().length >= 3) {
                      geocodeStreetAndPincode(address, pincode, city, state, selectedPostOffice);
                    }
                  }}
                  className={`w-full p-2.5 bg-white dark:bg-slate-900 border rounded-xl text-slate-900 dark:text-white focus:outline-hidden ${
                    (touched.address || submitAttempted) && errors.address
                      ? 'border-rose-500 bg-rose-50/20'
                      : 'border-slate-200 dark:border-slate-800 focus:border-orange-500'
                  }`}
                />

                {/* Live locating and map centering status */}
                {geocodingPincode && (
                  <p className="text-[11px] text-orange-500 font-semibold flex items-center space-x-1.5 mt-1.5 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span>Locating "{address || 'street'}" in Pincode {pincode || 'area'}...</span>
                  </p>
                )}

                {!geocodingPincode && locationFeedback && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1.5 mt-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{locationFeedback}</span>
                  </p>
                )}

                {(touched.address || submitAttempted) && errors.address && (
                  <p className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.address}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Country <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>
            </div>

            {/* Map Location */}
            <div className="pt-2 space-y-1.5">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Map Location <span className="text-rose-500">*</span>
              </label>
              <GoogleMapLocationPicker
                latitude={latitude}
                longitude={longitude}
                onChange={handleMapChange}
                initialCity={city}
                initialState={state}
                initialAddress={address}
                pincode={pincode}
              />
              {(touched.location || submitAttempted) && errors.location && (
                <p className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.location}</span>
                </p>
              )}
            </div>
          </div>

          {/* SECTION 3: CONTACT & STAY DETAILS */}
          <div className="space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <h2 className="text-base font-bold text-[#091B29] dark:text-white flex items-center space-x-2">
                <Phone className="w-4 h-4 text-orange-500" />
                <span>Contact & Stay Details</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* Phone */}
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 font-mono font-bold text-xs text-orange-600 dark:text-orange-400 select-none pointer-events-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    required
                    placeholder="9876543201"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    onBlur={() => handleBlur('contactPhone')}
                    className={`w-full pl-12 pr-3 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-slate-900 dark:text-white font-mono font-bold tracking-wider focus:outline-hidden transition-colors ${
                      (touched.contactPhone || submitAttempted) && errors.contactPhone
                        ? 'border-rose-500 bg-rose-50/20'
                        : 'border-slate-200 dark:border-slate-800 focus:border-orange-500'
                    }`}
                  />
                </div>
                {(touched.contactPhone || submitAttempted) && errors.contactPhone && (
                  <p className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.contactPhone}</span>
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="contact@retreat.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  onBlur={() => handleBlur('contactEmail')}
                  className={`w-full p-2.5 bg-white dark:bg-slate-900 border rounded-xl text-slate-900 dark:text-white focus:outline-hidden ${
                    (touched.contactEmail || submitAttempted) && errors.contactEmail
                      ? 'border-rose-500 bg-rose-50/20'
                      : 'border-slate-200 dark:border-slate-800 focus:border-orange-500'
                  }`}
                />
                {(touched.contactEmail || submitAttempted) && errors.contactEmail && (
                  <p className="text-[11px] text-rose-500 font-semibold mt-1">
                    {errors.contactEmail}
                  </p>
                )}
              </div>

              {/* Check-in Time */}
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Check-in Time
                </label>
                <input
                  type="text"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              {/* Check-out Time */}
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Check-out Time
                </label>
                <input
                  type="text"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>
            </div>

            {/* Cancellation Policy */}
            <div className="space-y-2 pt-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Cancellation & Refund Policy
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Select guest refund percentage if cancelled within 2 days of arrival (100% full refund applies when cancelled 2+ days prior):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {[
                  { pct: 0, label: '0% Refund', sub: 'Strict' },
                  { pct: 25, label: '25% Refund', sub: 'Moderate' },
                  { pct: 50, label: '50% Refund', sub: 'Standard' },
                  { pct: 75, label: '75% Refund', sub: 'Flexible' },
                  { pct: 100, label: '100% Refund', sub: 'Full Refund' },
                ].map((opt) => {
                  const isSelected = cancellationRefundPercentage === opt.pct;
                  return (
                    <button
                      key={opt.pct}
                      type="button"
                      onClick={() => setCancellationRefundPercentage(opt.pct)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer space-y-0.5 ${
                        isSelected
                          ? 'bg-[#087F8C] text-white border-[#087F8C] shadow-sm font-bold'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-[#087F8C]'
                      }`}
                    >
                      <span className="block text-xs font-bold">{opt.label}</span>
                      <span className={`block text-[10px] ${isSelected ? 'text-teal-100' : 'text-slate-400'}`}>
                        {opt.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 4: PROPERTY AMENITIES */}
          <div className="space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-2.5 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#091B29] dark:text-white flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                <span>Property Amenities</span>
              </h2>
              <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                {amenities.length} selected
              </span>
            </div>

            {/* Selected Amenities Pills */}
            {amenities.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Selected Amenities (Click ✕ to remove):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {amenities.map((am) => (
                    <span
                      key={am}
                      className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-orange-500 text-white text-xs font-semibold shadow-xs"
                    >
                      <span>{am}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePropAmenity(am)}
                        className="hover:bg-white/30 rounded-full p-0.5 transition-colors cursor-pointer"
                        title={`Remove ${am}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Amenity Adder */}
            <div className="flex items-center space-x-2 max-w-md">
              <input
                type="text"
                placeholder="Add custom amenity (e.g. Infinity Pool, Ayurveda Spa)"
                value={customPropAmenity}
                onChange={(e) => setCustomPropAmenity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomPropAmenity();
                  }
                }}
                className="flex-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
              />
              <button
                type="button"
                onClick={handleAddCustomPropAmenity}
                className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                + Add
              </button>
            </div>

            {/* Popular Suggestions */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Popular Suggestions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {defaultAmenitiesList.map((am) => {
                  const isChecked = amenities.some((a) => a.toLowerCase() === am.toLowerCase());
                  return (
                    <button
                      key={am}
                      type="button"
                      onClick={() => handleTogglePropAmenity(am)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                        isChecked
                          ? 'bg-orange-500 text-white border-orange-500 shadow-xs font-bold'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-orange-500 hover:text-orange-600'
                      }`}
                    >
                      <span>{am}</span>
                      {isChecked ? (
                        <Check className="w-3.5 h-3.5 text-white ml-0.5" />
                      ) : (
                        <Plus className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 5: PROPERTY PHOTOS */}
          <div className="space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-2.5 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#091B29] dark:text-white flex items-center space-x-2">
                <Image className="w-4 h-4 text-orange-500" />
                <span>Property Photos</span>
              </h2>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {images.length} photo(s)
              </span>
            </div>

            <MultiImageUploadPicker
              title="Add Property Photos"
              label="Add Property Photos"
              hint="Drag & drop photos here or Browse"
              formatsText="JPG, JPEG, PNG"
              images={images}
              onChange={(newImgs) => setImages(newImgs)}
              maxPhotos={10}
              required={true}
            />

            {(touched.images || submitAttempted) && errors.images && (
              <p className="text-[11px] text-rose-500 font-semibold flex items-center space-x-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.images}</span>
              </p>
            )}
          </div>

          {/* SECTION 6: ROOMS & ROOM PHOTOS */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <h2 className="text-base font-bold text-[#091B29] dark:text-white flex items-center space-x-2">
                <Bed className="w-4 h-4 text-emerald-600" />
                <span>Rooms & Room Photos</span>
              </h2>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full">
                {rooms.length} Room Type(s)
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 -mt-3 font-light">
              Add individual room types with their own details, pricing, guest capacity, and room photos.
            </p>

            {/* Room Units List */}
            <div className="space-y-6">
              {rooms.map((room, idx) => {
                const roomNum = idx + 1;
                return (
                  <div
                    key={idx}
                    className="p-5 sm:p-6 rounded-3xl bg-[#FFFDF7]/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs"
                  >
                    {/* Room Header */}
                    <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
                      <div className="flex items-center space-x-2.5">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                          {roomNum}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {room.name ? room.name : `Room Type #${roomNum}`}
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold rounded-md">
                          {room.room_type}
                        </span>
                      </div>

                      {rooms.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRoom(idx)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1.5 rounded-xl transition-colors cursor-pointer text-xs flex items-center space-x-1"
                          title="Remove this room type"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="font-semibold text-[11px]">Remove Room</span>
                        </button>
                      )}
                    </div>

                    {/* Room Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Room Type */}
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Room Type <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={room.room_type}
                          onChange={(e) => handleUpdateRoom(idx, 'room_type', e.target.value)}
                          className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-hidden"
                        >
                          {ROOM_TYPE_OPTIONS.map((rt) => (
                            <option key={rt} value={rt}>
                              {rt}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Room Name */}
                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Room Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Deluxe Valley Room"
                          value={room.name}
                          onChange={(e) => handleUpdateRoom(idx, 'name', e.target.value)}
                          className={`w-full p-2.5 bg-white dark:bg-slate-900 border rounded-xl font-medium text-slate-900 dark:text-white focus:outline-hidden ${
                            submitAttempted && errors[`room_${idx}_name`]
                              ? 'border-rose-500 bg-rose-50/20'
                              : 'border-slate-200 dark:border-slate-800 focus:border-orange-500'
                          }`}
                        />
                        {submitAttempted && errors[`room_${idx}_name`] && (
                          <p className="text-[11px] text-rose-500 font-semibold mt-1">
                            {errors[`room_${idx}_name`]}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Room Description */}
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Description <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={2}
                        required
                        placeholder="Describe room features, view, comfort, bed configuration..."
                        value={room.description}
                        onChange={(e) => handleUpdateRoom(idx, 'description', e.target.value)}
                        className={`w-full p-2.5 bg-white dark:bg-slate-900 border rounded-xl text-slate-900 dark:text-white focus:outline-hidden ${
                          submitAttempted && errors[`room_${idx}_desc`]
                            ? 'border-rose-500 bg-rose-50/20'
                            : 'border-slate-200 dark:border-slate-800 focus:border-orange-500'
                        }`}
                      />
                      {submitAttempted && errors[`room_${idx}_desc`] && (
                        <p className="text-[11px] text-rose-500 font-semibold mt-0.5">
                          {errors[`room_${idx}_desc`]}
                        </p>
                      )}
                    </div>

                    {/* Capacity, Quantity & Price */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Max Guests */}
                      <NumberStepperInput
                        id={`room_${idx}_capacity`}
                        label="Maximum Guests"
                        icon={Users}
                        hint="Guests per room"
                        value={room.capacity}
                        onChange={(val) => handleUpdateRoom(idx, 'capacity', val)}
                        min={1}
                        max={20}
                        step={1}
                        required={true}
                        error={
                          submitAttempted || room.capacity === 0 || (room.capacity !== '' && parseInt(room.capacity, 10) < 1)
                            ? errors[`room_${idx}_capacity`]
                            : ''
                        }
                      />

                      {/* Number of Units */}
                      <NumberStepperInput
                        id={`room_${idx}_quantity`}
                        label="Number of Units"
                        icon={Layers}
                        hint="Available rooms"
                        value={room.quantity}
                        onChange={(val) => handleUpdateRoom(idx, 'quantity', val)}
                        min={1}
                        max={100}
                        step={1}
                        required={true}
                        error={
                          submitAttempted || room.quantity === 0 || (room.quantity !== '' && parseInt(room.quantity, 10) < 1)
                            ? errors[`room_${idx}_quantity`]
                            : ''
                        }
                      />

                      {/* Price per Night */}
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
                          <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Price per Night (₹) <span className="text-rose-500">*</span></span>
                        </label>
                        <input
                          type="number"
                          min="100"
                          step="50"
                          required
                          placeholder="2500"
                          value={room.base_price}
                          onChange={(e) =>
                            handleUpdateRoom(idx, 'base_price', parseFloat(e.target.value) || 0)
                          }
                          className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Room Amenities */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block font-semibold text-slate-700 dark:text-slate-300">
                          Room Amenities
                        </label>
                        <span className="text-[11px] font-semibold text-emerald-600">
                          {(room.amenities || []).length} selected
                        </span>
                      </div>

                      {/* Active Room Amenities */}
                      {(room.amenities || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {(room.amenities || []).map((am) => (
                            <span
                              key={am}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold shadow-xs"
                            >
                              <span>{am}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveRoomAmenity(idx, am)}
                                className="hover:bg-white/30 rounded-full p-0.5 transition-colors cursor-pointer"
                                title={`Remove ${am}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Custom Room Amenity */}
                      <div className="flex items-center space-x-2 max-w-sm">
                        <input
                          type="text"
                          placeholder="Add custom feature (e.g. Jacuzzi, Balcony)"
                          value={customRoomAmenities[idx] || ''}
                          onChange={(e) =>
                            setCustomRoomAmenities((prev) => ({ ...prev, [idx]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustomRoomAmenity(idx);
                            }
                          }}
                          className="flex-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddCustomRoomAmenity(idx)}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                        >
                          + Add
                        </button>
                      </div>

                      {/* Room Presets */}
                      <div className="flex flex-wrap gap-1.5">
                        {AVAILABLE_ROOM_AMENITIES.map((am) => {
                          const isChecked = (room.amenities || []).some(
                            (a) => a.toLowerCase() === am.toLowerCase()
                          );
                          return (
                            <button
                              key={am}
                              type="button"
                              onClick={() => handleToggleRoomAmenity(idx, am)}
                              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                                isChecked
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-bold'
                                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-500'
                              }`}
                            >
                              <span>{am}</span>
                              {isChecked ? (
                                <Check className="w-3 h-3 text-white ml-0.5" />
                              ) : (
                                <Plus className="w-3 h-3 text-slate-400 ml-0.5" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Room Photos */}
                    <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {room.name ? `${room.name} — Room Photos` : `Room Photos (#${roomNum})`}
                      </div>
                      <MultiImageUploadPicker
                        title="Add Room Photos"
                        label="Add Room Photos"
                        hint="Drag & drop photos here or Browse"
                        formatsText="JPG, JPEG, PNG"
                        images={room.images || []}
                        onChange={(newImgs) => handleUpdateRoomImages(idx, newImgs)}
                        maxPhotos={8}
                        required={true}
                      />
                      {submitAttempted && errors[`room_${idx}_images`] && (
                        <p className="text-[11px] text-rose-500 font-semibold flex items-center space-x-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{errors[`room_${idx}_images`]}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* + Add Another Room Button */}
              <button
                type="button"
                onClick={handleAddRoom}
                className="w-full py-3.5 border-2 border-dashed border-emerald-500/60 hover:border-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Another Room</span>
              </button>
            </div>
          </div>

          {/* SECTION 7: FINAL SUBMIT */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-[#c2410c] text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 transition-all text-sm flex items-center justify-center space-x-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Property...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Submit Property & {rooms.length} Room Type(s)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProperty;
