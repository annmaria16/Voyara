import React, { useState } from 'react';
import {
  Baby,
  BedDouble,
  PawPrint,
  Cigarette,
  PartyPopper,
  Users,
  Moon,
  Clock,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Eye,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Info,
} from 'lucide-react';

export const DEFAULT_HOME_RULES = {
  children_allowed: 'Yes',
  additional_children_allowed: 0,
  max_child_age: '',
  free_additional_children: 0,
  child_charge_enabled: false,
  child_charge_amount: '',
  child_charge_unit: 'Per night',
  existing_bed_allowed: 'Yes',
  existing_bed_explanation: '',
  extra_bed_available: 'No',
  maximum_extra_beds: 0,
  extra_bed_price: '',
  extra_bed_charge_unit: 'Per night',
  cot_available: 'No',
  cot_quantity: 0,
  cot_price: '',
  cot_charge_unit: 'Free',
  // Legacy / fallback fields
  minimum_child_age: '',
  maximum_children: '',
  children_charged_separately: false,
  child_pricing_note: '',
  cot_policy: 'Upon Request',
  extra_bed_policy: 'Upon Request',
  pets_policy: 'No',
  pet_fee: '0',
  pet_policy_description: '',
  smoking_policy: 'No',
  smoking_policy_description: '',
  parties_policy: 'No',
  party_policy_description: '',
  visitors_policy: 'Upon Request',
  overnight_visitors_allowed: false,
  visitor_policy_description: '',
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
  check_in_start: '14:00',
  check_in_end: '22:00',
  check_out_time: '11:00',
  early_checkin_policy: 'Upon Request',
  late_checkout_policy: 'Upon Request',
  government_id_required: true,
  minimum_checkin_age: '18',
  safety_instructions: '',
  additional_rules: '',
};

