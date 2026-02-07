
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TabData } from '../types';
import { TrendingUp, Users, Database, Globe } from 'lucide-react';

interface DashboardProps {
  tabs: TabData[];
}

const Dashboard: React.FC<DashboardProps> = ({ tabs }) => {
  const [selectedVerticalId, setSelectedVerticalId] = useState<string>('all');

  const filteredTabs = selectedVerticalId === 'all' 
    ? tabs 
    : tabs.filter(t => t.id === selectedVerticalId);

  const totalCompanies = tabs.reduce((acc, tab) => acc + tab.rows.length, 0);
  const totalEnriched = tabs.reduce((acc, tab) => 
    acc + tab.rows.filter(r => r.enriched_data && r.enriched_data.toString().length > 0).length, 0
  );
  const totalSynced = tabs.reduce((acc, tab) => 
    acc + tab.rows.filter(r => r.sync_status === 'Synced').length, 0
  );

  const chartData = tabs.map(tab => ({
    name: tab.name,
    companies: tab.rows.length,
    enriched: tab.rows.filter(r => r.enriched_data).length,
    color: tab.color
  }));

  const pieData = [
    { name: 'Enriched', value: totalEnriched },
    { name: 'Pending', value: totalCompanies - totalEnriched }
  ];

  const COLORS = ['#10B981', '#3F3F46'];

  return (
    <div className="flex-1 bg-[#090909] p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Sourcing Dashboard</h1>
            <p className="text-neutral-500">Aggregate view across all market verticals</p>
          </div>
          <select 
            value={selectedVerticalId}
            onChange={(e) => setSelectedVerticalId(e.target.value)}
            className="bg-[#111] border border-neutral-800 text-sm text-neutral-200 px-4 py-2 rounded-lg outline-none focus:border-neutral-600"
          >
            <option value="all">All Verticals</option>
            {tabs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <StatCard icon={<Users className="w-5 h-5 text-blue-500" />} label="Total Companies" value={totalCompanies} />
          <StatCard icon={<Database className="w-5 h-5 text-emerald-500" />} label="Enriched Leads" value={totalEnriched} />
          <StatCard icon={<Globe className="w-5 h-5 text-purple-500" />} label="Market Verticals" value={tabs.length} />
          <StatCard icon={<TrendingUp className="w-5 h-5 text-amber-500" />} label="HubSpot Synced" value={totalSynced} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#111] border border-neutral-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Vertical Growth</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                  <XAxis dataKey="name" stroke="#555" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#555" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="companies" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
                  <Bar dataKey="enriched" fill="#10B981" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#111] border border-neutral-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Data Completion</h3>
            <div className="h-[300px] flex items-center justify-center flex-col">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#111', border: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 text-center">
                <span className="text-2xl font-bold text-white">{Math.round((totalEnriched/totalCompanies)*100)}%</span>
                <p className="text-xs text-neutral-500 uppercase tracking-widest mt-1">Enriched</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: number }) => (
  <div className="bg-[#111] border border-neutral-800 rounded-xl p-6 flex flex-col items-start">
    <div className="mb-4 p-2 bg-neutral-900 rounded-lg">{icon}</div>
    <span className="text-neutral-500 text-sm font-medium">{label}</span>
    <span className="text-2xl font-bold text-white mt-1">{value}</span>
  </div>
);

export default Dashboard;
