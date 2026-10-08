import React, { useState, useEffect } from 'react';
import { providerApi } from '../../api/provider';
import { ImageUploadPicker } from '../../components/common/ImageUploadPicker';
import {
  Flame,
  Plus,
  Trash2,
  Edit,
  Users,
  Clock,
  DollarSign,
  AlertCircle,
  Home,
  Check,
  ShieldCheck,
  Calendar,
  Sparkles,
  Compass,
  CheckCircle2,
  X,
} from 'lucide-react';

export const ProviderAdventures = () => {
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [adventures, setAdventures] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State (Create & Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAdventureId, setEditingAdventureId] = useState(null);
  const [title, setTitle] = useState('');
  const [adventureType, setAdventureType] = useState('Guided Trek');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [pricingModel, setPricingModel] = useState('per_person');
  const [capacity, setCapacity] = useState('15');
  const [duration, setDuration] = useState('3 Hours');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1000&q=80');
  const [isActive, setIsActive] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const advTypes = [
    'Campfire',
    'Guided Trek',
    'Sightseeing',
    'Local Food Adventure',
    'Outdoor Activity',
    'Cultural Adventure',
    'Adventure',
    'Event',
  ];

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const data = await providerApi.getProperties();
      setProperties(Array.isArray(data) ? data : []);
      if (data.length > 0) {
        setSelectedPropertyId(data[0].id);
        fetchAdventures(data[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load properties.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdventures = async (propId) => {
    try {
      const advList = await providerApi.getAdventures(propId);
      setAdventures(Array.isArray(advList) ? advList : []);
    } catch (err) {
      console.error('Error loading adventures:', err);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handlePropertyChange = (propId) => {
    setSelectedPropertyId(propId);
    fetchAdventures(propId);
  };

  const handleOpenCreateModal = () => {
    setEditingAdventureId(null);
    setTitle('');
    setAdventureType('Guided Trek');
    setDescription('');
    setPrice('');
    setPricingModel('per_person');
    setCapacity('15');
    setDuration('3 Hours');
    setImageUrl('https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1000&q=80');
    setIsActive(true);
    setError('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (adv) => {
    setEditingAdventureId(adv.id);
    setTitle(adv.title || '');
    setAdventureType(adv.adventure_type || adv.experience_type || 'Guided Trek');
    setDescription(adv.description || '');
    setPrice(adv.price !== undefined && adv.price !== null ? String(adv.price) : '');
    setPricingModel(adv.pricing_model || 'per_person');
    setCapacity(adv.capacity !== undefined && adv.capacity !== null ? String(adv.capacity) : '15');
    setDuration(adv.duration || '3 Hours');
    setImageUrl(adv.image_url || 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1000&q=80');
    setIsActive(adv.is_active !== undefined ? adv.is_active : true);
    setError('');
    setModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setError('');
    try {
      const payload = {
        title: title.trim(),
        adventure_type: adventureType,
        experience_type: adventureType,
        description: description.trim(),
        price: parseFloat(price),
        pricing_model: pricingModel,
        capacity: parseInt(capacity, 10),
        duration: duration.trim(),
        image_url: imageUrl,
        is_active: isActive,
      };

      if (editingAdventureId) {
        await providerApi.updateAdventure(editingAdventureId, payload);
        setSuccessToast(`Adventure '${title}' updated successfully!`);
      } else {
        await providerApi.createAdventure(selectedPropertyId, {
          ...payload,
          schedule_type: 'recurring',
        });
        setSuccessToast(`Adventure '${title}' created successfully!`);
      }

      setModalOpen(false);
      fetchAdventures(selectedPropertyId);
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to save adventure.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteAdventure = async (advId, advTitle) => {
    if (!window.confirm(`Are you sure you want to delete adventure '${advTitle}'?`)) return;
    try {
      await providerApi.deleteAdventure(advId);
      setSuccessToast(`Adventure '${advTitle}' deleted.`);
      fetchAdventures(selectedPropertyId);
      setTimeout(() => setSuccessToast(''), 3000);
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Failed to delete adventure.');
    }
  };

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#091B29] dark:text-white tracking-tight">
            Adventures at Your Place
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-light">
            Curate and manage adventures offered at your properties.
          </p>
        </div>

        {properties.length > 0 && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center space-x-2 px-6 py-3.5 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-orange-700 text-white text-xs font-bold rounded-2xl shadow-xl shadow-orange-500/25 hover:scale-[1.02] transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Adventure to {selectedProperty?.name ? selectedProperty.name.split(' ')[0] : 'Stay'}</span>
          </button>
        )}
      </div>

      {/* Success Toast Banner */}
      {successToast && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center space-x-2 animate-in fade-in duration-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {properties.length === 0 && !loading ? (
        <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-16 text-center border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-sm">
          <Home className="w-14 h-14 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-xl font-serif font-bold text-[#091B29] dark:text-white">No properties found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-light">Register a property first to attach authentic partner adventures.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Property Selector */}
          <div className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                <Home className="w-3.5 h-3.5 text-[#087F8C]" />
                <span>Select Stay / Property:</span>
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                {properties.length} Active Stays
              </span>
            </div>
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 custom-scrollbar">
              {properties.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePropertyChange(p.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center space-x-1.5 ${
                    selectedPropertyId === p.id
                      ? 'bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] text-white shadow-md shadow-teal-700/20 font-serif'
                      : 'bg-[#FFFDF7] dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800'
                  }`}
                >
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Stay Action Header */}
          {selectedProperty && (
            <div className="bg-gradient-to-r from-[#FFFDF7] via-white to-orange-50/30 dark:from-[#0F273D] dark:via-[#0F273D] dark:to-orange-950/20 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-serif font-bold text-[#091B29] dark:text-white">
                      {selectedProperty.name}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/15 text-orange-700 dark:text-orange-300">
                      {adventures.length} Adventure{adventures.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-light">
                    {selectedProperty.city ? `${selectedProperty.city}, ${selectedProperty.state || ''}` : 'Manage attached activities and excursions'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 hover:scale-[1.02] transition-all cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Adventure to this Stay</span>
              </button>
            </div>
          )}

          {/* Grid */}
          {adventures.length === 0 ? (
            <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-16 text-center border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-3xl bg-orange-500/10 text-orange-600 dark:text-orange-400 mx-auto flex items-center justify-center">
                <Flame className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-serif font-bold text-[#091B29] dark:text-white">
                  Add adventures to {selectedProperty?.name || 'your stay'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto font-light leading-relaxed">
                  Add multiple stargazing campfires, plantation walks, river rafting, or cultural dinners to offer complete travel journeys to your guests.
                </p>
              </div>
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-[#EA580C] text-white text-xs font-bold rounded-2xl shadow-md hover:scale-[1.02] transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add First Adventure to this Stay</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {adventures.map((a) => (
                <div
                  key={a.id}
                  className="group bg-white dark:bg-[#0F273D] rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-2xl hover:border-[#087F8C]/40 transition-all flex flex-col justify-between hover:-translate-y-1"
                >
                  <div>
                    <div className="relative aspect-16/10 bg-slate-100 dark:bg-slate-900 overflow-hidden">
                      <img
                        src={a.image_url}
                        alt={a.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(err) => {
                          err.target.src = 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                      <div className="absolute top-3.5 left-3.5 flex items-center space-x-2">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#091B29]/85 text-white backdrop-blur-md shadow-xs">
                          {a.adventure_type || a.experience_type}
                        </span>
                        {a.is_active === false && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/90 text-white shadow-xs">
                            Inactive
                          </span>
                        )}
                      </div>

                      <div className="absolute top-3.5 right-3.5">
                        <button
                          onClick={() => handleOpenEditModal(a)}
                          className="p-2 bg-[#091B29]/80 hover:bg-[#087F8C] text-white rounded-xl backdrop-blur-md transition-all shadow-md cursor-pointer"
                          title="Edit Adventure Details"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          onClick={() => handleOpenEditModal(a)}
                          className="text-lg font-serif font-bold text-[#091B29] dark:text-white leading-snug group-hover:text-[#087F8C] transition-colors cursor-pointer"
                        >
                          {a.title}
                        </h3>
                        <div className="text-right shrink-0">
                          <span className="text-lg font-serif font-black text-orange-600 dark:text-orange-400 block">
                            ₹{a.price?.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-400">/ {a.pricing_model === 'per_person' ? 'person' : 'session'}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-300 line-clamp-2 leading-relaxed font-light">
                        {a.description}
                      </p>

                      <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="flex items-center space-x-1.5">
                          <Users className="w-3.5 h-3.5 text-orange-500" />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Max {a.capacity} Seats</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#087F8C] dark:text-[#27B7A8]" />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{a.duration}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center space-x-1 text-[#35A66F] font-bold text-[11px]">
                      <Check className="w-3.5 h-3.5 text-[#35A66F]" />
                      <span>Capacity Enforced</span>
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleOpenEditModal(a)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#087F8C]/10 hover:bg-[#087F8C]/20 text-[#087F8C] dark:text-[#27B7A8] font-bold rounded-xl transition-colors cursor-pointer text-xs"
                        title="Edit Adventure Details"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteAdventure(a.id, a.title)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                        title="Delete Adventure"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* + Add Another Adventure Card */}
              <div
                onClick={handleOpenCreateModal}
                className="group border-2 border-dashed border-[#087F8C]/30 hover:border-[#087F8C] bg-teal-500/5 hover:bg-teal-500/10 dark:bg-teal-900/10 dark:hover:bg-teal-900/20 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[340px] transition-all hover:scale-[1.01] shadow-xs"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#087F8C]/20 to-teal-500/20 text-[#087F8C] dark:text-teal-300 flex items-center justify-center group-hover:scale-110 transition-transform mb-4 shadow-inner">
                  <Plus className="w-7 h-7" />
                </div>
                <h4 className="text-base font-serif font-bold text-[#091B29] dark:text-white">
                  + Add Another Adventure
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xs font-light leading-relaxed">
                  Attach multiple guided treks, campfires, cooking workshops, or outdoor activities to <strong className="text-slate-700 dark:text-slate-200 font-semibold">{selectedProperty?.name || 'this stay'}</strong>.
                </p>
                <button
                  type="button"
                  className="mt-5 px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-[#EA580C] text-white text-xs font-bold shadow-md shadow-orange-500/20 group-hover:from-orange-600 group-hover:to-orange-700 transition-all pointer-events-none"
                >
                  + Add Adventure
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Adventure Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl border border-slate-200 dark:border-slate-800 custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  {editingAdventureId ? <Edit className="w-5 h-5" /> : <Flame className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-[#091B29] dark:text-white">
                    {editingAdventureId ? 'Edit Stay Partner Adventure' : 'Create Stay Partner Adventure'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingAdventureId
                      ? 'Update details, pricing, capacity, and itinerary'
                      : 'Attach adventure, cultural, or culinary activity'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-4 text-xs">
              {/* Target Property Indicator */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Attached Stay / Property *
                </label>
                <select
                  value={selectedPropertyId || ''}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  disabled={editingAdventureId ? true : false}
                  className="w-full p-3 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden font-medium disabled:opacity-75"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id} className="dark:bg-slate-900">
                      {p.name} {p.city ? `(${p.city})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  This adventure will be available for guests booking {selectedProperty?.name || 'this stay'}.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Adventure Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Starlit Campfire & Acoustic Night"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Type *</label>
                  <select
                    value={adventureType}
                    onChange={(e) => setAdventureType(e.target.value)}
                    className="w-full p-3 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    {advTypes.map((t) => (
                      <option key={t} value={t} className="dark:bg-slate-900 text-slate-900 dark:text-white">{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Pricing Model</label>
                  <select
                    value={pricingModel}
                    onChange={(e) => setPricingModel(e.target.value)}
                    className="w-full p-3 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="per_person" className="dark:bg-slate-900 text-slate-900 dark:text-white">Per Person</option>
                    <option value="fixed" className="dark:bg-slate-900 text-slate-900 dark:text-white">Fixed Price</option>
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
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full p-3 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Capacity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full p-3 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Duration</label>
                  <input
                    type="text"
                    required
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full p-3 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the adventure itinerary, equipment provided, departure point..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <ImageUploadPicker
                label="Adventure Photo Upload"
                hint="Upload adventure image directly to local storage"
                value={imageUrl}
                onChange={(url) => setImageUrl(url)}
              />

              {editingAdventureId && (
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <div>
                    <label className="font-bold text-slate-800 dark:text-slate-200">Active Status</label>
                    <p className="text-[11px] text-slate-500">Allow travelers to discover and book this adventure</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-[#c2410c] text-white font-bold rounded-2xl cursor-pointer disabled:opacity-50 shadow-md shadow-orange-500/20 transition-all"
                >
                  {modalLoading ? 'Saving...' : editingAdventureId ? 'Save Changes' : '+ Save Adventure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderAdventures;
