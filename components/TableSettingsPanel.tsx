import React, { useMemo, useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { ColumnDefinition } from '../types';

interface TableSettingsPanelProps {
  onClose: () => void;
  onSave: (payload: {
    name: string;
    description: string;
    autoUpdate: boolean;
    dedupeActive: boolean;
    dedupeColumnId: string;
    dedupeKeep: 'oldest' | 'newest';
  }) => void;
  columns: ColumnDefinition[];
  name: string;
  description?: string;
  autoUpdate?: boolean;
  dedupeActive?: boolean;
  dedupeColumnId?: string;
  dedupeKeep?: 'oldest' | 'newest';
  isDarkMode?: boolean;
}

const TableSettingsPanel: React.FC<TableSettingsPanelProps> = ({
  onClose,
  onSave,
  columns,
  name,
  description,
  autoUpdate,
  dedupeActive,
  dedupeColumnId,
  dedupeKeep,
  isDarkMode = true
}) => {
  const [localName, setLocalName] = useState(name);
  const [localDescription, setLocalDescription] = useState(description || '');
  const [localAutoUpdate, setLocalAutoUpdate] = useState(Boolean(autoUpdate));
  const [localDedupeActive, setLocalDedupeActive] = useState(Boolean(dedupeActive));
  const [localDedupeColumnId, setLocalDedupeColumnId] = useState(dedupeColumnId || '');
  const [localDedupeKeep, setLocalDedupeKeep] = useState<'oldest' | 'newest'>(
    dedupeKeep || 'oldest'
  );

  const selectableColumns = useMemo(
    () => columns.filter(col => Boolean(col.header)),
    [columns]
  );

  const handleSave = () => {
    onSave({
      name: localName.trim() || name,
      description: localDescription.trim(),
      autoUpdate: localAutoUpdate,
      dedupeActive: localDedupeActive,
      dedupeColumnId: localDedupeColumnId,
      dedupeKeep: localDedupeKeep
    });
  };

  const bg = isDarkMode ? 'bg-[#131d2e]' : 'bg-white';
  const bgBody = isDarkMode ? 'bg-[#0d1526]' : 'bg-neutral-50';
  const border = isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200';
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900';
  const inputCls = `w-full rounded-xl px-3 text-sm focus:outline-none focus:border-blue-500 transition-all ${
    isDarkMode
      ? 'bg-[#131d2e] border border-[#1e2d3d] text-white'
      : 'bg-white border border-neutral-300 text-gray-900'
  }`;

  return (
    <div className="fixed inset-0 z-[500] flex justify-end">
      <style>{`
        .table-settings-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .table-settings-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .table-settings-scroll::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? '#4a5568' : '#9ca3af'};
          border-radius: 4px;
        }
        .table-settings-scroll::-webkit-scrollbar-thumb:hover {
          background: ${isDarkMode ? '#6b7280' : '#6b7280'};
        }
      `}</style>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className={`relative h-full w-full max-w-sm ${bg} border-l ${border} shadow-2xl flex flex-col`}>
        <div className={`p-3 border-b ${border} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <h2 className={`text-xs font-bold ${textPrimary} uppercase tracking-widest`}>Table Settings</h2>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg text-neutral-500 ${isDarkMode ? 'hover:bg-[#1e2d3d]' : 'hover:bg-neutral-100'}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div 
          className={`flex-1 overflow-y-auto p-3 space-y-3 table-settings-scroll ${bgBody}`}
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: isDarkMode ? '#4a5568 transparent' : '#9ca3af transparent'
          }}
        >
          <div className="space-y-1.5">
            <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Name</label>
            <input
              className={`${inputCls} py-2 text-xs`}
              value={localName}
              onChange={e => setLocalName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Description</label>
            <textarea
              rows={2}
              className={`${inputCls} resize-none py-2 text-xs`}
              placeholder="Briefly describe what this table contains"
              value={localDescription}
              onChange={e => setLocalDescription(e.target.value)}
            />
          </div>

          <div className={`space-y-2 pt-1.5 border-t ${border}`}>
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Auto-update</label>
              <button
                onClick={() => setLocalAutoUpdate(prev => !prev)}
                className={`w-10 h-5 rounded-full flex items-center transition-all ${
                  localAutoUpdate ? 'bg-blue-600' : isDarkMode ? 'bg-[#1e2d3d]' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`w-4 h-4 bg-white rounded-full shadow transition-all ${
                    localAutoUpdate ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <p className="text-[10px] text-neutral-500">
              Automatically run agents when dependent cells are edited or new rows are created.
            </p>
          </div>

          <div className={`space-y-2 pt-1.5 border-t ${border}`}>
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Deduplication</label>
              <button
                onClick={() => setLocalDedupeActive(prev => !prev)}
                className={`w-10 h-5 rounded-full flex items-center transition-all ${
                  localDedupeActive ? 'bg-red-600' : isDarkMode ? 'bg-[#1e2d3d]' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`w-4 h-4 bg-white rounded-full shadow transition-all ${
                    localDedupeActive ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Dedupe via column</label>
              <select
                value={localDedupeColumnId}
                onChange={e => setLocalDedupeColumnId(e.target.value)}
                className={`w-full rounded-xl px-3 py-1.5 text-xs outline-none ${
                  isDarkMode
                    ? 'bg-[#131d2e] border border-[#1e2d3d] text-white'
                    : 'bg-white border border-neutral-300 text-gray-900'
                }`}
              >
                <option value="">Select a column</option>
                {selectableColumns.map(col => (
                  <option key={col.id} value={col.id}>
                    {col.header}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-neutral-500">
                Auto-dedupe can be active on only one column at a time.
              </p>
            </div>

            <div className={`rounded-xl p-1 flex border ${isDarkMode ? 'bg-[#131d2e] border-[#1e2d3d]' : 'bg-neutral-100 border-neutral-200'}`}>
              <button
                onClick={() => setLocalDedupeKeep('oldest')}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${
                  localDedupeKeep === 'oldest'
                    ? isDarkMode ? 'bg-[#1e2d3d] text-white' : 'bg-white text-gray-900 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                Keep oldest row
              </button>
              <button
                onClick={() => setLocalDedupeKeep('newest')}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${
                  localDedupeKeep === 'newest'
                    ? isDarkMode ? 'bg-[#1e2d3d] text-white' : 'bg-white text-gray-900 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                Keep newest row
              </button>
            </div>
          </div>
        </div>

        <div className={`p-3 border-t ${border} ${bgBody}`}>
          <button
            onClick={handleSave}
            className={`w-full text-xs font-bold py-2 rounded-xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 ${
              isDarkMode
                ? 'bg-white hover:bg-neutral-200 text-black'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default TableSettingsPanel;
