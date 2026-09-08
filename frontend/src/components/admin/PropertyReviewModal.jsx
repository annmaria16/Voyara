import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { resolveImageUrl } from '../../utils/imageUrl';
import {
  X,
  MapPin,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  ExternalLink,
  Phone,
  Mail,
  Clock,
  Home,
  Check,
  Building,
  Image as ImageIcon,
  Loader2,
  Lock,
  Bed,
  Users,
  Layers,
  IndianRupee,
} from 'lucide-react';

export const PropertyReviewModal = ({ propertyId, isOpen, onClose, onActionComplete }) => {
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [reasonModal, setReasonModal] = useState({ open: false, action: null });
  const [reasonText, setReasonText] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    if (isOpen && propertyId) {
      loadProperty();
    }
  }, [isOpen, propertyId]);

  const loadProperty = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.getPropertyDetail(propertyId);
      setProperty(data);
      if (data.images && data.images.length > 0) {
        const first = data.images[0];
        setSelectedPhoto(typeof first === 'string' ? first : (first.image_url || ''));
      }
    } catch (err) {
      setError(err.message || 'Failed to load property review dossier.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action, reason = '') => {
    setActionLoading(true);
    setError('');
    try {
      await adminApi.verifyProperty(propertyId, {
        action,
        reason: reason || undefined,
      });
      setReasonModal({ open: false, action: null });
      setReasonText('');
      if (onActionComplete) {
        onActionComplete();
      }
      onClose();
    } catch (err) {
      setError(err.message || `Failed to perform ${action} on property.`);
    } finally {
      setActionLoading(false);
    }
  };

  const openReasonPrompt = (action) => {
    setReasonModal({ open: true, action });
    setReasonText('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-[#101927] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  Property Dossier Review
                </span>
                {property && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    property.verification_status === 'VERIFIED'
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : property.verification_status === 'REJECTED'
                      ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                      : property.verification_status === 'NEEDS_REVIEW'
                      ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      : 'bg-orange-500/10 text-orange-600 border border-orange-500/20 animate-pulse'
                  }`}>
                    {property.verification_status?.replace('_', ' ')}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white">
                {property ? property.name : 'Loading Property Details...'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-8 custom-scrollbar">
          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-semibold">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              <p className="text-xs text-slate-500">Fetching property verification dossier...</p>
            </div>
          ) : property ? (
            <div className="space-y-8 text-xs">
              
              {/* SECTION 1: PROPERTY INFORMATION */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <Home className="w-4 h-4 text-orange-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    1. Property Information & Host Contacts
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3 bg-[#FFF8F0]/70 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Property Type</span>
                    <strong className="text-slate-900 dark:text-white text-xs">{property.property_type}</strong>
                  </div>
                  <div className="p-3 bg-[#FFF8F0]/70 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Check-in / Check-out</span>
                    <strong className="text-slate-900 dark:text-white text-xs">{property.check_in_time} / {property.check_out_time}</strong>
                  </div>
                  <div className="p-3 bg-[#FFF8F0]/70 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Provider / Host</span>
                    <strong className="text-slate-900 dark:text-white text-xs">{property.provider_name || `Provider #${property.provider_id}`}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-[#FFF8F0]/70 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center space-x-3">
                    <Phone className="w-4 h-4 text-orange-500 shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Contact Phone</span>
                      <strong className="text-slate-900 dark:text-white">{property.contact_phone || 'N/A'}</strong>
                    </div>
                  </div>
                  <div className="p-3 bg-[#FFF8F0]/70 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center space-x-3">
                    <Mail className="w-4 h-4 text-orange-500 shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Contact Email</span>
                      <strong className="text-slate-900 dark:text-white">{property.contact_email || 'N/A'}</strong>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Description</span>
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed">
                    {property.description}
                  </div>
                </div>

                {property.amenities && property.amenities.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Selected Amenities</span>
                    <div className="flex flex-wrap gap-1.5">
                      {property.amenities.map((am, idx) => {
                        const amName = typeof am === 'string' ? am : (am.amenity_name || '');
                        return (
                          <span key={am.id || idx} className="px-2.5 py-1 bg-[#FFF8F0] dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            ✓ {amName}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: PROPERTY PHOTOS */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <ImageIcon className="w-4 h-4 text-orange-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    2. Uploaded Property Photos ({property.images?.length || 0})
                  </h3>
                </div>

                {property.images && property.images.length > 0 ? (
                  <div className="space-y-3">
                    {selectedPhoto && (
                      <div className="aspect-16/9 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
                        <img src={resolveImageUrl(selectedPhoto)} alt="Selected preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {property.images.map((img, idx) => {
                        const url = typeof img === 'string' ? img : (img.image_url || '');
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedPhoto(url)}
                            className={`aspect-16/10 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                              selectedPhoto === url
                                ? 'border-orange-500 ring-2 ring-orange-500/30'
                                : 'border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={resolveImageUrl(url)} alt="" className="w-full h-full object-cover" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No property photos uploaded.</p>
                )}
              </div>

              {/* SECTION 3: GOOGLE MAP LOCATION */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-orange-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      3. Google Map Location & Address
                    </h3>
                  </div>
                  <div className="font-mono text-[11px] font-bold text-orange-600 dark:text-orange-400">
                    GPS: {property.latitude ? `${property.latitude.toFixed(6)}, ${property.longitude?.toFixed(6)}` : 'Not Specified'}
                  </div>
                </div>

                <div className="p-3 bg-[#FFF8F0]/70 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Full Physical Address</span>
                  <strong className="text-slate-900 dark:text-white block mt-0.5">
                    {property.address}, {property.city}, {property.state}, {property.country}
                  </strong>
                </div>

                {/* Map Display */}
                {property.latitude && property.longitude ? (
                  <div
                    className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs aspect-16/8 bg-slate-900"
                    style={{
                      backgroundImage: `url('https://maps.wikimedia.org/osm-intl/13/${Math.floor(
                        ((property.longitude + 180) / 360) * Math.pow(2, 13)
                      )}/${Math.floor(
                        ((1 -
                          Math.log(
                            Math.tan((property.latitude * Math.PI) / 180) +
                              1 / Math.cos((property.latitude * Math.PI) / 180)
                          ) /
                            Math.PI) /
                          2) *
                          Math.pow(2, 13)
                      )}.png')`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full flex flex-col items-center">
                      <div className="px-2.5 py-1 bg-slate-900/95 text-white rounded-lg text-[10px] font-bold shadow-lg border border-white/20 whitespace-nowrap mb-1">
                        📍 {property.name} ({property.latitude.toFixed(4)}, {property.longitude.toFixed(4)})
                      </div>
                      <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-xl border-2 border-white ring-4 ring-orange-500/30">
                        <MapPin className="w-5 h-5 fill-white" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-300 text-xs">
                    No GPS coordinates were pinned for this property.
                  </div>
                )}
              </div>

              {/* SECTION 4: OWNERSHIP / AUTHORIZATION PROOF */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      4. Property Ownership / Authorization Proof
                    </h3>
                  </div>
                  <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    <Lock className="w-3 h-3" />
                    <span>Admin Only Access</span>
                  </span>
                </div>

                {property.ownership_proof_url ? (
                  <div className="p-4 bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center border border-emerald-500/30">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>Ownership Proof Document Attached</span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Stored securely on server. Accessible only to authenticated Voyara Administrators.
                        </span>
                      </div>
                    </div>

                    <a
                      href={adminApi.getOwnershipProofUrl(property.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Inspect Document</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-800 dark:text-amber-200 text-xs flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>No ownership document was uploaded by the host.</span>
                  </div>
                )}
              </div>

              {/* SECTION 5: ROOMS & INVENTORY BREAKDOWN */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <Bed className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      5. Room Units & Inventory Breakdown ({property.rooms?.length || 0})
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    Verified PostgreSQL Units
                  </span>
                </div>

                {property.rooms && property.rooms.length > 0 ? (
                  <div className="space-y-4">
                    {property.rooms.map((room, rIdx) => (
                      <div
                        key={rIdx}
                        className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/50 dark:border-slate-800 pb-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 block">
                              {room.room_type}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              {room.name}
                            </h4>
                          </div>
                          <div className="flex items-center space-x-2 text-xs font-bold">
                            <span className="text-emerald-600 dark:text-emerald-400">
                              ₹{room.base_price?.toLocaleString('en-IN')} / night
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600 dark:text-slate-300">
                              {room.capacity} Guests / Unit
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600 dark:text-slate-300">
                              {room.quantity} Available
                            </span>
                          </div>
                        </div>

                        {room.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {room.description}
                          </p>
                        )}

                        {/* Room Amenities */}
                        {room.amenities && room.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {room.amenities.map((a, aIdx) => (
                              <span
                                key={aIdx}
                                className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-300 rounded-md"
                              >
                                ✓ {a.amenity_name || a}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Room Photos */}
                        {room.images && room.images.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Room Photos ({room.images.length})
                            </span>
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                              {room.images.map((rImg, iIdx) => (
                                <div
                                  key={iIdx}
                                  className="aspect-16/10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900"
                                >
                                  <img
                                    src={resolveImageUrl(rImg.image_url || rImg)}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.src = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80';
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No room units found for this property.</p>
                )}
              </div>

              {/* CURRENT AUDIT HISTORY IF ANY */}
              {(property.verification_reason || property.verified_by || property.reviewed_by) && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1 text-[11px]">
                  <span className="font-bold text-slate-400 uppercase tracking-wider block">Audit Trail:</span>
                  {property.verification_reason && (
                    <p className="text-slate-700 dark:text-slate-300">
                      <strong>Last Reason:</strong> "{property.verification_reason}"
                    </p>
                  )}
                  {property.verified_at && (
                    <p className="text-slate-500 dark:text-slate-400">
                      Approved at: {new Date(property.verified_at).toLocaleString()}
                    </p>
                  )}
                  {property.reviewed_at && (
                    <p className="text-slate-500 dark:text-slate-400">
                      Reviewed at: {new Date(property.reviewed_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

            </div>
          ) : null}
        </div>

        {/* Modal Footer / Verification Actions */}
        {property && (
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Only <strong className="text-slate-700 dark:text-slate-200">APPROVED</strong> properties become visible to customers.
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => openReasonPrompt('REQUEST_REVIEW')}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-amber-500/30"
              >
                Request Review
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => openReasonPrompt('REJECT')}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-rose-500/30"
              >
                Reject Property
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleAction('APPROVE')}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1.5"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Approve Property</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Rejection / Request Review Reason Prompt Sub-modal */}
      {reasonModal.open && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#131D2E] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white">
              {reasonModal.action === 'REJECT' ? 'Reject Property Listing' : 'Request Changes / Correction'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Please enter the reason or specific corrections required from the host. This message will be displayed on the provider's dashboard.
            </p>

            <textarea
              rows={4}
              required
              placeholder="e.g. Please provide a clear electricity bill showing property ownership and address matching..."
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              className="w-full p-3 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
            />

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setReasonModal({ open: false, action: null })}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || !reasonText.trim()}
                onClick={() => handleAction(reasonModal.action, reasonText)}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer disabled:opacity-50 ${
                  reasonModal.action === 'REJECT'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {actionLoading ? 'Saving...' : `Confirm ${reasonModal.action === 'REJECT' ? 'Rejection' : 'Request'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
