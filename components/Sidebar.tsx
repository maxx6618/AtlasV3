
import React from 'react';
import { LayoutDashboard, Table, Plus, Search, Settings, Zap } from 'lucide-react';
import { VerticalData } from '../types';

interface SidebarProps {
  verticals: VerticalData[];
  activeVerticalId: string;
  isDashboardOpen: boolean;
  onVerticalSelect: (id: string) => void;
  onDashboardSelect: () => void;
  onAddVertical: () => void;
  onSettingsClick: () => void;
  isDarkMode: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  verticals, 
  activeVerticalId, 
  isDashboardOpen, 
  onVerticalSelect,
  onDashboardSelect,
  onAddVertical,
  onSettingsClick,
  isDarkMode
}) => {
  return (
    <div className={`w-64 h-full border-r flex flex-col p-4 ${
      isDarkMode
        ? 'bg-[#0f172a] border-[#1e2d3d]'
        : 'bg-white border-neutral-200'
    }`}>
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          isDarkMode ? 'bg-white' : 'bg-gray-900'
        }`}>
          <Zap className={`w-5 h-5 fill-current ${
            isDarkMode ? 'text-black' : 'text-white'
          }`} />
        </div>
        <h1 className={`text-lg font-bold tracking-tight ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>Atlas Intelligence</h1>
      </div>

      <div className="space-y-1 flex-1">
        <button
          onClick={onDashboardSelect}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            isDashboardOpen
              ? isDarkMode
                ? 'bg-[#1e2d3d] text-white'
                : 'bg-neutral-100 text-gray-900'
              : isDarkMode
                ? 'text-[#7b93a8] hover:bg-[#0f172a] hover:text-neutral-200'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-gray-900'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-sm font-medium">Dashboard</span>
        </button>

        <div className={`mt-8 mb-2 px-3 text-[10px] font-bold uppercase tracking-wider ${
          isDarkMode ? 'text-[#5a7a94]' : 'text-neutral-400'
        }`}>
          Verticals
        </div>

        {verticals.map((vertical) => (
          <button
            key={vertical.id}
            onClick={() => onVerticalSelect(vertical.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${
              !isDashboardOpen && activeVerticalId === vertical.id
                ? isDarkMode
                  ? 'bg-[#1e2d3d] text-white'
                  : 'bg-neutral-100 text-gray-900'
                : isDarkMode
                  ? 'text-[#7b93a8] hover:bg-[#0f172a] hover:text-neutral-200'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-gray-900'
            }`}
          >
            <Table className="w-4 h-4" style={{ color: vertical.color }} />
            <span className="text-sm font-medium">{vertical.name}</span>
          </button>
        ))}

        <button 
          onClick={onAddVertical}
          className={`w-full flex items-center gap-3 px-3 py-2 mt-4 rounded-lg transition-colors ${
            isDarkMode
              ? 'text-[#5a7a94] hover:bg-[#0f172a] hover:text-neutral-300'
              : 'text-neutral-500 hover:bg-neutral-50 hover:text-gray-700'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">New Vertical</span>
        </button>
      </div>

      <div className={`pt-4 border-t space-y-1 ${
        isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200'
      }`}>
        <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
          isDarkMode
            ? 'text-[#7b93a8] hover:bg-[#0f172a]'
            : 'text-neutral-600 hover:bg-neutral-50'
        }`}>
          <Search className="w-4 h-4" />
          <span className="text-sm font-medium">Search</span>
        </button>
        <button 
          onClick={onSettingsClick}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            isDarkMode
              ? 'text-[#7b93a8] hover:bg-[#0f172a]'
              : 'text-neutral-600 hover:bg-neutral-50'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span className="text-sm font-medium">Settings</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
