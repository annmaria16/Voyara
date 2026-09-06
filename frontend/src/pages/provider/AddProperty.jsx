import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { providerApi } from '../../api/provider';
import { ImageUploadPicker } from '../../components/common/ImageUploadPicker';
import { Home, MapPin, Phone, Mail, Image, Plus, Trash2, ArrowLeft, Check, AlertCircle } from 'lucide-react';

export const AddProperty = () => {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [propertyType, setPropertyType] = useState('Resort');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [locationDetails, setLocationDetails] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutTime, setCheckOutTime] = useState('11:00');

  const [amenities, setAmenities] = useState(['Wi-Fi', 'Breakfast', 'Mountain View']);
  const [images, setImages] = useState([
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
  ]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleAmenityToggle = (am) => {
    if (amenities.includes(am)) {
      setAmenities(amenities.filter((a) => a !== am));
    } else {
      setAmenities([...amenities, am]);
    }
  };

  const handleAddImage = () => {
    if (newImageUrl.trim()) {
      setImages([...images, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  const handleRemoveImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (images.length === 0) {
      setError('Please add at least one property photo.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const payload = {
        name,
        property_type: propertyType,
        description,
        address,
        city,
        state,
        country,
        location_details: locationDetails || undefined,
        contact_phone: contactPhone,
        contact_email: contactEmail,
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        amenities,
        images,
      };

      await providerApi.createProperty(payload);
      navigate('/provider/properties');
    } catch (err) {
      setError(err.message || 'Failed to register property.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center space-x-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Properties</span>
      </button>

      <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-6 sm:p-10 border border-[#FDBA9A]/30 dark:border-slate-800 shadow-md space-y-8">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-orange-500">List Your Sanctuary</span>
          <h2 className="text-2xl sm:text-3xl font-black font-serif text-slate-900 dark:text-white mt-1">Add New Property</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create real searchable listing records stored in PostgreSQL.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              1. Basic Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Property Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mountain Breeze Resort"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Property Type *</label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500 cursor-pointer"
                >
                  {propertyTypes.map((t) => (
                    <option key={t} value={t} className="dark:bg-slate-900 text-slate-900 dark:text-white">{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Description *</label>
              <textarea
                rows={3}
                required
                placeholder="Describe your property, the atmosphere, scenic views, and surroundings..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-normal text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
              />
            </div>
          </div>

          {/* Location Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              2. Location & Address
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Street Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pothamedu Viewpoint Road"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">City / Destination *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Munnar"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">State *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kerala"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Country *</label>
                <input
                  type="text"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Contact & Timings */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              3. Contact & Timings
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Contact Phone *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98470 12345"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Contact Email *</label>
                <input
                  type="email"
                  required
                  placeholder="reservations@example.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Check-in Time</label>
                <input
                  type="text"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Check-out Time</label>
                <input
                  type="text"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Amenities Multi-picker */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              4. Property Amenities
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {defaultAmenitiesList.map((am) => {
                const checked = amenities.includes(am);
                return (
                  <button
                    key={am}
                    type="button"
                    onClick={() => handleAmenityToggle(am)}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                      checked
                        ? 'bg-gradient-to-r from-[#F97360] to-orange-500 text-white border-orange-500 shadow-xs'
                        : 'bg-[#FFF8F0]/80 dark:bg-slate-900/70 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-orange-500'
                    }`}
                  >
                    <span className="font-semibold text-xs">{am}</span>
                    {checked && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photos Upload & List */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              5. Property Photos
            </h3>

            <ImageUploadPicker
              label="Upload Property Photo (Local Storage)"
              hint="Upload property images directly to Voyara server"
              onChange={(url) => {
                if (url) {
                  setImages((prev) => [...prev, url]);
                }
              }}
            />

            <div className="flex gap-2 pt-2">
              <input
                type="url"
                placeholder="Or paste high-res image URL (e.g. Unsplash URL)..."
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                className="flex-1 p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden text-xs text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddImage}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs"
              >
                Add URL
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-16/10 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 group border border-slate-200 dark:border-slate-700">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(i)}
                    className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-80 group-hover:opacity-100 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-2xl shadow-lg transition-all text-sm cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Creating Property in Database...' : 'Save & Publish Property'}
          </button>
        </form>
      </div>
    </div>
  );
};
