import React from 'react';
import DataBrowser from './DataBrowser';

const VillagesPage = () => {
  return (
    <div className="p-8 h-screen overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Village Database</h2>
        <p className="text-slate-500 mt-2 text-lg">Search, filter, and explore normalized village data across India.</p>
      </div>

      <DataBrowser />
    </div>
  );
};

export default VillagesPage;
