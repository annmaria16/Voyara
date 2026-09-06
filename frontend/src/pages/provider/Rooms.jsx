import React, { useState, useEffect } from 'react';
import { providerApi } from '../../api/provider';
import { ImageUploadPicker } from '../../components/common/ImageUploadPicker';
import { Layers, Plus, Trash2, Edit, Users, DollarSign, Home, AlertCircle, Check } from 'lucide-react';

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
  const [amenities, setAmenities] = useState(['King Bed', 'Balcony', 'Free Wi-Fi']);
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80');
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState('');

  const roomTypes = ['Deluxe Room', 'Standard Room', 'Family Room', 'Premium Villa', 'Cottage Unit', 'Tent', 'Private Cabin'];
  const defaultAmenities = ['King Bed', 'Balcony', 'Free Wi-Fi', 'Hot Shower', 'Tea Maker', 'Air Conditioning', 'TV', 'Mini Bar'];

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
    setImageUrl('https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80');
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
    setImageUrl(room.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80');
    setAmenities(room.amenities?.map(a => a.amenity_name || a) || ['King Bed', 'Balcony', 'Free Wi-Fi']);
    setError('');
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setError('');
    try {
      const payload = {
        name: name.trim(),
        room_type: roomType,
        description: description.trim(),
        capacity: parseInt(capacity, 10),
        quantity: parseInt(quantity, 10),
        base_price: parseFloat(basePrice),
        is_active: isActive,
        amenities,
        images: imageUrl ? [imageUrl] : [],
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
    if (!window.confirm(`Delete room '${roomName}'?`)) return;
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
          <p className="text-xs text-slate-500 dark:text-slate-400">Configure bookable inventory and base nightly rates</p>
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

      {properties.length === 0 ? (
        <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-12 text-center border border-[#FDBA9A]/30 dark:border-slate-800 space-y-3">
          <Home className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No properties found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">You must register a property before adding rooms.</p>
        </div>
      ) : (
        <>
          {/* Property Selector Bar */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 mr-2">
              Select Property:
            </span>
            {properties.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePropertyChange(p.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedPropertyId === p.id
                    ? 'bg-gradient-to-r from-[#F97360] to-orange-500 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-orange-500/10 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* Rooms Grid */}
          {rooms.length === 0 ? (
            <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-12 text-center border border-[#FDBA9A]/30 dark:border-slate-800 space-y-3">
              <Layers className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No room units created for this property</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Click "Add Room Unit" to create bookable inventory.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((r) => {
                const img = r.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80';
                return (
                  <div
                    key={r.id}
                    className="bg-white dark:bg-[#131D2E] rounded-3xl overflow-hidden border border-[#FDBA9A]/30 dark:border-slate-800 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-16/10 bg-slate-100 dark:bg-slate-800">
                        <img src={img} alt={r.name} className="w-full h-full object-cover" />
                        <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900/90 text-white backdrop-blur-xs">
                          {r.room_type}
                        </span>
                        <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold ${r.is_active ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                          {r.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="p-5 space-y-3">
                        <div className="flex items-start justify-between">
                          <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white">{r.name}</h3>
                          <div className="text-right">
                            <span className="text-base font-bold text-orange-600 dark:text-orange-400 font-serif block">
                              ₹{r.base_price?.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-400">/ night</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{r.description}</p>

                        <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="flex items-center space-x-1">
                            <Users className="w-3.5 h-3.5 text-orange-500" />
                            <span>Max {r.capacity} Guests</span>
                          </span>
                          <span>•</span>
                          <span>{r.quantity} Units</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-[#FFF8F0]/60 dark:bg-slate-900/70 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <button
                        onClick={() => openEditModal(r)}
                        className="inline-flex items-center space-x-1 font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit Room</span>
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(r.id, r.name)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                        title="Delete Room"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add / Edit Room Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-bold font-serif text-slate-900 dark:text-white">
              {editingRoomId ? 'Edit Room Unit' : 'Add Room Unit'}
            </h3>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Room Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deluxe Ocean Suite"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Room Type</label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    {roomTypes.map((t) => (
                      <option key={t} value={t} className="dark:bg-slate-900 text-slate-900 dark:text-white">{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Base Price (₹/night) *</label>
                  <input
                    type="number"
                    required
                    placeholder="5000"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Max Guests (Capacity) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Total Rooms Available (Quantity) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="room_active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="room_active" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Room Active & Available for Booking
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Bedding details, views, features..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <ImageUploadPicker
                label="Room Photo Upload"
                hint="Upload room photo directly to local storage"
                value={imageUrl}
                onChange={(url) => setImageUrl(url)}
              />

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {modalLoading ? 'Saving...' : editingRoomId ? 'Update Room' : 'Create Room'}
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
