import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { providerApi } from '../../api/provider';
import { MultiImageUploadPicker } from '../../components/common/MultiImageUploadPicker';
import { GoogleMapLocationPicker } from '../../components/common/GoogleMapLocationPicker';
import { DocumentUploadPicker } from '../../components/common/DocumentUploadPicker';
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
  Save,
  X,
  AlertTriangle,
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

const DEFAULT_PROPERTY_AMENITIES = [
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

export const EditProperty = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [initialLoading, setInitialLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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
  const [verificationStatus, setVerificationStatus] = useState('VERIFIED');
  const [verificationReason, setVerificationReason] = useState('');

  // 2. Contact & Timings
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutTime, setCheckOutTime] = useState('11:00');

  // 3. Amenities, Photos & Verification Proof
  const [amenities, setAmenities] = useState([]);
  const [customPropAmenity, setCustomPropAmenity] = useState('');
  const [images, setImages] = useState([]);
  const [ownershipProofUrl, setOwnershipProofUrl] = useState('');

  // 4. Pincode Lookup
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState('');
  const [pincodeVerified, setPincodeVerified] = useState(false);
  const [availablePostOffices, setAvailablePostOffices] = useState([]);
  const [selectedPostOffice, setSelectedPostOffice] = useState('');
  const [geocodingPincode, setGeocodingPincode] = useState(false);
  const geocodeRequestIdRef = useRef(0);

  // 5. Rooms State
  const [rooms, setRooms] = useState([]);
  const [customRoomAmenities, setCustomRoomAmenities] = useState({});

  // Touched state
  const [touched, setTouched] = useState({});

  const propertyTypes = ['Hotel', 'Homestay', 'Resort', 'Camp', 'Cottage', 'Villa'];

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Fetch initial property details
  useEffect(() => {
    const fetchPropertyData = async () => {
      setInitialLoading(true);
      setError('');
      try {
        const prop = await providerApi.getProperty(id);
        if (prop) {
          setName(prop.name || '');
          setPropertyType(prop.property_type || 'Resort');
          setDescription(prop.description || '');
          setAddress(prop.address || '');
          setCity(prop.city || '');
          setState(prop.state || '');
          setCountry(prop.country || 'India');
          setLocationDetails(prop.location_details || '');
          setLatitude(prop.latitude || 10.0889);
          setLongitude(prop.longitude || 77.0595);
          setContactPhone(prop.contact_phone || '');
          setContactEmail(prop.contact_email || '');
          setCheckInTime(prop.check_in_time || '14:00');
          setCheckOutTime(prop.check_out_time || '11:00');
          setVerificationStatus(prop.verification_status || 'VERIFIED');
          setVerificationReason(prop.verification_reason || '');
          setOwnershipProofUrl(prop.ownership_proof_url || '');

          // Extract pincode from address if present
          const pinMatch = (prop.address || '').match(/\b([1-9][0-9]{5})\b/);
          if (pinMatch) {
            setPincode(pinMatch[1]);
            setPincodeVerified(true);
          }

          // Amenities
          const amNames = (prop.amenities || []).map((a) => (typeof a === 'string' ? a : a.amenity_name)).filter(Boolean);
          setAmenities(amNames);

          // Images
          const imgUrls = (prop.images || []).map((img) => (typeof img === 'string' ? img : img.image_url)).filter(Boolean);
          setImages(imgUrls);

          // Rooms
          const roomList = (prop.rooms || []).map((r) => ({
            id: r.id,
            name: r.name || '',
            room_type: r.room_type || 'Deluxe Room',
            description: r.description || '',
            capacity: r.capacity || 2,
            quantity: r.quantity || 1,
            base_price: r.base_price || 2000,
            amenities: (r.amenities || []).map((a) => (typeof a === 'string' ? a : a.amenity_name)).filter(Boolean),
            images: (r.images || []).map((img) => (typeof img === 'string' ? img : img.image_url)).filter(Boolean),
            is_active: r.is_active !== undefined ? r.is_active : true,
          }));
          setRooms(roomList);
        }
      } catch (err) {
        setError(err.response?.data?.detail || err.message || 'Failed to load property details.');
      } finally {
        setInitialLoading(false);
      }
    };

    if (id) {
      fetchPropertyData();
    }
  }, [id]);

  // --- Amenities Handlers ---
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

  // --- Room Handlers ---
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
        is_active: true,
      },
    ]);
  };

  const handleRemoveRoom = async (index) => {
    const targetRoom = rooms[index];
    if (targetRoom.id) {
      if (!window.confirm(`Are you sure you want to delete room unit '${targetRoom.name || 'this room'}'?`)) return;
      try {
        await providerApi.deleteRoom(targetRoom.id);
      } catch (err) {
        alert(err.message || 'Failed to delete room unit from database.');
        return;
      }
    }
    setRooms((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateRoom = (index, field, value) => {
    setRooms((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
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

  // --- Map and Pincode Handlers ---
  const geocodeAndMoveMap = async (placeQuery, fallbackCity, fallbackState, isLocalitySpecific = false) => {
    setGeocodingPincode(true);
    const reqId = ++geocodeRequestIdRef.current;
    try {
      const queriesToTry = isLocalitySpecific
        ? [
            [placeQuery, fallbackCity && fallbackCity !== placeQuery ? fallbackCity : '', fallbackState, 'India'].filter(Boolean).join(', '),
            [placeQuery, fallbackState, 'India'].filter(Boolean).join(', '),
            [placeQuery, fallbackCity, 'India'].filter(Boolean).join(', '),
            [placeQuery, 'India'].filter(Boolean).join(', '),
          ]
        : [
            [placeQuery, fallbackCity && fallbackCity !== placeQuery ? fallbackCity : '', fallbackState, 'India'].filter(Boolean).join(', '),
            [placeQuery, fallbackState, 'India'].filter(Boolean).join(', '),
            [fallbackCity, fallbackState, 'India'].filter(Boolean).join(', '),
            [placeQuery, 'India'].filter(Boolean).join(', '),
          ];

      const uniqueQueries = [...new Set(queriesToTry)];

      for (const q of uniqueQueries) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              q
            )}&countrycodes=in&limit=1&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'en',
                'User-Agent': 'Voyara-Pincode-Geocoding/1.0',
              },
            }
          );

          if (res.ok) {
            const data = await res.json();
            if (reqId !== geocodeRequestIdRef.current) return;
            if (Array.isArray(data) && data.length > 0) {
              const newLat = parseFloat(parseFloat(data[0].lat).toFixed(6));
              const newLng = parseFloat(parseFloat(data[0].lon).toFixed(6));
              if (newLat >= 6.5 && newLat <= 37.5 && newLng >= 68.0 && newLng <= 97.5) {
                setLatitude(newLat);
                setLongitude(newLng);
                break;
              }
            }
          }
        } catch (subErr) {
          console.warn(`Geocoding query "${q}" failed:`, subErr);
        }
      }
    } catch (e) {
      console.warn('Geocoding place warning:', e);
    } finally {
      if (reqId === geocodeRequestIdRef.current) {
        setGeocodingPincode(false);
      }
    }
  };

  const handleMapChange = (loc) => {
    if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
      setLatitude(loc.latitude);
      setLongitude(loc.longitude);
    } else if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
      setLatitude(parseFloat(loc.lat.toFixed(6)));
      setLongitude(parseFloat(loc.lng.toFixed(6)));
    }

    if (loc && loc.formatted_address) {
      setAddress(loc.formatted_address);
    } else if (loc && loc.place_name) {
      setAddress(loc.place_name);
    }

    if (loc && loc.city && (!city || city === '')) {
      setCity(loc.city);
    }
    if (loc && loc.state && (!state || state === '')) {
      setState(loc.state);
    }
    if (loc && loc.pincode && !pincode && /^[1-9][0-9]{5}$/.test(loc.pincode)) {
      setPincode(loc.pincode);
    }
  };

  const handlePincodeChange = async (val) => {
    const clean = val.replace(/\D/g, '').slice(0, 6);
    setPincode(clean);
    setPincodeError('');
    setPincodeVerified(false);
    setAvailablePostOffices([]);
    setSelectedPostOffice('');

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
          const newAddr = `${defaultPlace}, ${targetDistrict}`;
          setAddress(newAddr);

          geocodeAndMoveMap(defaultPlace, targetDistrict, targetState, false);
        }
      } catch (err) {
        setPincodeError('Could not verify pincode. Please check the 6-digit postal code.');
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const handleSelectPostOffice = (placeName) => {
    if (placeName) {
      setSelectedPostOffice(placeName);
      const newAddr = `${placeName}, ${city || state}`;
      setAddress(newAddr);
      geocodeAndMoveMap(placeName, city, state, true);
    }
  };

  // --- Live Validation Rules ---
  const errors = useMemo(() => {
    const errs = {};

    if (!name.trim()) errs.name = 'Property name is required.';
    else if (name.trim().length < 3) errs.name = 'Property name must be at least 3 characters.';

    if (!description.trim()) errs.description = 'Property description is required.';
    else if (description.trim().length < 20) errs.description = 'Description must be at least 20 characters.';

    if (!address.trim()) errs.address = 'Street address is required.';

    if (!city.trim()) errs.city = 'City is required.';
    if (!state.trim()) errs.state = 'State is required.';

    // 10. Contact Phone (Strict 10-digit Indian Mobile Number)
    const cleanPhone = contactPhone.replace(/\D/g, '');
    if (!cleanPhone) {
      errs.contactPhone = '10-digit Indian mobile number is required.';
    } else if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      errs.contactPhone = 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9 (e.g. 9847012345).';
    }

    if (!contactEmail.trim()) {
      errs.contactEmail = 'Contact email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      errs.contactEmail = 'Please enter a valid email address.';
    }

    if (images.length === 0) {
      errs.images = 'At least one property photo is required.';
    }

    if (rooms.length === 0) {
      errs.rooms = 'At least one room unit must be configured for this property.';
    } else {
      rooms.forEach((r, idx) => {
        const num = idx + 1;
        if (!r.name.trim()) errs[`room_${idx}_name`] = `Room #${num}: Title is required.`;
        if (!r.description.trim() || r.description.trim().length < 10) {
          errs[`room_${idx}_desc`] = `Room #${num}: Description must be at least 10 characters.`;
        }
        const cap = typeof r.capacity === 'number' ? r.capacity : parseInt(r.capacity, 10);
        if (r.capacity === '' || isNaN(cap) || cap < 1) {
          errs[`room_${idx}_capacity`] = `Room #${num}: Guest capacity must be at least 1.`;
        }
        const qty = typeof r.quantity === 'number' ? r.quantity : parseInt(r.quantity, 10);
        if (r.quantity === '' || isNaN(qty) || qty < 1) {
          errs[`room_${idx}_quantity`] = `Room #${num}: Available units must be at least 1.`;
        }
        if (!r.base_price || r.base_price < 100) {
          errs[`room_${idx}_price`] = `Room #${num}: Price per night must be at least ₹100.`;
        }
        if (!r.images || r.images.length === 0) {
          errs[`room_${idx}_images`] = `Room #${num}: At least one room photo is required.`;
        }
      });
    }

    return errs;
  }, [name, description, address, city, state, contactPhone, contactEmail, images, rooms]);

  const isFormValid = Object.keys(errors).length === 0;

  // --- Submit Handler ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setError('');
    setSuccessMessage('');

    if (!isFormValid) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaveLoading(true);

    try {
      const cleanPhone = contactPhone.replace(/[\s\-()]/g, '');
      const phoneDigits = cleanPhone.startsWith('+91')
        ? cleanPhone.slice(3)
        : cleanPhone.startsWith('91') && cleanPhone.length === 12
        ? cleanPhone.slice(2)
        : cleanPhone;

      const propertyPayload = {
        name: name.trim(),
        property_type: propertyType,
        description: description.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim() || 'India',
        location_details: locationDetails.trim() || undefined,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        contact_phone: phoneDigits,
        contact_email: contactEmail.trim(),
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        amenities,
        images: images.map((img) => (typeof img === 'string' ? img : img.image_url)).filter(Boolean),
        ownership_proof_url: ownershipProofUrl || undefined,
      };

      // 1. Update Property details in DB
      await providerApi.updateProperty(id, propertyPayload);

      // 2. Update / Create rooms in DB
      for (const room of rooms) {
        const roomPayload = {
          name: room.name.trim(),
          room_type: room.room_type.trim(),
          description: room.description.trim(),
          capacity: parseInt(room.capacity, 10) || 2,
          quantity: parseInt(room.quantity, 10) || 1,
          base_price: parseFloat(room.base_price) || 1000,
          is_active: room.is_active !== undefined ? room.is_active : true,
          amenities: room.amenities || [],
          images: (room.images || []).map((img) => (typeof img === 'string' ? img : img.image_url)).filter(Boolean),
        };

        if (room.id) {
          await providerApi.updateRoom(room.id, roomPayload);
        } else {
          await providerApi.createRoom(id, roomPayload);
        }
      }

      setSuccessMessage('Property & room details have been saved successfully and updated live.');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      setTimeout(() => {
        navigate('/provider/properties');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to update property details.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaveLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="max-w-4xl mx-auto py-24 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        <span className="text-xs text-slate-500 font-semibold">Loading property & room details...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => navigate('/provider/properties')}
        className="inline-flex items-center space-x-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Properties</span>
      </button>

      <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-6 sm:p-10 border border-[#FDBA9A]/30 dark:border-slate-800 shadow-md space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-orange-500">
              Sanctuary Management
            </span>
            <h2 className="text-2xl sm:text-3xl font-black font-serif text-slate-900 dark:text-white mt-1">
              Edit Property & Room Details
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Updates saved here persist in PostgreSQL and immediately reflect on customer searches and stay listings.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                verificationStatus === 'VERIFIED'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
              }`}
            >
              {verificationStatus === 'VERIFIED' ? '✓ Verified & Live' : verificationStatus}
            </span>
          </div>
        </div>

        {/* Status Alerts */}
        {verificationReason && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-amber-900 dark:text-amber-200 text-xs flex items-start space-x-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Admin Review Feedback</span>
              <p className="text-[11px] italic mt-0.5">"{verificationReason}"</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span className="font-bold">{error}</span>
          </div>
        )}

        {submitAttempted && !isFormValid && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-rose-700 dark:text-rose-300 text-xs space-y-1">
            <span className="font-bold block flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Please review and fix the following {Object.keys(errors).length} issue(s):</span>
            </span>
            <ul className="list-disc pl-6 space-y-0.5 text-[11px]">
              {Object.entries(errors).map(([k, msg]) => (
                <li key={k}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold">{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8 text-xs">
          {/* 1. Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center space-x-2">
              <Home className="w-4 h-4 text-orange-500" />
              <span>1. Basic Property Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Property Name *</span>
                  <span className="text-[10px] text-slate-400 font-normal">Min 3 characters</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => handleBlur('name')}
                  className={`w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-hidden transition-colors ${
                    (touched.name || submitAttempted) && errors.name
                      ? 'border-rose-500 bg-rose-50/20'
                      : 'border-slate-200 dark:border-slate-800 focus:border-orange-500'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Property Type *
                </label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                >
                  {propertyTypes.map((t) => (
                    <option key={t} value={t} className="dark:bg-slate-900 text-slate-900 dark:text-white">
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Description *</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {description.trim().length}/20 min chars
                </span>
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => handleBlur('description')}
                className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-normal text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
              />
            </div>
          </div>

          {/* 2. Location & Map */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-orange-500" />
                <span>2. Location & GPS Position</span>
              </span>
              <span className="text-[10px] text-emerald-600 font-bold">India Stays</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pincode
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 685612"
                    value={pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                  />
                  {pincodeLoading && (
                    <Loader2 className="w-4 h-4 text-orange-500 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  City / Destination *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  State *
                </label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>
            </div>

            {/* Locality Selector if returned by Pincode API */}
            {availablePostOffices.length > 0 && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                  Localities under Pincode {pincode} (Click to set address & move map pin):
                </span>
                <div className="flex flex-wrap gap-2">
                  {availablePostOffices.map((poName) => {
                    const isSelected = selectedPostOffice === poName;
                    return (
                      <button
                        key={poName}
                        type="button"
                        onClick={() => handleSelectPostOffice(poName)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs flex items-center space-x-1.5 ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#F97360] to-orange-500 text-white border-orange-500 shadow-xs font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-orange-500 hover:text-orange-600 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>+ {poName}</span>
                        {isSelected && <Check className="w-3 h-3 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Street Address / Locality *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
              />
            </div>

            <div className="pt-2">
              <GoogleMapLocationPicker
                latitude={latitude}
                longitude={longitude}
                onChange={handleMapChange}
                initialCity={city}
                initialState={state}
                initialAddress={address}
              />
            </div>
          </div>

          {/* 3. Host Contact & Timings */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center space-x-2">
              <Phone className="w-4 h-4 text-orange-500" />
              <span>3. Host Contact & Timings</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Contact Phone (India) *</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {contactPhone.length}/10 digits
                  </span>
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
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    onBlur={() => handleBlur('contactPhone')}
                    className={`w-full pl-12 pr-3 py-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border rounded-xl text-slate-900 dark:text-white font-mono font-bold tracking-wider focus:outline-hidden transition-colors ${
                      (touched.contactPhone || submitAttempted) && errors.contactPhone
                        ? 'border-rose-500 bg-rose-50/20'
                        : touched.contactPhone && !errors.contactPhone && contactPhone.length === 10
                        ? 'border-emerald-500'
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

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Email *
                </label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Check-in Time
                </label>
                <input
                  type="text"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Check-out Time
                </label>
                <input
                  type="text"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* 4. Property Amenities */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                <span>4. Property Amenities & Facilities</span>
              </span>
              <span className="text-[10px] text-orange-600 font-bold">{amenities.length} selected</span>
            </h3>

            {/* Active Amenities Badges */}
            {amenities.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Active Amenities (Click &times; to remove):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {amenities.map((am) => (
                    <span
                      key={am}
                      className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-[#F97360] to-orange-500 text-white text-xs font-bold shadow-xs"
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
                className="flex-1 p-2 bg-[#FFF8F0]/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
              />
              <button
                type="button"
                onClick={handleAddCustomPropAmenity}
                className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                + Add
              </button>
            </div>

            {/* Suggested Presets */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Popular Suggestions (Click to add/remove):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_PROPERTY_AMENITIES.map((am) => {
                  const checked = (amenities || []).some(
                    (a) => a.toLowerCase() === am.toLowerCase()
                  );
                  return (
                    <button
                      key={am}
                      type="button"
                      onClick={() => handleTogglePropAmenity(am)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                        checked
                          ? 'bg-gradient-to-r from-[#F97360] to-orange-500 text-white border-orange-500 shadow-2xs font-bold'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-orange-500 hover:text-orange-600'
                      }`}
                    >
                      <span>{am}</span>
                      {checked ? (
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

          {/* 5. Property Photos */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Image className="w-4 h-4 text-orange-500" />
                <span>5. Property Photos *</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400">{images.length} photo(s)</span>
            </h3>

            <MultiImageUploadPicker
              label="Property Grounds & Common Area Photos"
              hint="Upload actual JPG, JPEG, PNG, or WebP photos stored securely on Voyara server"
              images={images}
              onChange={(newImgs) => setImages(newImgs)}
              maxPhotos={10}
              required={true}
            />
          </div>

          {/* 6. Rooms & Units Configuration */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
                <Bed className="w-4 h-4 text-emerald-600" />
                <span>6. Rooms & Units Inventory ({rooms.length})</span>
              </h3>
            </div>

            <div className="space-y-6">
              {rooms.map((room, idx) => {
                const roomNum = idx + 1;
                return (
                  <div
                    key={room.id || idx}
                    className="p-5 sm:p-6 rounded-3xl bg-[#FFF8F0]/40 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 space-y-5 shadow-xs relative"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/80 pb-3">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                          {roomNum}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {room.name || `Room Unit #${roomNum}`}
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 bg-orange-500/10 text-[#F97360] font-bold rounded-md uppercase">
                          {room.room_type}
                        </span>
                        {room.id && (
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-600 font-bold rounded-md">
                            Saved #ID: {room.id}
                          </span>
                        )}
                      </div>

                      {rooms.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRoom(idx)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1.5 rounded-xl transition-colors cursor-pointer text-xs flex items-center space-x-1"
                          title="Delete this room unit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="font-semibold text-[11px]">Delete Unit</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Room Type / Category *
                        </label>
                        <select
                          value={room.room_type}
                          onChange={(e) => handleUpdateRoom(idx, 'room_type', e.target.value)}
                          className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-hidden"
                        >
                          {ROOM_TYPE_OPTIONS.map((rt) => (
                            <option key={rt} value={rt}>
                              {rt}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Room Name / Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={room.name}
                          onChange={(e) => handleUpdateRoom(idx, 'name', e.target.value)}
                          className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Room Description *
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={room.description}
                        onChange={(e) => handleUpdateRoom(idx, 'description', e.target.value)}
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <NumberStepperInput
                        id={`edit_room_${idx}_capacity`}
                        label="Max Guests Allowed"
                        icon={Users}
                        value={room.capacity}
                        onChange={(val) => handleUpdateRoom(idx, 'capacity', val)}
                        min={1}
                        max={20}
                        step={1}
                        required={true}
                      />

                      <NumberStepperInput
                        id={`edit_room_${idx}_quantity`}
                        label="Number of Units"
                        icon={Layers}
                        value={room.quantity}
                        onChange={(val) => handleUpdateRoom(idx, 'quantity', val)}
                        min={1}
                        max={100}
                        step={1}
                        required={true}
                      />

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
                          <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Price per Night (₹) *</span>
                        </label>
                        <input
                          type="number"
                          min="100"
                          step="50"
                          required
                          value={room.base_price}
                          onChange={(e) =>
                            handleUpdateRoom(idx, 'base_price', parseFloat(e.target.value) || 0)
                          }
                          className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-hidden"
                        />
                      </div>
                    </div>

                    {/* Room Amenities */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block font-bold text-slate-700 dark:text-slate-300">
                          Room Amenities & Features
                        </label>
                        <span className="text-[10px] text-emerald-600 font-bold">
                          {(room.amenities || []).length} features selected
                        </span>
                      </div>

                      {/* Active Badges */}
                      {(room.amenities || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {(room.amenities || []).map((am) => (
                            <span
                              key={am}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold shadow-2xs"
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

                      {/* Custom Room Amenity Input */}
                      <div className="flex items-center space-x-2 max-w-sm">
                        <input
                          type="text"
                          placeholder="Add custom room feature (e.g. Jacuzzi, River View)"
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

                      {/* Suggested Room Presets */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Suggested Room Features (Click to add/remove):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {AVAILABLE_ROOM_AMENITIES.map((am) => {
                            const checked = (room.amenities || []).some(
                              (a) => a.toLowerCase() === am.toLowerCase()
                            );
                            return (
                              <button
                                key={am}
                                type="button"
                                onClick={() => handleToggleRoomAmenity(idx, am)}
                                className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                                  checked
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold'
                                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:text-emerald-600'
                                }`}
                              >
                                <span>{am}</span>
                                {checked ? (
                                  <Check className="w-3 h-3 text-white ml-0.5" />
                                ) : (
                                  <Plus className="w-3 h-3 text-slate-400 ml-0.5" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Room Photos */}
                    <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
                      <MultiImageUploadPicker
                        label={`Photos for Room #${roomNum} (${room.name || room.room_type})`}
                        hint="Upload bedroom, bathroom, and balcony photos for this specific room unit"
                        images={room.images || []}
                        onChange={(newImgs) => handleUpdateRoomImages(idx, newImgs)}
                        maxPhotos={8}
                        required={true}
                      />
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={handleAddRoom}
                className="w-full py-3.5 border-2 border-dashed border-emerald-500/60 hover:border-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Another Room Unit Type</span>
              </button>
            </div>
          </div>

          {/* 7. Ownership Document (if needed to update) */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>7. Legal Ownership Document</span>
              </span>
              <span className="text-[10px] text-emerald-600 font-bold">Admin Only</span>
            </h3>

            <DocumentUploadPicker
              value={ownershipProofUrl}
              onChange={setOwnershipProofUrl}
              label="Property Ownership / Authorization Proof"
              hint="Leave unchanged if already verified, or upload updated ownership/license agreement."
              required={false}
            />
          </div>

          {/* Save CTA */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <button
              type="submit"
              disabled={saveLoading}
              className="w-full py-4 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 transition-all text-sm flex items-center justify-center space-x-2 cursor-pointer"
            >
              {saveLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Property & Room Updates...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save All Property & Room Updates</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProperty;
