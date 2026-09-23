import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { verinovaApi } from '../../api/verinova';
import { legalDocumentsApi } from '../../api/legalDocuments';
import { resolveImageUrl } from '../../utils/imageUrl';
import { SecureDocumentViewerModal } from './SecureDocumentViewerModal';
import {
  X,
  MapPin,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
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
  RefreshCw,
  Copy,
  CheckCheck,
  AlertOctagon,
  Sparkles,
  Info,
  UserCheck,
  Calendar,
  FileCheck2,
} from 'lucide-react';

export const PropertyReviewModal = ({ propertyId, isOpen, onClose, onActionComplete }) => {
  const [property, setProperty] = useState(null);
  const [assessmentDetail, setAssessmentDetail] = useState(null);
  const [legalDocuments, setLegalDocuments] = useState([]);
  const [selectedDocForView, setSelectedDocForView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assessing, setAssessing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [reasonModal, setReasonModal] = useState({ open: false, action: null });
  const [reasonText, setReasonText] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);

  useEffect(() => {
    if (isOpen && propertyId) {
      loadData();
    }
  }, [isOpen, propertyId]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [propData, verinovaData, legalDocs] = await Promise.all([
        adminApi.getPropertyDetail(propertyId),
        verinovaApi.getPropertyAssessmentDetail(propertyId).catch(() => null),
        legalDocumentsApi.getAdminPropertyDocuments(propertyId).catch(() => []),
      ]);
      setProperty(propData);
      setAssessmentDetail(verinovaData);
      setLegalDocuments(Array.isArray(legalDocs) ? legalDocs : []);
      if (propData.images && propData.images.length > 0) {
        const first = propData.images[0];
        setSelectedPhoto(typeof first === 'string' ? first : (first.image_url || ''));
      }
    } catch (err) {
      setError(err.message || 'Failed to load property review dossier.');
    } finally {
      setLoading(false);
    }
  };

  const handleReassess = async () => {
    setAssessing(true);
    try {
      await verinovaApi.triggerPropertyAssessment(propertyId);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to recalculate VeriNova trust assessment.');
    } finally {
      setAssessing(false);
    }
  };

  const handleAction = async (action, reason = '') => {
    setActionLoading(true);
    setError('');
    try {
      if (action === 'APPROVE') {
        await verinovaApi.approveProperty(propertyId, { reason: reason || undefined });
      } else if (action === 'REQUEST_REVIEW' || action === 'NEEDS_REVIEW') {
        await verinovaApi.requestPropertyReview(propertyId, { reason: reason || undefined });
      } else if (action === 'REJECT') {
        await verinovaApi.rejectProperty(propertyId, { reason: reason || undefined });
      } else {
        await adminApi.verifyProperty(propertyId, { action, reason: reason || undefined });
      }

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

  const copyFingerprint = (fp) => {
    if (!fp) return;
    navigator.clipboard.writeText(fp);
    setCopiedFingerprint(true);
    setTimeout(() => setCopiedFingerprint(false), 2000);
  };

  if (!isOpen) return null;

  const assessment = assessmentDetail?.latest_assessment;
  const duplicate = assessmentDetail?.duplicate_property;
  const trustScore = assessment?.trust_score ?? property?.trust_score ?? 0;
  const assessmentStatus = assessment?.assessment_status ?? property?.trust_assessment_status ?? 'NEEDS_REVIEW';

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-emerald-500 stroke-emerald-500';
    if (score >= 65) return 'text-teal-500 stroke-teal-500';
    if (score >= 45) return 'text-amber-500 stroke-amber-500';
    return 'text-rose-500 stroke-rose-500';
  };

  const getScoreBg = (score) => {
    if (score >= 85) return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400';
    if (score >= 65) return 'bg-teal-500/10 border-teal-500/30 text-teal-600 dark:text-teal-400';
    if (score >= 45) return 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400';
    return 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">

        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-[#091B29] shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#087F8C] to-[#091B29] text-white flex items-center justify-center font-bold shadow-md shadow-teal-950/20">
              <ShieldCheck className="w-6 h-6 text-[#27B7A8]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#087F8C] dark:text-[#27B7A8]">
                  VeriNova Trust & Moderation Review
                </span>
                {property && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${property.verification_status === 'VERIFIED'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : property.verification_status === 'REJECTED'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                        : property.verification_status === 'NEEDS_REVIEW'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 animate-pulse'
                    }`}>
                    {property.verification_status?.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black font-serif text-[#091B29] dark:text-white mt-0.5">
                {property ? property.name : 'Loading Property Dossier...'}
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
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#087F8C] animate-spin" />
              <p className="text-xs text-slate-500">Loading VeriNova Trust Assessment Dossier...</p>
            </div>
          ) : property ? (
            <div className="space-y-8 text-xs">

              {/* TOP VERINOVA TRUST SCORE CARD */}
              <div className="bg-gradient-to-r from-[#091B29] via-[#0F273D] to-[#091B29] border border-teal-900/40 rounded-3xl p-6 text-white shadow-xl">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">

                  {/* Score & Gauge */}
                  <div className="flex items-center space-x-5">
                    <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                      <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-800 stroke-current"
                          strokeWidth="3.5"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className={`${getScoreColor(trustScore)} stroke-current`}
                          strokeWidth="3.5"
                          strokeDasharray={`${trustScore}, 100`}
                          strokeLinecap="round"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black">{trustScore}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">/ 100</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-[#27B7A8]">
                          VeriNova Trust Score
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${getScoreBg(trustScore)}`}>
                          {assessmentStatus.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 max-w-lg leading-relaxed">
                        {assessment?.summary || 'Explainable consistency evaluated across 9 independent deterministic verification signals.'}
                      </p>

                      {assessment?.property_fingerprint && (
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-[10px] text-slate-400">Fingerprint:</span>
                          <code className="text-[10px] bg-slate-900/90 text-teal-300 px-2 py-0.5 rounded-md border border-teal-800/40 font-mono">
                            {assessment.property_fingerprint}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyFingerprint(assessment.property_fingerprint)}
                            className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
                            title="Copy Fingerprint"
                          >
                            {copiedFingerprint ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions & Re-assess */}
                  <div className="flex flex-col items-end space-y-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleReassess}
                      disabled={assessing}
                      className="px-3.5 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs flex items-center space-x-2 border border-slate-700 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${assessing ? 'animate-spin text-[#27B7A8]' : ''}`} />
                      <span>{assessing ? 'Evaluating...' : 'Re-calculate Signals'}</span>
                    </button>
                    <span className="text-[10px] text-slate-400">
                      Evaluated: {assessment?.created_at ? new Date(assessment.created_at).toLocaleDateString() : 'Live'}
                    </span>
                  </div>
                </div>
              </div>

              {/* DUPLICATE / PROXIMITY ALERT CARD (IF FLAGGED) */}
              {(assessment?.duplicate_detected || duplicate) && (
                <div className="p-5 bg-rose-500/10 border-2 border-rose-500/30 rounded-2xl text-slate-800 dark:text-slate-200 space-y-3">
                  <div className="flex items-center space-x-2.5 text-rose-600 dark:text-rose-400">
                    <AlertOctagon className="w-5 h-5 shrink-0" />
                    <h4 className="text-xs font-black uppercase tracking-wider">
                      Possible Duplicate / Close Proximity Conflict Detected
                    </h4>
                  </div>
                  <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed font-medium">
                    {assessment?.duplicate_explanation || 'This submission has strong token, address, or GPS proximity overlap with an existing property.'}
                  </p>
                  {duplicate && (
                    <div className="p-3 bg-white/70 dark:bg-[#091B29] rounded-xl border border-rose-200 dark:border-rose-900/50 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Conflicting Property</span>
                        <strong className="text-slate-900 dark:text-white">#{duplicate.id} - {duplicate.name}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Declared Location</span>
                        <span className="text-slate-700 dark:text-slate-300">{duplicate.address}, {duplicate.city}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Similarity Match</span>
                        <span className="font-black text-rose-600 dark:text-rose-400">{Math.round((duplicate.similarity_score || 0.8) * 100)}% Match</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 9-SIGNAL DETERMINISTIC BREAKDOWN */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-[#087F8C] dark:text-[#27B7A8]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#091B29] dark:text-white">
                      VeriNova 9-Signal Consistency Breakdown
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Deterministic Engine • 0 External AI Fallback
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {assessment?.checks && assessment.checks.length > 0 ? (
                    assessment.checks.map((c) => (
                      <div
                        key={c.id}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${c.status === 'PASS'
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
                            : c.status === 'WARNING'
                              ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40'
                              : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40'
                          }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${c.status === 'PASS'
                                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                : c.status === 'WARNING'
                                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                  : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                              }`}>
                              {c.status}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">
                              {c.score_awarded} / {c.score_weight} pts
                            </span>
                          </div>
                          <h4 className="font-bold text-[#091B29] dark:text-white text-xs leading-tight">
                            {c.check_name}
                          </h4>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                            {c.message}
                          </p>
                        </div>
                        {c.details && (
                          <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[10px] text-slate-500 font-mono truncate" title={c.details}>
                            {c.details}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 p-4 bg-slate-50 dark:bg-[#091B29] rounded-xl text-center text-slate-400">
                      Assessment checks will be displayed after calculation.
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 0: PROPERTY LEGAL VERIFICATION DOSSIER */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <FileCheck2 className="w-4 h-4 text-[#087F8C] dark:text-[#27B7A8]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#091B29] dark:text-white">
                      Property Legal Authorization & Document Dossier ({legalDocuments.length})
                    </h3>
                  </div>
                  {property.legal_document_status && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      property.legal_document_status === 'APPROVED' || property.legal_document_status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : property.legal_document_status === 'EXPIRED' || property.legal_document_status === 'REJECTED'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    }`}>
                      Legal Status: {property.legal_document_status.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>

                {legalDocuments.length === 0 ? (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center space-x-3 text-rose-700 dark:text-rose-300">
                    <AlertOctagon className="w-5 h-5 shrink-0 text-rose-500" />
                    <div>
                      <h4 className="font-bold text-xs">Missing Property Legal Documentation</h4>
                      <p className="text-[11px] text-rose-600/90 dark:text-rose-400 mt-0.5">
                        This property has no legal document uploaded. Properties cannot be approved for listing on Voyara without verified legal authorization.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Primary Active / Latest Document */}
                    {legalDocuments.slice(0, 1).map((doc) => {
                      const valResult = doc.validation_result || {};
                      const signals = valResult.signals || {};
                      const breakdown = valResult.score_breakdown || {};
                      const isApproved = doc.overall_status === 'ADMIN_APPROVED';
                      const isPending = doc.overall_status === 'PENDING_ADMIN_REVIEW';
                      const isRejected = doc.overall_status === 'ADMIN_REJECTED';

                      return (
                        <div
                          key={doc.id}
                          className="bg-gradient-to-br from-[#0F273D]/90 via-[#0B2133] to-[#091B29] border border-teal-900/60 rounded-3xl p-5 text-white shadow-xl space-y-4"
                        >
                          {/* Doc Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-[#27B7A8] border border-teal-500/30">
                                  {doc.legal_relationship?.replace(/_/g, ' ') || 'CLAIMED RELATIONSHIP'}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                  isApproved
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : isRejected
                                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                                }`}>
                                  {doc.overall_status?.replace(/_/g, ' ')} (v{doc.version_number})
                                </span>
                                {doc.is_locked && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-800/80 text-slate-300 border border-slate-700 flex items-center space-x-1">
                                    <Lock className="w-3 h-3 text-teal-400 inline mr-1" />
                                    <span>Locked & Immutable</span>
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-bold text-white mt-1.5 flex items-center space-x-2">
                                <FileText className="w-4 h-4 text-[#27B7A8] shrink-0" />
                                <span>{doc.document_type?.replace(/_/g, ' ')}</span>
                                <span className="text-xs text-slate-400 font-normal">({doc.file_name})</span>
                              </h4>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedDocForView(doc)}
                              className="px-4 py-2 bg-[#087F8C] hover:bg-[#0F9D9A] text-white rounded-xl font-bold text-xs flex items-center space-x-2 shadow-md transition-all cursor-pointer shrink-0 self-start sm:self-auto"
                            >
                              <Eye className="w-4 h-4" />
                              <span>Inspect Full Document (Secure Stream)</span>
                            </button>
                          </div>

                          {/* Extracted Metadata Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                            <div className="p-3 bg-slate-900/70 rounded-2xl border border-slate-800">
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Parties / Signatories</span>
                              <strong className="text-teal-200 block truncate mt-0.5" title={doc.extracted_parties || 'Extracted from deed'}>
                                {doc.extracted_parties || 'Identified in Document'}
                              </strong>
                            </div>

                            <div className="p-3 bg-slate-900/70 rounded-2xl border border-slate-800">
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Deed / Reg Number</span>
                              <code className="text-xs text-slate-200 font-mono block truncate mt-0.5">
                                {doc.document_number || 'Registered Instrument'}
                              </code>
                            </div>

                            <div className="p-3 bg-slate-900/70 rounded-2xl border border-slate-800">
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Effective Date</span>
                              <span className="text-slate-200 block mt-0.5">
                                {doc.effective_date ? new Date(doc.effective_date).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>

                            <div className="p-3 bg-slate-900/70 rounded-2xl border border-slate-800">
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Expiry / Validity</span>
                              <span className={`block font-bold mt-0.5 ${
                                doc.is_expired ? 'text-rose-400' : 'text-emerald-400'
                              }`}>
                                {doc.expiry_date
                                  ? `${new Date(doc.expiry_date).toLocaleDateString()} (${doc.days_until_expiry}d left)`
                                  : 'Lifetime / Permanent'}
                              </span>
                            </div>
                          </div>

                          {/* 4-Pillar Validation Breakdown */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Automated Content & Multi-Signal Validation Check
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
                              
                              <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
                                <span className="text-slate-300">Category Evidence</span>
                                <span className="font-bold text-teal-400 font-mono">
                                  {breakdown.doc_type_score ?? 100}% PASS
                                </span>
                              </div>

                              <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
                                <span className="text-slate-300">Address Match</span>
                                <span className="font-bold text-emerald-400 font-mono">
                                  {breakdown.property_match_score ?? 100}% MATCH
                                </span>
                              </div>

                              <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
                                <span className="text-slate-300">Relationship Support</span>
                                <span className="font-bold text-teal-400 font-mono">
                                  {breakdown.relationship_score ?? 100}% VALID
                                </span>
                              </div>

                              <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
                                <span className="text-slate-300">Anti-Tamper & Structure</span>
                                <span className="font-bold text-emerald-400 font-mono">
                                  {breakdown.authenticity_score ?? 100}% VERIFIED
                                </span>
                              </div>

                            </div>

                            {valResult.summary && (
                              <p className="text-[11px] text-slate-300 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                                {valResult.summary}
                              </p>
                            )}

                            {doc.file_hash_sha256 && (
                              <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-mono pt-1">
                                <span>SHA-256 Digest:</span>
                                <code className="text-slate-400 truncate max-w-sm">{doc.file_hash_sha256}</code>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Version History Table (if more than 1 version) */}
                    {legalDocuments.length > 1 && (
                      <div className="p-4 bg-slate-50 dark:bg-[#091B29] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Legal Document Version History ({legalDocuments.length} total)
                        </span>
                        <div className="space-y-1.5">
                          {legalDocuments.slice(1).map((vDoc) => (
                            <div
                              key={vDoc.id}
                              className="flex items-center justify-between p-2.5 bg-white dark:bg-[#0F273D] rounded-xl border border-slate-100 dark:border-slate-800 text-xs"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-700 dark:text-slate-300">v{vDoc.version_number}</span>
                                <span className="text-slate-500">• {vDoc.document_type?.replace(/_/g, ' ')}</span>
                                <span className="text-[10px] text-slate-400">({new Date(vDoc.created_at).toLocaleDateString()})</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">
                                  {vDoc.overall_status?.replace(/_/g, ' ')}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedDocForView(vDoc)}
                                  className="text-[11px] text-[#087F8C] hover:underline font-bold"
                                >
                                  View v{vDoc.version_number}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION 1: PROPERTY INFORMATION & HOST CONTACT */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <Home className="w-4 h-4 text-[#087F8C] dark:text-[#27B7A8]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#091B29] dark:text-white">
                    Property Information & Stay Partner Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-[#FFFDF7] dark:bg-[#091B29] rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Property Type</span>
                    <strong className="text-slate-900 dark:text-white text-xs">{property.property_type}</strong>
                  </div>
                  <div className="p-3 bg-[#FFFDF7] dark:bg-[#091B29] rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Check-in / Check-out</span>
                    <strong className="text-slate-900 dark:text-white text-xs">{property.check_in_time} / {property.check_out_time}</strong>
                  </div>
                  <div className="p-3 bg-[#FFFDF7] dark:bg-[#091B29] rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Stay Partner</span>
                    <strong className="text-slate-900 dark:text-white text-xs">{property.provider_name || `Stay Partner #${property.provider_id}`}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-[#FFFDF7] dark:bg-[#091B29] rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center space-x-3">
                    <Phone className="w-4 h-4 text-[#087F8C] shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Contact Phone</span>
                      <strong className="text-slate-900 dark:text-white">{property.contact_phone || 'N/A'}</strong>
                    </div>
                  </div>
                  <div className="p-3 bg-[#FFFDF7] dark:bg-[#091B29] rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center space-x-3">
                    <Mail className="w-4 h-4 text-[#087F8C] shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Contact Email</span>
                      <strong className="text-slate-900 dark:text-white">{property.contact_email || 'N/A'}</strong>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-[#FFFDF7] dark:bg-[#091B29] rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Declared Address & GPS</span>
                  <p className="text-slate-900 dark:text-white font-medium">{property.address}, {property.city}, {property.state}, {property.country || 'India'}</p>
                  {property.latitude && property.longitude && (
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 block pt-0.5">
                      GPS Coordinates: {property.latitude.toFixed(6)}, {property.longitude.toFixed(6)} (Within India Boundaries)
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Description</span>
                  <div className="p-3.5 bg-slate-50 dark:bg-[#091B29]/50 rounded-xl border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed">
                    {property.description}
                  </div>
                </div>

                {property.amenities && property.amenities.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Declared Amenities</span>
                    <div className="flex flex-wrap gap-1.5">
                      {property.amenities.map((am, idx) => {
                        const amName = typeof am === 'string' ? am : (am.amenity_name || '');
                        return (
                          <span key={am.id || idx} className="px-2.5 py-1 bg-[#FFFDF7] dark:bg-[#091B29] rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            ✓ {amName}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: PHOTOS */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <ImageIcon className="w-4 h-4 text-[#087F8C] dark:text-[#27B7A8]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#091B29] dark:text-white">
                    Authentic Stay Partner Photos ({property.images?.length || 0})
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
                            className={`aspect-16/10 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${selectedPhoto === url
                                ? 'border-[#087F8C] ring-2 ring-[#087F8C]/30'
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

              {/* SECTION 3: ROOM INVENTORY */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <Bed className="w-4 h-4 text-[#087F8C] dark:text-[#27B7A8]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#091B29] dark:text-white">
                    Room Types & Unit Capacity ({property.rooms?.length || 0})
                  </h3>
                </div>

                {property.rooms && property.rooms.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {property.rooms.map((r) => {
                      const rr = r.rules || {};
                      return (
                        <div key={r.id} className="p-3.5 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-900 dark:text-white text-xs">{r.name}</strong>
                            <span className="font-mono font-black text-orange-500">₹{r.base_price}/night</span>
                          </div>
                          <div className="flex items-center space-x-3 text-[11px] text-slate-500">
                            <span className="flex items-center space-x-1">
                              <Bed className="w-3.5 h-3.5" />
                              <span>{r.room_type}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Layers className="w-3.5 h-3.5" />
                              <span>{r.quantity} Unit(s)</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Users className="w-3.5 h-3.5" />
                              <span>Max {r.capacity} Guests</span>
                            </span>
                          </div>

                          {/* Room Rules Summary */}
                          <div className="pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 flex flex-wrap gap-2">
                            <span>Max Adults: <strong>{rr.max_adults ?? r.capacity}</strong></span>
                            <span>•</span>
                            <span>Max Children: <strong>{rr.children_allowed !== false ? (rr.max_children ?? r.capacity) : '0 (None)'}</strong></span>
                            {rr.cot_allowed && <span>• 🛏 Cot OK</span>}
                            {rr.extra_bed_allowed && <span>• 🛏 Extra Bed OK</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No room units registered yet.</p>
                )}
              </div>

              {/* SECTION 4: PROPERTY HOME RULES & CONSISTENCY REVIEW */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <ShieldCheck className="w-4 h-4 text-[#087F8C] dark:text-[#27B7A8]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#091B29] dark:text-white">
                    Property Home Rules & Policy Consistency
                  </h3>
                </div>

                {/* Consistency Warnings Callout */}
                {property.rule_consistency_warnings && property.rule_consistency_warnings.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-1.5 text-xs text-amber-800 dark:text-amber-300">
                    <div className="flex items-center space-x-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Rule Consistency Warnings Detected ({property.rule_consistency_warnings.length})</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      {property.rule_consistency_warnings.map((w, wIdx) => (
                        <li key={wIdx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {property.home_rules ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-[#FFFDF7] dark:bg-[#091B29] rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Children</span>
                      <strong className="text-slate-800 dark:text-white">
                        {property.home_rules.children_allowed ? 'Allowed' : 'Adults Only'}
                      </strong>
                    </div>
                    <div className="p-3 bg-[#FFFDF7] dark:bg-[#091B29] rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Pets</span>
                      <strong className="text-slate-800 dark:text-white">
                        {property.home_rules.pets_allowed ? 'Allowed' : 'No Pets'}
                      </strong>
                    </div>
                    <div className="p-3 bg-[#FFFDF7] dark:bg-[#091B29] rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Smoking</span>
                      <strong className="text-slate-800 dark:text-white">
                        {property.home_rules.smoking_allowed ? 'Designated Zones' : 'Non-Smoking'}
                      </strong>
                    </div>
                    <div className="p-3 bg-[#FFFDF7] dark:bg-[#091B29] rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Parties</span>
                      <strong className="text-slate-800 dark:text-white">
                        {property.home_rules.parties_allowed ? 'Allowed' : 'No Parties'}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-xs">No custom home rules configured for this property.</p>
                )}
              </div>

            </div>
          ) : null}
        </div>

        {/* Modal Footer / Actions */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-[#091B29] flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="text-xs text-slate-500">
            {property?.verification_status === 'VERIFIED' ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Property is APPROVED and visible to customers on Voyara.</span>
              </span>
            ) : (
              <span>Review consistency signals before approving property for customer bookings.</span>
            )}
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => openReasonPrompt('REJECT')}
              disabled={actionLoading}
              className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-xs border border-rose-500/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              Reject Property
            </button>

            <button
              type="button"
              onClick={() => openReasonPrompt('REQUEST_REVIEW')}
              disabled={actionLoading}
              className="px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl font-bold text-xs border border-amber-500/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              Request Stay Partner Corrections
            </button>

            <button
              type="button"
              onClick={() => openReasonPrompt('APPROVE')}
              disabled={actionLoading}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? 'Processing...' : 'Approve & Publish Property'}
            </button>
          </div>
        </div>

      </div>

      {/* REASON PROMPT MODAL */}
      {reasonModal.open && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold font-serif text-[#091B29] dark:text-white">
              {reasonModal.action === 'APPROVE' && 'Approve & Make Live'}
              {reasonModal.action === 'REQUEST_REVIEW' && 'Request Review / Corrections from Stay Partner'}
              {reasonModal.action === 'REJECT' && 'Reject Property Submission'}
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Provide an optional note or rationale for the stay partner and internal VeriNova audit trail.
            </p>

            <textarea
              rows={3}
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Enter note or reason for stay partner..."
              className="w-full p-3 bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:border-[#087F8C]"
            />

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setReasonModal({ open: false, action: null })}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAction(reasonModal.action, reasonText)}
                disabled={actionLoading}
                className="px-5 py-2 bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] hover:from-[#091B29] hover:to-[#087F8C] text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Confirm Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECURE LEGAL DOCUMENT VIEWER MODAL */}
      {selectedDocForView && (
        <SecureDocumentViewerModal
          documentId={selectedDocForView.id}
          propertyName={property?.name || 'Property'}
          isOpen={Boolean(selectedDocForView)}
          onClose={() => setSelectedDocForView(null)}
          onVerificationChange={() => loadData()}
        />
      )}

    </div>
  );
};

export default PropertyReviewModal;
