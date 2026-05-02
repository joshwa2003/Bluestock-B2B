import React, { useState, useEffect, useMemo } from 'react';
import { Map, Users, TrendingUp, Activity, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatsCard from './StatsCard';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showChart, setShowChart] = useState(false);

  useEffect(() => {
    // Defer chart rendering to avoid blocking main thread on initial load
    const timer = setTimeout(() => setShowChart(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/analytics/dashboard`, {
          headers: {
            'x-api-key': import.meta.env.VITE_API_KEY
          }
        });
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      }
      setLoading(false);
    };

    fetchAnalytics();
  }, []);

  // All hooks MUST be called before any early returns (Rules of Hooks)
  // Format total villages with commas
  const totalVillagesFormatted = data ? data.totalVillages.toLocaleString() : '0';

  // Memoize chart data to prevent unnecessary re-calculations
  const chartData = useMemo(() => data?.topStates || [], [data?.topStates]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Overview</h2>
          <p className="text-slate-500">Welcome to your administrative dashboard.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Villages" 
          value={totalVillagesFormatted} 
          icon={Map} 
          trend={{ value: "Live Data", isPositive: true }} 
        />
        <StatsCard 
          title="Active Users" 
          value="1" 
          icon={Users} 
          trend={{ value: "Admin", isPositive: true }} 
        />
        <StatsCard 
          title="API Requests" 
          value="Active" 
          icon={Activity} 
          trend={{ value: "Tracking", isPositive: true }} 
        />
        <StatsCard 
          title="System Health" 
          value="99.9%" 
          icon={TrendingUp} 
        />
      </div>

      {/* Charts Area */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Top 10 States by Village Count</h3>
        <div className="h-96 w-full">
          {showChart ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b' }}
                  angle={-45}
                  textAnchor="end"
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b' }}
                />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#3b82f6" 
                  radius={[4, 4, 0, 0]} 
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-50/50 rounded-lg border border-slate-100 border-dashed">
              <Loader2 className="animate-spin text-slate-300" size={32} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
