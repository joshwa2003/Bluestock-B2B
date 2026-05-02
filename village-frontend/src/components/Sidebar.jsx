import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Map, Users, Settings, Sparkles } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const navLink = (to, icon, label) => {
    const Icon = icon;
    const active = currentPath === to || (to !== '/' && currentPath.startsWith(to));
    return (
      <Link
        to={to}
        className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
          active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <Icon size={20} />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <div className="w-64 bg-slate-900 text-white min-h-screen p-4 flex flex-col fixed left-0 top-0">
      <div className="mb-8 p-2">
        <h1 className="text-2xl font-bold text-blue-400">Bluestock</h1>
        <p className="text-sm text-slate-400">Village Directory</p>
      </div>

      <nav className="flex-1 space-y-1">
        {navLink('/', Home, 'Dashboard')}
        {navLink('/villages', Map, 'Villages')}
        {navLink('/admin/users', Users, 'Users & Logs')}
        {navLink('/demo', Sparkles, 'Demo Client')}
      </nav>

      <div className="mt-auto border-t border-slate-700 pt-4">
        {navLink('/portal', Settings, 'B2B Portal')}
      </div>
    </div>
  );
};

export default Sidebar;
