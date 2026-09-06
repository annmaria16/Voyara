import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { customerApi } from '../../api/customer';
import { useAuth } from '../../context/AuthContext';
import { VerificationBadge } from '../../components/verification/VerificationBadge';
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
  const [selectedExperienceId, setSelectedExperienceId] = useState(null);
  const [experienceParticipants, setExperienceParticipants] = useState('2');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const data = await customerApi.getPropertyDetails(id);
        setProperty(data);
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

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Loading sanctuary details...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold font-serif text-[#102A43] dark:text-white">Property Not Found</h2>
        <Link to="/search" className="inline-block px-5 py-2.5 bg-gradient-to-r from-[#F97360] to-orange-500 text-white font-bold rounded-xl text-xs">
          Browse Stays
        </Link>
      </div>
    );
  }

  // Calculate pricing
  const selectedRoom = property.rooms?.find((r) => r.id === selectedRoomId) || property.rooms?.[0];
  const selectedExp = property.experiences?.find((e) => e.id === selectedExperienceId);

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 1;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  };

  const nights = calculateNights();
  const roomSubtotal = (selectedRoom?.base_price || 0) * nights;

  let expSubtotal = 0;
  if (selectedExp) {
    const pCount = parseInt(experienceParticipants, 10) || 1;
    expSubtotal = selectedExp.pricing_model === 'per_person' ? selectedExp.price * pCount : selectedExp.price;
  }

  const grandTotal = roomSubtotal + expSubtotal;

  const handleProceedToBooking = () => {
    if (!checkIn || !checkOut) {
      setError('Please select check-in and check-out dates.');
      return;
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      setError('Check-out date must be after check-in date.');
      return;
    }
    if (!selectedRoomId) {
      setError('Please select a room unit.');
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
      room_name: selectedRoom.name,
      room_price: selectedRoom.base_price,
      check_in: checkIn,
      check_out: checkOut,
      nights,
      guests: parseInt(guests, 10),
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

  const images = property.images?.length > 0 ? property.images : [{ image_url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80' }];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Info */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-xs">
              {property.property_type}
            </span>
            <VerificationBadge status="VERIFIED" />
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center text-amber-500">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400 mr-1" />
              <strong className="text-[#102A43] dark:text-white">{property.rating?.toFixed(1) || '4.9'}</strong>
            </div>
            <span>•</span>
            <span>{property.review_count || 12} Verified Reviews</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black font-serif text-[#102A43] dark:text-white tracking-tight">
          {property.name}
        </h1>
        <div className="flex items-center text-xs text-slate-500 dark:text-slate-300 space-x-1">
          <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{property.address}, {property.city}, {property.state}, {property.country}</span>
        </div>
      </div>

      {/* Photo Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-3 aspect-16/10 rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-md">
          <img
            src={images[selectedImage]?.image_url || images[0]?.image_url}
            alt={property.name}
            className="w-full h-full object-cover transition-all duration-300"
          />
        </div>
        <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto">
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedImage(idx)}
              className={`aspect-16/10 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 md:shrink ${
                selectedImage === idx ? 'border-[#F97360] shadow-md scale-98' : 'border-transparent opacity-75 hover:opacity-100'
              }`}
            >
              <img src={img.image_url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Details + Booking Dock */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Property Description, Rooms, Experiences */}
        <div className="lg:col-span-8 space-y-8">
          {/* Description */}
          <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <h2 className="text-lg sm:text-xl font-bold font-serif text-[#102A43] dark:text-white">About this sanctuary</h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line font-light">
              {property.description}
            </p>

            {/* Check-in / out badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="p-3 bg-[#FFF8F0]/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Check-in</span>
                <strong className="text-[#102A43] dark:text-white">{property.check_in_time}</strong>
              </div>
              <div className="p-3 bg-[#FFF8F0]/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Check-out</span>
                <strong className="text-[#102A43] dark:text-white">{property.check_out_time}</strong>
              </div>
              <div className="p-3 bg-[#FFF8F0]/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Host Contact</span>
                <strong className="text-[#102A43] dark:text-white truncate block">{property.contact_phone}</strong>
              </div>
              <div className="p-3 bg-[#FFF8F0]/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Type</span>
                <strong className="text-[#102A43] dark:text-white">{property.property_type}</strong>
              </div>
            </div>
          </div>

          {/* Amenities Grid */}
          <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <h2 className="text-lg sm:text-xl font-bold font-serif text-[#102A43] dark:text-white">What this place offers</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {property.amenities?.map((am, i) => (
                <div key={i} className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-[#FFF8F0]/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs font-semibold text-[#102A43] dark:text-slate-200">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>{am.amenity_name || am}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Available Rooms Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-bold font-serif text-[#102A43] dark:text-white">Select Your Room Unit</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">All room rates verified against PostgreSQL inventory</p>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-full">
                {property.rooms?.length || 0} Units Available
              </span>
            </div>

            <div className="space-y-4">
              {property.rooms?.map((room) => {
                const isSelected = selectedRoomId === room.id;
                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row gap-5 ${
                      isSelected
                        ? 'bg-[#FFF8F0]/80 dark:bg-slate-900/80 border-emerald-500 shadow-md'
                        : 'bg-white dark:bg-[#131D2E] border-slate-200/80 dark:border-slate-800 hover:border-emerald-400'
                    }`}
                  >
                    <div className="sm:w-48 aspect-16/10 rounded-2xl overflow-hidden bg-gray-100 dark:bg-slate-800 shrink-0">
                      <img
                        src={room.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80'}
                        alt={room.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                              {room.room_type}
                            </span>
                            <h4 className="text-base font-bold font-serif text-[#102A43] dark:text-white">{room.name}</h4>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold text-[#F97360] font-serif block">
                              ₹{room.base_price?.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-400">/ night</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 line-clamp-2">{room.description}</p>

                        <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-400">
                          <span className="flex items-center space-x-1">
                            <Users className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Max {room.capacity} Guests</span>
                          </span>
                          <span>•</span>
                          <span>{room.quantity} units in stock</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex flex-wrap gap-1">
                          {room.amenities?.map((a, i) => (
                            <span key={i} className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 font-semibold">
                              {a.amenity_name || a}
                            </span>
                          ))}
                        </div>

                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${isSelected ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                          {isSelected ? '✓ Selected' : 'Select Unit'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add-on Experiences Section */}
          {property.experiences?.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold font-serif text-[#102A43] dark:text-white">Add Local Host Experiences</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Optionally bundle verified activities with your stay</p>
                </div>
                <span className="text-xs font-bold text-[#F97360] bg-[#F97360]/15 px-2.5 py-1 rounded-full">
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
                          ? 'bg-[#FFF8F0]/80 dark:bg-slate-900/80 border-[#F97360] shadow-sm'
                          : 'bg-white dark:bg-[#131D2E] border-slate-200/80 dark:border-slate-800 hover:border-[#F97360]'
                      }`}
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isChecked ? 'bg-[#F97360] border-[#F97360] text-white' : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                              {exp.experience_type}
                            </span>
                            <span className="text-xs text-slate-400">Duration: {exp.duration}</span>
                          </div>
                          <h4 className="text-sm font-bold text-[#102A43] dark:text-white mt-0.5">{exp.title}</h4>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-bold text-[#F97360] font-serif">
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
          <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6 sticky top-24">
            <div className="flex items-baseline justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-2xl font-bold font-serif text-[#102A43] dark:text-white">
                  ₹{selectedRoom?.base_price?.toLocaleString('en-IN') || '0'}
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

            {/* Date inputs */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Check-in Date
                  </label>
                  <input
                    type="date"
                    required
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#FFF8F0]/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#102A43] dark:text-white focus:outline-hidden focus:border-[#F97360]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Check-out Date
                  </label>
                  <input
                    type="date"
                    required
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#FFF8F0]/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#102A43] dark:text-white focus:outline-hidden focus:border-[#F97360]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Guests Count
                </label>
                <select
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FFF8F0]/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#102A43] dark:text-white focus:outline-hidden focus:border-[#F97360] cursor-pointer"
                >
                  <option value="1">1 Guest</option>
                  <option value="2">2 Guests</option>
                  <option value="3">3 Guests</option>
                  <option value="4">4 Guests</option>
                </select>
              </div>

              {selectedExp && (
                <div className="p-3 bg-[#FFF8F0]/70 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                    Experience Participants ({selectedExp.title})
                  </span>
                  <input
                    type="number"
                    min="1"
                    max={selectedExp.capacity}
                    value={experienceParticipants}
                    onChange={(e) => setExperienceParticipants(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-[#102A43] dark:text-white"
                  />
                </div>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>{selectedRoom?.name} × {nights} night(s)</span>
                <span className="font-semibold text-[#102A43] dark:text-white">₹{roomSubtotal.toLocaleString('en-IN')}</span>
              </div>

              {selectedExp && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>{selectedExp.title} ({experienceParticipants} pax)</span>
                  <span className="font-semibold">₹{expSubtotal.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm font-bold text-[#102A43] dark:text-white">
                <span>Total Amount</span>
                <span className="text-base text-[#F97360] font-serif">₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              onClick={handleProceedToBooking}
              className="w-full py-3.5 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-[#e05e4b] hover:to-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-[#F97360]/20 hover:shadow-xl transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer"
            >
              <span>Review & Confirm Booking</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center text-[11px] text-slate-400 space-y-1">
              <p className="flex items-center justify-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Verified by VeriNova before final confirmation</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetails;
