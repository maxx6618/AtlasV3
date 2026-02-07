
import React, { useState } from 'react';
import { X, CloudUpload, CloudDownload, Info, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface CRMSyncModalProps {
  onClose: () => void;
  onSync: (mode: 'all' | 'selected', direction: 'push' | 'pull') => void;
  selectedRowsCount: number;
}

const CRMSyncModal: React.FC<CRMSyncModalProps> = ({ onClose, onSync, selectedRowsCount }) => {
  const [direction, setDirection] = useState<'push' | 'pull'>('push');
  const [mode, setMode] = useState<'all' | 'selected'>(selectedRowsCount > 0 ? 'selected' : 'all');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#111] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-orange-600/10 rounded-lg">
                <CloudUpload className="w-5 h-5 text-orange-500" />
             </div>
             <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">HubSpot Connector</h2>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[10px] text-neutral-500 font-medium">Bi-directional active</p>
                </div>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Sync Direction</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setDirection('push')}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${
                  direction === 'push' ? 'bg-orange-600/10 border-orange-500 text-orange-400' : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:border-neutral-700'
                }`}
              >
                <CloudUpload className="w-6 h-6" />
                <span className="text-xs font-bold">Push to CRM</span>
              </button>
              <button 
                onClick={() => setDirection('pull')}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${
                  direction === 'pull' ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:border-neutral-700'
                }`}
              >
                <CloudDownload className="w-6 h-6" />
                <span className="text-xs font-bold">Pull from CRM</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Selection Mode</label>
            <div className="space-y-2">
              <button 
                onClick={() => setMode('all')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                  mode === 'all' ? 'bg-neutral-800 border-neutral-600 text-white' : 'bg-transparent border-neutral-800 text-neutral-500 hover:border-neutral-700'
                }`}
              >
                <span className="text-xs font-medium">Sync All Rows</span>
                {mode === 'all' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              </button>
              <button 
                disabled={selectedRowsCount === 0}
                onClick={() => setMode('selected')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                  mode === 'selected' ? 'bg-neutral-800 border-neutral-600 text-white' : 'bg-transparent border-neutral-800 text-neutral-500 hover:border-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed'
                }`}
              >
                <span className="text-xs font-medium">Sync Selected ({selectedRowsCount})</span>
                {mode === 'selected' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              </button>
            </div>
          </div>

          <div className="bg-blue-600/5 border border-blue-600/20 p-4 rounded-xl flex gap-3">
             <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
             <p className="text-[11px] text-blue-300 leading-relaxed">
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
