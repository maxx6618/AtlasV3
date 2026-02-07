
import React from 'react';
import { LayoutDashboard, Table, Plus, Search, Settings, Zap } from 'lucide-react';
import { TabData } from '../types';

interface SidebarProps {
  tabs: TabData[];
  activeTabId: string;
  isDashboardOpen: boolean;
  onTabSelect: (id: string) => void;
  onDashboardSelect: () => void;
  onAddTab: () => void;
  onSettingsClick: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  tabs, 
  activeTabId, 
  isDashboardOpen, 
  onTabSelect, 
  onDashboardSelect,
  onAddTab,
  onSettingsClick
}) => {
  return (
    <div className="w-64 h-full bg-[#111] border-r border-neutral-800 flex flex-col p-4">
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
          <Zap className="w-5 h-5 text-black fill-current" />
        </div>
        <h1 className="text-lg font-bold tracking-tight text-white">Atlas Intelligence</h1>
      </div>

      <div className="space-y-1 flex-1">
        <button
          onClick={onDashboardSelect}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            isDashboardOpen ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-sm font-medium">Dashboard</span>
        </button>

        <div className="mt-8 mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
          Verticals
        </div>

        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabSelect(tab.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${
              !isDashboardOpen && activeTabId === tab.id 
                ? 'bg-neutral-800 text-white' 
                : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
            }`}
          >
            <Table className="w-4 h-4" style={{ color: tab.color }} />
            <span className="text-sm font-medium">{tab.name}</span>
          </button>
        ))}

        <button 
          onClick={onAddTab}
          className="w-full flex items-center gap-3 px-3 py-2 mt-4 rounded-lg text-neutral-500 hover:bg-neutral-900 hover:text-neutral-300 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">New Vertical</span>
        </button>
      </div>

      <div className="pt-4 border-t border-neutral-800 space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-400 hover:bg-neutral-900 transition-colors">
          <Search className="w-4 h-4" />
          <span className="text-sm font-medium">Search</span>
        </button>
        <button 
          onClick={onSettingsClick}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-400 hover:bg-neutral-900 transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span className="text-sm font-medium">Settings</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
