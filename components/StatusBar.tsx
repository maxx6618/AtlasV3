import React from 'react';
import { CheckCircle, Loader2, Settings, Square } from 'lucide-react';

interface StatusBarProps {
  isProcessing: boolean;
  onStop: () => void;
  onOpenTableSettings: () => void;
  isDarkMode: boolean;
}

const StatusBar: React.FC<StatusBarProps> = ({
  isProcessing,
  onStop,
  onOpenTableSettings,
  isDarkMode
}) => {
  return (
    <div
      className={`h-9 border-t flex items-center justify-between px-3 shrink-0 text-[10px] font-bold uppercase tracking-widest ${
        isDarkMode
          ? 'bg-[#0f172a] border-[#1e2d3d] text-[#5a7a94]'
          : 'bg-neutral-50 border-neutral-200 text-neutral-500'
      }`}
    >
      <div className="flex items-center gap-2">
        {isProcessing ? (
          <>
            <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
            <span className="text-blue-400">Processing...</span>
          </>
        ) : (
          <>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span className={isDarkMode ? 'text-[#5a7a94]' : 'text-neutral-600'}>Table up to date</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onStop}
          disabled={!isProcessing}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
            isProcessing
              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
              : isDarkMode
                ? 'text-[#4a6078] cursor-not-allowed'
                : 'text-neutral-400 cursor-not-allowed'
          }`}
          title="Stop all runs"
        >
          <Square className="w-2.5 h-2.5" />
          Stop
        </button>

        <button
          onClick={onOpenTableSettings}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
            isDarkMode
              ? 'text-[#5a7a94] hover:text-neutral-300 hover:bg-[#1e2d3d]'
              : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100'
          }`}
          title="Table Settings"
        >
          <Settings className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default StatusBar;