export const PropertyHomeRulesForm = ({
  rules = DEFAULT_HOME_RULES,
  onChange,
  disabled = false,
}) => {
  const [showPreview, setShowPreview] = useState(false);

  const updateField = (field, value) => {
    if (onChange) {
      onChange({
        ...rules,
        [field]: value,
      });
    }
  };

  const handleClearOptional = () => {
    if (!window.confirm('Clear all optional rule descriptions and notes?')) return;
    if (onChange) {
      onChange({
        ...rules,
        max_child_age: '',
        child_charge_amount: '',
        existing_bed_explanation: '',
        extra_bed_price: '',
        cot_price: '',
        minimum_child_age: '',
        maximum_children: '',
        child_pricing_note: '',
        pet_policy_description: '',
        smoking_policy_description: '',
        party_policy_description: '',
        visitor_policy_description: '',
        safety_instructions: '',
        additional_rules: '',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#087F8C]" />
            Home Rules & Guest Policies
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Help Travelers understand what is allowed at your property before booking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              showPreview
                ? 'bg-[#087F8C] text-white border-[#087F8C] shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            {showPreview ? 'Hide Traveler Preview' : 'Preview Traveler View'}
          </button>

          <button
            type="button"
            onClick={handleClearOptional}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear Optional
          </button>
        </div>
      </div>

      {/* Traveler Live Preview Banner / Drawer */}
      {showPreview && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#087F8C]/5 via-[#FFFDF7] to-amber-500/5 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-[#087F8C]/30 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#087F8C] dark:text-[#27B7A8]">
              <Sparkles className="w-4 h-4" />
              Live Traveler Preview Card
            </div>
            <span className="text-[11px] text-slate-500">How travelers view your rules</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
            {/* Children & Beds Preview */}
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-1">
              <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Baby className="w-3.5 h-3.5 text-[#087F8C]" /> Children & Extra Bed Policy
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                Additional Children: <span className="font-semibold">{rules.additional_children_allowed ?? 0}</span>
                {rules.max_child_age ? ` (Max age: ${rules.max_child_age} yrs)` : ''}
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                Free Children: <span className="font-semibold">{rules.free_additional_children ?? 0}</span>
              </p>
              {rules.child_charge_enabled && rules.child_charge_amount > 0 && (
                <p className="text-slate-600 dark:text-slate-300">
                  Child Charge: <span className="font-semibold text-[#087F8C]">₹{rules.child_charge_amount} {rules.child_charge_unit?.toLowerCase()}</span>
                </p>
              )}
              <p className="text-slate-600 dark:text-slate-300">
                Existing Bed: <span className="font-semibold">{rules.existing_bed_allowed === 'No' ? 'No' : 'Yes'}</span>
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                Extra Bed: <span className="font-semibold">{rules.extra_bed_available === 'Yes' ? `Yes (Max ${rules.maximum_extra_beds || 1})` : 'No'}</span>
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                Baby Cot: <span className="font-semibold">{rules.cot_available === 'Yes' ? `Yes (Max ${rules.cot_quantity || 1})` : 'No'}</span>
              </p>
            </div>

            {/* Pets Preview */}
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-1">
              <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <PawPrint className="w-3.5 h-3.5 text-[#F97316]" /> Pet Policy
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                Pets Allowed: <span className="font-semibold">{rules.pets_policy || 'No'}</span>
                {parseFloat(rules.pet_fee) > 0 ? ` (Fee: ₹${rules.pet_fee})` : ''}
              </p>
            </div>

            {/* Smoking Preview */}
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-1">
              <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Cigarette className="w-3.5 h-3.5 text-slate-600" /> Smoking Policy
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                Smoking: <span className="font-semibold">{rules.smoking_policy || 'No'}</span>
              </p>
            </div>

            {/* Quiet Hours Preview */}
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-1">
              <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-indigo-500" /> Quiet Hours
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                {rules.quiet_hours_enabled ? `${rules.quiet_hours_start} to ${rules.quiet_hours_end}` : 'Not strictly enforced'}
              </p>
            </div>

            {/* Check-in/out Preview */}
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-1">
              <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" /> Check-in / Out
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                Check-in: <span className="font-semibold">{rules.check_in_start || '14:00'} - {rules.check_in_end || '22:00'}</span>
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                Check-out: <span className="font-semibold">by {rules.check_out_time || '11:00'}</span>
              </p>
            </div>

            {/* ID & Safety Preview */}
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-1">
              <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#087F8C]" /> ID & Age
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                Govt ID: <span className="font-semibold">{rules.government_id_required ? 'Required' : 'Optional'}</span>
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                Min Check-in Age: <span className="font-semibold">{rules.minimum_checkin_age || '18'} yrs</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 9 Rule Configuration Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Child Occupancy & Additional Child Policy (Full Width Container) */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white text-base">
              <div className="w-8 h-8 rounded-xl bg-[#087F8C]/10 text-[#087F8C] flex items-center justify-center">
                <Baby className="w-4 h-4" />
              </div>
              <span>Child Occupancy & Additional Child Policy</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Configure room occupancy limits, age thresholds, pricing supplements & bed availability.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
            {/* Question 1: Additional Children Allowed */}
            <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 space-y-2">
              <label className="block font-semibold text-slate-800 dark:text-slate-200 text-xs">
                1. How many additional children can stay in a room?
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={rules.additional_children_allowed !== undefined && rules.additional_children_allowed !== null ? rules.additional_children_allowed : 0}
                onChange={(e) => updateField('additional_children_allowed', Math.max(0, parseInt(e.target.value, 10) || 0))}
                disabled={disabled}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[#087F8C]"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Number of children permitted in addition to normal room occupancy.
              </p>
            </div>

            {/* Question 2: Child Age Limit */}
            <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 space-y-2">
              <label className="block font-semibold text-slate-800 dark:text-slate-200 text-xs">
                2. What is the maximum age allowed for an additional child?
              </label>
              <input
                type="number"
                min="0"
                max="17"
                placeholder="e.g., 5, 8, 12"
                value={rules.max_child_age || ''}
                onChange={(e) => updateField('max_child_age', e.target.value ? Math.max(0, parseInt(e.target.value, 10)) : '')}
                disabled={disabled || Number(rules.additional_children_allowed) === 0}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[#087F8C] disabled:opacity-50"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Max age in years that qualifies as an additional child.
              </p>
            </div>

            {/* Question 3: Free Additional Children */}
            <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 space-y-2">
              <label className="block font-semibold text-slate-800 dark:text-slate-200 text-xs">
                3. How many additional children can stay free of charge?
              </label>
              <input
                type="number"
                min="0"
                max={rules.additional_children_allowed || 0}
                placeholder="0"
                value={rules.free_additional_children !== undefined && rules.free_additional_children !== null ? rules.free_additional_children : 0}
                onChange={(e) => updateField('free_additional_children', Math.max(0, parseInt(e.target.value, 10) || 0))}
                disabled={disabled || Number(rules.additional_children_allowed) === 0}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[#087F8C] disabled:opacity-50 ${
                  Number(rules.free_additional_children) > Number(rules.additional_children_allowed)
                    ? 'border-rose-500 ring-1 ring-rose-500'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Specify how many additional children can stay without an extra charge.
              </p>
              {Number(rules.free_additional_children) > Number(rules.additional_children_allowed) && (
                <p className="text-[11px] text-rose-500 font-medium">
                  Free additional children cannot exceed additional children allowed ({rules.additional_children_allowed || 0}).
                </p>
              )}
            </div>

            {/* Question 4: Additional Child Charge */}
            <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 space-y-2.5">
              <label className="block font-semibold text-slate-800 dark:text-slate-200 text-xs">
                4. Is there an extra charge for additional children?
              </label>
              <select
                value={rules.child_charge_enabled ? 'Yes' : 'No'}
                onChange={(e) => updateField('child_charge_enabled', e.target.value === 'Yes')}
                disabled={disabled || Number(rules.additional_children_allowed) === 0}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[#087F8C] disabled:opacity-50"
              >
                <option value="No">No (Included / Free)</option>
                <option value="Yes">Yes (Chargeable)</option>
              </select>

              {rules.child_charge_enabled && Number(rules.additional_children_allowed) > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                        Amount (₹ INR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 500"
                        value={rules.child_charge_amount || ''}
                        onChange={(e) => updateField('child_charge_amount', Math.max(0, parseFloat(e.target.value) || 0))}
                        disabled={disabled}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                        Unit
                      </label>
                      <select
                        value={rules.child_charge_unit || 'Per night'}
                        onChange={(e) => updateField('child_charge_unit', e.target.value)}
                        disabled={disabled}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                      >
                        <option value="Per night">Per night</option>
                        <option value="Per stay">Per stay</option>
                      </select>
                    </div>
                  </div>
                  {rules.child_charge_amount > 0 && (
                    <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/50 text-[11px] text-teal-800 dark:text-teal-200 font-medium">
                      Display: ₹{rules.child_charge_amount} per child {rules.child_charge_unit?.toLowerCase() || 'per night'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Question 5: Existing Bed Policy */}
            <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 space-y-2.5">
              <label className="block font-semibold text-slate-800 dark:text-slate-200 text-xs">
                5. Can an additional child use the existing adult bed?
              </label>
              <select
                value={rules.existing_bed_allowed || 'Yes'}
                onChange={(e) => updateField('existing_bed_allowed', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[#087F8C]"
              >
                <option value="Yes">Yes (Bed sharing permitted)</option>
                <option value="No">No (Separate bed required)</option>
              </select>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                  Explanation (optional)
                </label>
                <input
                  type="text"
                  maxLength={500}
                  placeholder="Explain whether the child can share the existing bed."
                  value={rules.existing_bed_explanation || ''}
                  onChange={(e) => updateField('existing_bed_explanation', e.target.value)}
                  disabled={disabled}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Question 6: Extra Bed Availability */}
            <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 space-y-2.5">
              <label className="block font-semibold text-slate-800 dark:text-slate-200 text-xs">
                6. Is an extra bed available for an additional child?
              </label>
              <select
                value={rules.extra_bed_available || (rules.extra_bed_policy === 'No' ? 'No' : 'No')}
                onChange={(e) => {
                  updateField('extra_bed_available', e.target.value);
                  updateField('extra_bed_policy', e.target.value === 'Yes' ? 'Yes' : 'No');
                  if (e.target.value === 'Yes' && (!rules.maximum_extra_beds || parseInt(rules.maximum_extra_beds, 10) < 1)) {
                    updateField('maximum_extra_beds', 1);
                  }
                }}
                disabled={disabled}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[#087F8C]"
              >
                <option value="No">No (Not available)</option>
                <option value="Yes">Yes (Available upon request)</option>
              </select>

              {rules.extra_bed_available === 'Yes' && (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                        Max Beds
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={rules.maximum_extra_beds || 1}
                        onChange={(e) => updateField('maximum_extra_beds', Math.max(1, parseInt(e.target.value, 10) || 1))}
                        disabled={disabled}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                        Charge (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={rules.extra_bed_price || ''}
                        onChange={(e) => updateField('extra_bed_price', Math.max(0, parseFloat(e.target.value) || 0))}
                        disabled={disabled}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                        Unit
                      </label>
                      <select
                        value={rules.extra_bed_charge_unit || 'Per night'}
                        onChange={(e) => updateField('extra_bed_charge_unit', e.target.value)}
                        disabled={disabled}
                        className="w-full px-1.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                      >
                        <option value="Per night">Per night</option>
                        <option value="Per stay">Per stay</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Question 7: Baby Cot Availability */}
            <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 space-y-2.5">
              <label className="block font-semibold text-slate-800 dark:text-slate-200 text-xs">
                7. Is a baby cot available?
              </label>
              <select
                value={rules.cot_available || (rules.cot_policy === 'No' ? 'No' : 'No')}
                onChange={(e) => {
                  updateField('cot_available', e.target.value);
                  updateField('cot_policy', e.target.value === 'Yes' ? 'Yes' : 'No');
                  if (e.target.value === 'Yes' && (!rules.cot_quantity || parseInt(rules.cot_quantity, 10) < 1)) {
                    updateField('cot_quantity', 1);
                  }
                }}
                disabled={disabled}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[#087F8C]"
              >
                <option value="No">No (Not available)</option>
                <option value="Yes">Yes (Available upon request)</option>
              </select>

              {rules.cot_available === 'Yes' && (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                        Max Cots
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={rules.cot_quantity || 1}
                        onChange={(e) => updateField('cot_quantity', Math.max(1, parseInt(e.target.value, 10) || 1))}
                        disabled={disabled}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                        Charge (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={rules.cot_price || ''}
                        onChange={(e) => updateField('cot_price', Math.max(0, parseFloat(e.target.value) || 0))}
                        disabled={disabled}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                        Unit
                      </label>
                      <select
                        value={rules.cot_charge_unit || 'Free'}
                        onChange={(e) => updateField('cot_charge_unit', e.target.value)}
                        disabled={disabled}
                        className="w-full px-1.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                      >
                        <option value="Free">Free</option>
                        <option value="Per night">Per night</option>
                        <option value="Per stay">Per stay</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Pet Policy */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
            <PawPrint className="w-4 h-4 text-[#F97316]" />
            2. Pet Policy
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Pets
              </label>
              <select
                value={rules.pets_policy || 'No'}
                onChange={(e) => updateField('pets_policy', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="Yes">Allowed</option>
                <option value="Upon Request">Allowed upon request</option>
                <option value="No">Not allowed</option>
              </select>
            </div>

            {rules.pets_policy !== 'No' && (
              <>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Pet fee (₹, optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g., 500"
                    value={rules.pet_fee || '0'}
                    onChange={(e) => updateField('pet_fee', e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Additional pet rules (optional)
                  </label>
                  <input
                    type="text"
                    maxLength={500}
                    placeholder="e.g., Dogs up to 15kg only. Must remain leashed in garden areas."
                    value={rules.pet_policy_description || ''}
                    onChange={(e) => updateField('pet_policy_description', e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* 3. Smoking Policy */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
            <Cigarette className="w-4 h-4 text-slate-600" />
            3. Smoking Policy
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Smoking
              </label>
              <select
                value={rules.smoking_policy || 'No'}
                onChange={(e) => updateField('smoking_policy', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="No">Not allowed (100% smoke-free)</option>
                <option value="Designated Areas Only">Allowed only in designated areas</option>
                <option value="Yes">Allowed</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Additional smoking info (optional)
              </label>
              <input
                type="text"
                maxLength={500}
                placeholder="e.g., Smoking permitted on open balconies and outdoor gazebo."
                value={rules.smoking_policy_description || ''}
                onChange={(e) => updateField('smoking_policy_description', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* 4. Parties & Events */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
            <PartyPopper className="w-4 h-4 text-purple-600" />
            4. Parties and Events
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Parties / Events
              </label>
              <select
                value={rules.parties_policy || 'No'}
                onChange={(e) => updateField('parties_policy', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="No">Not allowed</option>
                <option value="Upon Request">Allowed upon request</option>
                <option value="Yes">Allowed</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Additional party/event rules (optional)
              </label>
              <input
                type="text"
                maxLength={500}
                placeholder="e.g., Birthday gatherings up to 10 people allowed with prior notice."
                value={rules.party_policy_description || ''}
                onChange={(e) => updateField('party_policy_description', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* 5. Visitors */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
            <Users className="w-4 h-4 text-blue-600" />
            5. Visitors Policy
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Day visitors
                </label>
                <select
                  value={rules.visitors_policy || 'Upon Request'}
                  onChange={(e) => updateField('visitors_policy', e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                >
                  <option value="Yes">Allowed</option>
                  <option value="Upon Request">Allowed upon request</option>
                  <option value="No">Not allowed</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Overnight visitors
                </label>
                <select
                  value={rules.overnight_visitors_allowed ? 'Yes' : 'No'}
                  onChange={(e) => updateField('overnight_visitors_allowed', e.target.value === 'Yes')}
                  disabled={disabled}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                >
                  <option value="No">Not allowed</option>
                  <option value="Yes">Allowed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Additional visitor rules (optional)
              </label>
              <input
                type="text"
                maxLength={500}
                placeholder="e.g., Outside visitors must register at reception before 8 PM."
                value={rules.visitor_policy_description || ''}
                onChange={(e) => updateField('visitor_policy_description', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* 6. Quiet Hours */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
            <Moon className="w-4 h-4 text-indigo-500" />
            6. Quiet Hours
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="quiet_hours_enabled"
                checked={!!rules.quiet_hours_enabled}
                onChange={(e) => updateField('quiet_hours_enabled', e.target.checked)}
                disabled={disabled}
                className="w-4 h-4 text-[#087F8C] rounded border-slate-300 focus:ring-[#087F8C]"
              />
              <label htmlFor="quiet_hours_enabled" className="font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                Enable strict quiet hours
              </label>
            </div>

            {rules.quiet_hours_enabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Start time
                  </label>
                  <input
                    type="time"
                    value={rules.quiet_hours_start || '22:00'}
                    onChange={(e) => updateField('quiet_hours_start', e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    End time
                  </label>
                  <input
                    type="time"
                    value={rules.quiet_hours_end || '07:00'}
                    onChange={(e) => updateField('quiet_hours_end', e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 7. Check-in and Check-out */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
            <Clock className="w-4 h-4 text-emerald-600" />
            7. Check-in and Check-out
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Check-in start
                </label>
                <input
                  type="time"
                  value={rules.check_in_start || '14:00'}
                  onChange={(e) => updateField('check_in_start', e.target.value)}
                  disabled={disabled}
                  className="w-full px-2 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Check-in end
                </label>
                <input
                  type="time"
                  value={rules.check_in_end || '22:00'}
                  onChange={(e) => updateField('check_in_end', e.target.value)}
                  disabled={disabled}
                  className="w-full px-2 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Check-out by
                </label>
                <input
                  type="time"
                  value={rules.check_out_time || '11:00'}
                  onChange={(e) => updateField('check_out_time', e.target.value)}
                  disabled={disabled}
                  className="w-full px-2 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Early check-in
                </label>
                <select
                  value={rules.early_checkin_policy || 'Upon Request'}
                  onChange={(e) => updateField('early_checkin_policy', e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                >
                  <option value="Available">Available</option>
                  <option value="Upon Request">Upon request</option>
                  <option value="Not available">Not available</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Late check-out
                </label>
                <select
                  value={rules.late_checkout_policy || 'Upon Request'}
                  onChange={(e) => updateField('late_checkout_policy', e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                >
                  <option value="Available">Available</option>
                  <option value="Upon Request">Upon request</option>
                  <option value="Not available">Not available</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 8. Identification & Safety */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
            <ShieldCheck className="w-4 h-4 text-[#087F8C]" />
            8. Identification & Safety
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Government ID Required
                </label>
                <select
                  value={rules.government_id_required ? 'Yes' : 'No'}
                  onChange={(e) => updateField('government_id_required', e.target.value === 'Yes')}
                  disabled={disabled}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                >
                  <option value="Yes">Yes (Mandatory at check-in)</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Min check-in age
                </label>
                <input
                  type="number"
                  min="18"
                  max="100"
                  placeholder="18"
                  value={rules.minimum_checkin_age || '18'}
                  onChange={(e) => updateField('minimum_checkin_age', e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Additional ID instructions (optional)
              </label>
              <input
                type="text"
                maxLength={500}
                placeholder="e.g., Physical Passport, Driving License, or Aadhaar Card required."
                value={rules.safety_instructions || ''}
                onChange={(e) => updateField('safety_instructions', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 9. Additional Rules Text Area */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <label className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#087F8C]" />
            9. Additional Rules
          </label>
          <span className="text-[11px] text-slate-500 font-mono">
            {(rules.additional_rules || '').length} / 3000 chars
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Add any important property-specific information that Travelers should know before booking.
        </p>

        {/* Examples Pills */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs space-y-1.5 border border-slate-200/70 dark:border-slate-700/60">
          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-[#087F8C]" /> Suggested rules you may include:
          </div>
          <ul className="list-disc pl-4 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
            <li>No loud music after 10 PM.</li>
            <li>Guests must keep the property clean.</li>
            <li>Outside visitors must be registered.</li>
            <li>Guests must follow pool safety instructions.</li>
            <li>Cooking is allowed only in the kitchen.</li>
            <li>Damages caused by guests may result in additional charges.</li>
          </ul>
        </div>

        <textarea
          rows={4}
          maxLength={3000}
          placeholder="e.g., No footwear inside the wooden living room. Swimming pool closes at 8:00 PM. Please separate dry and wet waste."
          value={rules.additional_rules || ''}
          onChange={(e) => updateField('additional_rules', e.target.value)}
          disabled={disabled}
          className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[#087F8C]"
        />

        {/* Lawful Accuracy Warning */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong>Important Notice:</strong> Please provide accurate, clear, and lawful rules. These rules will be shown to Travelers before booking and locked as an immutable snapshot for confirmed reservations.
          </span>
        </div>
      </div>
    </div>
  );
};

export default PropertyHomeRulesForm;
