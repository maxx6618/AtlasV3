
import React, { useState } from 'react';
import { Link, X } from 'lucide-react';
import { SheetTab, ColumnDefinition, LinkedColumn } from '../types';

interface LinkColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: LinkedColumn) => void;
  currentSheet: SheetTab;
  allSheets: SheetTab[];
  targetColumnId: string;
  isDarkMode: boolean;
}

const LinkColumnModal: React.FC<LinkColumnModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentSheet,
  allSheets,
  targetColumnId,
  isDarkMode
}) => {
  const [sourceSheetId, setSourceSheetId] = useState<string>('');
  const [sourceColumnId, setSourceColumnId] = useState<string>('');
  const [matchColumnId, setMatchColumnId] = useState<string>('');
  const [sourceMatchColumnId, setSourceMatchColumnId] = useState<string>('id');

  if (!isOpen) return null;

  const availableSheets = allSheets.filter(s => s.id !== currentSheet.id);
  const sourceSheet = allSheets.find(s => s.id === sourceSheetId);
  const availableColumns = currentSheet.columns.filter(c => c.id !== targetColumnId);
  
  const sourceColumns = sourceSheet?.columns || [];
  const sourceMatchColumns = sourceSheet?.columns || [];

  const handleSave = () => {
    if (!sourceSheetId || !sourceColumnId || !matchColumnId) {
      return;
    }

    onSave({
      sourceSheetId,
      sourceColumnId,
      matchColumnId,
      sourceMatchColumnId: sourceMatchColumnId || 'id'
    });
    
    // Reset form
    setSourceSheetId('');
    setSourceColumnId('');
    setMatchColumnId('');
    setSourceMatchColumnId('id');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className={`w-[500px] rounded-2xl shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in duration-200 ${
        isDarkMode ? 'bg-[#1a2638] border border-[#263a4f]' : 'bg-white border border-neutral-200'
      }`}>
        <div className={`flex items-center justify-between pb-4 border-b ${
          isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200'
        }`}>
          <div className="flex items-center gap-3">
            <Link className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <h3 className={`text-sm font-bold uppercase tracking-widest ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Link Column to Sheet
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg text-neutral-500 ${
              isDarkMode ? 'hover:bg-[#1e2d3d]' : 'hover:bg-neutral-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div className="space-y-1">
            <label className={`text-[10px] font-bold uppercase tracking-widest ${
              isDarkMode ? 'text-neutral-400' : 'text-neutral-600'
            }`}>
              Source Sheet
            </label>
            <select
              value={sourceSheetId}
              onChange={(e) => {
                setSourceSheetId(e.target.value);
                setSourceColumnId(''); // Reset source column when sheet changes
              }}
              className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all ${
                isDarkMode
                  ? 'bg-[#131d2e] border border-[#263a4f] text-white'
                  : 'bg-white border border-neutral-300 text-gray-900'
              }`}
            >
              <option value="">Select a sheet...</option>
              {availableSheets.map(sheet => (
                <option key={sheet.id} value={sheet.id}>
                  {sheet.name}
                </option>
              ))}
            </select>
          </div>

          {sourceSheetId && (
            <>
              <div className="space-y-1">
                <label className={`text-[10px] font-bold uppercase tracking-widest ${
                  isDarkMode ? 'text-neutral-400' : 'text-neutral-600'
                }`}>
                  Source Column (to link from)
                </label>
                <select
                  value={sourceColumnId}
                  onChange={(e) => setSourceColumnId(e.target.value)}
                  className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all ${
                    isDarkMode
                      ? 'bg-[#131d2e] border border-[#263a4f] text-white'
                      : 'bg-white border border-neutral-300 text-gray-900'
                  }`}
                >
                  <option value="">Select a column...</option>
                  {sourceColumns.map(col => (
                    <option key={col.id} value={col.id}>
                      {col.header}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-bold uppercase tracking-widest ${
                  isDarkMode ? 'text-neutral-400' : 'text-neutral-600'
                }`}>
                  Match Column (in current sheet)
                </label>
                <select
                  value={matchColumnId}
                  onChange={(e) => setMatchColumnId(e.target.value)}
                  className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all ${
                    isDarkMode
                      ? 'bg-[#131d2e] border border-[#263a4f] text-white'
                      : 'bg-white border border-neutral-300 text-gray-900'
                  }`}
                >
                  <option value="">Select a column...</option>
                  {availableColumns.map(col => (
                    <option key={col.id} value={col.id}>
                      {col.header}
                    </option>
                  ))}
                </select>
                <p className={`text-[10px] mt-1 ${
                  isDarkMode ? 'text-neutral-500' : 'text-neutral-400'
                }`}>
                  This column will be matched against the source sheet's match column
                </p>
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-bold uppercase tracking-widest ${
                  isDarkMode ? 'text-neutral-400' : 'text-neutral-600'
                }`}>
                  Source Match Column (in source sheet)
                </label>
                <select
                  value={sourceMatchColumnId}
                  onChange={(e) => setSourceMatchColumnId(e.target.value)}
                  className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all ${
                    isDarkMode
                      ? 'bg-[#131d2e] border border-[#263a4f] text-white'
                      : 'bg-white border border-neutral-300 text-gray-900'
                  }`}
                >
                  {sourceMatchColumns.map(col => (
                    <option key={col.id} value={col.id}>
                      {col.header} {col.id === 'id' ? '(default)' : ''}
                    </option>
                  ))}
                </select>
                <p className={`text-[10px] mt-1 ${
                  isDarkMode ? 'text-neutral-500' : 'text-neutral-400'
                }`}>
                  Usually "id" - the column that contains unique identifiers
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[#1e2d3d]">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
              isDarkMode
                ? 'text-neutral-400 hover:text-white hover:bg-[#1e2d3d]'
                : 'text-neutral-600 hover:text-gray-900 hover:bg-neutral-100'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!sourceSheetId || !sourceColumnId || !matchColumnId}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              isDarkMode
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            Create Link
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkColumnModal;
