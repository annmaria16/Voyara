import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { providerApi } from '../../api/provider';
import { VerificationBadge } from '../../components/verification/VerificationBadge';
import {
  Home,
  PlusCircle,
  MapPin,
  Star,
  Edit,
  Trash2,
  Layers,
  Flame,
  Calendar,
  Eye,
  AlertCircle
} from 'lucide-react';

export const ProviderProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const data = await providerApi.getProperties();
      setProperties(data);
    } catch (err) {
      setError(err.message || 'Failed to load properties.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete property '${name}'?`)) return;
    try {
      await providerApi.deleteProperty(id);
      await fetchProperties();
    } catch (err) {
      alert(err.message || 'Failed to delete property.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black font-serif text-slate-900 dark:text-white">My Properties</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Manage your accommodations and connected listings</p>
        </div>

        <Link
          to="/provider/properties/new"
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Property</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-rose-700 dark:text-rose-300 text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : properties.length === 0 ? (
        <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-16 text-center border border-[#FDBA9A]/30 dark:border-slate-800 space-y-4">
          <Home className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No properties registered yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Add your first hotel, homestay, resort, camp, cottage, or villa to start accepting bookings.
          </p>
          <Link
            to="/provider/properties/new"
            className="inline-block px-5 py-2.5 bg-gradient-to-r from-[#F97360] to-orange-500 text-white font-bold rounded-xl text-xs"
          >
            Create Property
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((p) => {
            const img = p.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80';
            return (
              <div
                key={p.id}
                className="bg-white dark:bg-[#131D2E] rounded-3xl overflow-hidden border border-[#FDBA9A]/30 dark:border-slate-800 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-16/10 bg-slate-100 dark:bg-slate-800">
                    <img src={img} alt={p.name} className="w-full h-full object-cover" />
                    <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900/90 text-white backdrop-blur-xs">
                      {p.property_type}
                    </span>
                    <span className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      p.is_active ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                    }`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white line-clamp-1">{p.name}</h3>
                      <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mt-1 space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-orange-500" />
                        <span>{p.city}, {p.state}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="p-2 bg-[#FFF8F0] dark:bg-slate-900/60 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Room Units</span>
                        <strong className="text-slate-900 dark:text-white">{p.room_count || 0}</strong>
                      </div>
                      <div className="p-2 bg-[#FFF8F0] dark:bg-slate-900/60 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Experiences</span>
                        <strong className="text-slate-900 dark:text-white">{p.experience_count || 0}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 bg-[#FFF8F0]/50 dark:bg-slate-900/70 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <Link
                    to={`/properties/${p.id}`}
                    target="_blank"
                    className="font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center space-x-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Public View</span>
                  </Link>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Delete Property"
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
  );
};
