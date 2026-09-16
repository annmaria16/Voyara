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
  const [roomRules, setRoomRules] = useState({
    max_adults: 2,
    max_children: 1,
    additional_children_allowed: 0,
    max_child_age: '',
    free_additional_children: 0,
    child_charge_enabled: false,
    child_charge_amount: 0,
    child_charge_unit: 'Per night',
    existing_bed_allowed: 'Yes',
    existing_bed_explanation: '',
    extra_bed_available: 'No',
    maximum_extra_beds: 1,
    extra_bed_price: 0,
    extra_bed_charge_unit: 'Per night',
    cot_available: 'No',
    cot_quantity: 1,
    cot_price: 0,
    cot_charge_unit: 'Free',
    children_allowed: true,
    min_child_age: 0,
    cot_allowed: false,
    cot_count: 1,
    extra_bed_allowed: false,
    extra_bed_max: 1,
    child_price: 0,
    room_rules: '',
  });
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
    setRoomRules({
      max_adults: 2,
      max_children: 1,
      additional_children_allowed: 0,
      max_child_age: '',
      free_additional_children: 0,
      child_charge_enabled: false,
      child_charge_amount: 0,
      child_charge_unit: 'Per night',
      existing_bed_allowed: 'Yes',
      existing_bed_explanation: '',
      extra_bed_available: 'No',
      maximum_extra_beds: 1,
      extra_bed_price: 0,
      extra_bed_charge_unit: 'Per night',
      cot_available: 'No',
      cot_quantity: 1,
      cot_price: 0,
      cot_charge_unit: 'Free',
      children_allowed: true,
      min_child_age: 0,
      cot_allowed: false,
      cot_count: 1,
      extra_bed_allowed: false,
      extra_bed_max: 1,
      child_price: 0,
      room_rules: '',
    });
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
    const r = room.rules || {};
    setRoomRules({
      max_adults: r.max_adults ?? room.capacity ?? 2,
      max_children: r.max_children ?? room.capacity ?? 1,
      additional_children_allowed: r.additional_children_allowed ?? 0,
      max_child_age: r.max_child_age ?? '',
      free_additional_children: r.free_additional_children ?? 0,
      child_charge_enabled: !!r.child_charge_enabled,
      child_charge_amount: r.child_charge_amount ?? 0,
      child_charge_unit: r.child_charge_unit || 'Per night',
      existing_bed_allowed: r.existing_bed_allowed || 'Yes',
      existing_bed_explanation: r.existing_bed_explanation || '',
      extra_bed_available: r.extra_bed_available || (r.extra_bed_allowed ? 'Yes' : 'No'),
      maximum_extra_beds: r.maximum_extra_beds ?? r.extra_bed_max ?? 1,
      extra_bed_price: r.extra_bed_price ?? 0,
      extra_bed_charge_unit: r.extra_bed_charge_unit || 'Per night',
      cot_available: r.cot_available || (r.cot_allowed ? 'Yes' : 'No'),
      cot_quantity: r.cot_quantity ?? r.cot_count ?? 1,
      cot_price: r.cot_price ?? 0,
      cot_charge_unit: r.cot_charge_unit || 'Free',
      children_allowed: r.children_allowed !== false,
      min_child_age: r.min_child_age || 0,
      cot_allowed: !!r.cot_allowed || r.cot_available === 'Yes',
      cot_count: r.cot_quantity ?? r.cot_count ?? 1,
      extra_bed_allowed: !!r.extra_bed_allowed || r.extra_bed_available === 'Yes',
      extra_bed_max: r.maximum_extra_beds ?? r.extra_bed_max ?? 1,
      child_price: r.child_price || 0,
      room_rules: r.room_rules || '',
    });
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

    const maxAdultsVal = parseInt(roomRules.max_adults, 10);
    const maxChildrenVal = parseInt(roomRules.max_children, 10);
    if (!isNaN(maxAdultsVal) && maxAdultsVal > cap) {
      setError(`Max adults (${maxAdultsVal}) cannot exceed room capacity (${cap}).`);
      return;
    }
    if (!isNaN(maxChildrenVal) && maxChildrenVal > cap) {
      setError(`Max children (${maxChildrenVal}) cannot exceed room capacity (${cap}).`);
      return;
    }
    if (parseInt(roomRules.free_additional_children, 10) > parseInt(roomRules.additional_children_allowed, 10)) {
      setError('Free additional children cannot exceed the number of additional children allowed.');
      return;
    }
    if (roomRules.min_child_age < 0 || roomRules.cot_price < 0 || roomRules.extra_bed_price < 0 || roomRules.child_charge_amount < 0) {
      setError('Ages and prices must be non-negative values.');
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
        rules: {
          max_adults: parseInt(roomRules.max_adults, 10) || cap,
          max_children: parseInt(roomRules.max_children, 10) || cap,
          additional_children_allowed: parseInt(roomRules.additional_children_allowed, 10) || 0,
          max_child_age: roomRules.max_child_age !== '' && roomRules.max_child_age !== null && roomRules.max_child_age !== undefined ? parseInt(roomRules.max_child_age, 10) : undefined,
          free_additional_children: parseInt(roomRules.free_additional_children, 10) || 0,
          child_charge_enabled: !!roomRules.child_charge_enabled,
          child_charge_amount: parseFloat(roomRules.child_charge_amount) || 0,
          child_charge_unit: roomRules.child_charge_unit || 'Per night',
          existing_bed_allowed: roomRules.existing_bed_allowed || 'Yes',
          existing_bed_explanation: roomRules.existing_bed_explanation?.trim() || undefined,
          extra_bed_available: roomRules.extra_bed_available || (roomRules.extra_bed_allowed ? 'Yes' : 'No'),
          maximum_extra_beds: parseInt(roomRules.maximum_extra_beds, 10) || parseInt(roomRules.extra_bed_max, 10) || 0,
          extra_bed_price: parseFloat(roomRules.extra_bed_price) || 0,
          extra_bed_charge_unit: roomRules.extra_bed_charge_unit || 'Per night',
          cot_available: roomRules.cot_available || (roomRules.cot_allowed ? 'Yes' : 'No'),
          cot_quantity: parseInt(roomRules.cot_quantity, 10) || parseInt(roomRules.cot_count, 10) || 0,
          cot_price: parseFloat(roomRules.cot_price) || 0,
          cot_charge_unit: roomRules.cot_charge_unit || 'Free',
          children_allowed: !!roomRules.children_allowed,
          min_child_age: parseInt(roomRules.min_child_age, 10) || 0,
          cot_allowed: !!roomRules.cot_allowed || roomRules.cot_available === 'Yes',
          cot_count: parseInt(roomRules.cot_quantity, 10) || parseInt(roomRules.cot_count, 10) || 0,
          extra_bed_allowed: !!roomRules.extra_bed_allowed || roomRules.extra_bed_available === 'Yes',
          extra_bed_max: parseInt(roomRules.maximum_extra_beds, 10) || parseInt(roomRules.extra_bed_max, 10) || 0,
          child_price: parseFloat(roomRules.child_price) || 0,
          room_rules: roomRules.room_rules?.trim() || undefined,
        },
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

              {/* Child Occupancy & Additional Child Policy */}
              <div className="p-4 rounded-2xl bg-[#FFFDF7] dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#087F8C] dark:text-[#27B7A8] flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Child Occupancy & Additional Child Policy</span>
                  </h3>
                  <span className="text-[10px] text-slate-400">Voyara StayGuide Grounded</span>
                </div>

                {/* Base Adult & Child Limits */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Max Standard Adults (Per Room)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={roomRules.max_adults}
                      onChange={(e) => setRoomRules({ ...roomRules, max_adults: parseInt(e.target.value, 10) || 1 })}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Max Standard Children (Per Room)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={roomRules.max_children}
                      onChange={(e) => setRoomRules({ ...roomRules, max_children: parseInt(e.target.value, 10) || 0 })}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    />
                  </div>
                </div>

                {/* 1. Additional Children Allowed & 2. Child Age Limit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      1. Additional Children Allowed
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={roomRules.additional_children_allowed ?? 0}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                        setRoomRules({
                          ...roomRules,
                          additional_children_allowed: val,
                          free_additional_children: Math.min(roomRules.free_additional_children || 0, val),
                        });
                      }}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    />
                    <span className="text-[10px] text-slate-400">Permitted in addition to standard occupancy</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      2. Child Age Limit (Years)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="17"
                      placeholder="e.g. 5 or 12"
                      value={roomRules.max_child_age ?? ''}
                      onChange={(e) => setRoomRules({ ...roomRules, max_child_age: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    />
                    <span className="text-[10px] text-slate-400">Maximum age for additional child</span>
                  </div>
                </div>

                {/* 3. Free Additional Children & 4. Additional Child Charge */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      3. Free Additional Children
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={roomRules.additional_children_allowed || 0}
                      value={roomRules.free_additional_children ?? 0}
                      onChange={(e) => setRoomRules({ ...roomRules, free_additional_children: Math.min(roomRules.additional_children_allowed || 0, Math.max(0, parseInt(e.target.value, 10) || 0)) })}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    />
                    <span className="text-[10px] text-slate-400">Stay free of charge (sharing bed)</span>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">
                      4. Additional Child Charge?
                    </label>
                    <div className="flex gap-2">
                      {['No', 'Yes'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setRoomRules({ ...roomRules, child_charge_enabled: opt === 'Yes' })}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            (roomRules.child_charge_enabled ? 'Yes' : 'No') === opt
                              ? 'bg-[#087F8C] text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>

                    {roomRules.child_charge_enabled && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Amount (₹)</span>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={roomRules.child_charge_amount ?? 0}
                            onChange={(e) => setRoomRules({ ...roomRules, child_charge_amount: Math.max(0, parseFloat(e.target.value) || 0) })}
                            className="w-full p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Unit</span>
                          <select
                            value={roomRules.child_charge_unit || 'Per night'}
                            onChange={(e) => setRoomRules({ ...roomRules, child_charge_unit: e.target.value })}
                            className="w-full p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                          >
                            <option value="Per night">Per night</option>
                            <option value="Per stay">Per stay</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Existing Bed Policy */}
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    5. Are children allowed to share existing beds?
                  </label>
                  <div className="flex gap-2">
                    {['Yes', 'No'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setRoomRules({ ...roomRules, existing_bed_allowed: opt })}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          (roomRules.existing_bed_allowed || 'Yes') === opt
                            ? 'bg-[#087F8C] text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Optional details (e.g., sharing king bed with parents)"
                    value={roomRules.existing_bed_explanation || ''}
                    onChange={(e) => setRoomRules({ ...roomRules, existing_bed_explanation: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>

                {/* 6. Extra Bed & 7. Baby Cot */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  {/* Extra Bed */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">
                      6. Extra Bed Available?
                    </label>
                    <div className="flex gap-2">
                      {['No', 'Yes'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setRoomRules({
                            ...roomRules,
                            extra_bed_available: opt,
                            extra_bed_allowed: opt === 'Yes',
                          })}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            (roomRules.extra_bed_available || (roomRules.extra_bed_allowed ? 'Yes' : 'No')) === opt
                              ? 'bg-[#F97316] text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>

                    {(roomRules.extra_bed_available === 'Yes' || roomRules.extra_bed_allowed) && (
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Max Beds</span>
                          <input
                            type="number"
                            min="1"
                            max="5"
                            value={roomRules.maximum_extra_beds ?? roomRules.extra_bed_max ?? 1}
                            onChange={(e) => {
                              const v = Math.max(1, parseInt(e.target.value, 10) || 1);
                              setRoomRules({ ...roomRules, maximum_extra_beds: v, extra_bed_max: v });
                            }}
                            className="w-full p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Price (₹)</span>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={roomRules.extra_bed_price ?? 0}
                            onChange={(e) => setRoomRules({ ...roomRules, extra_bed_price: Math.max(0, parseFloat(e.target.value) || 0) })}
                            className="w-full p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Unit</span>
                          <select
                            value={roomRules.extra_bed_charge_unit || 'Per night'}
                            onChange={(e) => setRoomRules({ ...roomRules, extra_bed_charge_unit: e.target.value })}
                            className="w-full p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                          >
                            <option value="Per night">Per night</option>
                            <option value="Per stay">Per stay</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Baby Cot */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">
                      7. Baby Cot Available?
                    </label>
                    <div className="flex gap-2">
                      {['No', 'Yes'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setRoomRules({
                            ...roomRules,
                            cot_available: opt,
                            cot_allowed: opt === 'Yes',
                          })}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            (roomRules.cot_available || (roomRules.cot_allowed ? 'Yes' : 'No')) === opt
                              ? 'bg-[#087F8C] text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>

                    {(roomRules.cot_available === 'Yes' || roomRules.cot_allowed) && (
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Max Cots</span>
                          <input
                            type="number"
                            min="1"
                            max="5"
                            value={roomRules.cot_quantity ?? roomRules.cot_count ?? 1}
                            onChange={(e) => {
                              const v = Math.max(1, parseInt(e.target.value, 10) || 1);
                              setRoomRules({ ...roomRules, cot_quantity: v, cot_count: v });
                            }}
                            className="w-full p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Price (₹)</span>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={roomRules.cot_price ?? 0}
                            onChange={(e) => setRoomRules({ ...roomRules, cot_price: Math.max(0, parseFloat(e.target.value) || 0) })}
                            className="w-full p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Unit</span>
                          <select
                            value={roomRules.cot_charge_unit || 'Free'}
                            onChange={(e) => setRoomRules({ ...roomRules, cot_charge_unit: e.target.value })}
                            className="w-full p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                          >
                            <option value="Free">Free</option>
                            <option value="Per night">Per night</option>
                            <option value="Per stay">Per stay</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                    Custom Room Rule / Occupancy Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Balcony safety latch required for toddlers under 5."
                    value={roomRules.room_rules}
                    onChange={(e) => setRoomRules({ ...roomRules, room_rules: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>

                {/* Live Room Policy Preview */}
                <div className="p-3.5 rounded-xl bg-teal-50/70 dark:bg-slate-800/80 border border-teal-200/80 dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-[#087F8C] dark:text-[#27B7A8] font-bold text-[11px]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Live Room Policy Preview for Travelers</span>
                  </div>
                  <div className="text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
                    <p>• <strong>Maximum occupancy:</strong> {capacity || 2} guests (Max {roomRules.max_adults || capacity || 2} adults, Max {roomRules.max_children ?? 0} standard children).</p>
                    <p>• <strong>Additional children:</strong> {roomRules.additional_children_allowed > 0 ? `Up to ${roomRules.additional_children_allowed} additional child(ren) allowed` : 'No additional children beyond standard occupancy'}{roomRules.max_child_age !== '' && roomRules.max_child_age !== null && roomRules.max_child_age !== undefined ? ` (Up to ${roomRules.max_child_age} yrs)` : ''}.</p>
                    <p>• <strong>Child pricing:</strong> {roomRules.free_additional_children > 0 ? `${roomRules.free_additional_children} child stays free. ` : ''}{roomRules.child_charge_enabled && roomRules.child_charge_amount > 0 ? `Extra child charge: ₹${roomRules.child_charge_amount} ${roomRules.child_charge_unit?.toLowerCase() || 'per night'}` : 'No additional child fee'}.</p>
                    <p>• <strong>Existing bed sharing:</strong> {roomRules.existing_bed_allowed === 'Yes' ? 'Allowed' : 'Not permitted'}{roomRules.existing_bed_explanation ? ` (${roomRules.existing_bed_explanation})` : ''}.</p>
                    {(roomRules.extra_bed_available === 'Yes' || roomRules.extra_bed_allowed) && (
                      <p>• <strong>Extra bed:</strong> Available ({roomRules.maximum_extra_beds || roomRules.extra_bed_max || 1} max, {roomRules.extra_bed_price > 0 ? `₹${roomRules.extra_bed_price} ${roomRules.extra_bed_charge_unit?.toLowerCase() || 'per night'}` : 'Complimentary'}).</p>
                    )}
                    {(roomRules.cot_available === 'Yes' || roomRules.cot_allowed) && (
                      <p>• <strong>Baby cot:</strong> Available ({roomRules.cot_quantity || roomRules.cot_count || 1} available, {roomRules.cot_charge_unit === 'Free' || roomRules.cot_price === 0 ? 'Complimentary' : `₹${roomRules.cot_price} ${roomRules.cot_charge_unit?.toLowerCase() || 'per night'}`}).</p>
                    )}
                    {roomRules.room_rules && (
                      <p>• <strong>Note:</strong> {roomRules.room_rules}</p>
                    )}
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
