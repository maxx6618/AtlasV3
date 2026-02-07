
import React, { useState, useRef, useEffect } from 'react';
import { ColumnDefinition, RowData, ColumnType } from '../types';
import { Plus, ChevronDown, Square, MoreVertical, Trash2, Bot, Play, Settings2, ArrowDown, ArrowUp, ArrowLeft, ArrowRight, Loader2, Braces, Eye, CheckSquare, X } from 'lucide-react';
import EnrichmentPopup from './EnrichmentPopup';

interface GridProps {
  columns: ColumnDefinition[];
  rows: RowData[];
  selectedCell: { rowId: string, colId: string } | null;
  selectedRows: Set<string>;
  onSelectCell: (rowId: string, colId: string) => void;
  onSelectRow: (rowId: string, multi: boolean) => void;
  onCellChange: (rowId: string, colId: string, value: any) => void;
  onAddColumn: (col: Partial<ColumnDefinition>, index?: number) => void;
  onUpdateColumn: (colId: string, updates: Partial<ColumnDefinition>) => void;
  onRunAgent: (agentId: string) => void;
  onConfigureAgent: (colId: string) => void;
  processingCells?: Set<string>; 
  onMapEnrichmentData?: (rowId: string, key: string, value: any) => void; // New prop
}

const Grid: React.FC<GridProps> = ({ 
  columns, 
  rows, 
  selectedCell, 
  selectedRows, 
  onSelectCell, 
  onSelectRow, 
  onCellChange, 
  onAddColumn,
  onUpdateColumn,
  onRunAgent,
  onConfigureAgent,
  processingCells,
  onMapEnrichmentData
}) => {
  const [activeMenuColId, setActiveMenuColId] = useState<string | null>(null);
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [editColState, setEditColState] = useState<Partial<ColumnDefinition>>({});

  // Enrichment Panel State
  const [enrichmentPopup, setEnrichmentPopup] = useState<{
    isOpen: boolean;
    rowId: string;
    colId: string;
    data: Record<string, any>;
  } | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuColId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openEditModal = (col: ColumnDefinition) => {
    setEditingColId(col.id);
    setEditColState({ 
        ...col,
        deduplication: col.deduplication || { active: false, keep: 'oldest' }
    });
    setActiveMenuColId(null);
  };

  const saveColumnEdits = () => {
    if (editingColId && editColState) {
        onUpdateColumn(editingColId, editColState);
        setEditingColId(null);
    }
  };

  const handleInsertColumn = (index: number) => {
      onAddColumn({ header: 'New Field', type: ColumnType.TEXT, width: 180 }, index);
      setActiveMenuColId(null);
  };

  const toggleDeduplication = (col: ColumnDefinition, mode: 'oldest' | 'newest') => {
    const isActive = col.deduplication?.active;
    const currentMode = col.deduplication?.keep;

    if (isActive && currentMode === mode) {
      onUpdateColumn(col.id, { deduplication: { active: false, keep: mode } });
    } else {
      onUpdateColumn(col.id, { deduplication: { active: true, keep: mode } });
    }
  };

  const handleEnrichmentClick = (e: React.MouseEvent, row: RowData, col: ColumnDefinition) => {
      e.stopPropagation();
      const rawValue = row[col.id];
      let data = {};
      try {
          if (typeof rawValue === 'string') {
              data = JSON.parse(rawValue);
          } else if (typeof rawValue === 'object' && rawValue !== null) {
              data = rawValue;
          }
      } catch (err) {
          data = {};
      }

      setEnrichmentPopup({
          isOpen: true,
          rowId: row.id,
          colId: col.id,
          data
      });
      onSelectCell(row.id, col.id);
  };

  const renderCell = (row: RowData, col: ColumnDefinition) => {
    const isProcessing = processingCells?.has(`${row.id}:${col.id}`);
    
    if (isProcessing) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-blue-400 font-bold bg-blue-500/5 h-full w-full animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                Thinking...
            </div>
        );
    }

    const value = row[col.id];
    const isSelected = selectedCell?.rowId === row.id && selectedCell?.colId === col.id;

    switch (col.type) {
      case ColumnType.ENRICHMENT:
        let parsedData = {};
        let keyCount = 0;
        try {
             parsedData = typeof value === 'string' ? JSON.parse(value) : value || {};
             keyCount = Object.keys(parsedData).length;
        } catch(e) {}

        if (!value) {
             return (
                 <div 
                    className="w-full h-full px-3 flex items-center text-neutral-600 italic text-xs cursor-default"
                    onClick={() => onSelectCell(row.id, col.id)}
                 >
                     Empty
                 </div>
             );
        }

        return (
          <div 
            className={`w-full h-full px-3 py-1 flex items-center cursor-pointer transition-colors ${isSelected ? 'bg-blue-600/10' : 'hover:bg-[#151515]'}`}
            onClick={(e) => handleEnrichmentClick(e, row, col)}
          >
             <div className={`flex items-center gap-2 px-2 py-1 rounded-md border text-xs font-medium font-mono ${isSelected ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-neutral-800 border-neutral-700 text-neutral-300'}`}>
                <Braces className="w-3 h-3" />
                <span>JSON</span>
                <span className="w-px h-3 bg-current opacity-30" />
                <span>{keyCount} Fields</span>
             </div>
          </div>
        );

      case ColumnType.SELECT:
        return (
          <div 
            className={`relative group/select w-full h-full flex items-center px-3 ${isSelected ? 'bg-blue-600/5' : ''}`}
            onClick={() => onSelectCell(row.id, col.id)}
          >
            <select
              value={value?.toString() || ''}
              onChange={(e) => onCellChange(row.id, col.id, e.target.value)}
              className="appearance-none bg-transparent w-full text-sm outline-none cursor-pointer z-10"
            >
              <option value="" className="bg-[#111]">Select...</option>
              {col.options?.map(opt => (
                <option key={opt.id} value={opt.label} className="bg-[#111]">{opt.label}</option>
              ))}
            </select>
            {value && (() => {
              const optColor = col.options?.find(o => o.label === value)?.color;
              return (
                <div
                  className="absolute left-2 px-2 py-0.5 rounded text-[10px] font-bold pointer-events-none"
                  style={{
                    backgroundColor: optColor ? optColor + '33' : '#333',
                    color: optColor || '#fff',
                    border: `1px solid ${optColor ? optColor + '55' : '#44444455'}`
                  }}
                >
                  {value.toString()}
                </div>
              );
            })()}
            <ChevronDown className="w-3 h-3 ml-auto text-neutral-600 group-hover/select:text-neutral-400" />
          </div>
        );

      case ColumnType.FORMULA:
        return (
          <div 
            className={`px-3 py-2 text-sm h-full flex items-center w-full transition-colors cursor-default truncate ${
              isSelected ? 'bg-blue-600/10 text-white' : 'text-neutral-400 italic'
            }`}
            onClick={() => onSelectCell(row.id, col.id)}
          >
            {value?.toString() || 'Calculating...'}
          </div>
        );

      case ColumnType.NUMBER:
        return (
          <input
            type="number"
            value={value?.toString() || ''}
            onFocus={() => onSelectCell(row.id, col.id)}
            onChange={(e) => onCellChange(row.id, col.id, e.target.value)}
            className={`notion-input px-3 py-2 text-sm text-right font-mono transition-colors ${
              isSelected ? 'bg-blue-600/5 text-white' : 'text-neutral-300'
            }`}
            placeholder="0"
          />
        );

      default:
        return (
          <input
            type="text"
            value={value?.toString() || ''}
            onFocus={() => onSelectCell(row.id, col.id)}
            onChange={(e) => onCellChange(row.id, col.id, e.target.value)}
            className={`notion-input px-3 py-2 text-sm transition-colors ${
              isSelected ? 'bg-blue-600/5 text-white' : 'text-neutral-300 focus:text-white'
            }`}
          />
        );
    }
  };

  const getColumnLetter = (index: number) => {
    let letter = '';
    while (index >= 0) {
      letter = String.fromCharCode((index % 26) + 65) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  };

  // Identify mapped columns for the active popup
  const mappedFieldKeys = new Set<string>();
  if (enrichmentPopup) {
      columns.forEach(c => mappedFieldKeys.add(c.header));
  }

  return (
    <div className="flex-1 overflow-auto bg-[#090909] relative">
      
      {/* Enrichment Side Panel */}
      {enrichmentPopup?.isOpen && (
          <>
             <div className="fixed inset-0 z-[400] bg-black/20 backdrop-blur-[1px]" onClick={() => setEnrichmentPopup(null)} />
             <EnrichmentPopup 
                data={enrichmentPopup.data}
                onClose={() => setEnrichmentPopup(null)}
                onMapField={(key, val) => {
                    if (onMapEnrichmentData) onMapEnrichmentData(enrichmentPopup.rowId, key, val);
                }}
                mappedFields={mappedFieldKeys}
             />
          </>
      )}

      {/* Edit Column Modal */}
      {editingColId && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="w-96 bg-[#1a1a1a] border border-neutral-700 rounded-2xl shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Edit Field Settings</h3>
                    <button onClick={() => setEditingColId(null)} className="hover:bg-neutral-800 p-2 rounded-lg text-neutral-500"><X className="w-5 h-5"/></button>
                </div>
                
                <div className="space-y-5">
                    <div className="space-y-1">
                        <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Field Name</label>
                        <input 
                            className="w-full bg-[#111] border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                            value={editColState.header}
                            onChange={e => setEditColState({...editColState, header: e.target.value})}
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Data Type</label>
                            <select 
                                className="w-full bg-[#111] border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white outline-none"
                                value={editColState.type}
                                onChange={e => setEditColState({...editColState, type: e.target.value as ColumnType})}
                            >
                                <option value={ColumnType.TEXT}>Text</option>
                                <option value={ColumnType.NUMBER}>Number</option>
                                <option value={ColumnType.SELECT}>Select</option>
                                <option value={ColumnType.FORMULA}>Formula</option>
                                <option value={ColumnType.ENRICHMENT}>Enrichment JSON</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Width (px)</label>
                            <input 
                                type="number"
                                className="w-full bg-[#111] border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                                value={editColState.width}
                                onChange={e => setEditColState({...editColState, width: parseInt(e.target.value) || 100})}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                         <div className="flex justify-between">
                            <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Default Value / Formula</label>
                            {editColState.type === ColumnType.FORMULA && <span className="text-[9px] text-blue-500 font-bold">Use /col_id</span>}
                         </div>
                        <input 
                            className="w-full bg-[#111] border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-blue-500 transition-all"
                            placeholder={editColState.type === ColumnType.FORMULA ? "e.g. /price * 1.2" : "e.g. TBD"}
                            value={editColState.type === ColumnType.FORMULA ? editColState.formula : editColState.defaultValue || ''}
                            onChange={e => {
                                if (editColState.type === ColumnType.FORMULA) {
                                    setEditColState({...editColState, formula: e.target.value});
                                } else {
                                    setEditColState({...editColState, defaultValue: e.target.value});
                                }
                            }}
                        />
                    </div>

                    {/* Auto-Delete Section */}
                    <div className="space-y-2 pt-4 border-t border-neutral-800">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Uniqueness Check</label>
                            <div className={`text-[10px] font-bold px-2 py-0.5 rounded ${editColState.deduplication?.active ? 'bg-red-500/20 text-red-400' : 'bg-neutral-800 text-neutral-500'}`}>
                                {editColState.deduplication?.active ? 'Active' : 'Off'}
                            </div>
                        </div>
                        
                        <div className="bg-[#111] border border-neutral-700 rounded-xl p-1 flex">
                             <button 
                                onClick={() => setEditColState({ ...editColState, deduplication: { active: false, keep: 'oldest' } })}
                                className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-colors ${!editColState.deduplication?.active ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                             >
                                Allow Duplicates
                             </button>
                             <button 
                                onClick={() => setEditColState({ ...editColState, deduplication: { active: true, keep: 'oldest' } })}
                                className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-colors ${editColState.deduplication?.active ? 'bg-red-600 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                             >
                                Auto-Delete
                             </button>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={saveColumnEdits}
                    className="w-full bg-white hover:bg-neutral-200 text-black text-xs font-bold py-3.5 rounded-xl transition-all shadow-xl active:scale-95"
                >
                    Save Changes
                </button>
            </div>
        </div>
      )}

      <div className="min-w-max border-collapse">
        
        {/* Spreadsheet Header (A, B, C...) */}
        <div className="flex bg-[#161616] sticky top-0 z-20 h-6 border-b border-neutral-800">
             <div className="w-12 border-r border-neutral-800 bg-[#161616]" /> {/* Index col spacer */}
             <div className="w-10 border-r border-neutral-800 bg-[#161616]" /> {/* Checkbox col spacer */}
             {columns.map((col, idx) => (
                 <div key={col.id} style={{ width: col.width }} className="border-r border-neutral-800 flex items-center justify-center text-[9px] font-bold text-neutral-500">
                     {getColumnLetter(idx)}
                 </div>
             ))}
             <div className="flex-1" />
        </div>

        {/* Main Header */}
        <div className="flex border-b border-neutral-800 bg-[#0F0F0F] sticky top-6 z-10 h-10">
          <div className="w-12 border-r border-neutral-800 flex items-center justify-center text-[10px] text-neutral-600 font-mono bg-[#111]">
            #
          </div>
          <div className="w-10 border-r border-neutral-800 flex items-center justify-center bg-[#111]">
             <Square className="w-3.5 h-3.5 text-neutral-700" />
          </div>
          {columns.map((col, index) => (
            <div
              key={col.id}
              style={{ width: col.width }}
              className="relative px-3 py-2 border-r border-neutral-800 text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center justify-between group bg-[#0F0F0F] hover:bg-[#1a1a1a] transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                {col.deduplication?.active && (
                    <div className="text-red-500 animate-pulse" title="Auto-delete active">
                        <Trash2 className="w-3 h-3" />
                    </div>
                )}
                {col.connectedAgentId && (
                    <div className="text-blue-500" title="Agent Connected">
                        <Bot className="w-3 h-3" />
                    </div>
                )}
                <span className={col.deduplication?.active ? 'text-white' : ''}>{col.header}</span>
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {col.connectedAgentId ? (
                    <button 
                        onClick={() => onRunAgent(col.connectedAgentId!)}
                        className="p-1 hover:bg-blue-600 hover:text-white rounded text-blue-500 transition-colors"
                        title="Run Agent"
                    >
                        <Play className="w-3 h-3 fill-current" />
                    </button>
                ) : (
                    <button 
                        onClick={() => onConfigureAgent(col.id)}
                        className="p-1 hover:bg-neutral-700 rounded text-neutral-600 hover:text-white transition-colors"
                        title="Configure Agent"
                    >
                        <Settings2 className="w-3 h-3" />
                    </button>
                )}
                
                <button 
                    onClick={() => setActiveMenuColId(activeMenuColId === col.id ? null : col.id)}
                    className={`p-1 rounded transition-colors ${activeMenuColId === col.id ? 'bg-neutral-800 text-white' : 'hover:bg-neutral-800 text-neutral-600 hover:text-white'}`}
                >
                    <MoreVertical className="w-3 h-3" />
                </button>
              </div>

              {/* Column Menu */}
              {activeMenuColId === col.id && (
                  <div ref={menuRef} className="absolute top-full right-2 mt-1 w-56 bg-[#1a1a1a] border border-neutral-700 rounded-xl shadow-2xl z-[50] py-1 animate-in fade-in zoom-in-95 duration-200">
                      <div className="px-3 py-2 border-b border-neutral-800">
                          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Column Actions</span>
                      </div>

                      <div className="p-1 border-b border-neutral-800">
                         <button onClick={() => openEditModal(col)} className="w-full text-left px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 rounded-lg flex items-center gap-2 font-medium transition-colors">
                            <Settings2 className="w-3.5 h-3.5" />
                            Edit Settings
                         </button>
                         <button onClick={() => handleInsertColumn(index)} className="w-full text-left px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 rounded-lg flex items-center gap-2 font-medium transition-colors">
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Insert Left
                         </button>
                         <button onClick={() => handleInsertColumn(index + 1)} className="w-full text-left px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 rounded-lg flex items-center gap-2 font-medium transition-colors">
                            <ArrowRight className="w-3.5 h-3.5" />
                            Insert Right
                         </button>
                      </div>
                  </div>
              )}
            </div>
          ))}
          <button 
            onClick={() => onAddColumn({ header: 'New Field', type: ColumnType.TEXT, width: 180 })}
            className="px-4 hover:bg-neutral-800 transition-colors border-r border-neutral-800 flex items-center justify-center bg-[#0F0F0F] min-w-[50px] group"
          >
            <Plus className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
             <div className="w-12 h-12 bg-neutral-900 rounded-full flex items-center justify-center mb-4">
                <Plus className="w-6 h-6 text-neutral-700" />
             </div>
             <p className="text-neutral-500 text-sm">No data in this vertical. Start by adding a row.</p>
          </div>
        ) : rows.map((row, index) => {
          const isRowSelected = selectedRows.has(row.id);
          return (
            <div key={row.id} className={`flex border-b border-neutral-800 group h-10 transition-colors ${isRowSelected ? 'bg-blue-600/10' : 'hover:bg-[#111]'}`}>
              <div className="w-12 border-r border-neutral-800 flex items-center justify-center text-[10px] text-neutral-600 font-mono bg-[#0F0F0F] group-hover:bg-[#151515]">
                {index + 1}
              </div>
              <div 
                className="w-10 border-r border-neutral-800 flex items-center justify-center cursor-pointer"
                onClick={(e) => onSelectRow(row.id, e.shiftKey || e.metaKey)}
              >
                {isRowSelected ? (
                  <CheckSquare className="w-4 h-4 text-blue-500 fill-current" />
                ) : (
                  <Square className="w-4 h-4 text-neutral-700 group-hover:text-neutral-500" />
                )}
              </div>
              {columns.map((col) => (
                <div
                  key={col.id}
                  style={{ width: col.width }}
                  className={`border-r border-neutral-800 notion-cell transition-all flex items-center h-full ${
                    selectedCell?.rowId === row.id && selectedCell?.colId === col.id ? 'ring-1 ring-inset ring-blue-500 bg-blue-500/5' : ''
                  }`}
                >
                  {renderCell(row, col)}
                </div>
              ))}
              <div className="flex-1" />
            </div>
          );
        })}
        <div className="h-40" />
      </div>
    </div>
  );
};

export default Grid;
