import React, { useState, useEffect } from 'react';
import { providerApi } from '../../api/provider';
import { MultiImageUploadPicker } from '../../components/common/MultiImageUploadPicker';
import { NumberStepperInput } from '../../components/common/NumberStepperInput';
import { resolveImageUrl } from '../../utils/imageUrl';
import {
  Layers,
  Plus,
  Trash2,
  Edit,
  Users,
  IndianRupee,
  Home,
  AlertCircle,
  Check,
  Bed,
  X,
  Sparkles,
  BedDouble,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

const ROOM_TYPES = [
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

const DEFAULT_AMENITIES = [
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

export const ProviderRooms = () => {
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [name, setName] = useState('');
  const [roomType, setRoomType] = useState('Deluxe Room');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('2');
  const [quantity, setQuantity] = useState('1');
  const [basePrice, setBasePrice] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [amenities, setAmenities] = useState(['King Bed', 'Attached Bathroom', 'Free Wi-Fi']);
  const [customAmenity, setCustomAmenity] = useState('');
  const [images, setImages] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const data = await providerApi.getProperties();
      setProperties(Array.isArray(data) ? data : []);
      if (data.length > 0) {
        setSelectedPropertyId(data[0].id);
        fetchRooms(data[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load properties.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async (propId) => {
    try {
      const roomData = await providerApi.getPropertyRooms(propId);
      setRooms(Array.isArray(roomData) ? roomData : []);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handlePropertyChange = (propId) => {
    setSelectedPropertyId(propId);
    fetchRooms(propId);
  };

  const openAddModal = () => {
    setEditingRoomId(null);
    setName('');
    setRoomType('Deluxe Room');
    setDescription('');
    setCapacity('2');
    setQuantity('1');
    setBasePrice('');
    setIsActive(true);
    setImages([]);
    setAmenities(['King Bed', 'Attached Bathroom', 'Free Wi-Fi', 'Air Conditioning']);
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (room) => {
    setEditingRoomId(room.id);
    setName(room.name);
    setRoomType(room.room_type);
    setDescription(room.description);
    setCapacity(String(room.capacity));
    setQuantity(String(room.quantity));
    setBasePrice(String(room.base_price));
    setIsActive(room.is_active !== undefined ? room.is_active : true);
    setImages(room.images?.map((img) => (typeof img === 'string' ? img : img.image_url)).filter(Boolean) || []);
    setAmenities(room.amenities?.map((a) => a.amenity_name || a) || ['King Bed', 'Attached Bathroom']);
    setError('');
    setModalOpen(true);
  };

  const handleAmenityToggle = (am) => {
    setAmenities((prev) => {
      const exists = prev.some((a) => a.toLowerCase() === am.toLowerCase());
      if (exists) {
        return prev.filter((a) => a.toLowerCase() !== am.toLowerCase());
      } else {
        return [...prev, am];
      }
    });
  };

  const handleAddCustomAmenity = () => {
    const val = customAmenity.trim();
    if (!val) return;
    if (!amenities.some((a) => a.toLowerCase() === val.toLowerCase())) {
      setAmenities((prev) => [...prev, val]);
    }
    setCustomAmenity('');
  };

  const handleRemoveAmenity = (am) => {
    setAmenities((prev) => prev.filter((a) => a.toLowerCase() !== am.toLowerCase()));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Room Name / Title is required.');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setError('Please provide a descriptive description (at least 10 characters).');
      return;
    }
    const cap = typeof capacity === 'number' ? capacity : parseInt(capacity, 10);
    if (capacity === '' || capacity === undefined || isNaN(cap) || cap < 1) {
      setError('Guest capacity must be at least 1 guest.');
      return;
    }
    const qty = typeof quantity === 'number' ? quantity : parseInt(quantity, 10);
    if (quantity === '' || quantity === undefined || isNaN(qty) || qty < 1) {
      setError('Number of available units must be at least 1 unit.');
      return;
    }
    if (!basePrice || parseFloat(basePrice) < 100) {
      setError('Base price per night must be at least ₹100.');
      return;
    }
    if (!images || images.length === 0) {
      setError('At least one room photo is required.');
      return;
    }

    setModalLoading(true);

    try {
      const payload = {
        name: name.trim(),
        room_type: roomType,
        description: description.trim(),
        capacity: cap,
        quantity: qty,
        base_price: parseFloat(basePrice),
        is_active: isActive,
        amenities,
        images: images.map((img) => (typeof img === 'string' ? img : (img.image_url || img.url))).filter(Boolean),
      };

      if (editingRoomId) {
        await providerApi.updateRoom(editingRoomId, payload);
      } else {
        await providerApi.createRoom(selectedPropertyId, payload);
      }

      setModalOpen(false);
      fetchRooms(selectedPropertyId);
    } catch (err) {
      setError(err.message || 'Failed to save room unit.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteRoom = async (roomId, roomName) => {
    if (!window.confirm(`Are you sure you want to delete room unit '${roomName}'?`)) return;
    try {
      await providerApi.deleteRoom(roomId);
      fetchRooms(selectedPropertyId);
    } catch (err) {
      alert(err.message || 'Failed to delete room.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#087F8C]/10 border border-[#087F8C]/30 text-[#087F8C] dark:text-[#27B7A8] text-xs font-bold mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#087F8C] dark:text-[#27B7A8]" />
            <span>Property Inventory Matrix</span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-[#091B29] dark:text-white tracking-tight">
            Room Inventory & Units
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-light">
            Manage unit availability, guest capacity, amenities, and nightly rates per category.
          </p>
        </div>

        {properties.length > 0 && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center space-x-2 px-6 py-3.5 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-orange-700 text-white text-xs font-bold rounded-2xl shadow-xl shadow-orange-500/25 hover:scale-[1.02] transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Room Unit</span>
          </button>
        )}
      </div>

      {properties.length === 0 && !loading ? (
        <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-16 text-center border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-[#087F8C]/10 text-[#087F8C] dark:text-[#27B7A8] mx-auto flex items-center justify-center">
            <Home className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-serif font-bold text-[#091B29] dark:text-white">No properties registered yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-light">You must register a property before you can configure room inventory.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Property Selector Bar */}
          <div className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3 shadow-xs flex items-center space-x-3 overflow-x-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap pl-2">
              Property:
            </span>
            <div className="flex items-center space-x-2">
              {properties.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePropertyChange(p.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedPropertyId === p.id
                      ? 'bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] text-white shadow-md shadow-teal-700/20 font-serif'
                      : 'bg-[#FFFDF7] dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Rooms Grid */}
          {rooms.length === 0 ? (
            <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-16 text-center border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-3xl bg-[#087F8C]/10 text-[#087F8C] dark:text-[#27B7A8] mx-auto flex items-center justify-center">
                <Bed className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-serif font-bold text-[#091B29] dark:text-white">No room units for this property</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto font-light">Click "Add Room Unit" to configure inventory, capacity, and nightly rates.</p>
              </div>
              <button
                onClick={openAddModal}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-[#EA580C] text-white text-xs font-bold rounded-xl shadow-md hover:scale-[1.02] transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Room Unit</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((r) => {
                const img = r.images?.[0]?.image_url || (typeof r.images?.[0] === 'string' ? r.images[0] : null);
                const totalUnits = r.quantity || 1;
                const isFullyBooked = !r.is_active || totalUnits === 0;

                return (
                  <div
                    key={r.id}
                    className="group bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-2xl hover:border-[#087F8C]/40 transition-all hover:-translate-y-1"
                  >
                    <div>
                      {/* Photo Thumbnail */}
                      <div className="aspect-16/10 bg-slate-100 dark:bg-slate-900 relative overflow-hidden">
                        {img ? (
                          <img
                            src={resolveImageUrl(img)}
                            alt={r.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 space-y-1">
                            <Bed className="w-8 h-8" />
                            <span className="text-[11px]">No Photo Uploaded</span>
                          </div>
                        )}

                        <div className="absolute top-3.5 left-3.5 px-3 py-1 bg-[#091B29]/85 backdrop-blur-md rounded-lg text-white font-bold text-[10px] uppercase tracking-wider">
                          {r.room_type}
                        </div>

                        <div className="absolute top-3.5 right-3.5">
                          {isFullyBooked ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs">
                              FULLY BOOKED
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#35A66F] text-white shadow-xs">
                              AVAILABLE
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6 space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-lg font-serif font-bold text-[#091B29] dark:text-white leading-snug group-hover:text-[#087F8C] transition-colors">
                            {r.name}
                          </h3>
                          <div className="text-right shrink-0">
                            <span className="text-lg font-serif font-black text-orange-600 dark:text-orange-400 block">
                              ₹{r.base_price?.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-400">/ night</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-300 line-clamp-2 leading-relaxed font-light">
                          {r.description}
                        </p>

                        {/* Visual Inventory Dots Matrix */}
                        <div className="p-3 bg-[#FFFDF7] dark:bg-slate-900/60 rounded-2xl border border-slate-200/50 dark:border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Inventory Units:</span>
                            <span className="font-bold text-[#091B29] dark:text-white">
                              {totalUnits} {totalUnits === 1 ? 'Unit' : 'Units'} ({r.capacity} Guests / Unit)
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5 pt-1">
                            {Array.from({ length: Math.min(10, totalUnits) }).map((_, idx) => (
                              <div
                                key={idx}
                                className={`h-2 flex-1 rounded-full ${
                                  r.is_active ? 'bg-[#35A66F]' : 'bg-rose-400'
                                }`}
                                title={`Unit #${idx + 1}`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Amenities Tags */}
                        {r.amenities && r.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {r.amenities.slice(0, 4).map((am, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-300"
                              >
                                {am.amenity_name || am}
                              </span>
                            ))}
                            {r.amenities.length > 4 && (
                              <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500">
                                +{r.amenities.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                        <Users className="w-3.5 h-3.5 text-orange-500" />
                        <span>Up to {r.capacity} guests</span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => openEditModal(r)}
                          className="p-2 text-[#087F8C] hover:bg-[#087F8C]/10 rounded-xl transition-colors cursor-pointer"
                          title="Edit Room"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(r.id, r.name)}
                          className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                          title="Delete Room"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal for Add / Edit Room */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-serif font-bold text-[#091B29] dark:text-white">
                  {editingRoomId ? 'Edit Room Unit' : 'Add New Room Unit'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure room category, pricing, available unit quantity, and guest capacity.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Room Category *
                  </label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="w-full p-3 bg-[#FFFDF7] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-[#087F8C]"
                  >
                    {ROOM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
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
                    placeholder="e.g. Deluxe Mountain View Suite"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 bg-[#FFFDF7] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-[#087F8C]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Describe room layout, bed size, view, and features..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 bg-[#FFFDF7] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-[#087F8C]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <NumberStepperInput
                  id="modal_room_capacity"
                  label="Max Guests"
                  icon={Users}
                  value={capacity}
                  onChange={setCapacity}
                  min={1}
                  max={20}
                  step={1}
                  required={true}
                  error={
                    (capacity === 0 || (capacity !== '' && parseInt(capacity, 10) < 1))
                      ? 'Guest capacity must be at least 1'
                      : ''
                  }
                />

                <NumberStepperInput
                  id="modal_room_quantity"
                  label="Available Units"
                  icon={Layers}
                  value={quantity}
                  onChange={setQuantity}
                  min={1}
                  max={100}
                  step={1}
                  required={true}
                  error={
                    (quantity === 0 || (quantity !== '' && parseInt(quantity, 10) < 1))
                      ? 'Available units must be at least 1'
                      : ''
                  }
                />

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
                    <IndianRupee className="w-3.5 h-3.5 text-orange-600" />
                    <span>Price per Night (₹) *</span>
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    required
                    placeholder="e.g. 3500"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className="w-full p-3 bg-[#FFFDF7] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-[#087F8C]"
                  />
                </div>
              </div>

              {/* Room Amenities */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Room Amenities & Features
                  </label>
                  <span className="text-[10px] text-[#087F8C] dark:text-[#27B7A8] font-bold">
                    {amenities.length} selected
                  </span>
                </div>

                {/* Active Amenities Badges */}
                {amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {amenities.map((am) => (
                      <span
                        key={am}
                        className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-[#087F8C] text-white text-xs font-bold shadow-xs"
                      >
                        <span>{am}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAmenity(am)}
                          className="hover:bg-white/30 rounded-full p-0.5 transition-colors cursor-pointer"
                          title={`Remove ${am}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Custom Amenity Adder */}
                <div className="flex items-center space-x-2 max-w-sm">
                  <input
                    type="text"
                    placeholder="Add custom feature (e.g. Jacuzzi, River View)"
                    value={customAmenity}
                    onChange={(e) => setCustomAmenity(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomAmenity();
                      }
                    }}
                    className="flex-1 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-[#087F8C]"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomAmenity}
                    className="px-4 py-2.5 bg-[#087F8C] hover:bg-[#0F9D9A] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    + Add
                  </button>
                </div>

                {/* Presets */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Suggested Features (Click to toggle):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {DEFAULT_AMENITIES.map((am) => {
                      const checked = (amenities || []).some(
                        (a) => a.toLowerCase() === am.toLowerCase()
                      );
                      return (
                        <button
                          key={am}
                          type="button"
                          onClick={() => handleAmenityToggle(am)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                            checked
                              ? 'bg-[#087F8C] text-white border-[#087F8C] shadow-xs font-bold'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-[#087F8C] hover:text-[#087F8C]'
                          }`}
                        >
                          <span>{am}</span>
                          {checked ? (
                            <Check className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Room Photos */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <MultiImageUploadPicker
                  label="Room Photos (JPG, JPEG, PNG, WebP)"
                  hint="Upload actual photos of this room unit directly to Voyara server"
                  images={images}
                  onChange={(newImgs) => setImages(newImgs)}
                  maxPhotos={8}
                  required={true}
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="room_active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-[#087F8C] focus:ring-[#087F8C]"
                />
                <label
                  htmlFor="room_active"
                  className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Room Unit Active & Available for Traveler Booking
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-2xl cursor-pointer disabled:opacity-50 text-xs shadow-md"
                >
                  {modalLoading ? 'Saving...' : editingRoomId ? 'Update Room Unit' : 'Create Room Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderRooms;
