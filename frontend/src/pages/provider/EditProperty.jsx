import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { providerApi } from '../../api/provider';
import { voyaraAiApi } from '../../api/stayguide';
import { MultiImageUploadPicker } from '../../components/common/MultiImageUploadPicker';
import { GoogleMapLocationPicker } from '../../components/common/GoogleMapLocationPicker';
import { NumberStepperInput } from '../../components/common/NumberStepperInput';
import { PropertyHomeRulesForm, DEFAULT_HOME_RULES } from '../../components/property/PropertyHomeRulesForm';
import { PropertyLegalDocumentsSection } from '../../components/property/PropertyLegalDocumentsSection';
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
  Lock,
  Flame,
  MessageSquare,
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

const EXPERIENCE_TYPE_OPTIONS = [
  'Campfire',
  'Guided Trek',
  'Sightseeing',
  'Local Food Experience',
  'Outdoor Activity',
  'Cultural Experience',
  'Adventure',
  'Event',
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
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('');
  const [verificationReason, setVerificationReason] = useState('');

  // 2. Contact & Timings
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutTime, setCheckOutTime] = useState('11:00');
  const [guestInformationMessage, setGuestInformationMessage] = useState('');
  const [cancellationRefundPercentage, setCancellationRefundPercentage] = useState(50);

  // 3. Amenities & Photos
  const [amenities, setAmenities] = useState([]);
  const [customPropAmenity, setCustomPropAmenity] = useState('');
  const [images, setImages] = useState([]);

  // 4. Pincode Lookup
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState('');
  const [pincodeVerified, setPincodeVerified] = useState(false);
  const [availablePostOffices, setAvailablePostOffices] = useState([]);
  const [selectedPostOffice, setSelectedPostOffice] = useState('');
  const [geocodingPincode, setGeocodingPincode] = useState(false);
  const [locationFeedback, setLocationFeedback] = useState('');
  const geocodeRequestIdRef = useRef(0);
  const streetDebounceRef = useRef(null);

  // 5. Rooms State
  const [rooms, setRooms] = useState([]);
  const [customRoomAmenities, setCustomRoomAmenities] = useState({});

  // 6. Property Home Rules State
  const [homeRules, setHomeRules] = useState(DEFAULT_HOME_RULES);

  // Touched state
  const [touched, setTouched] = useState({});

  const propertyTypes = ['Hotel', 'Homestay', 'Resort', 'Camp', 'Cottage', 'Villa'];
  const isLocationLocked = verificationStatus === 'VERIFIED';

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
          setLatitude(prop.latitude !== undefined && prop.latitude !== null ? prop.latitude : null);
          setLongitude(prop.longitude !== undefined && prop.longitude !== null ? prop.longitude : null);
          setContactPhone(prop.contact_phone || '');
          setContactEmail(prop.contact_email || '');
          setCheckInTime(prop.check_in_time || '14:00');
          setCheckOutTime(prop.check_out_time || '11:00');
          setGuestInformationMessage(prop.guest_information_message || '');
          setCancellationRefundPercentage(
            prop.cancellation_refund_percentage !== undefined && prop.cancellation_refund_percentage !== null
              ? prop.cancellation_refund_percentage
              : 50
          );
          setVerificationStatus(prop.verification_status || 'VERIFIED');
          setVerificationReason(prop.verification_reason || '');

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

          // Fetch experiences attached to this stay
          fetchStayExperiences();

          // Fetch Property Home Rules
          try {
            const rulesData = await voyaraAiApi.getPropertyRules(id);
            if (rulesData) {
              setHomeRules(rulesData);
            }
          } catch (rErr) {
            console.warn('Could not fetch property home rules:', rErr);
          }
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

  // Experiences State & Operations
  const [experiences, setExperiences] = useState([]);
  const [expModalOpen, setExpModalOpen] = useState(false);
  const [editingExpId, setEditingExpId] = useState(null);
  const [expTitle, setExpTitle] = useState('');
  const [expType, setExpType] = useState('Guided Trek');
  const [expDesc, setExpDesc] = useState('');
  const [expPrice, setExpPrice] = useState('');
  const [expPricingModel, setExpPricingModel] = useState('per_person');
  const [expCapacity, setExpCapacity] = useState('15');
  const [expDuration, setExpDuration] = useState('3 Hours');
  const [expImageUrl, setExpImageUrl] = useState('');
  const [expIsActive, setExpIsActive] = useState(true);
  const [expSaving, setExpSaving] = useState(false);
  const [expSuccess, setExpSuccess] = useState('');
  const [expError, setExpError] = useState('');

  const fetchStayExperiences = async () => {
    try {
      const expList = await providerApi.getExperiences(id);
      setExperiences(Array.isArray(expList) ? expList : []);
    } catch (e) {
      console.warn('Error fetching stay experiences:', e);
    }
  };

  const handleOpenCreateExpModal = () => {
    setEditingExpId(null);
    setExpTitle('');
    setExpType('Guided Trek');
    setExpDesc('');
    setExpPrice('');
    setExpPricingModel('per_person');
    setExpCapacity('15');
    setExpDuration('3 Hours');
    setExpImageUrl('https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1000&q=80');
    setExpIsActive(true);
    setExpError('');
    setExpModalOpen(true);
  };

  const handleOpenEditExpModal = (exp) => {
    setEditingExpId(exp.id);
    setExpTitle(exp.title || '');
    setExpType(exp.experience_type || 'Guided Trek');
    setExpDesc(exp.description || '');
    setExpPrice(exp.price !== undefined && exp.price !== null ? String(exp.price) : '');
    setExpPricingModel(exp.pricing_model || 'per_person');
    setExpCapacity(exp.capacity !== undefined && exp.capacity !== null ? String(exp.capacity) : '15');
    setExpDuration(exp.duration || '3 Hours');
    setExpImageUrl(exp.image_url || 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1000&q=80');
    setExpIsActive(exp.is_active !== undefined ? exp.is_active : true);
    setExpError('');
    setExpModalOpen(true);
  };

  const handleSaveExpModal = async (e) => {
    e.preventDefault();
    setExpSaving(true);
    setExpError('');
    try {
      const payload = {
        title: expTitle.trim(),
        experience_type: expType,
        description: expDesc.trim(),
        price: parseFloat(expPrice),
        pricing_model: expPricingModel,
        capacity: parseInt(expCapacity, 10),
        duration: expDuration.trim(),
        image_url: expImageUrl,
        is_active: expIsActive,
      };

      if (editingExpId) {
        await providerApi.updateExperience(editingExpId, payload);
        setExpSuccess(`Experience '${expTitle}' updated successfully!`);
      } else {
        await providerApi.createExperience(id, {
          ...payload,
          schedule_type: 'recurring',
        });
        setExpSuccess(`Experience '${expTitle}' created successfully!`);
      }

      setExpModalOpen(false);
      fetchStayExperiences();
      setTimeout(() => setExpSuccess(''), 4000);
    } catch (err) {
      setExpError(err.response?.data?.detail || err.message || 'Failed to save experience.');
    } finally {
      setExpSaving(false);
    }
  };

  const handleDeleteExp = async (expId, titleStr) => {
    if (!window.confirm(`Are you sure you want to delete experience '${titleStr}'?`)) return;
    try {
      await providerApi.deleteExperience(expId);
      setExpSuccess(`Experience '${titleStr}' deleted.`);
      fetchStayExperiences();
      setTimeout(() => setExpSuccess(''), 3000);
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Failed to delete experience.');
    }
  };

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

    if (guestInformationMessage && guestInformationMessage.length > 5000) {
      errs.guestInformationMessage = 'Guest information message must not exceed 5000 characters.';
    }

    if (![0, 25, 50, 75, 100].includes(Number(cancellationRefundPercentage))) {
      errs.cancellationRefundPercentage = 'Please select a valid cancellation refund percentage (0%, 25%, 50%, 75%, or 100%).';
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
  }, [name, description, address, city, state, contactPhone, contactEmail, guestInformationMessage, cancellationRefundPercentage, images, rooms]);

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
        guest_information_message: guestInformationMessage.trim() || undefined,
        cancellation_refund_percentage: parseInt(cancellationRefundPercentage, 10) || 50,
        amenities,
        images: images.map((img) => (typeof img === 'string' ? img : img.image_url)).filter(Boolean),
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

      // 3. Update Property Home Rules
      try {
        await voyaraAiApi.updatePropertyRules(id, homeRules);
      } catch (rErr) {
        console.warn('Could not save property home rules:', rErr);
      }

      setSuccessMessage('All property details, guest message, room inventory, and policies have been saved successfully.');
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
        className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#087F8C] dark:text-[#27B7A8] hover:underline cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Properties</span>
      </button>

      <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-md space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black font-serif text-[#091B29] dark:text-white">
              Edit Property & Room Details
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-light">
              Updates saved here immediately reflect on traveler searches and stay listings.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${verificationStatus === 'VERIFIED'
                  ? 'bg-[#35A66F]/15 text-[#35A66F] border border-[#35A66F]/30'
                  : 'bg-[#F6C945]/15 text-amber-700 dark:text-[#F6C945] border border-[#F6C945]/30'
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
                  className={`w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-hidden transition-colors ${(touched.name || submitAttempted) && errors.name
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
              {isLocationLocked ? (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                  <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>Verified Location Locked</span>
                </span>
              ) : (
                <span className="text-[10px] text-emerald-600 font-bold">India Stays</span>
              )}
            </h3>

            {/* Post-Approval Location Lockdown Notice */}
            {isLocationLocked && (
              <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start space-x-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                      LOCATION
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-800 dark:text-amber-300">
                      {country || 'India'} • {city} • {state} • {pincode}
                    </span>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-300/90 font-medium">
                    🔒 Verified location cannot be changed after approval. If you need a property in another location, please create a new property.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Pincode</span>
                  {isLocationLocked && <Lock className="w-3 h-3 text-slate-400" />}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    disabled={isLocationLocked}
                    readOnly={isLocationLocked}
                    placeholder="Enter Indian pincode"
                    value={pincode}
                    onChange={(e) => !isLocationLocked && handlePincodeChange(e.target.value)}
                    className={`w-full p-2.5 rounded-xl font-mono font-bold ${isLocationLocked
                        ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed select-all'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500'
                      }`}
                  />
                  {pincodeLoading && !isLocationLocked && (
                    <Loader2 className="w-4 h-4 text-orange-500 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>City / Destination *</span>
                  {isLocationLocked && <Lock className="w-3 h-3 text-slate-400" />}
                </label>
                <input
                  type="text"
                  required
                  disabled={isLocationLocked}
                  readOnly={isLocationLocked}
                  value={city}
                  onChange={(e) => !isLocationLocked && setCity(e.target.value)}
                  className={`w-full p-2.5 rounded-xl font-semibold ${isLocationLocked
                      ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed select-all'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500'
                    }`}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>State *</span>
                  {isLocationLocked && <Lock className="w-3 h-3 text-slate-400" />}
                </label>
                <input
                  type="text"
                  required
                  disabled={isLocationLocked}
                  readOnly={isLocationLocked}
                  value={state}
                  onChange={(e) => !isLocationLocked && setState(e.target.value)}
                  className={`w-full p-2.5 rounded-xl font-semibold ${isLocationLocked
                      ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed select-all'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500'
                    }`}
                />
              </div>
            </div>

            {/* Locality Selector if returned by Pincode API (editable mode only) */}
            {!isLocationLocked && availablePostOffices.length > 0 && (
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
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs flex items-center space-x-1.5 ${isSelected
                            ? 'bg-gradient-to-r from-orange-500 to-[#EA580C] text-white border-orange-500 shadow-xs font-bold'
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
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Street Address / Locality *</span>
                {isLocationLocked ? (
                  <Lock className="w-3 h-3 text-slate-400" />
                ) : (
                  <span className="text-[10px] text-slate-400 font-normal">Auto-centers map pin</span>
                )}
              </label>
              <input
                type="text"
                required
                disabled={isLocationLocked}
                readOnly={isLocationLocked}
                value={address}
                onChange={(e) => !isLocationLocked && handleStreetAddressChange(e.target.value)}
                onBlur={() => {
                  handleBlur('address');
                  if (!isLocationLocked && address.trim().length >= 3) {
                    geocodeStreetAndPincode(address, pincode, city, state, selectedPostOffice);
                  }
                }}
                className={`w-full p-2.5 rounded-xl ${isLocationLocked
                    ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed select-all'
                    : 'bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500'
                  }`}
              />

              {/* Live locating and map centering status */}
              {!isLocationLocked && geocodingPincode && (
                <p className="text-[11px] text-orange-500 font-semibold flex items-center space-x-1.5 mt-1.5 animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span>Locating "{address || 'street'}" in Pincode {pincode || 'area'}...</span>
                </p>
              )}

              {!isLocationLocked && !geocodingPincode && locationFeedback && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1.5 mt-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{locationFeedback}</span>
                </p>
              )}
            </div>

            <div className="pt-2">
              <GoogleMapLocationPicker
                latitude={latitude}
                longitude={longitude}
                onChange={!isLocationLocked ? handleMapChange : () => { }}
                initialCity={city}
                initialState={state}
                initialAddress={address}
                pincode={pincode}
                readOnly={isLocationLocked}
              />
            </div>
          </div>

          {/* 3. Host Contact & Timings */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center space-x-2">
              <Phone className="w-4 h-4 text-orange-500" />
              <span>3. Stay Partner Contact & Timings</span>
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
                    className={`w-full pl-12 pr-3 py-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border rounded-xl text-slate-900 dark:text-white font-mono font-bold tracking-wider focus:outline-hidden transition-colors ${(touched.contactPhone || submitAttempted) && errors.contactPhone
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

          {/* Guest Information & Safety Message */}
          <div className="space-y-4 p-6 rounded-3xl bg-[#FFF8F0]/60 dark:bg-slate-900/60 border border-orange-200/80 dark:border-teal-900/40 shadow-xs">
            <div className="border-b border-slate-200/80 dark:border-slate-800 pb-3 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-orange-500" />
                  <span>Guest Information & Safety Message</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  Add important information that guests should know after booking this property.
                </p>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border ${guestInformationMessage.length > 4500
                  ? 'bg-rose-500/10 text-rose-600 border-rose-300 dark:border-rose-800'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}>
                {guestInformationMessage.length} / 5000 characters
              </span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Message for Guests
              </label>
              <textarea
                rows={8}
                maxLength={5000}
                value={guestInformationMessage}
                onChange={(e) => setGuestInformationMessage(e.target.value)}
                placeholder={"Welcome to our property!\n\nPlease follow these safety and property guidelines:\n• Carry a valid ID during check-in.\n• Check-in time is 2:00 PM.\n• Check-out time is 11:00 AM.\n• Please keep valuables safely with you.\n• Smoking is not allowed inside rooms.\n• Please maintain quiet hours after 10:00 PM.\n• Contact the property reception if you need assistance.\n\nProperty contact:\n+91 XXXXX XXXXX\n\nWe look forward to welcoming you."}
                className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 leading-relaxed custom-scrollbar shadow-xs"
              />
              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                <span>Automatically sent to travelers when their booking is confirmed and visible on their Booking Details.</span>
              </div>
            </div>
          </div>

          {/* Cancellation Policy Setting */}
          <div className="space-y-4 p-6 rounded-3xl bg-[#FFF8F0]/60 dark:bg-slate-900/60 border border-orange-200/80 dark:border-teal-900/40 shadow-xs">
            <div className="border-b border-slate-200/80 dark:border-slate-800 pb-3 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-orange-500" />
                  <span>Cancellation & Refund Policy</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  Configure the refund percentage guests receive if they cancel within 2 days of check-in.
                </p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                100% Free Cancellation Tier: 2+ Days Prior
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <strong className="text-[#091B29] dark:text-white block font-semibold">Voyara Cancellation Standards:</strong>
                <ul className="list-disc list-inside text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                  <li><strong>Free Cancellation:</strong> Guests receive 100% full refund if cancelled $\ge$ 2 days before check-in date.</li>
                  <li><strong>Final 2 Days:</strong> Guest receives your selected refund % below until <strong>06:00:00 AM IST</strong> on the check-in date.</li>
                  <li><strong>Retained Split:</strong> Any retained amount is split as <strong>90% Stay Partner payout</strong> and <strong>10% Voyara platform fee</strong>.</li>
                  <li><strong>Check-In Day Cutoff:</strong> At or after 06:00 AM IST on check-in day, cancellation is closed with 0% refund.</li>
                </ul>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                {[
                  { pct: 0, label: '0% Refund', sub: 'Strict (Partner retains 100%)' },
                  { pct: 25, label: '25% Refund', sub: 'Moderate (Partner retains 75%)' },
                  { pct: 50, label: '50% Refund', sub: 'Standard (Recommended)' },
                  { pct: 75, label: '75% Refund', sub: 'Flexible (Partner retains 25%)' },
                  { pct: 100, label: '100% Refund', sub: 'Flexible (Full refund)' },
                ].map((opt) => {
                  const selected = cancellationRefundPercentage === opt.pct;
                  return (
                    <button
                      key={opt.pct}
                      type="button"
                      onClick={() => setCancellationRefundPercentage(opt.pct)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer space-y-1 ${selected
                          ? 'bg-gradient-to-tr from-[#087F8C] to-[#17324D] text-white border-[#087F8C] shadow-md shadow-[#087F8C]/20'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-[#087F8C]/50'
                        }`}
                    >
                      <strong className="block text-sm font-serif">{opt.label}</strong>
                      <span className={`block text-[10px] ${selected ? 'text-teal-200' : 'text-slate-400'}`}>
                        {opt.sub}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2">
                <span>Current policy: <strong>{cancellationRefundPercentage}% refund</strong> for cancellations under 2 days before check-in.</span>
              </div>
            </div>
          </div>

          {/* 4. Property Amenities */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-orange-500" />
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
                      className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-orange-500 to-[#EA580C] text-white text-xs font-bold shadow-xs"
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
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${checked
                          ? 'bg-gradient-to-r from-orange-500 to-[#EA580C] text-white border-orange-500 shadow-2xs font-bold'
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
                        <span className="text-[10px] px-2 py-0.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold rounded-md uppercase">
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
                                className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer flex items-center space-x-1 ${checked
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

          {/* SECTION 7: EXPERIENCES & ACTIVITIES AT THIS STAY */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <div className="flex items-center space-x-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <h2 className="text-base font-bold text-[#091B29] dark:text-white">
                  Experiences & Activities at this Stay
                </h2>
              </div>
              <span className="text-xs font-bold text-orange-700 dark:text-orange-300 bg-orange-500/15 px-2.5 py-0.5 rounded-full">
                {experiences.length} Experience(s)
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 -mt-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-light">
                Manage multiple guided treks, campfires, workshops, and outdoor activities attached to this stay.
              </p>
              <button
                type="button"
                onClick={handleOpenCreateExpModal}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-[#c2410c] text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Experience</span>
              </button>
            </div>

            {expSuccess && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="font-semibold">{expSuccess}</span>
              </div>
            )}

            {experiences.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[#FFF8F0]/40 dark:bg-slate-900/40 border border-orange-200/60 dark:border-slate-800 text-center space-y-2">
                <Flame className="w-8 h-8 text-orange-400 mx-auto" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  No experiences attached yet
                </h4>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Offer plantation walks, campfires, or river rafting to enhance guest bookings.
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreateExpModal}
                  className="inline-flex items-center space-x-1 px-4 py-2 bg-orange-500 text-white font-bold rounded-xl text-xs shadow-xs hover:bg-orange-600 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Experience</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {experiences.map((exp) => (
                  <div
                    key={exp.id}
                    className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-16/9 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <img
                          src={exp.image_url || 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=800&q=80'}
                          alt={exp.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#091B29]/85 text-white backdrop-blur-xs">
                            {exp.experience_type}
                          </span>
                          {exp.is_active === false && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                            {exp.title}
                          </h4>
                          <span className="text-xs font-bold text-orange-600 dark:text-orange-400 shrink-0">
                            ₹{exp.price?.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                          {exp.description}
                        </p>
                        <div className="text-[10px] text-slate-400 flex items-center space-x-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span>Max {exp.capacity} Guests</span>
                          <span>•</span>
                          <span>{exp.duration}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditExpModal(exp)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-[#087F8C]/10 hover:bg-[#087F8C]/20 text-[#087F8C] dark:text-[#27B7A8] font-bold rounded-lg transition-colors cursor-pointer text-xs"
                        title="Edit Experience"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteExp(exp.id, exp.title)}
                        className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Delete Experience"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 8. Voyara Trust & Platform Verification Notice */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-[#087F8C]/10 via-[#0F273D]/5 to-[#087F8C]/10 border border-[#087F8C]/30 text-xs space-y-3">
            <div className="flex items-center space-x-2.5 text-[#087F8C] dark:text-[#27B7A8]">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold font-serif">Voyara Trust Assessment Standards</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-light">
              Voyara evaluates stay partner and property trust using multiple platform signals (phone verification, email verification, authentic photos, pricing consistency, accurate location, and complete profile). It does not legally certify property ownership.
            </p>
          </div>

          {/* Property Legal Authorization & Document Dossier */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <PropertyLegalDocumentsSection
              propertyId={id}
              property={property}
              onDocumentsUpdated={fetchProperty}
            />
          </div>

          {/* Property Home Rules & Guest Policies */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <PropertyHomeRulesForm rules={homeRules} onChange={setHomeRules} />
          </div>

          {/* Save CTA */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <button
              type="submit"
              disabled={saveLoading}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-[#c2410c] text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 transition-all text-sm flex items-center justify-center space-x-2 cursor-pointer"
            >
              {saveLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Embedded Experience Modal */}
      {expModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl border border-slate-200 dark:border-slate-800 custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  <Flame className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-[#091B29] dark:text-white">
                    {editingExpId ? 'Edit Experience Details' : 'Add Experience to Stay'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Attach adventure, cultural, or culinary activity</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExpModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {expError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{expError}</span>
              </div>
            )}

            <form onSubmit={handleSaveExpModal} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Experience Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Starlit Campfire & Acoustic Night"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Type *</label>
                  <select
                    value={expType}
                    onChange={(e) => setExpType(e.target.value)}
                    className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    {EXPERIENCE_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t} className="dark:bg-slate-900 text-slate-900 dark:text-white">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Pricing Model</label>
                  <select
                    value={expPricingModel}
                    onChange={(e) => setExpPricingModel(e.target.value)}
                    className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="per_person" className="dark:bg-slate-900 text-slate-900 dark:text-white">
                      Per Person
                    </option>
                    <option value="fixed" className="dark:bg-slate-900 text-slate-900 dark:text-white">
                      Fixed Price
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="50"
                    placeholder="1200"
                    value={expPrice}
                    onChange={(e) => setExpPrice(e.target.value)}
                    className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Capacity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={expCapacity}
                    onChange={(e) => setExpCapacity(e.target.value)}
                    className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Duration</label>
                  <input
                    type="text"
                    required
                    value={expDuration}
                    onChange={(e) => setExpDuration(e.target.value)}
                    className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Describe the activity itinerary, equipment provided, departure point..."
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <ImageUploadPicker
                label="Experience Photo Upload"
                hint="Upload experience image directly to local storage"
                value={expImageUrl}
                onChange={(url) => setExpImageUrl(url)}
              />

              {editingExpId && (
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <div>
                    <label className="font-bold text-slate-800 dark:text-slate-200 text-xs">Active Status</label>
                    <p className="text-[10px] text-slate-500">Allow travelers to discover and book this experience</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={expIsActive}
                      onChange={(e) => setExpIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              )}

              <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setExpModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={expSaving}
                  className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-[#c2410c] text-white font-bold rounded-xl cursor-pointer disabled:opacity-50 shadow-md shadow-orange-500/20 transition-all text-xs"
                >
                  {expSaving ? 'Saving...' : editingExpId ? 'Save Changes' : 'Add Experience'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditProperty;
