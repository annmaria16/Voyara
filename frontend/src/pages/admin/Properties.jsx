import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { PropertyReviewModal } from '../../components/admin/PropertyReviewModal';
import { resolveImageUrl } from '../../utils/imageUrl';
import {
  Home,
  MapPin,
  Star,
  AlertCircle,
  Eye,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Filter,
  FileText,
  Mail,
  User,
  Calendar,
  Layers,
  ExternalLink,
  Check,
  X,
  Loader2,
  Navigation,
} from 'lucide-react';

export const AdminProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING_VERIFICATION');
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);

  // Reason Modal for quick inline Reject / Request Review
  const [reasonModal, setReasonModal] = useState({ open: false, action: null, propertyId: null, propertyName: '' });
  const [reasonText, setReasonText] = useState('');

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getProperties();
      setProperties(data);
    } catch (err) {
      setError(err.message || 'Failed to load property requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleQuickAction = async (propertyId, action, reason = '') => {
    setActionLoadingId(propertyId);
    setError('');
    try {
      await adminApi.verifyProperty(propertyId, {
        action,
        reason: reason || undefined,
      });
      setReasonModal({ open: false, action: null, propertyId: null, propertyName: '' });
      setReasonText('');
      await fetchProperties();
    } catch (err) {
      setError(err.message || `Failed to perform ${action} on property.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const openReasonPrompt = (propertyId, propertyName, action) => {
    setReasonModal({
      open: true,
      action,
      propertyId,
      propertyName,
    });
    setReasonText('');
  };

  const handleToggleStatus = async (propId) => {
    try {
      await adminApi.togglePropertyStatus(propId);
      fetchProperties();
    } catch (err) {
      alert(err.message || 'Failed to toggle property status.');
    }
  };

  // Filter calculation
  const counts = {
    ALL: properties.length,
    PENDING_VERIFICATION: properties.filter((p) => (p.verification_status || 'PENDING_VERIFICATION') === 'PENDING_VERIFICATION').length,
    VERIFIED: properties.filter((p) => p.verification_status === 'VERIFIED').length,
    NEEDS_REVIEW: properties.filter((p) => p.verification_status === 'NEEDS_REVIEW').length,
    REJECTED: properties.filter((p) => p.verification_status === 'REJECTED').length,
  };

  const filteredProperties = properties.filter((p) => {
    if (statusFilter === 'ALL') return true;
    return (p.verification_status || 'PENDING_VERIFICATION') === statusFilter;
  });

  const getVerificationBadge = (status) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved / Verified</span>
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Needs Review</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected</span>
          </span>
        );
      case 'PENDING_VERIFICATION':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Verification</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Segment */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-orange-500" />
            <h2 className="text-2xl font-black font-serif text-[#102A43] dark:text-white">Property Requests</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review host submissions, ownership proof documents, Google Maps GPS coordinates, and approve listings.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 custom-scrollbar">
          {[
            { key: 'PENDING_VERIFICATION', label: 'Pending', count: counts.PENDING_VERIFICATION },
            { key: 'VERIFIED', label: 'Approved', count: counts.VERIFIED },
            { key: 'NEEDS_REVIEW', label: 'Needs Review', count: counts.NEEDS_REVIEW },
            { key: 'REJECTED', label: 'Rejected', count: counts.REJECTED },
            { key: 'ALL', label: 'All Requests', count: counts.ALL },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
                statusFilter === tab.key
                  ? 'bg-gradient-to-r from-[#F97360] to-orange-500 text-white shadow-xs'
                  : 'bg-white dark:bg-[#131D2E] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-orange-500'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                statusFilter === tab.key ? 'bg-black/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500">Loading property verification requests...</p>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-16 text-center border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-xs">
          <ShieldCheck className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-[#102A43] dark:text-white">No property requests found</h3>
          <p className="text-xs text-slate-500">There are currently no property requests in "{statusFilter.replace('_', ' ')}".</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProperties.map((p) => {
            const isPending = (p.verification_status || 'PENDING_VERIFICATION') === 'PENDING_VERIFICATION';
            const isApproved = p.verification_status === 'VERIFIED';
            const isCustomerVisible = p.is_active && isApproved;
            const rawImg = p.images?.[0]?.image_url || (typeof p.images?.[0] === 'string' ? p.images[0] : null) || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80';
            const primaryImg = resolveImageUrl(rawImg);
            const isProcessing = actionLoadingId === p.id;

            return (
              <div
                key={p.id}
                className="bg-white dark:bg-[#131D2E] rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-orange-500/50 transition-all flex flex-col lg:flex-row gap-6 items-start justify-between"
              >
                {/* Left: Thumbnail & Property Details */}
                <div className="flex flex-col sm:flex-row gap-5 items-start w-full lg:w-2/3">
                  {/* Photo Thumbnail */}
                  <div className="relative w-full sm:w-44 h-32 rounded-2xl overflow-hidden bg-slate-900 shrink-0 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <img
                      src={primaryImg}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-900/90 text-white backdrop-blur-xs">
                      {p.property_type}
                    </span>
                    {p.images?.length > 1 && (
                      <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-black/75 text-white">
                        +{p.images.length - 1} photos
                      </span>
                    )}
                  </div>

                  {/* Text Details */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-slate-400 dark:text-slate-500">#{p.id}</span>
                      <h3 className="text-base font-bold font-serif text-[#102A43] dark:text-white truncate">
                        {p.name}
                      </h3>
                      {getVerificationBadge(p.verification_status)}
                    </div>

                    {/* Host Details */}
                    <div className="flex items-center space-x-3 text-xs text-slate-600 dark:text-slate-300 flex-wrap gap-y-1">
                      <div className="flex items-center space-x-1">
                        <User className="w-3.5 h-3.5 text-orange-500" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{p.provider_name || `Host #${p.provider_id}`}</span>
                      </div>
                      {p.provider_email && (
                        <div className="flex items-center space-x-1 text-slate-500 dark:text-slate-400 text-[11px]">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{p.provider_email}</span>
                        </div>
                      )}
                    </div>

                    {/* Location & GPS */}
                    <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300 flex-wrap">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-orange-500" />
                        <span>{p.city}, {p.state}, {p.country || 'India'}</span>
                      </div>
                      {p.latitude && p.longitude && (
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          GPS: {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
                        </span>
                      )}
                    </div>

                    {/* Ownership Proof & Submission Date */}
                    <div className="flex items-center space-x-4 pt-1 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap gap-y-1">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Submitted: {p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</span>
                      </div>

                      {p.ownership_proof_url ? (
                        <a
                          href={adminApi.getOwnershipProofUrl(p.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Ownership Proof Attached</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="w-3 h-3" />
                          <span>No Proof Doc</span>
                        </span>
                      )}

                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600 dark:text-slate-300 font-medium">
                        {p.rooms_count || 0} Room Types
                      </span>
                    </div>

                    {/* If rejected or review requested, display the reason note */}
                    {p.verification_reason && (p.verification_status === 'REJECTED' || p.verification_status === 'NEEDS_REVIEW') && (
                      <div className={`p-2.5 rounded-xl border text-[11px] mt-2 ${
                        p.verification_status === 'REJECTED'
                          ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-200'
                          : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-200'
                      }`}>
                        <strong>Admin Reason:</strong> "{p.verification_reason}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actions Segment */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end justify-between gap-2.5 w-full lg:w-auto shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                  {/* Customer Status Pill */}
                  <div className="flex items-center justify-between lg:justify-end space-x-2 text-[11px]">
                    <span className="text-slate-400">Customer View:</span>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase ${
                      isCustomerVisible
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20'
                    }`}>
                      {isCustomerVisible ? '✓ Visible to Customers' : 'Hidden from Search'}
                    </span>
                  </div>

                  {/* Main Action Buttons */}
                  <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPropertyId(p.id)}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer inline-flex items-center space-x-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-orange-500" />
                      <span>Review Dossier</span>
                    </button>

                    {p.verification_status !== 'VERIFIED' && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleQuickAction(p.id, 'APPROVE', 'Approved by Administrator')}
                        className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer inline-flex items-center space-x-1.5 disabled:opacity-50"
                      >
                        {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        <span>Approve</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => openReasonPrompt(p.id, p.name, 'REQUEST_REVIEW')}
                      className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold rounded-xl text-xs border border-amber-500/30 transition-colors cursor-pointer inline-flex items-center space-x-1 disabled:opacity-50"
                    >
                      <span>Request Review</span>
                    </button>

                    {p.verification_status !== 'REJECTED' && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => openReasonPrompt(p.id, p.name, 'REJECT')}
                        className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold rounded-xl text-xs border border-rose-500/30 transition-colors cursor-pointer inline-flex items-center space-x-1 disabled:opacity-50"
                      >
                        <span>Reject</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Dossier Modal with Map, Photos, Documents, Rooms Breakdown */}
      {selectedPropertyId && (
        <PropertyReviewModal
          propertyId={selectedPropertyId}
          isOpen={!!selectedPropertyId}
          onClose={() => setSelectedPropertyId(null)}
          onActionComplete={fetchProperties}
        />
      )}

      {/* Reject / Request Review Reason Dialog */}
      {reasonModal.open && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#131D2E] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white">
                {reasonModal.action === 'REJECT' ? 'Reject Property Listing' : 'Request Changes / Review'}
              </h3>
              <button
                type="button"
                onClick={() => setReasonModal({ open: false, action: null, propertyId: null, propertyName: '' })}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter the reason for <strong>'{reasonModal.propertyName}'</strong>. This reason will be stored in PostgreSQL and sent as an in-app notification to the Host.
            </p>

            <textarea
              rows={4}
              required
              placeholder={
                reasonModal.action === 'REJECT'
                  ? 'e.g. Ownership documents could not be verified or duplicate listing...'
                  : 'e.g. Please provide clearer exterior photos and upload electricity bill for verification...'
              }
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              className="w-full p-3 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
            />

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setReasonModal({ open: false, action: null, propertyId: null, propertyName: '' })}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reasonText.trim()}
                onClick={() => handleQuickAction(reasonModal.propertyId, reasonModal.action, reasonText)}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer disabled:opacity-50 ${
                  reasonModal.action === 'REJECT'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                Confirm {reasonModal.action === 'REJECT' ? 'Rejection' : 'Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
