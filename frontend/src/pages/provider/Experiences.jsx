import React, { useState, useEffect } from 'react';
import { providerApi } from '../../api/provider';
import { ImageUploadPicker } from '../../components/common/ImageUploadPicker';
import { Flame, Plus, Trash2, Users, Clock, DollarSign, AlertCircle, Home, Check } from 'lucide-react';

export const ProviderExperiences = () => {
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Experience Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [experienceType, setExperienceType] = useState('Guided Trek');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [pricingModel, setPricingModel] = useState('per_person');
  const [capacity, setCapacity] = useState('15');
  const [duration, setDuration] = useState('3 Hours');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1000&q=80');
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState('');

  const expTypes = [
    'Campfire',
    'Guided Trek',
    'Sightseeing',
    'Local Food Experience',
    'Outdoor Activity',
    'Cultural Experience',
    'Adventure',
    'Event',
  ];

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const data = await providerApi.getProperties();
      setProperties(data);
      if (data.length > 0) {
        setSelectedPropertyId(data[0].id);
        fetchExperiences(data[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load properties.');
    } finally {
      setLoading(false);
    }
  };

  const fetchExperiences = async (propId) => {
    try {
      const expList = await providerApi.getExperiences(propId);
      setExperiences(expList);
    } catch (err) {
      console.error('Error loading experiences:', err);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handlePropertyChange = (propId) => {
    setSelectedPropertyId(propId);
    fetchExperiences(propId);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setError('');
    try {
      const payload = {
        title,
        experience_type: experienceType,
        description,
        price: parseFloat(price),
        pricing_model: pricingModel,
        capacity: parseInt(capacity, 10),
        duration,
        schedule_type: 'recurring',
        image_url: imageUrl,
      };

      await providerApi.createExperience(selectedPropertyId, payload);
      setModalOpen(false);
      setTitle('');
      setPrice('');
      setDescription('');
      fetchExperiences(selectedPropertyId);
    } catch (err) {
      setError(err.message || 'Failed to create experience.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteExperience = async (expId, expTitle) => {
    if (!window.confirm(`Delete experience '${expTitle}'?`)) return;
    try {
      await providerApi.deleteExperience(expId);
      fetchExperiences(selectedPropertyId);
    } catch (err) {
      alert(err.message || 'Failed to delete experience.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black font-serif text-slate-900 dark:text-white">Experiences & Events</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Curate activities and track participant capacity</p>
        </div>

        {properties.length > 0 && (
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Experience</span>
          </button>
        )}
      </div>

      {properties.length === 0 ? (
        <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-12 text-center border border-[#FDBA9A]/30 dark:border-slate-800 space-y-3">
          <Home className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No properties found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Register a property first to attach host experiences.</p>
        </div>
      ) : (
        <>
          {/* Property Selector */}
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

          {/* Grid */}
          {experiences.length === 0 ? (
            <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-12 text-center border border-[#FDBA9A]/30 dark:border-slate-800 space-y-3">
              <Flame className="w-10 h-10 text-orange-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No experiences attached to this property</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Add campfires, guided treks, or food tours to boost bookings.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {experiences.map((e) => (
                <div
                  key={e.id}
                  className="bg-white dark:bg-[#131D2E] rounded-3xl overflow-hidden border border-[#FDBA9A]/30 dark:border-slate-800 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-16/10 bg-slate-100 dark:bg-slate-800">
                      <img src={e.image_url} alt={e.title} className="w-full h-full object-cover" />
                      <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900/90 text-white backdrop-blur-xs">
                        {e.experience_type}
                      </span>
                    </div>

                    <div className="p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white">{e.title}</h3>
                        <div className="text-right">
                          <span className="text-base font-bold text-orange-600 dark:text-orange-400 font-serif block">
                            ₹{e.price?.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-400">/ {e.pricing_model === 'per_person' ? 'person' : 'session'}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{e.description}</p>

                      <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="flex items-center space-x-1">
                          <Users className="w-3.5 h-3.5 text-orange-500" />
                          <span>Max {e.capacity} Seats</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{e.duration}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-[#FFF8F0]/60 dark:bg-slate-900/70 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Capacity Locked</span>
                    <button
                      onClick={() => handleDeleteExperience(e.id, e.title)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                      title="Delete Experience"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add Experience Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-bold font-serif text-slate-900 dark:text-white">Add Host Experience / Event</h3>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Experience Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Starlit Campfire & Acoustic Night"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Type *</label>
                  <select
                    value={experienceType}
                    onChange={(e) => setExperienceType(e.target.value)}
                    className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    {expTypes.map((t) => (
                      <option key={t} value={t} className="dark:bg-slate-900 text-slate-900 dark:text-white">{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Pricing Model</label>
                  <select
                    value={pricingModel}
                    onChange={(e) => setPricingModel(e.target.value)}
                    className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
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
                    placeholder="1200"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
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
                    className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Duration</label>
                  <input
                    type="text"
                    required
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Describe the experience itinerary, equipment provided, departure point..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <ImageUploadPicker
                label="Experience Photo Upload"
                hint="Upload experience image directly to local storage"
                value={imageUrl}
                onChange={(url) => setImageUrl(url)}
              />

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">Or Image URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full p-2.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden text-xs"
                />
              </div>

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
                  {modalLoading ? 'Saving...' : 'Add Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
