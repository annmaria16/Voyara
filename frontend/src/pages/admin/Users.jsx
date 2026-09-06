import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { Users, UserCheck, UserX, Shield, Mail, Phone, AlertCircle } from 'lucide-react';

export const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getUsers(roleFilter);
      setUsers(data);
    } catch (err) {
      setError(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleToggleStatus = async (userId) => {
    try {
      await adminApi.toggleUserStatus(userId);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to toggle status.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black font-serif text-[#102A43] dark:text-white">User & Host Management</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Manage traveler accounts, hosts, and administrative access</p>
        </div>

        <div className="flex items-center space-x-2">
          {[
            { value: '', label: 'All Roles' },
            { value: 'CUSTOMER', label: 'Travelers' },
            { value: 'PROVIDER', label: 'Hosts' },
            { value: 'ADMIN', label: 'Administrators' }
          ].map((r) => (
            <button
              key={r.value}
              onClick={() => setRoleFilter(r.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                roleFilter === r.value
                  ? 'bg-gradient-to-r from-[#F97360] to-orange-500 text-white shadow-xs'
                  : 'bg-white dark:bg-[#131D2E] text-slate-700 dark:text-slate-300 hover:bg-[#FFF8F0] dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3">User ID</th>
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Email & Phone</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Registered Date</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#FFF8F0]/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 font-mono text-slate-400 dark:text-slate-500">#{u.id}</td>
                    <td className="py-3.5 font-bold text-[#102A43] dark:text-white">{u.name}</td>
                    <td className="py-3.5">
                      <span className="block text-slate-600 dark:text-slate-300">{u.email}</span>
                      <span className="block text-[11px] text-slate-400 dark:text-slate-500">{u.phone || 'No phone'}</span>
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role === 'ADMIN'
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                          : u.role === 'PROVIDER'
                          ? 'bg-orange-500/10 text-[#F97360] dark:text-orange-400 border border-orange-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {u.role === 'ADMIN' ? 'Administrator' : u.role === 'PROVIDER' ? 'Host' : 'Traveler'}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.is_active
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }`}>
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-500 dark:text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="py-3.5">
                      <button
                        onClick={() => handleToggleStatus(u.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          u.is_active
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
