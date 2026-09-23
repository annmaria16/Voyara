import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { providerApi } from '../../api/provider';
import { resolveImageUrl } from '../../utils/imageUrl';
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
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Settings,
  Image as ImageIcon,
  BookOpen,
} from 'lucide-react';

export const ProviderProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [manageMenuPropertyId, setManageMenuPropertyId] = useState(null);
  const navigate = useNavigate();

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const data = await providerApi.getProperties();
      setProperties(Array.isArray(data) ? data : []);
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

  const getVerificationBadge = (status, isActive) => {
    if (status === 'VERIFIED' && isActive) {
      return (
        <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-[#35A66F]/20 text-[#35A66F] dark:text-[#35A66F] border border-[#35A66F]/40 backdrop-blur-md shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#35A66F]" />
          <span>🟢 Live</span>
        </span>
      );
    }
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-[#35A66F]/20 text-[#35A66F] border border-[#35A66F]/40 backdrop-blur-md">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#35A66F]" />
            <span>🟢 Verified</span>
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-[#F6C945]/20 text-amber-700 dark:text-[#F6C945] border border-[#F6C945]/40 backdrop-blur-md">
            <AlertTriangle className="w-3.5 h-3.5 text-[#F6C945]" />
            <span>🟠 Needs Review</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40 backdrop-blur-md">
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>🔴 Rejected</span>
          </span>
        );
      case 'PENDING_VERIFICATION':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 backdrop-blur-md">
            <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>🟡 Under Review</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#091B29] dark:text-white tracking-tight">
            My Properties
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-light">
            Manage all your stays, rooms and availability.
          </p>
        </div>

        <Link
          to="/provider/properties/new"
          className="inline-flex items-center space-x-2 px-6 py-3.5 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-orange-700 text-white text-xs font-bold rounded-2xl shadow-xl shadow-orange-500/25 hover:scale-[1.02] transition-all cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Add Property</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="w-8 h-8 border-3 border-[#087F8C] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : properties.length === 0 ? (
        <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-16 text-center border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-[#087F8C]/10 text-[#087F8C] dark:text-[#27B7A8] mx-auto flex items-center justify-center">
            <Home className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-serif font-bold text-[#091B29] dark:text-white">
              No properties registered yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto font-light leading-relaxed">
              Add your first homestay, heritage villa, mountain cottage, or boutique resort to Voyara's verified travel network.
            </p>
          </div>
          <Link
            to="/provider/properties/new"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-[#EA580C] text-white font-bold rounded-2xl text-xs shadow-md hover:scale-[1.02] transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Add Property</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((p) => {
            const hasImage = p.images && p.images.length > 0 && p.images[0]?.image_url;
            const img = hasImage ? p.images[0].image_url : null;
            const status = p.verification_status || 'PENDING_VERIFICATION';
            const roomTypesCount = p.room_types_count !== undefined ? p.room_types_count : (p.room_count || 0);
            const totalUnitsCount = p.total_units !== undefined ? p.total_units : (p.room_count || 0);

            return (
              <div
                key={p.id}
                className="group bg-white dark:bg-[#0F273D] rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-2xl hover:border-[#087F8C]/40 transition-all flex flex-col justify-between hover:-translate-y-1 relative"
              >
                <div>
                  {/* Property Image / Fallback Container - Clickable Link to Edit */}
                  <Link
                    to={`/provider/properties/${p.id}/edit`}
                    className="block relative aspect-16/10 bg-slate-100 dark:bg-slate-900 overflow-hidden cursor-pointer"
                    title={`Edit and manage ${p.name}`}
                  >
                    {hasImage ? (
                      <img
                        src={resolveImageUrl(img)}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-800/80 p-4 text-center">
                        <ImageIcon className="w-8 h-8 mb-2 opacity-50 text-[#087F8C]" />
                        <span className="text-xs font-semibold">No property photos available</span>
                      </div>
                    )}

                    <div className="absolute top-3.5 left-3.5">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#091B29]/80 text-white backdrop-blur-md shadow-xs">
                        {p.property_type || 'Stay'}
                      </span>
                    </div>

                    <div className="absolute top-3.5 right-3.5 flex flex-col items-end gap-1.5">
                      {getVerificationBadge(status, p.is_active)}
                      {p.trust_score !== undefined && p.trust_score > 0 && (
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider bg-[#091B29]/85 text-[#27B7A8] border border-teal-500/30 backdrop-blur-md">
                          Trust: {p.trust_score}/100
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Portfolio Details */}
                  <div className="p-6 space-y-4">
                    <div>
                      <Link to={`/provider/properties/${p.id}/edit`} className="block">
                        <h3 className="text-xl font-serif font-bold text-[#091B29] dark:text-white line-clamp-1 group-hover:text-[#087F8C] transition-colors">
                          {p.name}
                        </h3>
                      </Link>
                      <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mt-1 space-x-1.5 font-light">
                        <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span className="truncate">
                          {p.city ? `${p.city}${p.state ? ', ' + p.state : ''}` : p.address || 'Location details'}
                        </span>
                      </div>
                    </div>

                    {/* Admin Review Note / Reason if rejected or needs review */}
                    {p.verification_reason && (status === 'NEEDS_REVIEW' || status === 'REJECTED') && (
                      <div className={`p-3.5 rounded-2xl border text-xs space-y-1 ${status === 'REJECTED'
                        ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-200'
                        : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-200'
                        }`}>
                        <div className="font-bold flex items-center space-x-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Review Feedback:</span>
                        </div>
                        <p className="font-normal italic leading-relaxed text-[11px]">
                          "{p.verification_reason}"
                        </p>
                      </div>
                    )}

                    {/* Room Types & Units Summary */}
                    <div className="p-3 bg-[#FFFDF7] dark:bg-slate-900/70 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <Layers className="w-4 h-4 text-[#087F8C] dark:text-[#27B7A8]" />
                        <span className="font-bold text-[#091B29] dark:text-white">
                          {roomTypesCount} Room {roomTypesCount === 1 ? 'Type' : 'Types'} • {totalUnitsCount} {totalUnitsCount === 1 ? 'Unit' : 'Units'}
                        </span>
                      </div>
                      {p.min_price ? (
                        <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                          From ₹{Number(p.min_price).toLocaleString('en-IN')}/night
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Portfolio Action Bar: [Edit Stay], [Live Preview], [Manage] hub */}
                <div className="p-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/provider/properties/${p.id}/edit`}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-bold transition-all border border-orange-500/20"
                      title="Edit and Manage Property"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Stay</span>
                    </Link>

                    {status === 'VERIFIED' && p.is_active && (
                      <Link
                        to={`/properties/${p.id}`}
                        target="_blank"
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-[#087F8C] dark:text-slate-400 dark:hover:text-[#27B7A8] hover:bg-slate-200/50 dark:hover:bg-slate-800 text-xs font-medium transition-all"
                        title="Open Live Public Listing in New Tab"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Live View</span>
                      </Link>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {/* Manage Dropdown Trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setManageMenuPropertyId(manageMenuPropertyId === p.id ? null : p.id)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-[#087F8C] hover:bg-[#0F9D9A] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                        title="Manage Property Details, Rooms, Availability & Bookings"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Manage</span>
                      </button>

                      {/* Manage Dropdown Menu */}
                      {manageMenuPropertyId === p.id && (
                        <div className="absolute bottom-full right-0 mb-2 w-52 bg-white dark:bg-[#0F273D] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95">
                          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Manage {p.name}
                          </div>
                          <Link
                            to={`/provider/properties/${p.id}/edit`}
                            className="flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => setManageMenuPropertyId(null)}
                          >
                            <Edit className="w-3.5 h-3.5 text-[#087F8C]" />
                            <span>Property Details & Photos</span>
                          </Link>
                          <Link
                            to="/provider/rooms"
                            className="flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => setManageMenuPropertyId(null)}
                          >
                            <Layers className="w-3.5 h-3.5 text-[#087F8C]" />
                            <span>Rooms & Unit Matrix</span>
                          </Link>
                          <Link
                            to="/provider/availability"
                            className="flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => setManageMenuPropertyId(null)}
                          >
                            <Calendar className="w-3.5 h-3.5 text-[#087F8C]" />
                            <span>Availability Calendar</span>
                          </Link>
                          <Link
                            to="/provider/experiences"
                            className="flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => setManageMenuPropertyId(null)}
                          >
                            <Flame className="w-3.5 h-3.5 text-[#F97316]" />
                            <span>Experiences</span>
                          </Link>
                          <Link
                            to="/provider/bookings"
                            className="flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => setManageMenuPropertyId(null)}
                          >
                            <BookOpen className="w-3.5 h-3.5 text-[#35A66F]" />
                            <span>Guest Bookings</span>
                          </Link>
                        </div>
                      )}
                    </div>

                    <Link
                      to={`/provider/properties/${p.id}/edit`}
                      className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#087F8C] dark:hover:text-[#27B7A8] rounded-xl font-bold text-xs transition-colors"
                      title="Edit Property"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                      title="Delete Property"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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

export default ProviderProperties;

