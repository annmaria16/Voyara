import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { customerApi } from '../../api/customer';
import { useAuth } from '../../context/AuthContext';
import { VerificationBadge } from '../../components/verification/VerificationBadge';
import { resolveImageUrl } from '../../utils/imageUrl';
import {
  MapPin,
  Star,
  ShieldCheck,
  Calendar,
  Users,
  Clock,
  Flame,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Bed,
  Check,
  AlertCircle
} from 'lucide-react';

export const PropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  // Booking selection state
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2');
  const [roomQuantity, setRoomQuantity] = useState(1);
  const [roomAvailability, setRoomAvailability] = useState(null);
  const [availLoading, setAvailLoading] = useState(false);
  const [selectedExperienceId, setSelectedExperienceId] = useState(null);
  const [experienceParticipants, setExperienceParticipants] = useState('2');
  const [error, setError] = useState('');
  const [reviewsData, setReviewsData] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const minCheckoutDate = checkIn
    ? new Date(new Date(checkIn).getTime() + 86400000).toISOString().split('T')[0]
    : todayStr;

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const [data, revs] = await Promise.all([
          customerApi.getPropertyDetails(id),
          customerApi.getPropertyReviews(id).catch(() => null),
        ]);
        setProperty(data);
        setReviewsData(revs);
        if (data.rooms?.length > 0) {
          setSelectedRoomId(data.rooms[0].id);
        }
      } catch (err) {
        console.error('Error fetching property details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  // Fetch real-time room availability whenever room, checkIn, or checkOut changes
  useEffect(() => {
    if (!selectedRoomId) return;
    let isMounted = true;
    const fetchAvail = async () => {
      setAvailLoading(true);
      try {
        const data = await customerApi.getRoomAvailability(
          selectedRoomId,
          checkIn || undefined,
          checkOut || undefined
        );
        if (!isMounted) return;
        setRoomAvailability(data);

        // Adjust room quantity if exceeds available
        if (data.available_quantity > 0 && roomQuantity > data.available_quantity) {
          setRoomQuantity(data.available_quantity);
        }
      } catch (err) {
        console.error('Error checking room availability:', err);
      } finally {
        if (isMounted) setAvailLoading(false);
      }
    };
    fetchAvail();
    return () => {
      isMounted = false;
    };
  }, [selectedRoomId, checkIn, checkOut]);

  // Derived variables (safely handling null property during initial load)
  const selectedRoom = property?.rooms?.find((r) => r.id === selectedRoomId) || property?.rooms?.[0];
  const selectedExp = property?.experiences?.find((e) => e.id === selectedExperienceId);

  const roomCapacity = roomAvailability?.max_guests || selectedRoom?.capacity || 2;
  const maxAllowedGuests = roomCapacity * roomQuantity;
  const availableRoomsCount = roomAvailability ? roomAvailability.available_quantity : (selectedRoom?.quantity || 1);
  const isRoomSoldOut = roomAvailability ? !roomAvailability.is_available : false;

  // Ensure selected guests count is strictly clamped within maxAllowedGuests (roomCapacity * roomQuantity)
  useEffect(() => {
    const currentGuests = parseInt(guests, 10) || 1;
    if (currentGuests > maxAllowedGuests) {
      setGuests(String(Math.max(1, maxAllowedGuests)));
    }
  }, [maxAllowedGuests, guests]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-[#087F8C] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-[#607080] dark:text-slate-300">Loading sanctuary details...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold font-serif text-[#17324D] dark:text-white">Property Not Found</h2>
        <Link to="/search" className="inline-block px-5 py-2.5 bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white font-bold rounded-xl text-xs">
          Browse Stays
        </Link>
      </div>
    );
  }

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 1;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  };

  const nights = calculateNights();
  const roomUnitPrice = roomAvailability?.price_per_night || selectedRoom?.base_price || 0;
  const roomSubtotal = roomUnitPrice * nights * roomQuantity;

  let expSubtotal = 0;
  if (selectedExp) {
    const pCount = parseInt(experienceParticipants, 10) || 1;
    expSubtotal = selectedExp.pricing_model === 'per_person' ? selectedExp.price * pCount : selectedExp.price;
  }

  const grandTotal = roomSubtotal + expSubtotal;

  const handleCheckInChange = (newCheckIn) => {
    setCheckIn(newCheckIn);
    if (checkOut && newCheckIn >= checkOut) {
      // Auto-adjust check-out to the next day
      const nextDay = new Date(new Date(newCheckIn).getTime() + 86400000).toISOString().split('T')[0];
      setCheckOut(nextDay);
    }
  };

  const handleProceedToBooking = () => {
    if (!checkIn || !checkOut) {
      setError('Please select check-in and check-out dates.');
      return;
    }
    if (checkIn < todayStr) {
      setError('Check-in date cannot be in the past.');
      return;
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      setError('Check-out date must be strictly after check-in date.');
      return;
    }
    if (!selectedRoomId) {
      setError('Please select a room unit.');
      return;
    }
    if (isRoomSoldOut || availableRoomsCount <= 0) {
      setError(roomAvailability?.message || 'Sorry, this room is not available for the selected dates.');
      return;
    }
    if (roomQuantity > availableRoomsCount) {
      setError(`Only ${availableRoomsCount} room(s) are available for these dates.`);
      return;
    }
    const guestNum = parseInt(guests, 10);
    if (guestNum > maxAllowedGuests) {
      setError(`This room accommodates a maximum of ${maxAllowedGuests} guests for ${roomQuantity} room(s).`);
      return;
    }

    setError('');

    // Prepare checkout state
    const checkoutState = {
      property_id: property.id,
      property_name: property.name,
      property_type: property.property_type,
      property_city: property.city,
      room_id: selectedRoomId,
      room_name: selectedRoom?.name || 'Deluxe Unit',
      room_price: roomUnitPrice,
      room_quantity: roomQuantity,
      check_in: checkIn,
      check_out: checkOut,
      nights,
      guests: guestNum,
      room_subtotal: roomSubtotal,
      experience_id: selectedExperienceId,
      experience_title: selectedExp?.title,
      experience_price: selectedExp?.price,
      experience_pricing_model: selectedExp?.pricing_model,
      experience_participants: selectedExp ? parseInt(experienceParticipants, 10) : 0,
      experience_subtotal: expSubtotal,
      total_amount: grandTotal,
    };

    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/booking', state: checkoutState } } });
    } else {
      navigate('/booking', { state: checkoutState });
    }
  };

  const rawImages = property.images?.length > 0 ? property.images : [{ image_url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80' }];
  const images = rawImages.map((img) => (typeof img === 'string' ? { image_url: img } : img));

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Info */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-xs">
              {property.property_type}
            </span>
            <VerificationBadge status="VERIFIED" />
          </div>

          <div className="flex items-center space-x-2 text-xs text-[#607080] dark:text-slate-400">
            <div className="flex items-center text-[#F6C945]">
              <Star className="w-4 h-4 fill-[#F6C945] text-[#F6C945] mr-1" />
              <strong className="text-[#17324D] dark:text-white">{property.rating?.toFixed(1) || '4.9'}</strong>
            </div>
            <span>•</span>
            <span>{property.review_count || 12} Verified Reviews</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black font-serif text-[#17324D] dark:text-white tracking-tight">
          {property.name}
        </h1>
        <div className="flex items-center text-xs text-[#607080] dark:text-slate-300 space-x-1">
          <MapPin className="w-4 h-4 text-[#F97316] shrink-0" />
          <span>{property.address}, {property.city}, {property.state}, {property.country}</span>
        </div>
      </div>

      {/* Photo Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-3 aspect-16/10 rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-md">
          <img
            src={resolveImageUrl(images[selectedImage]?.image_url || images[0]?.image_url)}
            alt={property.name}
            className="w-full h-full object-cover transition-all duration-300"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';
            }}
          />
        </div>
        <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto">
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedImage(idx)}
              className={`aspect-16/10 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 md:shrink ${
                selectedImage === idx ? 'border-[#087F8C] shadow-md scale-98' : 'border-transparent opacity-75 hover:opacity-100'
              }`}
            >
              <img
                src={resolveImageUrl(img.image_url || img)}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Details + Booking Dock */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Property Description, Rooms, Experiences */}
        <div className="lg:col-span-8 space-y-8">
          {/* Description */}
          <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-teal-900/40 shadow-sm space-y-4">
            <h2 className="text-lg sm:text-xl font-bold font-serif text-[#17324D] dark:text-white">About this sanctuary</h2>
            <p className="text-xs sm:text-sm text-[#607080] dark:text-slate-300 leading-relaxed whitespace-pre-line font-light">
              {property.description}
            </p>

            {/* Check-in / out badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="p-3 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-100 dark:border-teal-900/40">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Check-in</span>
                <strong className="text-[#17324D] dark:text-white">{property.check_in_time}</strong>
              </div>
              <div className="p-3 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-100 dark:border-teal-900/40">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Check-out</span>
                <strong className="text-[#17324D] dark:text-white">{property.check_out_time}</strong>
              </div>
              <div className="p-3 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-100 dark:border-teal-900/40">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Stay Partner Contact</span>
                <strong className="text-[#17324D] dark:text-white truncate block">{property.contact_phone}</strong>
              </div>
              <div className="p-3 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-100 dark:border-teal-900/40">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Type</span>
                <strong className="text-[#17324D] dark:text-white">{property.property_type}</strong>
              </div>
            </div>
          </div>

          {/* Amenities Grid */}
          <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-teal-900/40 shadow-sm space-y-4">
            <h2 className="text-lg sm:text-xl font-bold font-serif text-[#17324D] dark:text-white">What this place offers</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {property.amenities?.map((am, i) => (
                <div key={i} className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-100 dark:border-teal-900/40 text-xs font-semibold text-[#17324D] dark:text-slate-200">
                  <Check className="w-4 h-4 text-[#35A66F]" />
                  <span>{am.amenity_name || am}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Available Rooms Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-bold font-serif text-[#17324D] dark:text-white">Select Your Room Unit</h2>
                <p className="text-xs text-[#607080] dark:text-slate-400">All room rates verified against PostgreSQL inventory</p>
              </div>
              <span className="text-xs font-bold text-[#087F8C] dark:text-[#27B7A8] bg-[#087F8C]/10 px-3 py-1 rounded-full">
                {property.rooms?.length || 0} Units Available
              </span>
            </div>

            <div className="space-y-4">
              {(!property.rooms || property.rooms.length === 0) ? (
                <div className="p-8 text-center bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-100 dark:border-teal-900/40 text-xs text-[#607080] dark:text-slate-400 space-y-2">
                  <Bed className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-bold text-sm text-[#17324D] dark:text-white">No room units currently listed</p>
                  <p>Please check back soon or browse other verified sanctuaries.</p>
                </div>
              ) : (
                property.rooms.map((room) => {
                const isSelected = selectedRoomId === room.id;
                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row gap-5 ${
                      isSelected
                        ? 'bg-[#FFFDF7] dark:bg-[#091B29] border-[#087F8C] shadow-md ring-2 ring-[#087F8C]/15'
                        : 'bg-white dark:bg-[#0F273D] border-slate-100 dark:border-teal-900/40 hover:border-[#087F8C]/50'
                    }`}
                  >
                    <div className="sm:w-48 aspect-16/10 rounded-2xl overflow-hidden bg-gray-100 dark:bg-slate-800 shrink-0">
                      <img
                        src={resolveImageUrl(room.images?.[0]?.image_url || (typeof room.images?.[0] === 'string' ? room.images[0] : null)) || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80'}
                        alt={room.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                    </div>

                    <div className="flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#087F8C] dark:text-[#27B7A8]">
                              {room.room_type}
                            </span>
                            <h4 className="text-base font-bold font-serif text-[#17324D] dark:text-white">{room.name}</h4>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold text-[#F97316] font-serif block">
                              ₹{room.base_price?.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-400">/ night</span>
                          </div>
                        </div>

                        <p className="text-xs text-[#607080] dark:text-slate-300 mt-1 line-clamp-2">{room.description}</p>

                        <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-[#607080] dark:text-slate-400">
                          <span className="flex items-center space-x-1">
                            <Users className="w-3.5 h-3.5 text-[#087F8C]" />
                            <span>Max {room.capacity} Guests / Room</span>
                          </span>
                          <span>•</span>
                          <span>{room.quantity} units in stock</span>
                          {isSelected && roomQuantity > 1 && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-[#087F8C] dark:text-[#27B7A8]">
                                Max {room.capacity * roomQuantity} Guests across {roomQuantity} Rooms
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex flex-wrap gap-1">
                          {room.amenities?.map((a, i) => (
                            <span key={i} className="text-[10px] bg-[#087F8C]/10 dark:bg-[#087F8C]/20 px-2 py-0.5 rounded border border-[#087F8C]/20 text-[#087F8C] dark:text-[#27B7A8] font-semibold">
                              {a.amenity_name || a}
                            </span>
                          ))}
                        </div>

                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${isSelected ? 'bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] text-white' : 'bg-slate-100 dark:bg-slate-800 text-[#17324D] dark:text-slate-300'}`}>
                          {isSelected ? '✓ Selected' : 'Select Unit'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }))}
            </div>
          </div>

          {/* Verified Guest Reviews & Ratings Section */}
          <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-teal-900/40 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-[#F6C945] fill-[#F6C945]" />
                  <h2 className="text-lg sm:text-xl font-bold font-serif text-[#17324D] dark:text-white">
                    {reviewsData?.average_rating || property.rating || 4.8} / 5.0
                  </h2>
                  <span className="text-xs text-slate-400">
                    • {reviewsData?.review_count || property.review_count || 0} Verified Guest Review(s)
                  </span>
                </div>
                <p className="text-xs text-[#607080] dark:text-slate-400 mt-0.5">
                  100% authentic ratings from guests with completed VeriNova bookings
                </p>
              </div>

              <div
                title="This property has passed Voyara's platform verification and administrative review."
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#35A66F] dark:text-[#35A66F] bg-[#DDF3E7] dark:bg-[#35A66F]/20 px-3.5 py-1.5 rounded-full border border-[#35A66F]/30 shadow-2xs"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>✓ Voyara Verified Stay</span>
              </div>
            </div>

            {/* Rating Breakdown Bars */}
            {reviewsData?.rating_breakdown && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-100 dark:border-teal-900/40">
                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-[#17324D] dark:text-slate-300 mb-1">
                    <span>Cleanliness</span>
                    <span>{reviewsData.rating_breakdown.cleanliness}/5</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#087F8C] h-full rounded-full"
                      style={{ width: `${(reviewsData.rating_breakdown.cleanliness / 5) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-[#17324D] dark:text-slate-300 mb-1">
                    <span>Staff</span>
                    <span>{reviewsData.rating_breakdown.staff}/5</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#087F8C] h-full rounded-full"
                      style={{ width: `${(reviewsData.rating_breakdown.staff / 5) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-[#17324D] dark:text-slate-300 mb-1">
                    <span>Location</span>
                    <span>{reviewsData.rating_breakdown.location}/5</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#087F8C] h-full rounded-full"
                      style={{ width: `${(reviewsData.rating_breakdown.location / 5) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-[#17324D] dark:text-slate-300 mb-1">
                    <span>Value</span>
                    <span>{reviewsData.rating_breakdown.value}/5</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#087F8C] h-full rounded-full"
                      style={{ width: `${(reviewsData.rating_breakdown.value / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Reviews List */}
            {reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
              <div className="space-y-4 pt-2">
                {reviewsData.reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-100 dark:border-teal-900/40 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#087F8C] to-[#0F9D9A] text-white font-bold text-xs flex items-center justify-center">
                          {rev.user?.full_name ? rev.user.full_name.charAt(0).toUpperCase() : 'G'}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">
                            {rev.user?.full_name || 'Verified Guest'}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Reviewed on {new Date(rev.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800/40">
                        <Star className="w-3.5 h-3.5 text-[#F6C945] fill-[#F6C945]" />
                        <span className="text-xs font-bold text-[#17324D] dark:text-amber-300">
                          {rev.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[#607080] dark:text-slate-300 leading-relaxed font-light whitespace-pre-line">
                      "{rev.comment}"
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 italic">
                No guest reviews yet. Be the first to book and review this sanctuary!
              </div>
            )}
          </div>

          {/* Add-on Experiences Section */}
          {property.experiences?.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold font-serif text-[#17324D] dark:text-white">Add Local Stay Partner Experiences</h2>
                  <p className="text-xs text-[#607080] dark:text-slate-400">Optionally bundle verified activities with your stay</p>
                </div>
                <span className="text-xs font-bold text-[#F97316] bg-[#F97316]/15 px-2.5 py-1 rounded-full">
                  Optional Add-on
                </span>
              </div>

              <div className="space-y-3">
                {property.experiences.map((exp) => {
                  const isChecked = selectedExperienceId === exp.id;
                  return (
                    <div
                      key={exp.id}
                      onClick={() => setSelectedExperienceId(isChecked ? null : exp.id)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                        isChecked
                          ? 'bg-[#FFFDF7] dark:bg-[#091B29] border-[#F97316] shadow-sm'
                          : 'bg-white dark:bg-[#0F273D] border-slate-100 dark:border-teal-900/40 hover:border-[#F97316]/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isChecked ? 'bg-[#F97316] border-[#F97316] text-white' : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#087F8C] dark:text-[#27B7A8] bg-[#087F8C]/10 px-2 py-0.5 rounded-full">
                              {exp.experience_type}
                            </span>
                            <span className="text-xs text-slate-400">Duration: {exp.duration}</span>
                          </div>
                          <h4 className="text-sm font-bold text-[#17324D] dark:text-white mt-0.5">{exp.title}</h4>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-bold text-[#F97316] font-serif">
                          +₹{exp.price?.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          / {exp.pricing_model === 'per_person' ? 'person' : 'session'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Sticky Booking & Verification Dock */}
        <div className="lg:col-span-4">
          <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-6 border border-slate-100 dark:border-teal-900/40 shadow-xl space-y-6 sticky top-24">
            <div className="flex items-baseline justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-2xl font-bold font-serif text-[#17324D] dark:text-white">
                  ₹{roomUnitPrice?.toLocaleString('en-IN') || '0'}
                </span>
                <span className="text-xs text-slate-400"> / night</span>
              </div>
              <VerificationBadge status="VERIFIED" size="sm" />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Live Availability Status Banner */}
            {checkIn && checkOut && (
              <div>
                {availLoading ? (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-500 flex items-center space-x-2">
                    <div className="w-3.5 h-3.5 border-2 border-[#087F8C] border-t-transparent rounded-full animate-spin" />
                    <span>Checking live inventory...</span>
                  </div>
                ) : isRoomSoldOut || availableRoomsCount <= 0 ? (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-bold space-y-0.5">
                    <div className="flex items-center space-x-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{roomAvailability?.message || 'Sold out for these dates'}</span>
                    </div>
                    <p className="text-[11px] font-normal text-rose-600 dark:text-rose-400">Please choose different dates or select another room.</p>
                  </div>
                ) : (
                  <div className="p-2.5 bg-[#DDF3E7] dark:bg-[#35A66F]/20 border border-[#35A66F]/30 rounded-xl text-[#35A66F] text-xs font-semibold flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Check className="w-4 h-4 text-[#35A66F]" />
                      <span>{availableRoomsCount} of {selectedRoom?.quantity} units available</span>
                    </span>
                    <span className="text-[10px] uppercase font-bold text-[#35A66F] bg-white dark:bg-[#091B29] px-2 py-0.5 rounded-full">Available</span>
                  </div>
                )}
              </div>
            )}

            {/* Date inputs */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#17324D] dark:text-slate-300 mb-1">
                    Check-in Date
                  </label>
                  <input
                    type="date"
                    required
                    min={todayStr}
                    value={checkIn}
                    onChange={(e) => handleCheckInChange(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#17324D] dark:text-white focus:outline-hidden focus:border-[#087F8C]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#17324D] dark:text-slate-300 mb-1">
                    Check-out Date
                  </label>
                  <input
                    type="date"
                    required
                    min={minCheckoutDate}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#17324D] dark:text-white focus:outline-hidden focus:border-[#087F8C]"
                  />
                </div>
              </div>

              {/* Number of Rooms Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#17324D] dark:text-slate-300">
                    Number of Rooms
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Max {Math.max(1, availableRoomsCount)} available
                  </span>
                </div>
                <div className="flex items-center space-x-3 bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 rounded-xl p-1.5">
                  <button
                    type="button"
                    disabled={roomQuantity <= 1 || isRoomSoldOut}
                    onClick={() => setRoomQuantity((prev) => Math.max(1, prev - 1))}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    -
                  </button>
                  <div className="flex-1 text-center">
                    <span className="font-black text-sm text-[#17324D] dark:text-white font-serif">
                      {roomQuantity} {roomQuantity === 1 ? 'Room' : 'Rooms'}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={roomQuantity >= availableRoomsCount || isRoomSoldOut}
                    onClick={() => setRoomQuantity((prev) => Math.min(availableRoomsCount, prev + 1))}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Dynamic Guest Count Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#17324D] dark:text-slate-300">
                    Guests Count
                  </label>
                  <span className="text-[11px] text-[#087F8C] dark:text-[#27B7A8] font-medium">
                    Max {maxAllowedGuests} guests ({roomCapacity} guests/room × {roomQuantity} {roomQuantity === 1 ? 'room' : 'rooms'})
                  </span>
                </div>
                <select
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#17324D] dark:text-white focus:outline-hidden focus:border-[#087F8C] cursor-pointer"
                >
                  {Array.from({ length: maxAllowedGuests }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? 'Guest' : 'Guests'}
                    </option>
                  ))}
                </select>
              </div>

              {selectedExp && (
                <div className="p-3 bg-[#FFFDF7] dark:bg-[#091B29] rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#087F8C] dark:text-[#27B7A8] block">
                    Experience Participants ({selectedExp.title})
                  </span>
                  <input
                    type="number"
                    min="1"
                    max={selectedExp.capacity}
                    value={experienceParticipants}
                    onChange={(e) => setExperienceParticipants(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-[#17324D] dark:text-white"
                  />
                </div>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-[#607080] dark:text-slate-300">
                <span>
                  {selectedRoom?.name} (₹{roomUnitPrice.toLocaleString('en-IN')} × {nights}n × {roomQuantity}r)
                </span>
                <span className="font-semibold text-[#17324D] dark:text-white">
                  ₹{roomSubtotal.toLocaleString('en-IN')}
                </span>
              </div>

              {selectedExp && (
                <div className="flex justify-between text-[#087F8C] dark:text-[#27B7A8]">
                  <span>{selectedExp.title} ({experienceParticipants} pax)</span>
                  <span className="font-semibold">₹{expSubtotal.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm font-bold text-[#17324D] dark:text-white">
                <span>Total Amount</span>
                <span className="text-base text-[#F97316] font-serif">₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              onClick={handleProceedToBooking}
              disabled={isRoomSoldOut || availableRoomsCount <= 0}
              className="w-full py-3.5 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-bold rounded-2xl shadow-lg shadow-[#F97316]/20 hover:shadow-xl transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isRoomSoldOut || availableRoomsCount <= 0 ? 'Sold Out for Selected Dates' : 'Review & Confirm Booking'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center text-[11px] text-slate-400 space-y-1.5 pt-1">
              <div className="p-2.5 rounded-xl bg-[#FFF8F0] dark:bg-slate-800/80 border border-orange-200/60 dark:border-slate-700 text-left space-y-1">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Cancellation & Refund Guarantee</span>
                </div>
                <p className="text-[10.5px] text-slate-600 dark:text-slate-400 leading-tight">
                  • <strong>100% full refund</strong> if cancelled 2+ days before check-in.
                  <br />
                  • <strong>{property.cancellation_refund_percentage ?? 50}% refund</strong> if cancelled within 2 days of arrival.
                </p>
              </div>
              <p className="flex items-center justify-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#087F8C] dark:text-[#27B7A8]" />
                <span>Verified by VeriNova before final confirmation</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom CTA Dock */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#091B29]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-4 shadow-2xl flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Rate</span>
          <div className="flex items-baseline space-x-1">
            <span className="text-lg font-bold font-serif text-[#F97316]">₹{grandTotal.toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-slate-400">/ {nights} night(s)</span>
          </div>
        </div>

        <button
          onClick={handleProceedToBooking}
          disabled={isRoomSoldOut || availableRoomsCount <= 0}
          className="px-6 py-3 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5 disabled:opacity-50"
        >
          <span>{isRoomSoldOut || availableRoomsCount <= 0 ? 'Fully Booked' : 'Reserve Stay'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default PropertyDetails;

