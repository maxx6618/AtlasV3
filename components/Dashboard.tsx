
import React, { useState } from 'react';
import { VerticalData } from '../types';
import { TrendingUp, Users, Database, Globe } from 'lucide-react';

interface DashboardProps {
  verticals: VerticalData[];
}

const Dashboard: React.FC<DashboardProps> = ({ verticals }) => {
  const [selectedVerticalId, setSelectedVerticalId] = useState<string>('all');

  const filteredVerticals = selectedVerticalId === 'all' 
    ? verticals 
    : verticals.filter(v => v.id === selectedVerticalId);

  // Aggregate across all sheets in each vertical
  const totalRows = filteredVerticals.reduce(
    (acc, v) => acc + v.sheets.reduce((s, sheet) => s + sheet.rows.length, 0), 0
  );
  const totalSheets = filteredVerticals.reduce((acc, v) => acc + v.sheets.length, 0);
  const totalEnriched = filteredVerticals.reduce(
    (acc, v) => acc + v.sheets.reduce(
      (s, sheet) => s + sheet.rows.filter(r => {
        return sheet.columns.some(c => c.type === 'ENRICHMENT' as any && r[c.id] && r[c.id].toString().length > 2);
      }).length, 0
    ), 0
  );

  const enrichedPct = totalRows > 0 ? Math.round((totalEnriched / totalRows) * 100) : 0;

  return (
    <div className="flex-1 bg-[#0b1120] p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Sourcing Dashboard</h1>
            <p className="text-[#5a7a94]">Aggregate view across all market verticals</p>
          </div>
          <select 
            value={selectedVerticalId}
            onChange={(e) => setSelectedVerticalId(e.target.value)}
            className="bg-[#131d2e] border border-[#1e2d3d] text-sm text-neutral-200 px-4 py-2 rounded-lg outline-none focus:border-neutral-600"
          >
            <option value="all">All Verticals</option>
            {verticals.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <StatCard icon={<Users className="w-5 h-5 text-blue-500" />} label="Total Rows" value={totalRows} />
          <StatCard icon={<Database className="w-5 h-5 text-emerald-500" />} label="Enriched Rows" value={totalEnriched} />
          <StatCard icon={<Globe className="w-5 h-5 text-purple-500" />} label="Market Verticals" value={verticals.length} />
          <StatCard icon={<TrendingUp className="w-5 h-5 text-amber-500" />} label="Total Sheets" value={totalSheets} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#131d2e] border border-[#1e2d3d] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Data Completion</h3>
            <p className="text-[#5a7a94] text-sm mb-6">
              Quick overview of enrichment progress across the selected verticals.
            </p>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="h-2 bg-[#1e2d3d] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${enrichedPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-[#5a7a94]">
                  <span>{totalEnriched} enriched</span>
                  <span>{Math.max(0, totalRows - totalEnriched)} pending</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-white">{enrichedPct}%</span>
                <p className="text-xs text-[#5a7a94] uppercase tracking-widest mt-1">Enriched</p>
              </div>
            </div>
          </div>

          <div className="bg-[#131d2e] border border-[#1e2d3d] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Vertical Coverage</h3>
            <p className="text-[#5a7a94] text-sm mb-6">
              Total sheets and rows across the selected market verticals.
            </p>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-[#5a7a94] uppercase tracking-widest">Sheets</div>
                <div className="text-2xl font-bold text-white">{totalSheets}</div>
              </div>
              <div>
                <div className="text-xs text-[#5a7a94] uppercase tracking-widest">Rows</div>
                <div className="text-2xl font-bold text-white">{totalRows}</div>
              </div>
              <div>
                <div className="text-xs text-[#5a7a94] uppercase tracking-widest">Verticals</div>
                <div className="text-2xl font-bold text-white">{filteredVerticals.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: number }) => (
  <div className="bg-[#131d2e] border border-[#1e2d3d] rounded-xl p-6 flex flex-col items-start">
    <div className="mb-4 p-2 bg-[#0f172a] rounded-lg">{icon}</div>
    <span className="text-[#5a7a94] text-sm font-medium">{label}</span>
    <span className="text-2xl font-bold text-white mt-1">{value}</span>
  </div>
);

export default Dashboard;
