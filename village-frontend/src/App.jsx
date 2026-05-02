import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';

const Dashboard = lazy(() => import('./components/Dashboard'));
const VillagesPage = lazy(() => import('./components/VillagesPage'));
const AdminUsers = lazy(() => import('./components/AdminUsers'));
const DemoClient = lazy(() => import('./components/DemoClient'));
const B2BPortal = lazy(() => import('./components/B2BPortal'));
const KeyManagement = lazy(() => import('./components/KeyManagement'));

const AdminLayout = () => (
  <div className="flex bg-slate-50 min-h-screen font-sans text-slate-900">
    <Sidebar />
    <main className="flex-1 ml-64 relative">
      <Outlet />
    </main>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>}>
        <Routes>
          {/* Admin Dashboard Routes */}
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/villages" element={<VillagesPage />} />
            <Route path="/admin/users" element={<AdminUsers />} />
          </Route>

          {/* Demo Client — standalone page (no sidebar) */}
          <Route path="/demo" element={<DemoClient />} />

          {/* B2B Portal Routes */}
          <Route path="/portal" element={<B2BPortal />} />
          <Route path="/portal/keys" element={<KeyManagement />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
