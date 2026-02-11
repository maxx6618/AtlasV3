
import React, { useState } from 'react';
import { X, CloudUpload, CloudDownload, Info, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface CRMSyncModalProps {
  onClose: () => void;
  onSync: (mode: 'all' | 'selected', direction: 'push' | 'pull') => void;
  selectedRowsCount: number;
  isDarkMode: boolean;
}

const CRMSyncModal: React.FC<CRMSyncModalProps> = ({ onClose, onSync, selectedRowsCount, isDarkMode }) => {
  const [direction, setDirection] = useState<'push' | 'pull'>('push');
  const [mode, setMode] = useState<'all' | 'selected'>(selectedRowsCount > 0 ? 'selected' : 'all');

  const bgMain = isDarkMode ? 'bg-[#0b1120]' : 'bg-white';
  const bgSecondary = isDarkMode ? 'bg-[#0f172a]' : 'bg-neutral-50';
  const bgTertiary = isDarkMode ? 'bg-[#1e2d3d]' : 'bg-neutral-100';
  const borderMain = isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200';
  const borderSecondary = isDarkMode ? 'border-[#263a4f]' : 'border-neutral-300';
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-neutral-500' : 'text-neutral-600';
  const hoverBg = isDarkMode ? 'hover:bg-[#1e2d3d]' : 'hover:bg-neutral-100';

  return (
    <div className="fixed inset-0 z-[200]" onClick={onClose}>
      <div className={`absolute top-0 right-0 h-screen w-[450px] ${bgMain} border-l ${borderMain} shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300`} onClick={e => e.stopPropagation()}>
        <div className={`p-4 border-b ${borderMain} flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-3">
             <div className="p-2 bg-orange-600/10 rounded-lg">
                <CloudUpload className="w-5 h-5 text-orange-500" />
             </div>
             <div>
                <h2 className={`text-sm font-bold ${textPrimary} uppercase tracking-wider`}>HubSpot Connector</h2>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className={`text-[10px] ${textSecondary} font-medium`}>Bi-directional active</p>
                </div>
             </div>
          </div>
          <button onClick={onClose} className={`p-2 ${hoverBg} rounded-lg ${textSecondary} ${isDarkMode ? 'hover:text-white' : 'hover:text-gray-900'} transition-colors`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <label className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest`}>Sync Direction</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setDirection('push')}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${
                  direction === 'push' ? 'bg-orange-600/10 border-orange-500 text-orange-400' : `${bgSecondary} ${borderMain} ${textSecondary} ${isDarkMode ? 'hover:border-[#263a4f]' : 'hover:border-neutral-300'}`
                }`}
              >
                <CloudUpload className="w-6 h-6" />
                <span className="text-xs font-bold">Push to CRM</span>
              </button>
              <button 
                onClick={() => setDirection('pull')}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${
                  direction === 'pull' ? 'bg-blue-600/10 border-blue-500 text-blue-400' : `${bgSecondary} ${borderMain} ${textSecondary} ${isDarkMode ? 'hover:border-[#263a4f]' : 'hover:border-neutral-300'}`
                }`}
              >
                <CloudDownload className="w-6 h-6" />
                <span className="text-xs font-bold">Pull from CRM</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest`}>Selection Mode</label>
            <div className="space-y-2">
              <button 
                onClick={() => setMode('all')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                  mode === 'all' ? `${bgTertiary} ${isDarkMode ? 'border-neutral-600' : 'border-neutral-300'} ${textPrimary}` : `bg-transparent ${borderMain} ${textSecondary} ${isDarkMode ? 'hover:border-[#263a4f]' : 'hover:border-neutral-300'}`
                }`}
              >
                <span className="text-xs font-medium">Sync All Rows</span>
                {mode === 'all' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              </button>
              <button 
                disabled={selectedRowsCount === 0}
                onClick={() => setMode('selected')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                  mode === 'selected' ? `${bgTertiary} ${isDarkMode ? 'border-neutral-600' : 'border-neutral-300'} ${textPrimary}` : `bg-transparent ${borderMain} ${textSecondary} ${isDarkMode ? 'hover:border-[#263a4f]' : 'hover:border-neutral-300'} disabled:opacity-30 disabled:cursor-not-allowed`
                }`}
              >
                <span className="text-xs font-medium">Sync Selected ({selectedRowsCount})</span>
                {mode === 'selected' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              </button>
            </div>
          </div>

          <div className="bg-blue-600/5 border border-blue-600/20 p-4 rounded-xl flex gap-3">
             <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
             <p className={`text-[11px] ${isDarkMode ? 'text-blue-300' : 'text-blue-700'} leading-relaxed`}>
               Atlas verifies data integrity before syncing. All mappings are automatically resolved using Gemini Intelligence.
             </p>
          </div>

          <button 
            onClick={() => onSync(mode, direction)}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-95"
          >
            Start HubSpot Sync
          </button>
        </div>
      </div>
    </div>
  );
};

export default CRMSyncModal;
