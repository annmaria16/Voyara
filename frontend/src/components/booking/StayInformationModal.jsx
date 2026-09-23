import React, { useState, useEffect } from 'react';
import { messagesApi } from '../../api/messages';
import { resolveImageUrl } from '../../utils/imageUrl';
import {
  X,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  Home,
  Bed,
  Users,
  Sparkles,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  FileText,
  Phone,
  Mail,
  Check,
  CheckCircle2,
  Compass,
  Info,
  DollarSign,
  Lock,
} from 'lucide-react';

export const StayInformationModal = ({ bookingId, isOpen, onClose, onOpenMessaging }) => {
  const [stayInfo, setStayInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'location', 'rules', 'room', 'host', 'experience'

  useEffect(() => {
    if (isOpen && bookingId) {
      const fetchStayInfo = async () => {
        setLoading(true);
        setError('');
        try {
          const data = await messagesApi.getStayInformation(bookingId);
          setStayInfo(data);
        } catch (err) {
          console.error('Error fetching stay information:', err);
          setError(err.response?.data?.detail || err.message || 'Failed to load stay information.');
        } finally {
          setLoading(false);
        }
      };
      fetchStayInfo();
    }
  }, [isOpen, bookingId]);

  if (!isOpen) return null;

  const prop = stayInfo?.property || {};
  const room = stayInfo?.room || {};
  const rules = stayInfo?.home_rules || {};
  const roomRules = room.rules || {};
  const exp = stayInfo?.experience;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-[#091B29]/60 shrink-0">
          <div className="space-y-0.5">
            <h2 className="text-xl font-black font-serif text-[#091B29] dark:text-white flex items-center space-x-2">
              <span>{prop.name || 'Your Stay Information'}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Booking Ref: <strong className="font-mono text-slate-800 dark:text-slate-200">{stayInfo?.booking_number}</strong> • {stayInfo?.check_in} to {stayInfo?.check_out}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {onOpenMessaging && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMessaging(stayInfo || { id: bookingId });
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Message Host</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 px-6 border-b border-slate-100 dark:border-slate-800 overflow-x-auto shrink-0 bg-white dark:bg-[#0F273D] text-xs font-bold">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'location', label: 'Location & Map' },
            { key: 'rules', label: 'Home Rules' },
            { key: 'room', label: 'Booked Room' },
            { key: 'host', label: 'Host Instructions' },
            ...(exp ? [{ key: 'experience', label: 'Booked Experience' }] : []),
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`py-3 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400 font-extrabold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#087F8C] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Loading verified stay information...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Confirmed Banner */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-[#091B29] dark:text-white">
                          Your Stay is Confirmed!
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                          Verified transaction • Protected under Voyara Stay Guarantee.
                        </p>
                      </div>
                    </div>

                    <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#091B29] border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>VeriNova Verified</span>
                    </div>
                  </div>

                  {/* Property Photo & Summary Showcase */}
                  <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-[#091B29]/70 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center p-4">
                    <div className="sm:col-span-4 h-36 rounded-xl overflow-hidden relative shadow-xs">
                      <img
                        src={
                          resolveImageUrl(
                            prop.image ||
                            prop.images?.[0]?.image_url ||
                            (typeof prop.images?.[0] === 'string' ? prop.images[0] : null)
                          ) ||
                          'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'
                        }
                        alt={prop.name || 'Sanctuary'}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80';
                        }}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold">
                        {prop.property_type || 'Sanctuary'}
                      </span>
                    </div>

                    <div className="sm:col-span-8 space-y-1.5">
                      <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-teal-500/10 text-[#087F8C] dark:text-[#27B7A8] text-[10px] font-bold">
                        <Sparkles className="w-3 h-3" />
                        <span>Verified Sanctuary Stay</span>
                      </div>
                      <h3 className="text-base font-serif font-bold text-[#091B29] dark:text-white">
                        {prop.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span>{prop.address || (prop.city ? `${prop.city}, ${prop.state || ''}` : 'Sanctuary Location')}</span>
                      </p>
                    </div>
                  </div>

                  {/* Summary Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#091B29]/70 border border-slate-200/70 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Property & Type
                      </span>
                      <strong className="text-slate-900 dark:text-white text-sm block">
                        {prop.name}
                      </strong>
                      <span className="text-slate-500 dark:text-slate-400">{prop.property_type || 'Resort'}</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#091B29]/70 border border-slate-200/70 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Check-in & Check-out
                      </span>
                      <strong className="text-slate-900 dark:text-white text-sm block">
                        {stayInfo.check_in} → {stayInfo.check_out}
                      </strong>
                      <span className="text-slate-500 dark:text-slate-400">
                        Check-in: {prop.check_in_time} • Check-out: {prop.check_out_time}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#091B29]/70 border border-slate-200/70 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Booked Room
                      </span>
                      <strong className="text-[#087F8C] dark:text-[#27B7A8] text-sm block">
                        {room.name}
                      </strong>
                      <span className="text-slate-500 dark:text-slate-400">
                        {stayInfo.total_guests} Guests ({stayInfo.adults} Adults{stayInfo.children > 0 ? `, ${stayInfo.children} Child` : ''})
                      </span>
                    </div>
                  </div>

                  {/* Host Message Box */}
                  <div className="p-5 rounded-2xl bg-[#FFFDF7] dark:bg-[#091B29] border border-amber-200/70 dark:border-amber-900/40 space-y-2">
                    <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-400 font-bold text-xs">
                      <MessageSquare className="w-4 h-4" />
                      <span>Message from Your Stay Partner ({prop.host_name || 'Host'})</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed italic bg-white/60 dark:bg-slate-800/40 p-3.5 rounded-xl border border-amber-100 dark:border-slate-700">
                      "{stayInfo.host_message}"
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: LOCATION & MAP */}
              {activeTab === 'location' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#091B29]/70 border border-slate-200/70 dark:border-slate-800 space-y-4">
                    <div className="flex items-center space-x-2 text-xs font-bold text-[#087F8C] dark:text-[#27B7A8]">
                      <MapPin className="w-4 h-4" />
                      <span>Verified Stay Location & Directions</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Property Address</span>
                        <p className="text-xs font-semibold text-slate-900 dark:text-white">
                          {prop.address || 'Address provided upon booking confirmation'}
                        </p>
                      </div>

                      {prop.locality && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Locality / Landmark</span>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">{prop.locality}</p>
                        </div>
                      )}

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">City & State</span>
                        <p className="text-xs font-semibold text-slate-900 dark:text-white">
                          {prop.city}, {prop.state}, {prop.country || 'India'}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Host Contact Phone</span>
                        <p className="text-xs font-semibold text-slate-900 dark:text-white flex items-center space-x-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{prop.contact_phone || 'Contact provided in confirmation'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Google Maps External Button */}
                    {prop.map_url && (
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Coordinates: <span className="font-mono text-slate-700 dark:text-slate-300">{prop.latitude}, {prop.longitude}</span>
                        </div>
                        <a
                          href={prop.map_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#087F8C] hover:bg-[#076974] text-white text-xs font-bold shadow-sm transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View on Google Maps</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: HOME RULES */}
              {activeTab === 'rules' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Check-in & Check-out Rules */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#091B29]/70 border border-slate-200/70 dark:border-slate-800 space-y-2">
                      <h4 className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                        <Clock className="w-4 h-4 text-[#087F8C]" />
                        <span>Check-in & Check-out</span>
                      </h4>
                      <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
                        <li>• Check-in time: <strong>{rules.check_in_start || prop.check_in_time || '14:00'}</strong></li>
                        <li>• Check-out time: <strong>{rules.check_out_time || prop.check_out_time || '11:00'}</strong></li>
                        <li>• Early check-in: <strong>{rules.early_checkin_policy || 'Upon Request'}</strong></li>
                        <li>• Late check-out: <strong>{rules.late_checkout_policy || 'Upon Request'}</strong></li>
                      </ul>
                    </div>

                    {/* Guest Policies */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#091B29]/70 border border-slate-200/70 dark:border-slate-800 space-y-2">
                      <h4 className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                        <Home className="w-4 h-4 text-orange-500" />
                        <span>Guest & Property Policies</span>
                      </h4>
                      <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
                        <li>• Children Allowed: <strong>{rules.children_allowed || 'Yes'}</strong></li>
                        <li>• Pet Policy: <strong>{rules.pets_policy || 'No'}</strong></li>
                        <li>• Smoking Policy: <strong>{rules.smoking_policy || 'No'}</strong></li>
                        <li>• Parties & Events: <strong>{rules.parties_policy || 'No'}</strong></li>
                        <li>• Visitors: <strong>{rules.visitors_policy || 'Upon Request'}</strong></li>
                      </ul>
                    </div>

                    {/* Quiet Hours */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#091B29]/70 border border-slate-200/70 dark:border-slate-800 space-y-2">
                      <h4 className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                        <ShieldCheck className="w-4 h-4 text-indigo-500" />
                        <span>Quiet Hours & Community</span>
                      </h4>
                      <p className="text-slate-600 dark:text-slate-300">
                        {rules.quiet_hours_enabled
                          ? `Quiet hours observed between ${rules.quiet_hours_start || '22:00'} and ${rules.quiet_hours_end || '07:00'}.`
                          : 'Standard community residential quiet standards apply.'}
                      </p>
                    </div>

                    {/* ID & Safety */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#091B29]/70 border border-slate-200/70 dark:border-slate-800 space-y-2">
                      <h4 className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                        <Lock className="w-4 h-4 text-emerald-500" />
                        <span>Identification & Safety</span>
                      </h4>
                      <p className="text-slate-600 dark:text-slate-300">
                        {rules.government_id_required !== false
                          ? 'Valid Government-issued photo ID required for all adult guests at check-in.'
                          : 'Standard identification check.'}
                      </p>
                      {rules.safety_instructions && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Safety: {rules.safety_instructions}
                        </p>
                      )}
                    </div>
                  </div>

                  {rules.additional_rules && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#091B29]/70 border border-slate-200/70 dark:border-slate-800 space-y-1.5 text-xs">
                      <span className="font-bold text-slate-900 dark:text-white block">Additional Rules</span>
                      <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line">{rules.additional_rules}</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: BOOKED ROOM */}
              {activeTab === 'room' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#091B29]/70 border border-slate-200/70 dark:border-slate-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-black text-[#091B29] dark:text-white">
                          {room.name}
                        </h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{room.room_type}</span>
                      </div>
                      <span className="px-3 py-1 rounded-xl bg-[#087F8C]/10 text-[#087F8C] dark:text-[#27B7A8] text-xs font-bold">
                        Max Capacity: {room.capacity} Guests
                      </span>
                    </div>

                    {/* Room Amenities */}
                    {room.amenities && room.amenities.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          Included Room Amenities
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {room.amenities.map((amenity, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center space-x-1 px-3 py-1 rounded-xl bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200"
                            >
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span>{amenity}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bedding & Policy Specs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                      <div className="p-3.5 bg-white dark:bg-[#0F273D] rounded-xl border border-slate-200/60 dark:border-slate-700 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Child Policy</span>
                        <p className="text-slate-700 dark:text-slate-200">
                          {roomRules.children_allowed === 'No'
                            ? 'Children not permitted in this room.'
                            : roomRules.max_child_age
                            ? `Children up to ${roomRules.max_child_age} years stay under room child policy.`
                            : 'Standard child policies apply.'}
                        </p>
                      </div>

                      <div className="p-3.5 bg-white dark:bg-[#0F273D] rounded-xl border border-slate-200/60 dark:border-slate-700 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Extra Bed & Cots</span>
                        <p className="text-slate-700 dark:text-slate-200">
                          Extra Beds: {roomRules.extra_bed_available || 'Upon Request'} • Baby Cots: {roomRules.cot_available || 'Upon Request'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: HOST MESSAGE */}
              {activeTab === 'host' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="p-6 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-3">
                    <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-400 font-bold text-xs">
                      <MessageSquare className="w-4 h-4" />
                      <span>Message from Your Stay Partner ({prop.host_name || 'Host'})</span>
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line bg-white/70 dark:bg-slate-800/60 p-4 rounded-xl border border-amber-100 dark:border-slate-700">
                      {stayInfo.host_message}
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 6: BOOKED EXPERIENCE */}
              {activeTab === 'experience' && exp && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#091B29]/70 border border-slate-200/70 dark:border-slate-800 space-y-3">
                    <div className="flex items-center space-x-2 text-xs font-bold text-[#087F8C] dark:text-[#27B7A8]">
                      <Compass className="w-4 h-4" />
                      <span>Curated Stay Experience</span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-base font-black text-slate-900 dark:text-white">{exp.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Scheduled Date: <strong>{exp.scheduled_date}</strong> • Participants: <strong>{exp.participants}</strong>
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Total Experience Price</span>
                      <strong className="text-orange-500 text-sm">₹{Number(exp.subtotal || exp.price).toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#091B29]/60 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            Voyara Protected Booking • Retains original booking terms snapshot.
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Close Stay Guide
          </button>
        </div>
      </div>
    </div>
  );
};

export default StayInformationModal;
