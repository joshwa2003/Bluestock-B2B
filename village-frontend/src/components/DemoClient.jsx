import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, User, Mail, Phone, MessageSquare, CheckCircle2, Search, ChevronRight, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/v1';
// Demo key — replace with a real key if needed
const DEMO_KEY = import.meta.env.VITE_DEMO_API_KEY || 'ak_d31600a53570533f96a8bbded965698bb561ec9af7f4d137';

export default function DemoClient() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [address, setAddress] = useState({ village: null, subDistrict: '', district: '', state: '', country: 'India' });
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchSuggestions = useCallback(async (q) => {
    if (q.length < 2) { setSuggestions([]); setDropdownOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/autocomplete?q=${encodeURIComponent(q)}`, {
        headers: { 'x-api-key': DEMO_KEY }
      });
      const result = await res.json();
      if (result.success) {
        setSuggestions(result.data || []);
        setDropdownOpen(true);
      }
    } catch { setSuggestions([]); }
    finally { setLoading(false); }
  }, []);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    // Clear selection if user edits
    setAddress(prev => ({ ...prev, village: null, subDistrict: '', district: '', state: '' }));
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 350);
  };

  const selectVillage = (v) => {
    setAddress({
      village: v.hierarchy.village,
      subDistrict: v.hierarchy.subDistrict,
      district: v.hierarchy.district,
      state: v.hierarchy.state,
      country: v.hierarchy.country,
    });
    setQuery(v.hierarchy.village);
    setSuggestions([]);
    setDropdownOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!address.village) { alert('Please select a village from the autocomplete.'); return; }
    setSubmitted(true);
  };

  const field = (id, label, type, placeholder, value, onChange, required = true) => (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      <input id={id} type={type} required={required} placeholder={placeholder} value={value} onChange={onChange}
        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder-slate-400 text-slate-900" />
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">Message Sent! 🎉</h2>
        <p className="text-slate-500 mb-6">Thank you, <strong>{form.name}</strong>. We'll get back to you at {form.email}.</p>
        <div className="bg-slate-50 rounded-2xl p-4 text-left space-y-2 text-sm mb-8">
          <p className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-3">Your Address (auto-filled)</p>
          <p><span className="text-slate-400">Village:</span> <strong>{address.village}</strong></p>
          <p><span className="text-slate-400">Sub-District:</span> {address.subDistrict}</p>
          <p><span className="text-slate-400">District:</span> {address.district}</p>
          <p><span className="text-slate-400">State:</span> {address.state}</p>
          <p><span className="text-slate-400">Country:</span> {address.country}</p>
        </div>
        <button onClick={() => { setSubmitted(false); setForm({ name:'', email:'', phone:'', message:'' }); setAddress({ village:null, subDistrict:'', district:'', state:'', country:'India' }); setQuery(''); }}
          className="bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">
          Submit Another →
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/60 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center space-x-2 bg-blue-600/10 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <MapPin size={14} /><span>Village API Demo</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Contact Us</h1>
          <p className="text-slate-500 text-lg">Experience our magic village autocomplete — type your village name and watch the full address fill in instantly.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 space-y-6">
          {/* Personal Info */}
          <div className="grid grid-cols-2 gap-5">
            {field('name', 'Full Name', 'text', 'John Doe', form.name, e => setForm({...form, name: e.target.value}))}
            {field('email', 'Email Address', 'email', 'john@company.com', form.email, e => setForm({...form, email: e.target.value}))}
          </div>
          {field('phone', 'Phone Number', 'tel', '+91 98765 43210', form.phone, e => setForm({...form, phone: e.target.value}), false)}

          {/* Address Section */}
          <div className="border-t border-slate-100 pt-6">
            <div className="flex items-center space-x-2 mb-5">
              <MapPin size={18} className="text-blue-600" />
              <h3 className="font-bold text-slate-900">Address</h3>
              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium ml-auto">✨ Auto-fill via API</span>
            </div>

            {/* Village Autocomplete */}
            <div className="relative mb-4" ref={dropdownRef}>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Village / Area <span className="text-red-500">*</span></label>
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                {loading && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />}
                <input
                  type="text"
                  placeholder="Type village name... (e.g. Manibeli, Akkalkuwa)"
                  value={query}
                  onChange={handleQueryChange}
                  onFocus={() => suggestions.length > 0 && setDropdownOpen(true)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder-slate-400"
                />
              </div>

              {/* Suggestions Dropdown */}
              {dropdownOpen && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto">
                  {suggestions.map(v => (
                    <button key={v.value} type="button" onClick={() => selectVillage(v)}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-start space-x-3 border-b border-slate-50 last:border-0">
                      <MapPin size={16} className="text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{v.hierarchy.village}</p>
                        <p className="text-xs text-slate-500">{v.hierarchy.subDistrict}, {v.hierarchy.district}, {v.hierarchy.state}</p>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 ml-auto shrink-0 mt-0.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Auto-filled address fields */}
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Sub-District', address.subDistrict],
                ['District', address.district],
                ['State', address.state],
                ['Country', address.country],
              ].map(([label, value]) => (
                <div key={label}>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
                  <div className={`w-full px-4 py-3 rounded-xl border text-sm transition-all ${value ? 'border-green-200 bg-green-50 text-green-800 font-medium' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                    {value || `Auto-filled after village selection`}
                    {value && <span className="float-right text-green-500">✓</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="border-t border-slate-100 pt-6">
            <label htmlFor="message" className="block text-sm font-semibold text-slate-700 mb-1.5">Message</label>
            <textarea id="message" rows={4} placeholder="How can we help you?"
              value={form.message} onChange={e => setForm({...form, message: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all resize-none placeholder-slate-400" />
          </div>

          <button type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-600/30 text-lg">
            Send Message →
          </button>
        </form>

        {/* API Badge */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400">Powered by <span className="font-semibold text-blue-600">Bluestock Village Directory API</span> · 457,053 villages · Instant autocomplete</p>
        </div>
      </div>
    </div>
  );
}
