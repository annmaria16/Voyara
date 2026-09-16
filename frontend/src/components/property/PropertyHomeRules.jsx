import React, { useState, useEffect } from 'react';
import {
  Baby,
  Dog,
  Cigarette,
  PartyPopper,
  Clock,
  Users,
  ShieldAlert,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ChevronRight,
  Sparkles,
  BedDouble,
  Moon,
  IdCard,
  X,
  ShieldCheck,
} from 'lucide-react';

export const PropertyHomeRules = ({ rules, roomRules, propertyName, inline = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Close modal on Escape key press and prevent background scrolling
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen]);

  if (!rules && !roomRules) {
    return (
      <div
        data-testid="property-home-rules"
        className="p-6 bg-[#FFFDF7] dark:bg-[#091B29] rounded-3xl border border-slate-100 dark:border-teal-900/40 text-xs text-slate-500 dark:text-slate-400 text-center"
      >
        <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
        <p className="font-semibold text-slate-700 dark:text-slate-300">Standard House Rules Apply</p>
        <p className="text-[11px] mt-0.5">Please contact the Stay Partner for specific house policy details.</p>
      </div>
    );
  }

  const r = rules || {};
  const rr = roomRules || {};

  // Badges helper
  const renderBadge = (isAllowed, allowedText = 'Allowed', disallowedText = 'Not Allowed') => {
    if (isAllowed === true) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DDF3E7] text-[#35A66F] dark:bg-[#35A66F]/20 dark:text-[#35A66F] border border-[#35A66F]/30">
          <CheckCircle2 className="w-3 h-3" />
          <span>{allowedText}</span>
        </span>
      );
    }
    if (isAllowed === false) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
          <XCircle className="w-3 h-3" />
          <span>{disallowedText}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
        <AlertTriangle className="w-3 h-3" />
        <span>Conditional</span>
      </span>
    );
  };

  // Helper for quick highlight pills on the main card
  const isChildrenWelcome = (rr.children_allowed ?? r.children_allowed) !== false;
  const isPetsAllowed = r.pets_allowed || r.pets_policy === 'Yes';
  const isSmokingAllowed = r.smoking_allowed || r.smoking_policy === 'Yes' || r.smoking_policy === 'Designated Areas Only';
  const checkInStart = r.check_in_time_start || r.check_in_start || '14:00';
  const checkOutEnd = r.check_out_time || '11:00';

  const renderDetailedRulesGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 1. Children & Extra Bed Policy */}
      <div
        data-testid="children-policy"
        className="p-4 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-100 dark:border-teal-900/40 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[#17324D] dark:text-white font-bold text-xs">
            <div className="w-7 h-7 rounded-lg bg-[#087F8C]/10 text-[#087F8C] dark:text-[#27B7A8] flex items-center justify-center">
              <Baby className="w-4 h-4" />
            </div>
            <span>Children & Extra Bed Policy</span>
          </div>
          {renderBadge(
            (rr.children_allowed ?? r.children_allowed) !== false &&
              (rr.additional_children_allowed ?? r.additional_children_allowed ?? 1) >= 0,
            'Children Welcome',
            'Adults Only'
          )}
        </div>

        {/* Formatted Policy Items */}
        <div className="text-xs space-y-2 text-[#607080] dark:text-slate-300">
          {(() => {
            const addAllowed = rr.additional_children_allowed ?? r.additional_children_allowed;
            const maxAge = rr.max_child_age ?? r.max_child_age;
            const freeChildren = rr.free_additional_children ?? r.free_additional_children;
            const childChargeEnabled =
              rr.child_charge_enabled ??
              r.child_charge_enabled ??
              Number(rr.child_charge_amount ?? r.child_charge_amount) > 0;
            const childPrice = Number(rr.child_charge_amount ?? r.child_charge_amount ?? 0);
            const childUnit = rr.child_charge_unit ?? r.child_charge_unit ?? 'Per night';
            const existingBed = rr.existing_bed_allowed ?? r.existing_bed_allowed;
            const existingBedExp = rr.existing_bed_explanation ?? r.existing_bed_explanation;

            const extraBedAvail =
              rr.extra_bed_available ??
              r.extra_bed_available ??
              (rr.extra_bed_allowed ? 'Yes' : r.extra_bed_allowed ? 'Yes' : undefined);
            const extraBedMax =
              rr.maximum_extra_beds ?? rr.extra_bed_max ?? r.maximum_extra_beds ?? r.extra_bed_max ?? 1;
            const extraBedPrice = Number(rr.extra_bed_price ?? r.extra_bed_price ?? 0);
            const extraBedUnit = rr.extra_bed_charge_unit ?? r.extra_bed_charge_unit ?? 'Per night';

            const cotAvail =
              rr.cot_available ??
              r.cot_available ??
              (rr.cot_allowed ? 'Yes' : r.cot_allowed ? 'Yes' : undefined);
            const cotQty = rr.cot_quantity ?? rr.cot_count ?? r.cot_quantity ?? r.cot_count ?? 1;
            const cotPrice = Number(rr.cot_price ?? r.cot_price ?? 0);
            const cotUnit = rr.cot_charge_unit ?? r.cot_charge_unit ?? 'Free';

            const hasConfig =
              addAllowed !== undefined ||
              maxAge !== undefined ||
              existingBed !== undefined ||
              extraBedAvail !== undefined ||
              cotAvail !== undefined;

            if (!hasConfig && !r.children_policy_description) {
              return (
                <p className="italic text-slate-500 dark:text-slate-400">
                  This information has not been specified by the Stay Partner. Please contact the Stay Partner for confirmation.
                </p>
              );
            }

            return (
              <div className="space-y-1.5">
                {/* Additional Children Allowed */}
                <div className="flex items-start space-x-1.5">
                  <span className="text-[#087F8C] dark:text-[#27B7A8] font-bold">•</span>
                  <div>
                    <strong>Additional children: </strong>
                    {addAllowed !== undefined ? (
                      addAllowed > 0 ? (
                        <span>
                          Up to {addAllowed} additional child{addAllowed > 1 ? 'ren' : ''} allowed
                        </span>
                      ) : (
                        <span>Additional children are not permitted beyond standard room occupancy</span>
                      )
                    ) : (
                      <span className="italic text-slate-400">
                        This information has not been specified by the Stay Partner. Please contact the Stay Partner for confirmation.
                      </span>
                    )}
                  </div>
                </div>

                {/* Child Age Limit */}
                <div className="flex items-start space-x-1.5">
                  <span className="text-[#087F8C] dark:text-[#27B7A8] font-bold">•</span>
                  <div>
                    <strong>Child age limit: </strong>
                    {maxAge !== undefined && maxAge !== '' && maxAge !== null ? (
                      <span>Children up to {maxAge} years permitted as additional guests</span>
                    ) : (
                      <span>Children of all ages welcome (unless specified)</span>
                    )}
                  </div>
                </div>

                {/* Free Additional Children & Charges */}
                <div className="flex items-start space-x-1.5">
                  <span className="text-[#087F8C] dark:text-[#27B7A8] font-bold">•</span>
                  <div>
                    <strong>Child pricing: </strong>
                    {freeChildren !== undefined && freeChildren > 0 ? (
                      <span>
                        {freeChildren} child{freeChildren > 1 ? 'ren' : ''} stay free of charge when sharing existing bedding.{' '}
                      </span>
                    ) : null}
                    {childChargeEnabled && childPrice > 0 ? (
                      <span className="text-[#F97316] font-medium">
                        Extra child charge: ₹{childPrice.toLocaleString('en-IN')} {childUnit.toLowerCase()}
                      </span>
                    ) : (
                      <span className="text-[#35A66F] font-medium">No extra child surcharge applies</span>
                    )}
                  </div>
                </div>

                {/* Existing Bed Policy */}
                <div className="flex items-start space-x-1.5">
                  <span className="text-[#087F8C] dark:text-[#27B7A8] font-bold">•</span>
                  <div>
                    <strong>Existing bedding: </strong>
                    {existingBed === 'Yes' ? (
                      <span>Children may share existing bedding with parents</span>
                    ) : existingBed === 'No' ? (
                      <span>Sharing existing bed is not permitted</span>
                    ) : (
                      <span>Sharing existing bedding is subject to room layout</span>
                    )}
                    {existingBedExp ? (
                      <span className="italic text-slate-500 dark:text-slate-400"> ({existingBedExp})</span>
                    ) : null}
                  </div>
                </div>

                {/* Extra Bed Availability */}
                <div className="flex items-start space-x-1.5">
                  <span className="text-[#087F8C] dark:text-[#27B7A8] font-bold">•</span>
                  <div>
                    <strong>Extra bed: </strong>
                    {extraBedAvail === 'Yes' ? (
                      <span>
                        Available upon request: Up to {extraBedMax} extra bed{extraBedMax > 1 ? 's' : ''}{' '}
                        {extraBedPrice > 0
                          ? `at ₹${extraBedPrice.toLocaleString('en-IN')} ${extraBedUnit.toLowerCase()}`
                          : '(Free)'}
                      </span>
                    ) : extraBedAvail === 'No' ? (
                      <span>Extra beds are not available</span>
                    ) : (
                      <span className="italic text-slate-400">
                        This information has not been specified by the Stay Partner. Please contact the Stay Partner for confirmation.
                      </span>
                    )}
                  </div>
                </div>

                {/* Baby Cot Availability */}
                <div className="flex items-start space-x-1.5">
                  <span className="text-[#087F8C] dark:text-[#27B7A8] font-bold">•</span>
                  <div>
                    <strong>Baby cot: </strong>
                    {cotAvail === 'Yes' ? (
                      <span>
                        Available upon request: Up to {cotQty} baby cot{cotQty > 1 ? 's' : ''}{' '}
                        {cotUnit === 'Free' || cotPrice === 0
                          ? '(Free)'
                          : `at ₹${cotPrice.toLocaleString('en-IN')} ${cotUnit.toLowerCase()}`}
                      </span>
                    ) : cotAvail === 'No' ? (
                      <span>Baby cots are not available</span>
                    ) : (
                      <span className="italic text-slate-400">
                        This information has not been specified by the Stay Partner. Please contact the Stay Partner for confirmation.
                      </span>
                    )}
                  </div>
                </div>

                {r.children_policy_description && (
                  <p className="italic text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                    "{r.children_policy_description}"
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* 2. Pet Policy */}
      <div
        data-testid="pet-policy"
        className="p-4 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-100 dark:border-teal-900/40 space-y-2.5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[#17324D] dark:text-white font-bold text-xs">
            <div className="w-7 h-7 rounded-lg bg-[#F97316]/10 text-[#F97316] flex items-center justify-center">
              <Dog className="w-4 h-4" />
            </div>
            <span>Pet Policy</span>
          </div>
          {renderBadge(r.pets_allowed ?? (r.pets_policy === 'Yes' ? true : (r.pets_policy === 'No' ? false : null)), 'Pets Allowed', 'No Pets Allowed')}
        </div>

        <div className="text-xs space-y-1 text-[#607080] dark:text-slate-300">
          {r.pets_allowed || r.pets_policy === 'Yes' ? (
            <>
              <p>
                • Pets permitted ({r.pet_types_allowed || 'Dogs and cats welcome'}).
                {r.max_pets ? ` Max ${r.max_pets} pet(s).` : ''}
              </p>
              {r.pet_fee > 0 ? (
                <p className="text-[#F97316] font-medium">• Pet cleaning charge: ₹{r.pet_fee?.toLocaleString('en-IN')}</p>
              ) : (
                <p className="text-[#35A66F] font-medium">• No pet fee charged.</p>
              )}
              {r.pet_policy_description && (
                <p className="italic text-[11px] text-slate-600 dark:text-slate-400">"{r.pet_policy_description}"</p>
              )}
            </>
          ) : (
            <p className="text-rose-600 dark:text-rose-400 font-medium">
              • Pets are strictly not permitted on this property to maintain guest hygiene and allergen safety.
            </p>
          )}
        </div>
      </div>

      {/* 3. Smoking & Alcohol Policy */}
      <div
        data-testid="smoking-policy"
        className="p-4 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-100 dark:border-teal-900/40 space-y-2.5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[#17324D] dark:text-white font-bold text-xs">
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <Cigarette className="w-4 h-4" />
            </div>
            <span>Smoking Policy</span>
          </div>
          {renderBadge(r.smoking_allowed ?? (r.smoking_policy === 'Yes' ? true : (r.smoking_policy === 'No' ? false : null)), 'Smoking Permitted', 'Non-Smoking')}
        </div>

        <div className="text-xs space-y-1 text-[#607080] dark:text-slate-300">
          {r.smoking_allowed || r.smoking_policy === 'Yes' || r.smoking_policy === 'Designated Areas Only' ? (
            <>
              <p>• Smoking allowed in designated outdoor/balcony zones only.</p>
              {r.smoking_policy_description && (
                <p className="italic text-[11px] text-slate-600 dark:text-slate-400">"{r.smoking_policy_description}"</p>
              )}
            </>
          ) : (
            <p className="text-rose-600 dark:text-rose-400 font-medium">
              • Strictly 100% smoke-free property. Smoking inside rooms or indoor lounges is prohibited and incurs a deep-cleaning fine.
            </p>
          )}
        </div>
      </div>

      {/* 4. Parties & Events */}
      <div
        data-testid="party-policy"
        className="p-4 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-100 dark:border-teal-900/40 space-y-2.5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[#17324D] dark:text-white font-bold text-xs">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <PartyPopper className="w-4 h-4" />
            </div>
            <span>Parties & Events</span>
          </div>
          {renderBadge(r.parties_allowed ?? (r.parties_policy === 'Yes' ? true : (r.parties_policy === 'No' ? false : null)), 'Events Allowed', 'No Parties / Events')}
        </div>

        <div className="text-xs space-y-1 text-[#607080] dark:text-slate-300">
          {r.parties_allowed || r.parties_policy === 'Yes' ? (
            <>
              <p>• Parties and social gatherings permitted upon prior approval with host.</p>
              {r.party_policy_description && (
                <p className="italic text-[11px] text-slate-600 dark:text-slate-400">"{r.party_policy_description}"</p>
              )}
            </>
          ) : (
            <p className="text-rose-600 dark:text-rose-400 font-medium">
              • Parties, bachelor/bachelorette gatherings, and loud events are strictly prohibited.
            </p>
          )}
        </div>
      </div>

      {/* 5. Check-in & Check-out Window */}
      <div
        data-testid="checkin-policy"
        className="p-4 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-100 dark:border-teal-900/40 space-y-2.5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[#17324D] dark:text-white font-bold text-xs">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <span>Check-in & Check-out</span>
          </div>
          <span className="text-[10px] font-bold text-[#087F8C] dark:text-[#27B7A8]">
            {r.self_check_in ? '🔑 Self Check-In Available' : '🛎 Front Desk Check-In'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div className="p-2.5 bg-white dark:bg-[#0F273D] rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Check-in Window</span>
            <strong className="text-[#17324D] dark:text-white">
              {r.check_in_time_start || r.check_in_start || '14:00'} - {r.check_in_time_end || r.check_in_end || '22:00'}
            </strong>
          </div>
          <div className="p-2.5 bg-white dark:bg-[#0F273D] rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Check-out By</span>
            <strong className="text-[#17324D] dark:text-white">{r.check_out_time || '11:00'}</strong>
          </div>
        </div>

        {r.self_check_in_instructions && (
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            🔑 <strong>Key Access:</strong> {r.self_check_in_instructions}
          </p>
        )}
      </div>

      {/* 6. Quiet Hours & Visitors */}
      <div
        data-testid="quiet-hours-policy"
        className="p-4 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-100 dark:border-teal-900/40 space-y-2.5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[#17324D] dark:text-white font-bold text-xs">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Moon className="w-4 h-4" />
            </div>
            <span>Quiet Hours & Visitors</span>
          </div>
          {r.quiet_hours_enabled ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200">
              {r.quiet_hours_start || '22:00'} - {r.quiet_hours_end || '07:00'}
            </span>
          ) : (
            renderBadge(r.visitors_allowed, 'Visitors Allowed', 'No Outside Visitors')
          )}
        </div>

        <div className="text-xs space-y-1 text-[#607080] dark:text-slate-300">
          {r.quiet_hours_enabled && (
            <p>
              • <strong>Quiet Hours:</strong> Guests are requested to keep noise to a minimum between{' '}
              <strong>{r.quiet_hours_start || '22:00'}</strong> and <strong>{r.quiet_hours_end || '07:00'}</strong>.
            </p>
          )}
          <p>
            • <strong>Outside Visitors:</strong>{' '}
            {r.visitors_allowed || r.visitors_policy === 'Yes'
              ? r.visitor_policy_description || 'Permitted with advance notification to the host.'
              : 'Outside visitors not on the reservation are strictly not permitted past 8:00 PM.'}
          </p>
        </div>
      </div>

      {/* 7. Government ID & Security Deposit */}
      <div
        data-testid="id-safety-policy"
        className="p-4 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-100 dark:border-teal-900/40 space-y-2.5 md:col-span-2"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[#17324D] dark:text-white font-bold text-xs">
            <div className="w-7 h-7 rounded-lg bg-[#35A66F]/10 text-[#35A66F] flex items-center justify-center">
              <IdCard className="w-4 h-4" />
            </div>
            <span>Government ID Verification & Safety Protocols</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            🔒 Mandatory Security Standard
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#607080] dark:text-slate-300 pt-1">
          <div>
            <p>
              • <strong>ID Verification:</strong>{' '}
              {r.gov_id_required !== false && r.government_id_required !== false
                ? 'All adult guests must present valid government photo ID (Aadhaar, Passport, Driving License, Voter ID) at check-in.'
                : 'Standard guest registration required.'}
            </p>
            {r.security_deposit_required && (
              <p className="text-[#F97316] font-medium mt-1">
                • Refundable Security Deposit: ₹{r.security_deposit_amount?.toLocaleString('en-IN') || 1000} (Collected at check-in, returned upon inspection).
              </p>
            )}
          </div>

          <div>
            {r.safety_instructions || r.safety_rules ? (
              <p>
                • <strong>Safety Guidelines:</strong> {r.safety_instructions || r.safety_rules}
              </p>
            ) : null}
            {r.additional_rules || r.custom_rules ? (
              <p className="mt-1">
                • <strong>Additional Host Rules:</strong> {r.additional_rules || r.custom_rules}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  const renderRoomRulesCard = () => {
    if (!roomRules) return null;
    return (
      <div
        data-testid="room-rules"
        className="p-4 bg-[#FFF8F0] dark:bg-slate-900/80 rounded-2xl border border-orange-200/80 dark:border-slate-800 space-y-2 text-xs"
      >
        <div className="flex items-center space-x-2 font-bold text-slate-800 dark:text-slate-200">
          <BedDouble className="w-4 h-4 text-[#F97316]" />
          <span>Selected Room Occupancy Limits & Guidelines</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-[11px]">
          <div>
            <span className="text-slate-400 block uppercase font-bold text-[9px]">Max Adults</span>
            <strong className="text-slate-800 dark:text-white">{rr.maximum_adults ?? rr.max_adults ?? 2} Adult(s)</strong>
          </div>
          <div>
            <span className="text-slate-400 block uppercase font-bold text-[9px]">Max Children</span>
            <strong className="text-slate-800 dark:text-white">
              {rr.children_allowed !== 'No' && rr.children_allowed !== false
                ? `${rr.maximum_children ?? rr.max_children ?? 1} Child(ren)`
                : 'None (0)'}
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block uppercase font-bold text-[9px]">Baby Cot Available</span>
            <strong className="text-slate-800 dark:text-white">
              {rr.cot_available === 'Yes' || rr.cot_allowed ? `Yes (Max ${rr.cot_quantity || rr.cot_count || 1})` : 'No'}
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block uppercase font-bold text-[9px]">Extra Bed Available</span>
            <strong className="text-slate-800 dark:text-white">
              {rr.extra_bed_available === 'Yes' || rr.extra_bed_allowed
                ? `Yes (Max ${rr.maximum_extra_beds || rr.extra_bed_max || 1})`
                : 'No'}
            </strong>
          </div>
        </div>

        {(rr.room_specific_rules || rr.room_rules) && (
          <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-orange-200/40 dark:border-slate-800">
            📌 <strong>Room Rule:</strong> {rr.room_specific_rules || rr.room_rules}
          </p>
        )}
      </div>
    );
  };

  // If inline is explicitly requested, render expanded grid directly
  if (inline) {
    return (
      <div
        id="property-home-rules"
        data-testid="property-home-rules"
        className="bg-white dark:bg-[#0F273D] rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-teal-900/40 shadow-sm space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#087F8C]/10 text-[#087F8C] dark:text-[#27B7A8] text-xs font-bold mb-1 border border-[#087F8C]/20">
              <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
              <span>Stay Guidelines & House Rules</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-serif text-[#17324D] dark:text-white">
              Property Home Rules {propertyName ? `• ${propertyName}` : ''}
            </h2>
          </div>
        </div>
        {renderDetailedRulesGrid()}
        {renderRoomRulesCard()}
      </div>
    );
  }

  // DEFAULT COMPACT CARD WITH BUTTON THAT OPENS MODAL
  return (
    <>
      <div
        id="property-home-rules"
        data-testid="property-home-rules"
        className="bg-white dark:bg-[#0F273D] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-teal-900/40 shadow-sm transition-all hover:border-[#087F8C]/30 space-y-4"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#087F8C]/10 text-[#087F8C] dark:text-[#27B7A8] text-xs font-bold border border-[#087F8C]/20">
              <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
              <span>Stay Guidelines & House Rules</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-serif text-[#17324D] dark:text-white">
              Property Home Rules {propertyName ? `• ${propertyName}` : ''}
            </h2>
            <p className="text-xs text-[#607080] dark:text-slate-400 max-w-2xl">
              Authoritative policies set by the Stay Partner including child occupancy, check-in window, pets, and safety protocols.
            </p>

            {/* Quick Summary Highlights Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
              <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 font-medium text-[11px] border border-slate-200/60 dark:border-slate-700">
                <Clock className="w-3 h-3 text-[#087F8C]" />
                <span>Check-in: {checkInStart} - {r.check_in_time_end || r.check_in_end || '22:00'}</span>
              </span>

              <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 font-medium text-[11px] border border-slate-200/60 dark:border-slate-700">
                <Clock className="w-3 h-3 text-[#F97316]" />
                <span>Check-out: {checkOutEnd}</span>
              </span>

              {isChildrenWelcome ? (
                <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-xl bg-[#DDF3E7] dark:bg-[#35A66F]/10 text-[#35A66F] font-semibold text-[11px] border border-[#35A66F]/20">
                  <Baby className="w-3 h-3" />
                  <span>Children Welcome</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-semibold text-[11px] border border-rose-200 dark:border-rose-900/30">
                  <Baby className="w-3 h-3" />
                  <span>Adults Only</span>
                </span>
              )}

              {isPetsAllowed ? (
                <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-xl bg-[#FFF8F0] dark:bg-orange-950/20 text-[#F97316] font-semibold text-[11px] border border-orange-200 dark:border-orange-900/30">
                  <Dog className="w-3 h-3" />
                  <span>Pets Allowed</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 font-semibold text-[11px] border border-slate-200/60 dark:border-slate-700">
                  <Dog className="w-3 h-3" />
                  <span>No Pets</span>
                </span>
              )}

              {isSmokingAllowed ? (
                <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 font-semibold text-[11px] border border-amber-200">
                  <Cigarette className="w-3 h-3" />
                  <span>Designated Smoking</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 font-semibold text-[11px] border border-slate-200/60 dark:border-slate-700">
                  <Cigarette className="w-3 h-3" />
                  <span>Non-Smoking</span>
                </span>
              )}

              <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] border border-emerald-200 dark:border-emerald-900/30">
                <ShieldCheck className="w-3 h-3" />
                <span>Govt ID Required</span>
              </span>
            </div>
          </div>

          {/* Action Button that triggers the modal */}
          <div className="flex md:flex-col justify-end items-stretch md:items-end gap-2 shrink-0">
            <button
              type="button"
              id="view-home-rules-button"
              data-testid="view-home-rules-button"
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#087F8C] to-[#0A96A6] hover:from-[#076F7B] hover:to-[#087F8C] text-white text-xs font-bold shadow-lg shadow-[#087F8C]/20 hover:shadow-xl hover:shadow-[#087F8C]/30 transition-all transform active:scale-95 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>View House Rules & Policies</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* FULL RULES POPUP MODAL */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm transition-opacity animate-fadeIn"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#0F273D] rounded-3xl shadow-2xl border border-slate-100 dark:border-teal-900/40 flex flex-col overflow-hidden animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-white to-teal-50/20 dark:from-[#091B29] dark:via-[#0F273D] dark:to-[#091B29]">
              <div>
                <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-[#087F8C]/10 text-[#087F8C] dark:text-[#27B7A8] text-xs font-bold mb-1 border border-[#087F8C]/20">
                  <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>Stay Guidelines & House Rules</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold font-serif text-[#17324D] dark:text-white">
                  Property Home Rules {propertyName ? `• ${propertyName}` : ''}
                </h3>
                <p className="text-xs text-[#607080] dark:text-slate-400">
                  Authoritative policies verified and set by the Stay Partner.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close Rules Modal"
                className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 max-h-[calc(90vh-140px)]">
              {renderRoomRulesCard()}
              {renderDetailedRulesGrid()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#091B29] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2 text-[11px] text-[#607080] dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-[#35A66F] shrink-0" />
                <span>All policies are enforced during your stay to maintain safety and comfort for all guests.</span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-[#17324D] hover:bg-[#087F8C] text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                Close & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PropertyHomeRules;
