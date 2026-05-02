import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, CheckCircle, XCircle, Clock, ChevronDown,
  LogOut, BarChart2, FileText, Search, Shield, Activity
} from 'lucide-react';

const BASE = import.meta.env.VITE_API_BASE_URL?.replace('/v1', '') || 'http://localhost:5001';

const statusBadge = (status) => {
  const map = {
    ACTIVE:    'bg-green-100 text-green-800',
    PENDING:   'bg-amber-100 text-amber-800',
    SUSPENDED: 'bg-red-100 text-red-700',
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;
};

const planBadge = (plan) => {
  const map = {
    Free:      'bg-slate-100 text-slate-600',
    Premium:   'bg-blue-100 text-blue-700',
    Pro:       'bg-purple-100 text-purple-700',
    Unlimited: 'bg-indigo-100 text-indigo-800',
  };
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${map[plan] || 'bg-slate-100'}`}>{plan}</span>;
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [adminSecret, setAdminSecret] = useState('');
  const [loginError, setLoginError] = useState('');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState('users'); // users | logs
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = sessionStorage.getItem('admin_token');
    if (t) { setToken(t); fetchData(t); }
  }, []);

  const adminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: adminSecret }),
      });
      const result = await res.json();
      if (result.success) {
        sessionStorage.setItem('admin_token', result.data.token);
        setToken(result.data.token);
        fetchData(result.data.token);
      } else {
        setLoginError(result.error || 'Invalid secret');
      }
    } catch { setLoginError('Could not reach server'); }
  };

  const fetchData = async (t) => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${t}` };
    const [uRes, sRes, lRes] = await Promise.all([
      fetch(`${BASE}/admin/users`, { headers }),
      fetch(`${BASE}/admin/stats`, { headers }),
      fetch(`${BASE}/admin/logs?limit=50`, { headers }),
    ]);
    const [uData, sData, lData] = await Promise.all([uRes.json(), sRes.json(), lRes.json()]);
    if (uData.success) setUsers(uData.data);
    if (sData.success) setStats(sData.data);
    if (lData.success) setLogs(lData.data.data || []);
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    // Optimistic update
    const previousUsers = [...users];
    setUsers(users.map(u => u.id === id ? { ...u, status } : u));

    try {
      const res = await fetch(`${BASE}/admin/users/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const result = await res.json();
      if (!result.success) {
        setUsers(previousUsers);
        alert(result.error);
      }
    } catch (err) {
      setUsers(previousUsers);
      alert('Failed to update status');
    }
  };

  const updatePlan = async (id, planType) => {
    // Optimistic update
    const previousUsers = [...users];
    setUsers(users.map(u => u.id === id ? { ...u, planType } : u));

    try {
      const res = await fetch(`${BASE}/admin/users/${id}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planType }),
      });
      const result = await res.json();
      if (!result.success) {
        setUsers(previousUsers);
        alert(result.error);
      }
    } catch (err) {
      setUsers(previousUsers);
      alert('Failed to update plan');
    }
  };

  const logout = () => { sessionStorage.removeItem('admin_token'); setToken(null); };

  // Admin Login Screen
  if (!token) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-sm">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 text-white mb-6 mx-auto">
          <Shield size={28} />
        </div>
        <h1 className="text-2xl font-bold text-center text-slate-900 mb-1">Admin Panel</h1>
        <p className="text-slate-500 text-sm text-center mb-8">Enter your admin secret to continue</p>
        <form onSubmit={adminLogin} className="space-y-4">
          <input type="password" required placeholder="Admin secret" value={adminSecret}
            onChange={e => setAdminSecret(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-colors" />
          {loginError && <p className="text-red-600 text-sm">{loginError}</p>}
          <button type="submit" className="w-full bg-slate-900 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-colors">
            Access Admin Panel
          </button>
        </form>
        <button onClick={() => navigate('/')} className="mt-4 w-full text-center text-sm text-slate-500 hover:text-slate-700">← Back to Dashboard</button>
      </div>
    </div>
  );

  const filteredUsers = users.filter(u =>
    u.companyName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full bg-slate-50 min-h-screen">
      {/* Top Nav / Tabs */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-6">
          <h1 className="text-xl font-bold text-slate-900">Admin Control</h1>
          <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setTab('users')} className={`flex items-center space-x-2 px-4 py-1.5 text-sm rounded-md transition-colors ${tab === 'users' ? 'bg-white text-blue-600 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}>
              <Users size={16} /><span>Users</span>
            </button>
            <button onClick={() => setTab('logs')} className={`flex items-center space-x-2 px-4 py-1.5 text-sm rounded-md transition-colors ${tab === 'logs' ? 'bg-white text-blue-600 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}>
              <Activity size={16} /><span>API Logs</span>
            </button>
          </div>
        </div>
        <button onClick={logout} className="flex items-center space-x-2 text-sm text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-medium transition-colors">
          <LogOut size={16} /><span>Sign Out</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="p-8 max-w-7xl mx-auto">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Users', value: stats.totalUsers, color: 'text-slate-900' },
              { label: 'Pending Approval', value: stats.pendingUsers, color: 'text-amber-600' },
              { label: "Today's API Calls", value: stats.todayLogs.toLocaleString(), color: 'text-blue-600' },
              { label: 'Total API Calls', value: stats.totalLogs.toLocaleString(), color: 'text-purple-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{s.label}</p>
                <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <>
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-xl font-bold text-slate-900">B2B Users</h1>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                  <tr>
                    {['Company', 'Email', 'Plan', 'Status', 'Keys', 'Joined', 'Actions'].map(h => (
                      <th key={h} className="p-4 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={7} className="p-10 text-center text-slate-400">Loading...</td></tr>
                  ) : filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium text-slate-900 text-sm">{u.companyName}</td>
                      <td className="p-4 text-sm text-slate-500">{u.email}</td>
                      <td className="p-4">
                        <select value={u.planType} onChange={e => updatePlan(u.id, e.target.value)}
                          className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer">
                          {['Free','Premium','Pro','Unlimited'].map(p => <option key={p}>{p}</option>)}
                        </select>
                      </td>
                      <td className="p-4">{statusBadge(u.status)}</td>
                      <td className="p-4 text-sm text-slate-600">{u.apiKeyCount}</td>
                      <td className="p-4 text-sm text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="p-4">
                        <div className="flex space-x-2">
                          {u.status !== 'ACTIVE' && (
                            <button onClick={() => updateStatus(u.id, 'ACTIVE')}
                              className="flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
                              <CheckCircle size={13} /><span>Approve</span>
                            </button>
                          )}
                          {u.status !== 'SUSPENDED' && (
                            <button onClick={() => updateStatus(u.id, 'SUSPENDED')}
                              className="flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
                              <XCircle size={13} /><span>Suspend</span>
                            </button>
                          )}
                          {u.status !== 'PENDING' && (
                            <button onClick={() => updateStatus(u.id, 'PENDING')}
                              className="flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">
                              <Clock size={13} /><span>Pending</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && !loading && (
                <div className="p-12 text-center text-slate-400">No users found.</div>
              )}
            </div>
          </>
        )}

        {/* Logs Tab */}
        {tab === 'logs' && (
          <>
            <h1 className="text-xl font-bold text-slate-900 mb-5">API Usage Logs</h1>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                  <tr>
                    {['Time', 'Company', 'Key Name', 'Endpoint', 'Method', 'Status', 'Response Time'].map(h => (
                      <th key={h} className="p-4 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-slate-500 text-xs whitespace-nowrap">
                        {new Date(l.createdAt).toLocaleTimeString()} <br/>
                        <span className="text-slate-400">{new Date(l.createdAt).toLocaleDateString()}</span>
                      </td>
                      <td className="p-3 font-medium text-slate-800">{l.company}</td>
                      <td className="p-3 text-slate-500">{l.keyName}</td>
                      <td className="p-3 font-mono text-xs text-blue-700 bg-blue-50 rounded">{l.endpoint}</td>
                      <td className="p-3"><span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono">{l.method}</span></td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${l.statusCode < 300 ? 'bg-green-100 text-green-700' : l.statusCode < 500 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {l.statusCode}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">{l.responseTime}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && !loading && (
                <div className="p-12 text-center text-slate-400">No logs yet. Logs appear after API calls are made.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
