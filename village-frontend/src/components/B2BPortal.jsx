import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, KeyRound, ArrowRight } from 'lucide-react';

const B2BPortal = () => {
  const [isLogin, setIsLogin] = useState(false);
  const [formData, setFormData] = useState({ companyName: '', email: '', password: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const endpoint = isLogin ? '/portal/login' : '/portal/register';
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await response.json();

      if (result.success) {
        if (!isLogin) {
          // Registration — account is pending admin approval
          alert('✅ Account created! Your account is pending admin approval. You will be notified once approved.');
          setIsLogin(true);
          return;
        }
        // Login — store JWT token and user info
        const { token, ...userData } = result.data;
        localStorage.setItem('b2b_token', token);
        localStorage.setItem('b2b_user', JSON.stringify(userData));
        navigate('/portal/keys');
      } else {
        setErrorMsg(result.error);
      }
    } catch (err) {
      setErrorMsg("An error occurred. Make sure the backend is running.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30 mb-4">
            <Building2 size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Bluestock B2B</h1>
          <p className="text-slate-500 mt-2">Enterprise Village Directory API Access</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
          <div className="flex space-x-4 mb-8 border-b border-slate-100">
            <button 
              className={`pb-4 px-2 font-medium text-sm transition-colors relative ${!isLogin ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setIsLogin(false)}
            >
              Register Company
              {!isLogin && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></span>}
            </button>
            <button 
              className={`pb-4 px-2 font-medium text-sm transition-colors relative ${isLogin ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setIsLogin(true)}
            >
              Developer Login
              {isLogin && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></span>}
            </button>
          </div>

          {errorMsg && (
            <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-sm font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="Acme Corp"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Work Email</label>
              <input 
                type="email" 
                required
                placeholder="dev@company.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input 
                type="password" 
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center mt-6 shadow-lg shadow-blue-600/20"
            >
              {isLogin ? 'Sign In' : 'Create Account'}
              <ArrowRight size={18} className="ml-2" />
            </button>
          </form>
        </div>

        {/* Benefits text */}
        {!isLogin && (
          <div className="mt-8 text-center text-sm text-slate-500 flex items-center justify-center space-x-6">
            <span className="flex items-center"><KeyRound size={16} className="mr-2 text-blue-500" /> Instant API Keys</span>
            <span className="flex items-center"><Building2 size={16} className="mr-2 text-blue-500" /> Free Tier Available</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default B2BPortal;
