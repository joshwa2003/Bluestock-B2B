import React from 'react';

const StatsCard = ({ title, value, icon: Icon, trend }) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
        {trend && (
          <p className={`text-sm mt-2 ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {trend.isPositive ? '↑' : '↓'} {trend.value} from last month
          </p>
        )}
      </div>
      <div className="bg-blue-50 p-4 rounded-full">
        <Icon className="text-blue-500" size={28} />
      </div>
    </div>
  );
};

export default StatsCard;
