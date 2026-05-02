import React, { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const DataBrowser = () => {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const cache = React.useRef({});

  const fetchData = useCallback(async (searchQuery, targetPage, isPrefetch = false) => {
    const cacheKey = `${searchQuery}-${targetPage}`;
    
    // If it's a regular fetch and we have it in cache, use it immediately
    if (!isPrefetch && cache.current[cacheKey]) {
      setData(cache.current[cacheKey].data);
      setMeta(cache.current[cacheKey].meta);
      setLoading(false);
      
      // Still prefetch the next page in background
      if (targetPage < cache.current[cacheKey].meta.totalPages) {
        fetchData(searchQuery, targetPage + 1, true);
      }
      return;
    }

    if (!isPrefetch) setLoading(true);
    try {
      // Use standard villages endpoint if no query, else use search endpoint
      const endpoint = searchQuery 
        ? `${import.meta.env.VITE_API_BASE_URL}/search?q=${searchQuery}&limit=50&page=${targetPage}`
        : `${import.meta.env.VITE_API_BASE_URL}/villages?limit=50&page=${targetPage}`;

      const response = await fetch(endpoint, {
        headers: {
          'x-api-key': import.meta.env.VITE_API_KEY
        }
      });
      const result = await response.json();
      
      if (result.success) {
        const newData = result.data.data || [];
        const newMeta = result.data.meta;
        
        // Save to cache
        cache.current[cacheKey] = { data: newData, meta: newMeta };

        if (!isPrefetch) {
          setData(newData);
          setMeta(newMeta);
          
          // Prefetch next page
          if (newMeta && targetPage < newMeta.totalPages) {
            fetchData(searchQuery, targetPage + 1, true);
          }
        }
      }
    } catch (error) {
      if (!isPrefetch) console.error('Failed to fetch data:', error);
    }
    if (!isPrefetch) setLoading(false);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchData(query, 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [query, fetchData]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && (!meta || newPage <= meta.totalPages)) {
      setPage(newPage);
      fetchData(query, newPage);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col h-full">
      {/* Header & Search */}
      <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Village Explorer</h3>
          <p className="text-sm text-slate-500 mt-1">
            {meta?.total ? <>{meta.total.toLocaleString()} results found. Showing 50 per page.</> : 'Live search across all 457,053 villages.'}
          </p>
        </div>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
          </div>
          <input 
            type="text" 
            placeholder="Search villages, states, districts..." 
            className="pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 w-80 shadow-sm transition-all text-slate-700 placeholder:text-slate-400"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1 bg-white">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 shadow-sm">
            <tr className="text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <th className="p-5 border-b border-slate-100">MDDS Code</th>
              <th className="p-5 border-b border-slate-100">Village Name</th>
              <th className="p-5 border-b border-slate-100">Sub-District</th>
              <th className="p-5 border-b border-slate-100">District</th>
              <th className="p-5 border-b border-slate-100">State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan="5" className="p-20 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="animate-spin text-blue-500" size={40} />
                    <p className="text-lg font-medium text-slate-600">Searching records...</p>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-20 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                    <Search className="text-slate-400" size={24} />
                  </div>
                  <h4 className="text-lg font-medium text-slate-900">No villages found</h4>
                  <p className="text-slate-500 mt-1">Try adjusting your search query.</p>
                </td>
              </tr>
            ) : (
              data.map((village, idx) => (
                <tr key={idx} className="hover:bg-blue-50/50 transition-colors text-sm group">
                  <td className="p-5 font-mono text-slate-400 group-hover:text-blue-600 transition-colors">
                    {village.code}
                  </td>
                  <td className="p-5 font-bold text-slate-800">
                    {village.village_name}
                  </td>
                  <td className="p-5 text-slate-600 font-medium">
                    {village.sub_district_name}
                  </td>
                  <td className="p-5 text-slate-600 font-medium">
                    {village.district_name}
                  </td>
                  <td className="p-5">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm">
                      {village.state_name}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination — shown for both search and browse */}
      {meta && meta.totalPages > 0 && (
        <div className="p-5 border-t border-slate-100 flex items-center justify-between bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] z-20 relative">
          <p className="text-sm font-medium text-slate-500">
            Page <span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded mx-1">{meta.page}</span>
            of <span className="text-slate-900 font-semibold ml-1">{meta.totalPages.toLocaleString()}</span>
            <span className="ml-3 text-slate-400">({meta.total.toLocaleString()} total records)</span>
          </p>
          <div className="flex space-x-3">
            <button 
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 flex items-center space-x-2 border border-slate-200 rounded-xl bg-white text-slate-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm active:scale-95"
            >
              <ChevronLeft size={18} />
              <span>Previous</span>
            </button>
            <button 
              onClick={() => handlePageChange(page + 1)}
              disabled={page === meta.totalPages}
              className="px-4 py-2 flex items-center space-x-2 border border-slate-200 rounded-xl bg-white text-slate-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm active:scale-95"
            >
              <span>Next</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataBrowser;
