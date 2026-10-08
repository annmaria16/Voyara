import React, { useState } from 'react';
import {
  MapPin,
  Calendar,
  Users,
  Bed,
  DollarSign,
  SlidersHorizontal,
  Edit2,
  Check,
  X
} from 'lucide-react';

export const ExtractedRequirementsBar = ({
  requirements = {},
  onUpdateRequirement,
  className = ''
}) => {
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');

  const dest = requirements.destination;
  const cIn = requirements.check_in;
  const cOut = requirements.check_out;
  const adults = requirements.adults;
  const children = requirements.children;
  const childAges = requirements.child_ages || [];
  const roomType = requirements.room_type;
  const budget = requirements.budget_max;
  const budgetType = requirements.budget_type;

  const hasAny = Boolean(dest || cIn || adults || roomType || budget);
  if (!hasAny) return null;

  const handleStartEdit = (field, currentVal) => {
    setEditingField(field);
    setEditValue(currentVal || '');
  };

  const handleSaveEdit = () => {
    if (editingField && onUpdateRequirement) {
      onUpdateRequirement(editingField, editValue);
    }
    setEditingField(null);
    setEditValue('');
  };

  return (
    <div className={`bg-slate-50/95 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/90 dark:border-white/10 rounded-2xl p-3.5 shadow-2xs space-y-2 text-xs ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-[#087F8C] dark:text-teal-400 font-extrabold uppercase tracking-wider text-[11px]">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Extracted Journey Requirements</span>
        </div>
        <span className="text-[10px] text-slate-400">Live AI Context</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Destination Pill */}
        {dest && (
          <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-[#087F8C]" />
            <span className="font-bold text-[#17324D] dark:text-white">{dest}</span>
          </div>
        )}

        {/* Dates Pill */}
        {cIn && cOut && (
          <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-[#087F8C]" />
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {cIn} → {cOut}
            </span>
          </div>
        )}

        {/* Guests Pill */}
        {(adults || children > 0) && (
          <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-2xs">
            <Users className="w-3.5 h-3.5 text-[#087F8C]" />
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {adults || 1} Adult{(adults || 1) > 1 ? 's' : ''}
              {children > 0 ? `, ${children} Child${children > 1 ? 'ren' : ''}` : ''}
              {childAges.length > 0 ? ` (age${childAges.length > 1 ? 's' : ''}: ${childAges.join(', ')})` : ''}
            </span>
          </div>
        )}

        {/* Room Type Pill */}
        {roomType && (
          <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-2xs">
            <Bed className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span className="font-semibold text-teal-700 dark:text-teal-300">{roomType}</span>
          </div>
        )}

        {/* Budget Pill */}
        {budget && (
          <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-2xs">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-emerald-700 dark:text-emerald-400">
              Under ₹{Number(budget).toLocaleString('en-IN')}{budgetType === 'PER_NIGHT' ? '/nt' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExtractedRequirementsBar;
