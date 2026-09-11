import React, { useState, useEffect } from 'react';
import { verinovaApi } from '../../api/verinova';
import { PropertyReviewModal } from '../../components/admin/PropertyReviewModal';
import {
  ShieldCheck,
  Filter,
  AlertCircle,
  Calendar,
  Users,
  Home,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  RefreshCw,
  Eye,
  FileText,
  Clock,
  Layers,
  Sparkles,
  AlertOctagon,
  CheckCheck,
  Building,
  ArrowUpRight,
  TrendingUp,
  Database,
  Lock,
  Activity,
  History
} from 'lucide-react';

export const VerificationCenter = () => {
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [overview, setOverview] = useState(null);
  const [properties, setProperties] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [reassessingId, setReassessingId] = useState(null);

  const fetchOverview = async () => {
    try {
      const data = await verinovaApi.getOverview();
      setOverview(data);
    } catch (err) {
      console.error('Error loading VeriNova overview:', err);
    }
  };

  const fetchProperties = async () => {
    try {
      const params = {};
      if (statusFilter !== 'ALL' && activeTab === 'PROPERTY_ASSESSMENTS') {
        params.assessment_status = statusFilter;
      }
      const data = await verinovaApi.getPropertyAssessments(params);
      setProperties(data);
    } catch (err) {
      console.error('Error loading properties:', err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const data = await verinovaApi.getVerifiedTransactions(50);
      setTransactions(data);
    } catch (err) {
      console.error('Error loading transactions:', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const data = await verinovaApi.getAuditLogs({ limit: 100 });
      setAuditLogs(data);
    } catch (err) {
      console.error('Error loading audit logs:', err);
    }
  };

  const reloadAll = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([
        fetchOverview(),
        fetchProperties(),
        fetchTransactions(),
        fetchAuditLogs()
      ]);
    } catch (err) {
      setError(err.message || 'Failed to load VeriNova verification data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadAll();
  }, []);

  useEffect(() => {
    if (activeTab === 'PROPERTY_ASSESSMENTS') {
      fetchProperties();
    }
  }, [statusFilter]);

  const handleReassessProperty = async (e, propertyId) => {
    e.stopPropagation();
    setReassessingId(propertyId);
    try {
      await verinovaApi.triggerPropertyAssessment(propertyId);
      await Promise.all([fetchOverview(), fetchProperties(), fetchAuditLogs()]);
    } catch (err) {
      setError(err.message || 'Failed to re-assess property.');
    } finally {
      setReassessingId(null);
    }
  };

  const openReview = (propertyId) => {
    setSelectedPropertyId(propertyId);
    setReviewModalOpen(true);
  };

  const getScoreBadge = (score) => {
    if (score >= 85) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    if (score >= 65) return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30';
    if (score >= 45) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
  };

  const filteredProperties = properties.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.property_name?.toLowerCase().includes(term) ||
      p.host_name?.toLowerCase().includes(term) ||
      p.assessment_id?.toLowerCase().includes(term) ||
      p.property_fingerprint?.toLowerCase().includes(term)
    );
  });

  const needsReviewList = properties.filter(
    (p) => p.assessment_status === 'NEEDS_REVIEW' || p.assessment_status === 'HIGH_RISK_INCONSISTENT' || p.duplicate_detected || p.admin_decision === 'NEEDS_REVIEW' || p.admin_decision === 'PENDING_VERIFICATION'
  );

  const duplicatesList = properties.filter((p) => p.duplicate_detected);

  const filteredTransactions = transactions.filter((t) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.booking_code?.toLowerCase().includes(term) ||
      t.customer_name?.toLowerCase().includes(term) ||
      t.property_name?.toLowerCase().includes(term) ||
      t.verinova_verification_id?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#091B29] via-[#0F273D] to-[#091B29] border border-teal-900/40 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 bg-gradient-to-br from-[#087F8C] to-[#091B29] rounded-2xl border border-teal-500/30 text-[#27B7A8] shrink-0 shadow-lg shadow-teal-950/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black uppercase tracking-widest text-[#27B7A8]">
                VeriNova Integrity Engine
              </span>
              <span className="text-[10px] bg-white/10 px-2.5 py-0.5 rounded-full text-slate-300 font-bold border border-white/10">
                Live Trust & Transaction Layer
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-serif text-white mt-1">
              Trust & Transaction Integrity Center
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed font-light">
              An explainable trust and transaction-integrity framework evaluating independent signals,
              consistency relationships, and zero double-booking concurrency locks.
            </p>
          </div>
        </div>

        <button
          onClick={reloadAll}
          disabled={loading}
          className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center space-x-2 border border-slate-700 transition-all cursor-pointer shadow-xs shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#27B7A8]' : ''}`} />
          <span>Refresh All Signals</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TABS NAVIGATION */}
      <div className="bg-white dark:bg-[#0F273D] rounded-2xl p-2 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center space-x-1 overflow-x-auto custom-scrollbar">
        {[
          { id: 'OVERVIEW', label: 'Overview & Metrics', icon: Activity },
          { id: 'PROPERTY_ASSESSMENTS', label: `Property Assessments (${properties.length})`, icon: Building },
          { id: 'TRANSACTIONS', label: `Transaction Verifications (${transactions.length})`, icon: CheckCheck },
          { id: 'NEEDS_REVIEW', label: `Needs Review (${needsReviewList.length})`, icon: AlertTriangle },
          { id: 'DUPLICATES', label: `Duplicate Signals (${duplicatesList.length})`, icon: AlertOctagon },
          { id: 'AUDIT_LOGS', label: `Audit Trail (${auditLogs.length})`, icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-2 ${
                isActive
                  ? 'bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] text-white shadow-md shadow-teal-900/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-[#FFFDF7] dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & METRICS */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-8">
          {/* Top Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Properties Evaluated
                </span>
                <strong className="text-2xl font-black text-[#091B29] dark:text-white mt-1 block">
                  {overview?.total_properties_assessed ?? properties.length}
                </strong>
                <span className="text-[11px] text-[#087F8C] dark:text-[#27B7A8] font-semibold mt-0.5 block">
                  Avg Trust Score: {overview?.avg_trust_score ?? 0}/100
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#087F8C]/10 text-[#087F8C] dark:text-[#27B7A8] flex items-center justify-center">
                <Building className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  High & Good Consistency
                </span>
                <strong className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {(overview?.high_consistency_count ?? 0) + (overview?.good_consistency_count ?? 0)}
                </strong>
                <span className="text-[11px] text-slate-500 font-semibold mt-0.5 block">
                  Passing 9-signal baseline
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Needs Review / Flagged
                </span>
                <strong className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
                  {(overview?.needs_review_count ?? 0) + (overview?.potential_duplicates_count ?? 0)}
                </strong>
                <span className="text-[11px] text-rose-500 font-semibold mt-0.5 block">
                  {overview?.potential_duplicates_count ?? 0} duplicate alerts
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Transactions Verified
                </span>
                <strong className="text-2xl font-black text-[#087F8C] dark:text-[#27B7A8] mt-1 block">
                  {overview?.total_transactions_verified ?? transactions.length}
                </strong>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block">
                  100% Zero Double-Booking Lock
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-[#087F8C] dark:text-[#27B7A8] flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Framework Architecture Explainer */}
          <div className="p-6 bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-[#087F8C] dark:text-[#27B7A8]" />
              <h3 className="text-sm font-black text-[#091B29] dark:text-white uppercase tracking-wider">
                VeriNova Dual Architecture Positioning
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-5 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-[#087F8C] dark:text-[#27B7A8]">
                  <Building className="w-4 h-4 font-bold" />
                  <strong className="font-bold text-xs uppercase tracking-wider">
                    Engine 1: Property Trust Assessment (Pre-Approval)
                  </strong>
                </div>
                <p className="leading-relaxed text-[11px]">
                  Evaluates 9 deterministic signals: Stay Partner account status, listing completeness, sovereign India boundary checks, postal pincode consistency, GPS-to-address correlation, canonical identity fingerprinting (<code>VN-PROP-FP-XXXXXXXX</code>), supporting evidence inspection, photo availability, and duplicate anomaly detection.
                </p>
                <div className="text-[10px] text-slate-500 font-mono">
                  • 0-100 Explainable Trust Score • Fingerprint Mutation Detection
                </div>
              </div>

              <div className="p-5 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-orange-500">
                  <Lock className="w-4 h-4 font-bold" />
                  <strong className="font-bold text-xs uppercase tracking-wider">
                    Engine 2: Booking Transaction Integrity (Pre-Payment & Confirmation)
                  </strong>
                </div>
                <p className="leading-relaxed text-[11px]">
                  Executes 27 database integrity verifications: PostgreSQL row-level locks (<code>with_for_update</code>) preventing double-booking race conditions, stay window date logical validation, stay+experience schedule synchronization, authoritative backend rate recalculation, and unique <code>VN-TX-XXXXXXXX</code> verification tokens.
                </p>
                <div className="text-[10px] text-slate-500 font-mono">
                  • Row-Level Concurrency Protection • Real-Time Re-Verification
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROPERTY TRUST ASSESSMENTS */}
      {activeTab === 'PROPERTY_ASSESSMENTS' && (
        <div className="space-y-6">
          {/* Filter and Search */}
          <div className="bg-white dark:bg-[#0F273D] rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 custom-scrollbar">
              {['ALL', 'HIGH_CONSISTENCY', 'GOOD_CONSISTENCY', 'NEEDS_REVIEW', 'HIGH_RISK_INCONSISTENT'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] text-white shadow-xs'
                      : 'bg-[#FFFDF7] dark:bg-[#091B29] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700'
                  }`}
                >
                  {st === 'ALL' ? 'All Assessments' : st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            <div className="relative sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search property, host, fingerprint..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:border-[#087F8C]"
              />
            </div>
          </div>

          {/* Properties Table */}
          <div className="bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#091B29]/60 border-b border-slate-200/80 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <tr>
                    <th className="p-4">Property & ID</th>
                    <th className="p-4">Stay Partner</th>
                    <th className="p-4">Trust Score</th>
                    <th className="p-4">Consistency Status</th>
                    <th className="p-4">Supporting Evidence</th>
                    <th className="p-4">Duplicate / Flags</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredProperties.length > 0 ? (
                    filteredProperties.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-4">
                          <strong className="font-bold text-[#091B29] dark:text-white block text-sm">
                            {p.property_name}
                          </strong>
                          <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                            <span className="font-mono text-[#087F8C] dark:text-[#27B7A8] font-bold">{p.assessment_id}</span>
                            <span>•</span>
                            <span>ID #{p.property_id}</span>
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block">{p.host_name}</span>
                          <span className="text-[10px] text-slate-400 block">{p.host_email}</span>
                        </td>

                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${getScoreBadge(p.trust_score)}`}>
                            {p.trust_score} / 100
                          </span>
                        </td>

                        <td className="p-4">
                          <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300 block">
                            {p.assessment_status.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Pincode: {p.pincode_status}
                          </span>
                        </td>

                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            p.evidence_status === 'ACCEPTED_AS_SUPPORTING_EVIDENCE'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : p.evidence_status === 'REVIEW_REQUIRED'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            {p.evidence_status.replace(/_/g, ' ')}
                          </span>
                        </td>

                        <td className="p-4">
                          {p.duplicate_detected ? (
                            <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold rounded-md border border-rose-500/20 flex items-center space-x-1 w-fit">
                              <AlertOctagon className="w-3 h-3" />
                              <span>Duplicate Alert</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Clean Listing</span>
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              type="button"
                              onClick={(e) => handleReassessProperty(e, p.property_id)}
                              disabled={reassessingId === p.property_id}
                              title="Re-run 9-signal engine"
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${reassessingId === p.property_id ? 'animate-spin text-[#087F8C]' : ''}`} />
                            </button>

                            <button
                              type="button"
                              onClick={() => openReview(p.property_id)}
                              className="px-3.5 py-1.5 bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] hover:from-[#091B29] hover:to-[#087F8C] text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Inspect Dossier</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400 italic">
                        No property trust assessments matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TRANSACTION VERIFICATIONS */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0F273D] rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search booking #, VN-TX ID, guest, property..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:border-[#087F8C]"
              />
            </div>
            <span className="text-xs text-slate-400">
              Showing latest {filteredTransactions.length} verified customer transactions
            </span>
          </div>

          <div className="bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#091B29]/60 border-b border-slate-200/80 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <tr>
                    <th className="p-4">Verification ID & Booking</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Stay & Experience</th>
                    <th className="p-4">Dates</th>
                    <th className="p-4">Amount & Status</th>
                    <th className="p-4">Integrity Checks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((tx) => (
                      <tr key={tx.booking_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-4">
                          <code className="text-xs font-mono font-black text-[#087F8C] dark:text-[#27B7A8] bg-[#087F8C]/10 px-2 py-0.5 rounded-md border border-[#087F8C]/20 block w-fit">
                            {tx.verinova_verification_id}
                          </code>
                          <span className="text-[10px] text-slate-400 font-bold block mt-1">
                            Booking #{tx.booking_code}
                          </span>
                        </td>

                        <td className="p-4">
                          <strong className="text-[#091B29] dark:text-white block">{tx.customer_name}</strong>
                          <span className="text-[10px] text-slate-400 block">{tx.customer_email || 'N/A'}</span>
                        </td>

                        <td className="p-4">
                          <strong className="text-[#091B29] dark:text-white block">{tx.property_name}</strong>
                          <span className="text-[10px] text-slate-500 block">{tx.room_name || 'Room Stay'}</span>
                          {tx.experience_name && (
                            <span className="text-[10px] text-orange-500 font-semibold block">
                              + {tx.experience_name}
                            </span>
                          )}
                        </td>

                        <td className="p-4">
                          <span className="text-slate-700 dark:text-slate-300 block">{tx.check_in_date}</span>
                          <span className="text-[10px] text-slate-400 block">to {tx.check_out_date}</span>
                        </td>

                        <td className="p-4">
                          <strong className="font-mono font-black text-orange-500 block text-sm">
                            ₹{tx.total_price.toLocaleString('en-IN')}
                          </strong>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                            tx.payment_status === 'PAID' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                          }`}>
                            {tx.payment_status}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="space-y-1">
                            {tx.integrity_checks?.map((chk, idx) => (
                              <div key={idx} className="flex items-center space-x-1.5 text-[10px]">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span className="text-slate-600 dark:text-slate-400">{chk.name}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-slate-400 italic">
                        No transactions recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: NEEDS REVIEW & ACTION QUEUE */}
      {activeTab === 'NEEDS_REVIEW' && (
        <div className="space-y-6">
          <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-slate-800 dark:text-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Priority Action & Moderation Queue
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Properties with consistency warnings, missing pincode alignments, duplicate alerts, or core identity alterations.
                </p>
              </div>
            </div>
            <span className="font-black text-sm text-amber-600 bg-amber-500/20 px-3 py-1 rounded-xl">
              {needsReviewList.length} Item(s)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {needsReviewList.length > 0 ? (
              needsReviewList.map((p) => (
                <div key={p.id} className="p-5 bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase ${getScoreBadge(p.trust_score)}`}>
                        Score: {p.trust_score}/100
                      </span>
                      <span className="text-[10px] font-mono text-[#087F8C] dark:text-[#27B7A8] font-bold">
                        {p.assessment_id}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-[#091B29] dark:text-white">
                      {p.property_name}
                    </h4>
                    <span className="text-xs text-slate-500 block mt-0.5">
                      Stay Partner: {p.host_name} ({p.host_email})
                    </span>

                    <div className="p-3 bg-slate-50 dark:bg-[#091B29] rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 mt-3 leading-relaxed">
                      {p.summary}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      Status: {p.admin_decision}
                    </span>
                    <button
                      type="button"
                      onClick={() => openReview(p.property_id)}
                      className="px-4 py-2 bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] hover:from-[#091B29] hover:to-[#087F8C] text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review & Moderate</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 p-12 bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center text-slate-400 italic">
                All property submissions are currently evaluated and verified.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: DUPLICATE & ANOMALY SIGNALS */}
      {activeTab === 'DUPLICATES' && (
        <div className="space-y-6">
          <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-slate-800 dark:text-slate-200 flex items-center space-x-3">
            <AlertOctagon className="w-5 h-5 text-rose-500 shrink-0" />
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Proximity & Token Duplicate Detection
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Evaluates Levenshtein ratios, address token overlaps, and Haversine GPS proximity (&lt;500m) to identify overlapping listings.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {duplicatesList.length > 0 ? (
              duplicatesList.map((p) => (
                <div key={p.id} className="p-6 bg-white dark:bg-[#0F273D] rounded-3xl border-2 border-rose-500/30 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 bg-rose-500/20 text-rose-700 dark:text-rose-300 rounded-md text-[10px] font-black uppercase">
                          Duplicate Alert
                        </span>
                        <span className="text-xs font-bold text-[#091B29] dark:text-white">
                          #{p.property_id} - {p.property_name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Stay Partner: {p.host_name} • Fingerprint: <code className="font-mono text-[#087F8C] dark:text-[#27B7A8]">{p.property_fingerprint}</code>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openReview(p.property_id)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-xs shrink-0"
                    >
                      Inspect Duplicate Dossier
                    </button>
                  </div>

                  <div className="p-3.5 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300 leading-relaxed font-medium">
                    {p.duplicate_explanation || 'High token and GPS similarity detected.'}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center text-slate-400 italic">
                No duplicate listing conflicts or proximity anomalies currently detected.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT LOGS */}
      {activeTab === 'AUDIT_LOGS' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-black text-xs uppercase tracking-wider text-[#091B29] dark:text-white flex items-center space-x-2">
                <History className="w-4 h-4 text-[#087F8C] dark:text-[#27B7A8]" />
                <span>Immutable VeriNova Audit Log History</span>
              </h3>
              <span className="text-[10px] text-slate-400">Total {auditLogs.length} Events</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                          log.actor_role === 'ADMIN'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                            : 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20'
                        }`}>
                          {log.actor_role}
                        </span>
                        <span className="font-bold text-[#091B29] dark:text-white">
                          {log.event_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          on {log.entity_type} #{log.entity_id}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                        {log.summary}
                      </p>
                    </div>

                    <div className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center text-slate-400 italic">
                  No audit log events recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Property Review Modal */}
      <PropertyReviewModal
        propertyId={selectedPropertyId}
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onActionComplete={reloadAll}
      />
    </div>
  );
};
