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
  Loader2,
  Sparkles
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
      setProperties(data);
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
      setRooms(roomData);
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black font-serif text-slate-900 dark:text-white">Rooms & Units</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure bookable inventory, guest capacity, amenities, photos, and base nightly rates
          </p>
        </div>

        {properties.length > 0 && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Room Unit</span>
          </button>
        )}
      </div>

      {properties.length === 0 && !loading ? (
        <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800 space-y-3">
          <Home className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No properties registered</h3>
          <p className="text-xs text-slate-500">You must register a property before you can add room units.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Property Selector Bar */}
          <div className="flex items-center space-x-3 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Select Sanctuary:
            </span>
            {properties.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePropertyChange(p.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                  selectedPropertyId === p.id
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-500'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* Rooms Grid */}
          {rooms.length === 0 ? (
            <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800 space-y-3">
              <Bed className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No room units for this property</h3>
              <p className="text-xs text-slate-500">Click "Add Room Unit" to configure your first room type.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {rooms.map((r) => {
                const img = r.images?.[0]?.image_url || (typeof r.images?.[0] === 'string' ? r.images[0] : null);
                return (
                  <div
                    key={r.id}
                    className="bg-white dark:bg-[#131D2E] rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow group"
                  >
                    <div>
                      {/* Photo Thumbnail */}
                      <div className="aspect-16/10 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
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

                        <div className="absolute top-3 left-3 px-2.5 py-1 bg-slate-900/80 backdrop-blur-md rounded-lg text-white font-bold text-[10px] uppercase">
                          {r.room_type}
                        </div>

                        <div className="absolute top-3 right-3 flex items-center space-x-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.is_active
                                ? 'bg-emerald-500/90 text-white'
                                : 'bg-rose-500/90 text-white'
                            }`}
                          >
                            {r.is_active ? 'Active' : 'Paused'}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5 space-y-3">
                        <div className="flex items-start justify-between">
                          <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white leading-tight">
                            {r.name}
                          </h3>
                          <div className="text-right shrink-0">
                            <span className="text-base font-bold text-[#F97360] font-serif block">
                              ₹{r.base_price?.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-400">/ night</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-300 line-clamp-2">
                          {r.description}
                        </p>

                        <div className="flex items-center space-x-3 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                          <span className="flex items-center space-x-1">
                            <Users className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Max {r.capacity} Guests</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center space-x-1">
                            <Layers className="w-3.5 h-3.5 text-orange-500" />
                            <span>{r.quantity} Available Unit(s)</span>
                          </span>
                        </div>

                        {/* Amenities */}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {r.amenities?.map((a, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-[#FFF8F0] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-semibold"
                            >
                              {a.amenity_name || a}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {r.images?.length || 0} photo(s)
                      </span>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openEditModal(r)}
                          className="p-1.5 text-slate-600 hover:text-orange-500 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Edit Room"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(r.id, r.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
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

      {/* Add / Edit Room Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-[#131D2E] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[92vh] overflow-y-auto my-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Bed className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white">
                  {editingRoomId ? 'Edit Room Unit' : 'Add New Room Unit'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center space-x-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Room Type *
                  </label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-hidden"
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
                    className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-hidden"
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
                  className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden"
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
                    <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
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
                    className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-hidden"
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
                    {amenities.length} selected
                  </span>
                </div>

                {/* Active Amenities Badges */}
                {amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {amenities.map((am) => (
                      <span
                        key={am}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold shadow-2xs"
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
                    placeholder="Add custom room feature (e.g. Jacuzzi, River View)"
                    value={customAmenity}
                    onChange={(e) => setCustomAmenity(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomAmenity();
                      }
                    }}
                    className="flex-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomAmenity}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    + Add
                  </button>
                </div>

                {/* Presets */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Suggested Features (Click to add/remove):
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
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                <label
                  htmlFor="room_active"
                  className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Room Unit Active & Available for Customer Booking
                </label>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50 text-xs shadow-md"
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
