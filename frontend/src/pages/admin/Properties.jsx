import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { Home, MapPin, Star, AlertCircle, Eye } from 'lucide-react';

export const AdminProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getProperties();
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

  const handleToggleStatus = async (propId) => {
    try {
      await adminApi.togglePropertyStatus(propId);
      fetchProperties();
    } catch (err) {
      alert(err.message || 'Failed to toggle property status.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black font-serif text-[#102A43] dark:text-white">Property Listings Moderation</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Monitor all accommodations, host businesses, and active statuses</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3">ID</th>
                  <th className="pb-3">Property Name</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Location</th>
                  <th className="pb-3">Host Business</th>
                  <th className="pb-3">Inventory</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {properties.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FFF8F0]/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 font-mono text-slate-400 dark:text-slate-500">#{p.id}</td>
                    <td className="py-3.5 font-bold text-[#102A43] dark:text-white">{p.name}</td>
                    <td className="py-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-orange-500/10 text-[#F97360] dark:text-orange-400 border border-orange-500/20">
                        {p.property_type}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-600 dark:text-slate-300">{p.city}, {p.state}</td>
                    <td className="py-3.5 text-slate-600 dark:text-slate-300 font-medium">{p.provider_name}</td>
                    <td className="py-3.5 text-slate-500 dark:text-slate-400">
                      <span>{p.rooms_count} Rooms • {p.experiences_count} Experiences</span>
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        p.is_active
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }`}>
                        {p.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <button
                        onClick={() => handleToggleStatus(p.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          p.is_active
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        {p.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
