import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Plus, Copy, CheckCircle2, ShieldAlert, LogOut, Code, Activity, Trash2, Eye, EyeOff, X } from 'lucide-react';

const KeyManagement = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [usage, setUsage] = useState(null);
  const [keys, setKeys] = useState([]);
  const [copiedKey, setCopiedKey] = useState(null);
  const [newSecretModal, setNewSecretModal] = useState(null); // holds { key, secret } after creation
  const [secretVisible, setSecretVisible] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('b2b_user');
    if (!userData) { navigate('/portal'); return; }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    fetchUsage();
  }, [navigate]);

  const fetchUsage = async () => {
    try {
      const token = localStorage.getItem('b2b_token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/portal/usage`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        setUsage(result.data);
        setKeys(result.data.keys);
      } else if (res.status === 401) {
        // Token expired — redirect to login
        localStorage.removeItem('b2b_token');
        localStorage.removeItem('b2b_user');
        navigate('/portal');
      }
    } catch (err) { console.error('Failed to fetch usage:', err); }
  };

  const handleCopy = (text, setter) => {
    navigator.clipboard.writeText(text);
    setter(text);
    setTimeout(() => setter(null), 2000);
  };

  const generateNewKey = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/portal/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, keyName: `Key ${keys.length + 1}` })
      });
      const result = await res.json();
      if (result.success) {
        // Show the one-time secret modal
        setNewSecretModal({ key: result.data.key, secret: result.data.secret });
        setSecretVisible(false);
        setSecretCopied(false);
        fetchUsage(user.email); // refresh the list
      } else {
        alert(result.error);
      }
    } catch (err) { alert('Failed to generate key.'); }
  };

  const revokeKey = async (keyId) => {
    if (!confirm('Are you sure you want to revoke this key? This cannot be undone.')) return;

    // Optimistic update
    const previousKeys = [...keys];
    setKeys(keys.map(k => k.id === keyId ? { ...k, isActive: false } : k));

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/portal/keys/${keyId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });
      const result = await res.json();
      if (!result.success) {
        setKeys(previousKeys);
        alert(result.error);
      } else {
        fetchUsage(); // to update overall usage numbers if needed
      }
    } catch (err) {
      setKeys(previousKeys);
      alert('Failed to revoke key.');
    }
  };

  const handleLogout = () => { localStorage.removeItem('b2b_user'); navigate('/portal'); };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed h-full">
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">B</div>
          <span className="text-white font-bold text-lg">Bluestock B2B</span>
        </div>
        <div className="p-4 flex-1 space-y-1">
          <button className="flex items-center space-x-3 w-full p-3 rounded-lg bg-blue-600/10 text-blue-400 font-medium">
            <KeyRound size={20} /><span>API Keys</span>
          </button>
          <button onClick={() => alert("Your usage quota is displayed on your main dashboard.")} className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
            <Activity size={20} /><span>Usage Quota</span>
          </button>
          <button onClick={() => alert("Documentation portal is coming soon in Phase 3!")} className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
            <Code size={20} /><span>Documentation</span>
          </button>
        </div>
        <div className="p-4 border-t border-slate-800">
          <div className="mb-4 px-3">
            <p className="text-sm font-medium text-white">{user.companyName || 'My Company'}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
          <button onClick={handleLogout} className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors">
            <LogOut size={20} /><span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 ml-64 p-10">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Header */}
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">API Key Management</h1>
              <p className="text-slate-500 mt-1">Generate and manage your access keys for the Village Directory API.</p>
            </div>
            <button onClick={generateNewKey} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-lg transition-colors flex items-center shadow-sm">
              <Plus size={18} className="mr-2" />Generate New Key
            </button>
          </div>

          {/* Usage Stats */}
          {usage && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <p className="text-sm text-slate-500 font-medium">Plan</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{usage.plan}</p>
                <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Active</span>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <p className="text-sm text-slate-500 font-medium">Remaining Quota</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {Math.max(0, usage.dailyLimit - (usage.requestsToday || 0)).toLocaleString()} <span className="text-slate-400 text-base font-normal">/ {usage.dailyLimit.toLocaleString()}</span>
                </p>
                <p className="text-xs text-slate-400 mt-2">requests left today</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <p className="text-sm text-slate-500 font-medium">Active Keys</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{usage.activeKeys} <span className="text-slate-400 text-base font-normal">/ 5</span></p>
                <p className="text-xs text-slate-400 mt-2">maximum 5 keys</p>
              </div>
            </div>
          )}

          {/* Security Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3">
            <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-sm font-semibold text-amber-800">Keep your keys secure</h4>
              <p className="text-sm text-amber-700 mt-1">Do not share your API keys in publicly accessible areas such as GitHub, client-side code, and so forth. Treat them like passwords.</p>
            </div>
          </div>

          {/* Keys Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-500">
                  <th className="p-5 font-semibold">Key Name</th>
                  <th className="p-5 font-semibold">API Key</th>
                  <th className="p-5 font-semibold">Created</th>
                  <th className="p-5 font-semibold">Last Used</th>
                  <th className="p-5 font-semibold">Status</th>
                  <th className="p-5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {keys.map(keyObj => (
                  <tr key={keyObj.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-5 font-medium text-slate-900">{keyObj.name}</td>
                    <td className="p-5">
                      <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-md w-fit">
                        <code className="text-sm font-mono text-slate-700">
                          {keyObj.key.substring(0, 12)}...{keyObj.key.slice(-6)}
                        </code>
                      </div>
                    </td>
                    <td className="p-5 text-sm text-slate-500">{new Date(keyObj.createdAt).toLocaleDateString()}</td>
                    <td className="p-5 text-sm text-slate-500">{keyObj.lastUsed ? new Date(keyObj.lastUsed).toLocaleDateString() : 'Never'}</td>
                    <td className="p-5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${keyObj.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                        {keyObj.isActive ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td className="p-5 flex items-center justify-end space-x-2">
                      <button onClick={() => handleCopy(keyObj.key, setCopiedKey)}
                        className={`p-2 rounded-lg transition-colors ${copiedKey === keyObj.key ? 'text-green-600 bg-green-50' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`} title="Copy Key">
                        {copiedKey === keyObj.key ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                      </button>
                      {keyObj.isActive && (
                        <button onClick={() => revokeKey(keyObj.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Revoke Key">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {keys.length === 0 && (
              <div className="p-12 text-center text-slate-500">No API keys yet. Generate your first key above.</div>
            )}
          </div>
        </div>
      </div>

      {/* One-Time Secret Modal */}
      {newSecretModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">🎉 Key Generated!</h2>
                <p className="text-slate-500 mt-1 text-sm">Save both values now. The secret is shown only once.</p>
              </div>
              <button onClick={() => setNewSecretModal(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={22} />
              </button>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start space-x-3">
              <ShieldAlert className="text-red-600 shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-red-700 font-medium">⚠️ This secret will <strong>never be shown again</strong>. Copy and store it in a safe place before closing this window.</p>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">API Key</p>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 bg-slate-100 px-4 py-3 rounded-xl text-sm font-mono text-slate-800 break-all">{newSecretModal.key}</code>
                  <button onClick={() => handleCopy(newSecretModal.key, setCopiedKey)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                    {copiedKey === newSecretModal.key ? <CheckCircle2 size={20} className="text-green-600" /> : <Copy size={20} />}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">API Secret (one-time only)</p>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 bg-slate-100 px-4 py-3 rounded-xl text-sm font-mono text-slate-800 break-all">
                    {secretVisible ? newSecretModal.secret : '••••••••••••••••••••••••••••••••••••••••••••'}
                  </code>
                  <button onClick={() => setSecretVisible(!secretVisible)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                    {secretVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(newSecretModal.secret); setSecretCopied(true); }} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                    {secretCopied ? <CheckCircle2 size={20} className="text-green-600" /> : <Copy size={20} />}
                  </button>
                </div>
              </div>
            </div>

            <button onClick={() => setNewSecretModal(null)} className="w-full mt-8 bg-slate-900 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-colors">
              I've saved both values — Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeyManagement;
