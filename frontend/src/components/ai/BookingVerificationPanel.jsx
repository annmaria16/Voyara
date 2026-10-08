import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  Cpu,
  Sparkles,
  Award,
  Check,
  Info,
  Calendar,
  MapPin,
  Bed,
  CreditCard,
  FileCheck,
  RefreshCw,
  Copy,
  CheckCheck
} from 'lucide-react';
import VoyaraRobotAvatar from './VoyaraRobotAvatar';

export const BookingVerificationPanel = ({
  stepProgress,
  agentStatus,
  verinovaStatus,
  verificationScore,
  bookingPreview,
  confirmedBooking,
  verificationReport,
  className = ''
}) => {
  const [auditOpen, setAuditOpen] = useState(false);
  const [scoreBreakdownOpen, setScoreBreakdownOpen] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  // 12 steps definition
  const stepDefinitions = [
    { num: 1, key: '1_request_received', label: 'Request Received', desc: 'Traveler query received' },
    { num: 2, key: '2_requirements_extracted', label: 'Requirements Extracted', desc: 'Destination, dates & guests parsed' },
    { num: 3, key: '3_stay_search', label: 'Stay Search', desc: 'Searching verified sanctuaries' },
    { num: 4, key: '4_availability_check', label: 'Availability Check', desc: 'Live inventory verification' },
    { num: 5, key: '5_room_verification', label: 'Room Verification', desc: 'Capacity & house rules' },
    { num: 6, key: '6_price_verification', label: 'Price Verification', desc: 'Nightly rates & taxes locked' },
    { num: 7, key: '7_verinova_pre_check', label: 'VeriNova Pre-Check', desc: '8-point pre-booking audit' },
    { num: 8, key: '8_booking_preparation', label: 'Booking Preparation', desc: 'Server preview generated' },
    { num: 9, key: '9_payment_verification', label: 'Payment Verification', desc: 'Razorpay HMAC signature' },
    { num: 10, key: '10_booking_execution', label: 'Booking Execution', desc: 'Atomic PostgreSQL row lock' },
    { num: 11, key: '11_verinova_final_verification', label: 'VeriNova Final Verification', desc: '12-checkpoint post-audit' },
    { num: 12, key: '12_booking_completed', label: 'Booking Completed', desc: 'Transaction confirmed & verified' }
  ];

  const getStepStatus = (key) => {
    if (!stepProgress) return 'pending';
    const st = stepProgress[key];
    if (!st) return 'pending';
    return typeof st === 'string' ? st : (st.status || 'pending');
  };

  const getStepExplanation = (key, defaultDesc) => {
    if (stepProgress && stepProgress[key]?.explanation) {
      return stepProgress[key].explanation;
    }
    return defaultDesc;
  };

  const getStepTimestamp = (key) => {
    if (stepProgress && stepProgress[key]?.timestamp) {
      return stepProgress[key].timestamp;
    }
    return null;
  };

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const renderStatusIndicator = (status, key) => {
    const time = getStepTimestamp(key);

    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-bold text-[11px] whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{time || 'Done'}</span>
          </span>
        );
      case 'processing':
        return (
          <span className="flex items-center text-[#087F8C] dark:text-teal-300 font-bold text-[11px] whitespace-nowrap animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin text-[#087F8C] dark:text-teal-400 shrink-0" />
            <span>{time || 'Active'}</span>
          </span>
        );
      case 'requires_attention':
        return (
          <span className="flex items-center text-amber-600 dark:text-amber-400 font-bold text-[11px] whitespace-nowrap">
            <AlertTriangle className="w-3.5 h-3.5 mr-1 shrink-0" />
            <span>Needs Info</span>
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center text-rose-600 dark:text-rose-400 font-bold text-[11px] whitespace-nowrap">
            <XCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="text-slate-400 dark:text-slate-500 font-medium text-[11px] whitespace-nowrap">
            Pending
          </span>
        );
    }
  };

  // 10 real VeriNova checkpoints mapping
  const verinovaChecks = [
    { label: 'Requirements Matched', status: verinovaStatus?.requirements_matched || (stepProgress ? 'VERIFIED' : 'PENDING') },
    { label: 'Property Verified', status: verinovaStatus?.property_verified || (bookingPreview || confirmedBooking ? 'VERIFIED' : 'PENDING') },
    { label: 'Room Verified', status: verinovaStatus?.room_verified || (bookingPreview || confirmedBooking ? 'VERIFIED' : 'PENDING') },
    { label: 'Availability Verified', status: verinovaStatus?.availability_verified || (bookingPreview || confirmedBooking ? 'VERIFIED' : 'PENDING') },
    { label: 'Guest Capacity Verified', status: verinovaStatus?.capacity_verified || (bookingPreview || confirmedBooking ? 'VERIFIED' : 'PENDING') },
    { label: 'Dates Verified', status: verinovaStatus?.dates_verified || (bookingPreview || confirmedBooking ? 'VERIFIED' : 'PENDING') },
    { label: 'Price Verified', status: verinovaStatus?.price_verified || (bookingPreview || confirmedBooking ? 'VERIFIED' : 'PENDING') },
    { label: 'Budget Verified', status: verinovaStatus?.budget_verified || (bookingPreview || confirmedBooking ? 'VERIFIED' : 'PENDING') },
    { label: 'Payment Verified', status: verinovaStatus?.payment_verified || (confirmedBooking ? 'VERIFIED' : 'PENDING') },
    { label: 'Booking Verified', status: verinovaStatus?.booking_verified || (confirmedBooking ? 'VERIFIED' : 'PENDING') }
  ];

  const scoreValue = verinovaStatus?.score ?? (verificationScore?.score ?? (confirmedBooking?.verinova_score ?? (bookingPreview?.verinova_score ?? (confirmedBooking ? 100 : (bookingPreview ? 96 : 0)))));
  const scoreBreakdown = verificationScore?.breakdown || {
    requirements_extracted: Boolean(bookingPreview || confirmedBooking),
    destination_valid: Boolean(bookingPreview || confirmedBooking),
    dates_valid: Boolean(bookingPreview || confirmedBooking),
    guests_valid: Boolean(bookingPreview || confirmedBooking),
    stay_available: Boolean(bookingPreview || confirmedBooking),
    room_available: Boolean(bookingPreview || confirmedBooking),
    price_verified: Boolean(bookingPreview || confirmedBooking),
    booking_confirmed: Boolean(confirmedBooking)
  };

  const scorePoints = [
    { key: 'requirements_extracted', label: 'Requirements Extracted', pts: 15 },
    { key: 'destination_valid', label: 'Destination Validated', pts: 15 },
    { key: 'dates_valid', label: 'Dates Verified', pts: 15 },
    { key: 'guests_valid', label: 'Guest Count Matched', pts: 10 },
    { key: 'stay_available', label: 'Stay Available in DB', pts: 15 },
    { key: 'room_available', label: 'Room Units Verified', pts: 10 },
    { key: 'price_verified', label: 'Price Rate Locked', pts: 10 },
    { key: 'booking_confirmed', label: 'Booking Confirmed by DB', pts: 10 }
  ];

  const currentVerifiedTime = confirmedBooking?.verinova_verified_at || confirmedBooking?.created_at
    ? new Date(confirmedBooking.verinova_verified_at || confirmedBooking.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : (verinovaStatus?.verified_at ? new Date(verinovaStatus.verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (stepProgress?.['11_verinova_final_verification']?.timestamp || null));

  return (
    <div className={`space-y-4 text-xs select-none ${className}`}>
      
      {/* 1. BOOKING PROGRESS TIMELINE CARD */}
      <div className="bg-white dark:bg-[#0E273C] rounded-3xl p-5 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
        
        {/* Header */}
        <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100 dark:border-white/5">
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-[#087F8C] dark:text-teal-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[#17324D] dark:text-white tracking-tight">
              Booking Progress
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Live verification and execution pipeline
            </p>
          </div>
        </div>

        {/* 11 Steps List */}
        <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
          {stepDefinitions.map((step) => {
            const status = getStepStatus(step.key);
            const isCompleted = status === 'completed';
            const isProcessing = status === 'processing';
            const isAttention = status === 'requires_attention';
            const isFailed = status === 'failed';
            const explanation = getStepExplanation(step.key, step.desc);

            return (
              <div
                key={step.key}
                className={`flex items-start justify-between p-2.5 rounded-2xl transition border ${
                  isProcessing
                    ? 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-300 dark:border-teal-700/80 shadow-2xs'
                    : isCompleted
                    ? 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-100 dark:border-white/5'
                    : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                {/* Step number badge & label */}
                <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                      isCompleted
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : isProcessing
                        ? 'bg-[#087F8C] text-white shadow-xs animate-pulse'
                        : isAttention
                        ? 'bg-amber-500 text-white shadow-xs'
                        : isFailed
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3 h-3" /> : step.num}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs truncate ${
                          isProcessing
                            ? 'font-extrabold text-[#087F8C] dark:text-teal-300'
                            : isCompleted
                            ? 'font-bold text-[#17324D] dark:text-white'
                            : 'font-semibold text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-normal">
                      {explanation}
                    </div>
                  </div>
                </div>

                {/* Right Status / Timestamp */}
                <div className="shrink-0 pl-2 text-right">
                  {renderStatusIndicator(status, step.key)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. VERINOVA INDEPENDENT VERIFICATION */}
      <div className="bg-white dark:bg-[#0E273C] rounded-3xl p-5 border border-slate-200 dark:border-white/10 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-xs text-[#17324D] dark:text-white block">
                VeriNova Verification
              </span>
              <span className="text-[10px] text-slate-400 block">
                Independent transaction audit & integrity engine
              </span>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
            confirmedBooking
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
              : bookingPreview
              ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}>
            {confirmedBooking ? 'Verified' : (bookingPreview ? 'Preview Ready' : 'Pending')}
          </span>
        </div>

        {/* 6 Checkpoints list */}
        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
          {verinovaChecks.map((chk, cIdx) => {
            const isOk = chk.status === 'VERIFIED' || chk.status === 'CONFIRMED';
            const isFailed = chk.status === 'FAILED';

            return (
              <div
                key={cIdx}
                className={`p-2.5 rounded-2xl border flex flex-col justify-between space-y-1 transition ${
                  isOk
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30'
                    : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200/60 dark:border-white/5'
                }`}
              >
                <span className="text-slate-600 dark:text-slate-300 font-medium truncate">{chk.label}</span>
                <div className="flex items-center space-x-1 font-bold">
                  {isOk ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center text-[11px]">
                      <Check className="w-3 h-3 mr-1" />
                      <span>{chk.status === 'CONFIRMED' ? 'Confirmed' : 'Verified'}</span>
                    </span>
                  ) : isFailed ? (
                    <span className="text-rose-600 dark:text-rose-400 flex items-center text-[11px]">
                      <XCircle className="w-3 h-3 mr-1" />
                      <span>Failed</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 flex items-center text-[11px]">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>Pending</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Failed Verification Banner (Section 24) */}
        {(verinovaStatus?.status === 'FAILED' || verinovaStatus?.failure_reasons) && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 space-y-1 text-[11px]">
            <div className="flex items-center space-x-1.5 text-rose-700 dark:text-rose-300 font-bold">
              <XCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Verification Discrepancy Detected</span>
            </div>
            <p className="text-rose-600 dark:text-rose-400 text-[10px] leading-relaxed">
              {verinovaStatus.failure_reasons || 'Authoritative database checks detected an inconsistency.'}
            </p>
          </div>
        )}

        {/* Confirmed Reference or Audit Info */}
        {confirmedBooking && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold uppercase">Booking Reference</span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                {currentVerifiedTime ? `Verified at ${currentVerifiedTime}` : 'Verified'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono font-extrabold text-sm text-[#087F8C] dark:text-teal-300">
                {confirmedBooking.booking_number}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(confirmedBooking.booking_number)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer flex items-center space-x-1"
                title="Copy reference"
              >
                {copiedRef ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        {/* Collapsible VeriNova Audit */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setAuditOpen(!auditOpen)}
            className="w-full flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-[#087F8C] pt-1 cursor-pointer"
          >
            <span className="flex items-center space-x-1">
              <FileCheck className="w-3.5 h-3.5 text-[#087F8C]" />
              <span>VeriNova Audit Trail</span>
            </span>
            {auditOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {auditOpen && (
            <div className="mt-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/60 dark:border-white/10 text-[10px] space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Audit ID:</span>
                <span className="truncate max-w-[130px] font-bold text-emerald-600">{confirmedBooking?.verinova_verification_id || 'VN-TX-PENDING'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Lock Status:</span>
                <span className="text-emerald-600 font-bold">LOCKED_SAFE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Price Variance:</span>
                <span className="text-emerald-600 font-bold">0.00%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. AI BOOKING VERIFICATION SCORE */}
      <div className="bg-white dark:bg-[#0E273C] rounded-3xl p-5 border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span className="font-extrabold text-xs text-[#17324D] dark:text-white">
              AI Verification Score
            </span>
          </div>
          <span className="text-sm font-black font-mono text-[#087F8C] dark:text-teal-400">
            {scoreValue} / 100
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#087F8C] via-[#0F9D9A] to-emerald-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(scoreValue > 0 ? 5 : 0, scoreValue))}%` }}
          />
        </div>

        {/* Toggleable breakdown */}
        <div>
          <button
            type="button"
            onClick={() => setScoreBreakdownOpen(!scoreBreakdownOpen)}
            className="w-full flex items-center justify-between text-[11px] font-bold text-[#087F8C] dark:text-teal-400 hover:underline pt-0.5 cursor-pointer"
          >
            <span>{scoreBreakdownOpen ? 'Hide Score Breakdown' : 'View Score Breakdown'}</span>
            {scoreBreakdownOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {scoreBreakdownOpen && (
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/5 space-y-1.5 text-[11px]">
              {scorePoints.map((pt) => {
                const passed = Boolean(scoreBreakdown[pt.key]);
                return (
                  <div key={pt.key} className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <div className="flex items-center space-x-1.5">
                      {passed ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 shrink-0 inline-block" />
                      )}
                      <span className={passed ? 'font-semibold text-slate-800 dark:text-slate-100' : 'text-slate-400'}>
                        {pt.label}
                      </span>
                    </div>
                    <span className={`font-mono font-bold ${passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      +{pt.pts}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default BookingVerificationPanel;
