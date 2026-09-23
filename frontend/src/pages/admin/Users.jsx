import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  Mail,
  Phone,
  AlertCircle,
  ShieldCheck,
  Calendar,
  X,
  Building,
  BookOpen,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  Ban,
  Loader2,
  Sparkles,
} from 'lucide-react';

export const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDossier, setUserDossier] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);

  // Modals for Safety Actions
  const [actionModal, setActionModal] = useState({
    open: false,
    type: null, // 'SUSPEND', 'REACTIVATE', 'DEACTIVATE'
    user: null,
  });
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getUsers(roleFilter);
      // Ensure admin users are excluded from the regular users table
      const filtered = (data || []).filter((u) => u.role !== 'ADMIN');
      setUsers(filtered);
    } catch (err) {
      setError(err.message || 'Failed to load user directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const openDossier = async (user) => {
    setSelectedUser(user);
    setDossierLoading(true);
    setUserDossier(null);
    try {
      const data = await adminApi.getUserDossier(user.id);
      setUserDossier(data);
    } catch (err) {
      console.warn('Failed to load user dossier details:', err);
    } finally {
      setDossierLoading(false);
    }
  };

  const openActionPrompt = (type, user) => {
    setActionModal({ open: true, type, user });
    setActionReason('');
  };

  const handleConfirmAction = async () => {
    if (!actionModal.user || !actionModal.type) return;

    if ((actionModal.type === 'SUSPEND' || actionModal.type === 'DEACTIVATE') && !actionReason.trim()) {
      alert('A reason is required for account suspension or deactivation.');
      return;
    }

    setActionLoading(true);
    try {
      const userId = actionModal.user.id;
      if (actionModal.type === 'SUSPEND') {
        await adminApi.suspendUser(userId, { reason: actionReason.trim() });
      } else if (actionModal.type === 'REACTIVATE') {
        await adminApi.reactivateUser(userId);
      } else if (actionModal.type === 'DEACTIVATE') {
        await adminApi.deactivateUser(userId, { reason: actionReason.trim() });
      }

      setActionModal({ open: false, type: null, user: null });
      setActionReason('');
      await fetchUsers();
      if (selectedUser?.id === actionModal.user.id) {
        const updatedDossier = await adminApi.getUserDossier(actionModal.user.id).catch(() => null);
        setUserDossier(updatedDossier);
      }
    } catch (err) {
      alert(err.response?.data?.detail || err.message || `Failed to perform ${actionModal.type}`);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (user) => {
    const status = user.account_status || (user.is_active ? 'ACTIVE' : 'SUSPENDED');
    if (status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span>Active</span>
        </span>
      );
    }
    if (status === 'SUSPENDED') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <Ban className="w-3 h-3 text-rose-500" />
          <span>Suspended</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
        <UserX className="w-3 h-3 text-slate-500" />
        <span>Deactivated</span>
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#091B29] dark:text-white tracking-tight">
            Users & Stay Partner Safety Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage mindful traveler accounts, verified stay partners, account suspensions, and safety audit logs.
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center space-x-2">
          {[
            { value: '', label: 'All Accounts' },
            { value: 'CUSTOMER', label: 'Travelers' },
            { value: 'PROVIDER', label: 'Stay Partners' },
          ].map((r) => (
            <button
              key={r.value}
              onClick={() => setRoleFilter(r.value)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                roleFilter === r.value
                  ? 'bg-gradient-to-r from-orange-500 to-[#EA580C] text-white shadow-md shadow-orange-500/20'
                  : 'bg-white dark:bg-[#0F273D] text-slate-700 dark:text-slate-300 hover:bg-[#FFFDF7] dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
              }`}
            >
              {r.label}
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
        <div className="py-24 flex justify-center">
          <div className="w-8 h-8 border-3 border-[#087F8C] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-16 text-center border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-xs">
          <Users className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-lg font-serif font-bold text-[#091B29] dark:text-white">No accounts found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">No registered users matched the selected filter.</p>
        </div>
      ) : (
        /* Directory Grid of User Profiles */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((u) => {
            const isHost = u.role === 'PROVIDER';
            const isSuspended = u.account_status === 'SUSPENDED' || !u.is_active;

            return (
              <div
                key={u.id}
                className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-[#087F8C]/40 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Top: Avatar, Name, Role Badge */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3.5">
                      <div
                        className={`w-12 h-12 rounded-2xl font-serif font-bold text-lg flex items-center justify-center shadow-xs ${
                          isHost
                            ? 'bg-gradient-to-tr from-[#087F8C] to-[#27B7A8] text-white'
                            : 'bg-gradient-to-tr from-orange-500 to-[#F6C945] text-white'
                        }`}
                      >
                        {u.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <h3 className="text-base font-serif font-bold text-[#091B29] dark:text-white leading-tight group-hover:text-[#087F8C] transition-colors">
                          {u.name}
                        </h3>
                        <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 block">
                          Account #{u.id}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isHost
                          ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30'
                          : 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30'
                      }`}
                    >
                      {isHost ? 'Stay Partner' : 'Traveler'}
                    </span>
                  </div>

                  {/* Verification & Contact Details */}
                  <div className="space-y-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{u.email}</span>
                      </div>
                      <span className={`text-[10px] font-bold ${u.email_verified ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {u.email_verified ? '✓ Email' : 'Unverified'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{u.phone || 'No phone'}</span>
                      </div>
                      <span className={`text-[10px] font-bold ${u.phone_verified ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {u.phone_verified ? '✓ Phone' : 'Unverified'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Joined {new Date(u.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions & Status */}
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  {getStatusBadge(u)}

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => openDossier(u)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#091B29] dark:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Dossier
                    </button>

                    {isSuspended ? (
                      <button
                        type="button"
                        onClick={() => openActionPrompt('REACTIVATE', u)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                      >
                        Reactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openActionPrompt('SUSPEND', u)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                      >
                        Suspend
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* User Profile Detail Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0F273D] w-full max-w-md h-full shadow-2xl p-6 sm:p-8 space-y-6 overflow-y-auto border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-[#087F8C] dark:text-[#27B7A8]" />
                  <h3 className="text-lg font-serif font-bold text-[#091B29] dark:text-white">
                    Account Dossier
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-center space-y-2">
                <div
                  className={`w-20 h-20 rounded-3xl font-serif font-bold text-3xl mx-auto flex items-center justify-center shadow-md ${
                    selectedUser.role === 'PROVIDER'
                      ? 'bg-gradient-to-tr from-[#087F8C] to-[#27B7A8] text-white'
                      : 'bg-gradient-to-tr from-orange-500 to-[#F6C945] text-white'
                  }`}
                >
                  {selectedUser.name?.charAt(0) || 'U'}
                </div>
                <h4 className="text-xl font-serif font-bold text-[#091B29] dark:text-white">
                  {selectedUser.name}
                </h4>
                <p className="text-xs text-slate-500 font-mono">UID: {selectedUser.id}</p>
                <div className="flex justify-center pt-1">{getStatusBadge(selectedUser)}</div>
              </div>

              {/* Verified Identity Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#FFFDF7] dark:bg-[#091B29] rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Phone Verification</span>
                  <strong className={selectedUser.phone_verified ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}>
                    {selectedUser.phone_verified ? '✓ Verified (+91)' : 'Pending'}
                  </strong>
                </div>
                <div className="p-3 bg-[#FFFDF7] dark:bg-[#091B29] rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Email Verification</span>
                  <strong className={selectedUser.email_verified ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}>
                    {selectedUser.email_verified ? '✓ Verified' : 'Pending'}
                  </strong>
                </div>
              </div>

              {/* Statistics Panel */}
              {dossierLoading ? (
                <div className="py-6 flex justify-center">
                  <Loader2 className="w-5 h-5 text-[#087F8C] animate-spin" />
                </div>
              ) : userDossier?.stats ? (
                <div className="p-4 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-2 text-xs">
                  <span className="text-[10px] text-[#087F8C] dark:text-[#27B7A8] font-bold uppercase tracking-wider block">
                    Platform Operational Activity
                  </span>
                  {selectedUser.role === 'PROVIDER' ? (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Properties</span>
                        <strong className="text-[#091B29] dark:text-white">
                          {userDossier.stats.total_properties || 0} Listed ({userDossier.stats.verified_properties || 0} Live)
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Reservations</span>
                        <strong className="text-[#091B29] dark:text-white">{userDossier.stats.total_bookings || 0} Total</strong>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Gross Volume</span>
                        <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                          ₹{Number(userDossier.stats.total_revenue || 0).toLocaleString('en-IN')}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Completed Stays</span>
                        <strong className="text-[#091B29] dark:text-white">{userDossier.stats.total_bookings || 0} Stays</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Total Spent</span>
                        <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                          ₹{Number(userDossier.stats.total_spent || 0).toLocaleString('en-IN')}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Suspension details if suspended */}
              {userDossier?.suspension_reason && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 block">
                    Suspension Audit Record
                  </span>
                  <p className="text-rose-700 dark:text-rose-300 font-medium">"{userDossier.suspension_reason}"</p>
                  {userDossier.suspended_at && (
                    <span className="text-[10px] text-rose-500/80 block">
                      Suspended on: {new Date(userDossier.suspended_at).toLocaleString()}
                    </span>
                  )}
                </div>
              )}

              {/* General Account Details */}
              <div className="space-y-3 bg-[#FFFDF7] dark:bg-[#091B29] p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-800">
                  <span className="text-slate-500">Platform Role:</span>
                  <strong className="text-[#091B29] dark:text-white">{selectedUser.role}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-800">
                  <span className="text-slate-500">Email:</span>
                  <strong className="text-[#091B29] dark:text-white">{selectedUser.email}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-800">
                  <span className="text-slate-500">Phone:</span>
                  <strong className="text-[#091B29] dark:text-white">{selectedUser.phone || 'N/A'}</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Registration Date:</span>
                  <strong className="text-[#091B29] dark:text-white">{new Date(selectedUser.created_at).toLocaleDateString()}</strong>
                </div>
              </div>
            </div>

            {/* Action Buttons in Drawer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              {selectedUser.account_status === 'SUSPENDED' || !selectedUser.is_active ? (
                <button
                  type="button"
                  onClick={() => openActionPrompt('REACTIVATE', selectedUser)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  Reactivate Account Access
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openActionPrompt('SUSPEND', selectedUser)}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  Suspend Account Access
                </button>
              )}

              {selectedUser.account_status !== 'DEACTIVATED' && (
                <button
                  type="button"
                  onClick={() => openActionPrompt('DEACTIVATE', selectedUser)}
                  className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Soft Deactivate Account
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SAFETY ACTION MODAL (SUSPEND / REACTIVATE / DEACTIVATE) */}
      {actionModal.open && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-2.5 text-[#091B29] dark:text-white">
              {actionModal.type === 'SUSPEND' && <Ban className="w-5 h-5 text-rose-500" />}
              {actionModal.type === 'REACTIVATE' && <RotateCcw className="w-5 h-5 text-emerald-500" />}
              {actionModal.type === 'DEACTIVATE' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
              <h3 className="text-base font-bold font-serif">
                {actionModal.type === 'SUSPEND' && `Suspend Account #${actionModal.user?.id}`}
                {actionModal.type === 'REACTIVATE' && `Reactivate Account #${actionModal.user?.id}`}
                {actionModal.type === 'DEACTIVATE' && `Deactivate Account #${actionModal.user?.id}`}
              </h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {actionModal.type === 'SUSPEND' && (
                <>
                  Suspending <strong>{actionModal.user?.name}</strong> will revoke all platform login access, block property management, and hide their properties from traveler searches. A reason is required for safety audit logging.
                </>
              )}
              {actionModal.type === 'REACTIVATE' && (
                <>
                  Reactivating <strong>{actionModal.user?.name}</strong> will restore standard login and account permissions.
                </>
              )}
              {actionModal.type === 'DEACTIVATE' && (
                <>
                  Soft deactivating <strong>{actionModal.user?.name}</strong> marks the account inactive while preserving history and audit trails.
                </>
              )}
            </p>

            {(actionModal.type === 'SUSPEND' || actionModal.type === 'DEACTIVATE') && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Mandatory Reason / Note *
                </label>
                <textarea
                  rows={3}
                  required
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Enter reason for administrative action (e.g. Terms violation, host requested closure)..."
                  className="w-full p-3 bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:border-[#087F8C]"
                />
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setActionModal({ open: false, type: null, user: null })}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={actionLoading}
                className={`px-5 py-2 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${
                  actionModal.type === 'SUSPEND'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20'
                    : actionModal.type === 'REACTIVATE'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20'
                    : 'bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20'
                }`}
              >
                {actionLoading ? 'Saving...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
