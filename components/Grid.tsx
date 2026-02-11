
import React, { useState, useRef, useEffect } from 'react';
import { ColumnDefinition, RowData, ColumnType, SelectOption, FilterState, FilterCondition, ColumnSearch, MergeInput } from '../types';
import { Plus, ChevronDown, Square, Trash2, Bot, Play, Settings2, ArrowDown, ArrowUp, ArrowLeft, ArrowRight, Loader2, Braces, Eye, CheckSquare, X, Users, ChevronRight, Pencil, FileText, Palette, Type, Copy, Filter, Pin, EyeOff, Scissors, ClipboardPaste, Rows, Trash, Search, Hash, DollarSign, Calendar, Link2, AtSign, Image as ImageIcon, Globe, MessageSquare, GitBranch, Merge, List, Sparkles, ExternalLink, Link } from 'lucide-react';
import EnrichmentPopup from './EnrichmentPopup';

interface GridProps {
  columns: ColumnDefinition[];
  rows: RowData[];
  selectedCell: { rowId: string, colId: string } | null;
  selectedRows: Set<string>;
  onSelectCell: (rowId: string, colId: string) => void;
  onSelectRow: (rowId: string, multi: boolean) => void;
  onCellChange: (rowId: string, colId: string, value: any) => void;
  onInsertRow: (index: number) => void;
  onDeleteRow: (rowId: string) => void;
  onRunCell: (rowId: string, colId: string) => void;
  onAddColumn: (col: Partial<ColumnDefinition>, index?: number) => void;
  onUpdateColumn: (colId: string, updates: Partial<ColumnDefinition>) => void;
  onDeleteColumn: (colId: string) => void;
  onDuplicateColumn: (colId: string) => void;
  onSortColumn: (colId: string, direction: 'asc' | 'desc') => void;
  onPinColumn: (colId: string) => void;
  onHideColumn: (colId: string) => void;
  onRunAgent: (agentId: string, rowIds?: string[]) => void;
  onRunHttpRequest: (configId: string, targetRowId?: string) => void;
  onRunOwnership?: (targetRowId?: string) => void;
  onConfigureHttpRequest?: (colId: string) => void;
  onConfigureAgent: (colId: string) => void;
  onLinkColumn?: (colId: string) => void;
  onUnlinkColumn?: (colId: string) => void;
  onUseAI?: () => void;
  filterState: FilterState;
  onAddFilterCondition: (colId: string) => void;
  columnSearch: ColumnSearch | null;
  onColumnSearchChange: (search: ColumnSearch | null) => void;
  processingCells?: Set<string>; 
  onMapEnrichmentData?: (rowId: string, key: string, value: any, enrichmentColId?: string) => void;
  onPushToList?: (rowId: string, key: string, items: any[]) => void;
  isDarkMode: boolean;
  /** Demo: cells to outline + blink (keys "rowId:colId") */
  highlightedCellKeys?: Set<string>;
  /** Demo: column ids to outline + blink */
  highlightedColumnIds?: Set<string>;
  /** Demo: scroll horizontally so this column is in view */
  scrollToColumnId?: string | null;
  /** Demo: show "Loading data..." overlay over grid */
  loadingOverlay?: boolean;
}

const Grid: React.FC<GridProps> = ({ 
  columns, 
  rows, 
  selectedCell, 
  selectedRows, 
  onSelectCell, 
  onSelectRow, 
  onCellChange, 
  onInsertRow,
  onDeleteRow,
  onRunCell,
  onAddColumn,
  onUpdateColumn,
  onDeleteColumn,
  onDuplicateColumn,
  onSortColumn,
  onPinColumn,
  onHideColumn,
  onRunAgent,
  onRunHttpRequest,
  onRunOwnership,
  onConfigureHttpRequest,
  onConfigureAgent,
  onLinkColumn,
  onUnlinkColumn,
  onUseAI,
  filterState,
  onAddFilterCondition,
  columnSearch,
  onColumnSearchChange,
  processingCells,
  onMapEnrichmentData,
  onPushToList,
  isDarkMode,
  highlightedCellKeys,
  highlightedColumnIds,
  scrollToColumnId,
  loadingOverlay,
}) => {
  const selectedInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    selectedInputRef.current?.focus();
  }, [selectedCell]);

  // Demo: scroll to column when scrollToColumnId is set
  useEffect(() => {
    if (!scrollToColumnId || !scrollContainerRef.current) return;
    const vis = columns.filter(c => !c.hidden);
    const idx = vis.findIndex(c => c.id === scrollToColumnId);
    if (idx < 0) return;
    let offset = 48 + 40 + (onRunOwnership ? 40 : 0); // index + checkbox + optional ownership
    for (let i = 0; i < idx; i++) offset += vis[i].width;
    scrollContainerRef.current.scrollLeft = Math.max(0, offset - 100);
  }, [scrollToColumnId, columns, onRunOwnership]);

  const SELECT_COLOR_PALETTE = ['#3B82F6','#10B981','#EF4444','#F59E0B','#8B5CF6','#EC4899','#06B6D4','#84CC16','#F97316','#14B8A6','#E11D48','#7C3AED'];

  const getColumnTypeIcon = (type: ColumnType, size = 'w-3 h-3') => {
    const cls = `${size} shrink-0`;
    switch (type) {
      case ColumnType.TEXT: return <Type className={cls} />;
      case ColumnType.NUMBER: return <Hash className={cls} />;
      case ColumnType.CURRENCY: return <DollarSign className={cls} />;
      case ColumnType.DATE: return <Calendar className={cls} />;
      case ColumnType.URL: return <Link2 className={cls} />;
      case ColumnType.EMAIL: return <AtSign className={cls} />;
      case ColumnType.IMAGE: return <ImageIcon className={cls} />;
      case ColumnType.CHECKBOX: return <CheckSquare className={cls} />;
      case ColumnType.SELECT: return <List className={cls} />;
      case ColumnType.FORMULA: return <Type className={`${cls} italic`} />;
      case ColumnType.ENRICHMENT: return <Sparkles className={cls} />;
      case ColumnType.HTTP: return <Globe className={cls} />;
      case ColumnType.MESSAGE: return <MessageSquare className={cls} />;
      case ColumnType.WATERFALL: return <GitBranch className={cls} />;
      case ColumnType.MERGE: return <Merge className={cls} />;
      default: return <Type className={cls} />;
    }
  };

  const COLUMN_TYPE_CATEGORIES = [
    {
      label: 'AI & Enrichment',
      items: [
        { type: ColumnType.ENRICHMENT, label: 'Add enrichment', icon: <Sparkles className="w-3.5 h-3.5" /> },
        { type: 'USE_AI' as const, label: 'Use AI', icon: <Sparkles className="w-3.5 h-3.5" /> },
        { type: ColumnType.MESSAGE, label: 'Message', icon: <MessageSquare className="w-3.5 h-3.5" /> },
        { type: ColumnType.WATERFALL, label: 'Waterfall', icon: <GitBranch className="w-3.5 h-3.5" /> },
        { type: ColumnType.FORMULA, label: 'Formula', icon: <Type className="w-3.5 h-3.5 italic" /> },
        { type: ColumnType.MERGE, label: 'Merge columns', icon: <Merge className="w-3.5 h-3.5" /> },
      ]
    },
    {
      label: 'Data Types',
      items: [
        { type: ColumnType.TEXT, label: 'Text', icon: <Type className="w-3.5 h-3.5" /> },
        { type: ColumnType.NUMBER, label: 'Number', icon: <Hash className="w-3.5 h-3.5" /> },
        { type: ColumnType.CURRENCY, label: 'Currency', icon: <DollarSign className="w-3.5 h-3.5" /> },
        { type: ColumnType.DATE, label: 'Date', icon: <Calendar className="w-3.5 h-3.5" /> },
        { type: ColumnType.URL, label: 'URL', icon: <Link2 className="w-3.5 h-3.5" /> },
        { type: ColumnType.EMAIL, label: 'Email', icon: <AtSign className="w-3.5 h-3.5" /> },
        { type: ColumnType.IMAGE, label: 'Image from URL', icon: <ImageIcon className="w-3.5 h-3.5" /> },
      ]
    },
    {
      label: 'Input Types',
      items: [
        { type: ColumnType.CHECKBOX, label: 'Checkbox', icon: <CheckSquare className="w-3.5 h-3.5" /> },
        { type: ColumnType.SELECT, label: 'Select', icon: <List className="w-3.5 h-3.5" /> },
      ]
    }
  ];

  const [addColumnMenuOpen, setAddColumnMenuOpen] = useState(false);
  const addColumnMenuRef = useRef<HTMLDivElement>(null);

  const [contextMenu, setContextMenu] = useState<{ colId: string; x: number; y: number; colIndex: number } | null>(null);
  const [renamingColId, setRenamingColId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [descriptionEditor, setDescriptionEditor] = useState<{ colId: string; value: string; x: number; y: number } | null>(null);
  const [hiddenMenuOpen, setHiddenMenuOpen] = useState(false);
  const [selectMenu, setSelectMenu] = useState<{ rowId: string; colId: string; x: number; y: number; width: number } | null>(null);
  const [cellContextMenu, setCellContextMenu] = useState<{
    rowId: string;
    colId: string;
    x: number;
    y: number;
    rowIndex: number;
  } | null>(null);
  const [agentRunMenu, setAgentRunMenu] = useState<{ colId: string; x: number; y: number } | null>(null);
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const hiddenMenuRef = useRef<HTMLDivElement>(null);
  const [editColState, setEditColState] = useState<Partial<ColumnDefinition>>({});
  const resizingRef = useRef<{
    colId: string;
    startX: number;
    startWidth: number;
  } | null>(null);
  const defaultSelectOptions: SelectOption[] = [
    { id: '1', label: 'Lead', color: '#3B82F6' },
    { id: '2', label: 'Enriched', color: '#10B981' },
    { id: '3', label: 'Priority', color: '#EF4444' }
  ];

  // Enrichment Panel State
  const [enrichmentPopup, setEnrichmentPopup] = useState<{
    isOpen: boolean;
    rowId: string;
    colId: string;
    data: Record<string, any>;
  } | null>(null);
  const selectMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      const inMenu = menuRef.current?.contains(targetNode);
      const inDescription = descriptionRef.current?.contains(targetNode);
      const inHiddenMenu = hiddenMenuRef.current?.contains(targetNode);
      const inAddColumnMenu = addColumnMenuRef.current?.contains(targetNode);
      const inSelectMenu = selectMenuRef.current?.contains(targetNode);
      if (!inAddColumnMenu) {
        setAddColumnMenuOpen(false);
      }
      if (!inMenu && !inHiddenMenu && !inDescription) {
        setContextMenu(null);
        setDescriptionEditor(null);
        setHiddenMenuOpen(false);
        setCellContextMenu(null);
        setAgentRunMenu(null);
      }
      if (!inSelectMenu) {
        setSelectMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!resizingRef.current) return;
      const { colId, startX, startWidth } = resizingRef.current;
      const nextWidth = Math.min(480, Math.max(80, startWidth + (event.clientX - startX)));
      onUpdateColumn(colId, { width: nextWidth });
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onUpdateColumn]);

  const openEditModal = (col: ColumnDefinition) => {
    setEditingColId(col.id);
    setEditColState({ 
        ...col,
        deduplication: col.deduplication || { active: false, keep: 'oldest' }
    });
    setContextMenu(null);
  };

  const saveColumnEdits = () => {
    if (editingColId && editColState) {
        onUpdateColumn(editingColId, editColState);
        setEditingColId(null);
    }
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

  const openContextMenu = (event: React.MouseEvent, col: ColumnDefinition) => {
    event.preventDefault();
    event.stopPropagation();
    const menuWidth = 260;
    const menuHeight = 520;
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(event.clientY, window.innerHeight - menuHeight - 8);
    const colIndex = columns.findIndex(c => c.id === col.id);
    setContextMenu({ colId: col.id, x, y, colIndex });
    setDescriptionEditor(null);
    setHiddenMenuOpen(false);
    setAgentRunMenu(null);
  };

  const runAgentForCount = (agentId: string, count: number | 'all' | 'selected') => {
    let rowIds: string[] = [];
    if (count === 'selected') {
      rowIds = Array.from(selectedRows);
    } else if (count === 'all') {
      rowIds = rows.map(r => r.id);
    } else {
      rowIds = rows.slice(0, count).map(r => r.id);
    }
    if (rowIds.length === 0) return;
    onRunAgent(agentId, rowIds);
    setContextMenu(null);
    setAgentRunMenu(null);
  };

  const startRename = (col: ColumnDefinition) => {
    setRenamingColId(col.id);
    setRenameValue(col.header);
    setContextMenu(null);
  };

  const commitRename = () => {
    if (!renamingColId) return;
    const trimmed = renameValue.trim() || 'Untitled';
    onUpdateColumn(renamingColId, { header: trimmed });
    setRenamingColId(null);
  };

  const openDescriptionEditor = (col: ColumnDefinition, anchorX: number, anchorY: number) => {
    setDescriptionEditor({
      colId: col.id,
      value: col.description || '',
      x: anchorX,
      y: anchorY
    });
    setContextMenu(null);
  };

  const saveDescription = () => {
    if (!descriptionEditor) return;
    onUpdateColumn(descriptionEditor.colId, { description: descriptionEditor.value.trim() });
    setDescriptionEditor(null);
  };

  const handleInsertColumnWithType = (index: number, type: ColumnType) => {
    onAddColumn({ header: 'New Field', type, width: 180 }, index);
    setContextMenu(null);
  };

  const applyColumnType = (col: ColumnDefinition, nextType: ColumnType) => {
    const updates: Partial<ColumnDefinition> = { type: nextType };
    if (nextType === ColumnType.SELECT) {
      // Auto-detect unique values from existing row data
      const uniqueValues = [...new Set(
        rows.map(r => r[col.id]?.toString().trim()).filter(Boolean) as string[]
      )];
      if (uniqueValues.length > 0) {
        updates.options = uniqueValues.map((val, i) => ({
          id: `opt_${Date.now()}_${i}`,
          label: val,
          color: SELECT_COLOR_PALETTE[i % SELECT_COLOR_PALETTE.length]
        }));
      } else if (!col.options || col.options.length === 0) {
        updates.options = defaultSelectOptions;
      }
    }
    onUpdateColumn(col.id, updates);
    setContextMenu(null);
  };

  const applyHeaderColor = (col: ColumnDefinition, color: string) => {
    onUpdateColumn(col.id, { headerColor: color || undefined });
    setContextMenu(null);
  };

  const openCellContextMenu = (event: React.MouseEvent, row: RowData, col: ColumnDefinition, rowIndex: number) => {
    event.preventDefault();
    event.stopPropagation();
    const menuWidth = 220;
    const menuHeight = 240;
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(event.clientY, window.innerHeight - menuHeight - 8);
    setCellContextMenu({ rowId: row.id, colId: col.id, x, y, rowIndex });
    setContextMenu(null);
    setDescriptionEditor(null);
    setHiddenMenuOpen(false);
  };

  const getCellValueText = (rowId: string, colId: string) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return '';
    const value = row[colId];
    if (value === undefined || value === null) return '';
    return value.toString();
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

  const addSelectOption = () => {
    setEditColState(prev => {
      const options = [...(prev.options || [])];
      options.push({
        id: `opt_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
        label: 'Option',
        color: '#6B7280'
      });
      return { ...prev, options };
    });
  };

  const openSelectMenu = (event: React.MouseEvent<HTMLButtonElement>, row: RowData, col: ColumnDefinition) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setSelectMenu(prev => {
      if (prev && prev.rowId === row.id && prev.colId === col.id) {
        return null;
      }
      return {
        rowId: row.id,
        colId: col.id,
        x: rect.left,
        y: rect.bottom + 6,
        width: rect.width
      };
    });
    onSelectCell(row.id, col.id);
  };

  const updateSelectOption = (index: number, updates: Partial<SelectOption>) => {
    setEditColState(prev => {
      const options = [...(prev.options || [])];
      const current = options[index] || { id: `opt_${index}` };
      options[index] = { ...current, ...updates };
      return { ...prev, options };
    });
  };

  const removeSelectOption = (index: number) => {
    setEditColState(prev => {
      const options = [...(prev.options || [])];
      options.splice(index, 1);
      return { ...prev, options };
    });
  };

  const visibleColumns = columns.filter(c => !c.hidden);

  // Sticky first column(s): index 48px, checkbox 40px, ownership 40px, then first data column
  const STICKY_LEFT_INDEX = 0;
  const STICKY_LEFT_CHECKBOX = 48;
  const STICKY_LEFT_OWNERSHIP = 88;
  const STICKY_LEFT_FIRST_DATA = onRunOwnership ? 128 : 88;
  const stickyFirstDataLeft = STICKY_LEFT_FIRST_DATA;

  const handleCellKeyDown = (e: React.KeyboardEvent, row: RowData, col: ColumnDefinition) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const rowIdx = rows.findIndex(r => r.id === row.id);
      if (rowIdx >= 0 && rowIdx < rows.length - 1) {
        onSelectCell(rows[rowIdx + 1].id, col.id);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const colIdx = visibleColumns.findIndex(c => c.id === col.id);
      if (e.shiftKey) {
        if (colIdx > 0) {
          onSelectCell(row.id, visibleColumns[colIdx - 1].id);
        }
      } else if (colIdx >= 0 && colIdx < visibleColumns.length - 1) {
        onSelectCell(row.id, visibleColumns[colIdx + 1].id);
      }
    }
  };

  const renderCell = (row: RowData, col: ColumnDefinition) => {
    const isProcessing = processingCells?.has(`${row.id}:${col.id}`);
    
    if (isProcessing) {
        return (
            <div className={`flex items-center gap-2 px-3 py-2 text-xs font-bold bg-blue-500/5 h-full w-full animate-pulse ${
              isDarkMode ? 'text-blue-400' : 'text-black'
            }`}>
                <Loader2 className="w-3 h-3 animate-spin" />
                Thinking...
            </div>
        );
    }

    const value = row[col.id];
    const isSelected = selectedCell?.rowId === row.id && selectedCell?.colId === col.id;
    const isSearchMatch = cellMatchesSearch(row, col.id);

    // Linked columns are always readonly
    if (col.linkedColumn) {
      return (
        <div 
          className={`px-3 py-2 text-sm h-full flex items-center gap-2 w-full transition-colors cursor-default truncate ${
            isSelected ? (isDarkMode ? 'bg-blue-600/10 text-white' : 'bg-blue-600/10 text-black') : isDarkMode ? 'text-neutral-300' : 'text-black'
          } ${isSearchMatch ? 'bg-yellow-500/20' : ''}`}
          onClick={() => onSelectCell(row.id, col.id)}
        >
          <Link className={`w-3 h-3 shrink-0 ${isDarkMode ? 'text-blue-400/60' : 'text-blue-500/60'}`} />
          <span className="truncate">{value?.toString() || ''}</span>
        </div>
      );
    }

    switch (col.type) {
      case ColumnType.ENRICHMENT: {
        let parsedData: Record<string, any> = {};
        let hasError = false;
        let hasData = false;
        try {
             parsedData = typeof value === 'string' ? JSON.parse(value) : value || {};
             const dataKeys = Object.keys(parsedData).filter(k => k !== '_sources' && k !== '_metadata');
             hasError = !!parsedData.error;
             hasData = dataKeys.length > 0 && !hasError;
        } catch(e) {}

        if (!value) {
             return (
                 <div 
                   className={`w-full h-full px-3 flex items-center italic text-xs cursor-default ${isDarkMode ? 'text-neutral-600' : 'text-black'} ${isSearchMatch ? 'bg-yellow-500/20' : ''}`}
                    onClick={() => onSelectCell(row.id, col.id)}
                 >
                     Empty
                 </div>
             );
        }

        return (
          <div 
            className={`w-full h-full px-3 py-1 flex items-center cursor-pointer transition-colors ${isSelected ? 'bg-blue-600/10' : 'hover:bg-[#151515]'} ${isSearchMatch ? 'bg-yellow-500/20' : ''}`}
            onClick={(e) => handleEnrichmentClick(e, row, col)}
          >
             <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full shrink-0 ${hasError ? 'bg-red-500' : hasData ? 'bg-emerald-500' : 'bg-neutral-600'}`} />
                <span className={`text-xs font-medium ${
                  isSelected ? (isDarkMode ? 'text-white' : 'text-black') : (isDarkMode ? 'text-neutral-300' : 'text-black')
                }`}>Response</span>
             </div>
          </div>
        );
      }

      case ColumnType.SELECT:
        return (
          <div 
            className={`relative group/select w-full h-full flex items-center px-3 ${isSelected ? 'bg-blue-600/5' : ''} ${isSearchMatch ? 'bg-yellow-500/20' : ''}`}
            onClick={() => onSelectCell(row.id, col.id)}
          >
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => openSelectMenu(e, row, col)}
              className="flex items-center gap-2 flex-1 min-w-0 text-left"
            >
              {value ? (
                <span
                  className="px-2 py-0.5 rounded-full text-[11px] font-semibold truncate"
                  style={{
                    backgroundColor: `${col.options?.find(o => o.label === value)?.color || '#111827'}22`,
                    color: col.options?.find(o => o.label === value)?.color || (isDarkMode ? '#e5e7eb' : '#111827'),
                    border: `1px solid ${(col.options?.find(o => o.label === value)?.color || '#111827')}55`
                  }}
                >
                  {value.toString()}
                </span>
              ) : (
                <span className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-black'}`}>Select...</span>
              )}
            </button>
            <ChevronDown className={`w-3 h-3 ml-auto ${isDarkMode ? 'text-neutral-400 group-hover/select:text-neutral-300' : 'text-neutral-700'}`} />
          </div>
        );

      case ColumnType.HTTP: {
        const configId = col.connectedHttpRequestId;
        const displayValue = value?.toString() || '';
        if (!configId) {
          return (
            <button
              className={`w-full h-full px-3 text-xs font-bold uppercase tracking-widest ${
                isDarkMode ? 'text-neutral-500 hover:text-blue-400' : 'text-black hover:text-blue-600'
              } transition-colors ${isSelected ? 'bg-blue-600/10' : ''} ${isSearchMatch ? 'bg-yellow-500/20' : ''}`}
              onClick={() => {
                onSelectCell(row.id, col.id);
                if (onConfigureHttpRequest) onConfigureHttpRequest(col.id);
              }}
            >
              Configure
            </button>
          );
        }

        return (
          <div
            className={`w-full h-full px-3 flex items-center gap-2 text-xs cursor-pointer ${
              isDarkMode ? 'text-neutral-300' : 'text-black'
            } ${isSelected ? 'bg-blue-600/10' : isDarkMode ? 'hover:bg-[#151515]' : 'hover:bg-neutral-100'} ${isSearchMatch ? 'bg-yellow-500/20' : ''}`}
            onClick={() => {
              onSelectCell(row.id, col.id);
              onRunHttpRequest(configId, row.id);
            }}
          >
            <Play className="w-3 h-3 text-blue-400" />
            <span className="truncate">{displayValue || 'Run HTTP'}</span>
          </div>
        );
      }

      case ColumnType.FORMULA:
        return (
          <div 
            className={`px-3 py-2 text-sm h-full flex items-center w-full transition-colors cursor-default truncate ${
              isSelected ? (isDarkMode ? 'bg-blue-600/10 text-white' : 'bg-blue-600/10 text-black') : isDarkMode ? 'text-neutral-400 italic' : 'text-black italic'
            } ${isSearchMatch ? 'bg-yellow-500/20' : ''}`}
            onClick={() => onSelectCell(row.id, col.id)}
          >
            {value?.toString() || 'Calculating...'}
          </div>
        );

      case ColumnType.NUMBER:
        return (
          <input
            ref={isSelected ? selectedInputRef : undefined}
            type="number"
            value={value?.toString() || ''}
            onFocus={() => onSelectCell(row.id, col.id)}
            onChange={(e) => onCellChange(row.id, col.id, e.target.value)}
            onKeyDown={(e) => handleCellKeyDown(e, row, col)}
            className={`notion-input px-3 py-2 text-sm text-right font-mono transition-colors ${
              isSelected
                ? `bg-blue-600/5 ${isDarkMode ? 'text-white' : 'text-black'}`
                : isDarkMode ? 'text-neutral-300' : 'text-black'
            } ${isSearchMatch ? 'bg-yellow-500/20' : ''}`}
            placeholder="0"
          />
        );

      case ColumnType.CURRENCY:
        return (
          <div 
            className={`w-full h-full flex items-center px-3 ${isSelected ? 'bg-blue-600/5' : ''} ${isSearchMatch ? 'bg-yellow-500/20' : ''}`}
            onClick={() => onSelectCell(row.id, col.id)}
          >
            <span className={`text-xs mr-1 ${isDarkMode ? 'text-neutral-500' : 'text-black'}`}>$</span>
            <input
              ref={isSelected ? selectedInputRef : undefined}
              type="number"
              value={value?.toString() || ''}
              onFocus={() => onSelectCell(row.id, col.id)}
              onChange={(e) => onCellChange(row.id, col.id, e.target.value)}
              onKeyDown={(e) => handleCellKeyDown(e, row, col)}
              className={`notion-input py-2 text-sm text-right font-mono transition-colors flex-1 ${
                isSelected ? `bg-transparent ${isDarkMode ? 'text-white' : 'text-black'}` : isDarkMode ? 'text-neutral-300' : 'text-black'
              }`}
              placeholder="0.00"
              step="0.01"
            />
          </div>
        );

      case ColumnType.DATE:
        return (
          <input
            ref={isSelected ? selectedInputRef : undefined}
            type="date"
            value={value?.toString() || ''}
            onFocus={() => onSelectCell(row.id, col.id)}
            onChange={(e) => onCellChange(row.id, col.id, e.target.value)}
            onKeyDown={(e) => handleCellKeyDown(e, row, col)}
            className={`notion-input px-3 py-2 text-sm transition-colors w-full h-full ${
              isSelected
                ? `bg-blue-600/5 ${isDarkMode ? 'text-white' : 'text-black'}`
                : isDarkMode ? 'text-neutral-300' : 'text-black'
            } ${isSearchMatch ? 'bg-yellow-500/20' : ''}`}
          />
        );

      case ColumnType.URL: {
        const urlValue = value?.toString() || '';
        return (
          <div 
            className={`w-full h-full flex items-center gap-1.5 px-3 group/url ${isSelected ? 'bg-blue-600/5' : ''} ${isSearchMatch ? 'bg-yellow-500/20' : ''}`}
            onClick={() => onSelectCell(row.id, col.id)}
          >
            {isSelected ? (
              <input
                ref={selectedInputRef}
                type="url"
                value={urlValue}
                onFocus={() => onSelectCell(row.id, col.id)}
                onChange={(e) => onCellChange(row.id, col.id, e.target.value)}
                onKeyDown={(e) => handleCellKeyDown(e, row, col)}
                className={`notion-input py-2 text-sm bg-transparent flex-1 outline-none ${isDarkMode ? 'text-blue-400' : 'text-black'}`}
                placeholder="https://..."
              />
            ) : (
              <>
                <span className={`text-sm truncate flex-1 ${isDarkMode ? 'text-blue-400' : 'text-black'}`}>{urlValue || ''}</span>
                {urlValue && (
                  <a href={urlValue} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="opacity-0 group-hover/url:opacity-100 transition-opacity">
                    <ExternalLink className={`w-3 h-3 ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-black'}`} />
                  </a>
                )}
              </>
            )}
          </div>
        );
      }

      case ColumnType.EMAIL: {
        const emailValue = value?.toString() || '';
        return (
          <div 
            className={`w-full h-full flex items-center gap-1.5 px-3 group/email ${isSelected ? 'bg-blue-600/5' : ''} ${isSearchMatch ? 'bg-yellow-500/20' : ''}`}
            onClick={() => onSelectCell(row.id, col.id)}
          >
            {isSelected ? (
              <input
                ref={selectedInputRef}
                type="email"
                value={emailValue}
                onFocus={() => onSelectCell(row.id, col.id)}
                onChange={(e) => onCellChange(row.id, col.id, e.target.value)}
                onKeyDown={(e) => handleCellKeyDown(e, row, col)}
                className={`notion-input py-2 text-sm bg-transparent flex-1 outline-none ${isDarkMode ? 'text-purple-400' : 'text-black'}`}
                placeholder="email@example.com"
              />
            ) : (
              <>
                <AtSign className={`w-3 h-3 shrink-0 ${isDarkMode ? 'text-neutral-600' : 'text-black'}`} />
                <span className={`text-sm truncate flex-1 ${isDarkMode ? 'text-purple-400' : 'text-black'}`}>{emailValue}</span>
              </>
            )}
          </div>
        );
      }

      case ColumnType.IMAGE: {
        const imgUrl = value?.toString() || '';
        return (
          <div 
            className={`w-full h-full flex items-center px-2 ${isSelected ? 'bg-blue-600/5' : ''} ${isSearchMatch ? 'bg-yellow-500/20' : ''}`}
            onClick={() => onSelectCell(row.id, col.id)}
          >
            {imgUrl ? (
              <img 
                src={imgUrl} 
                alt="" 
                className="h-8 w-8 rounded object-cover border border-neutral-700"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className={`h-8 w-8 rounded border flex items-center justify-center ${isDarkMode ? 'border-neutral-700 bg-neutral-800' : 'border-neutral-300 bg-neutral-100'}`}>
                <ImageIcon className="w-3 h-3 text-neutral-500" />
              </div>
            )}
            {isSelected && (
              <input
                ref={selectedInputRef}
                type="url"
                value={imgUrl}
                onChange={(e) => onCellChange(row.id, col.id, e.target.value)}
                onKeyDown={(e) => handleCellKeyDown(e, row, col)}
                className={`notion-input ml-2 py-1 text-xs bg-transparent flex-1 outline-none ${isDarkMode ? 'text-neutral-300' : 'text-black'}`}
                placeholder="Image URL..."
              />
            )}
          </div>
        );
      }

      case ColumnType.CHECKBOX:
        return (
          <div 
            className={`w-full h-full flex items-center justify-center cursor-pointer ${isSelected ? 'bg-blue-600/5' : ''} ${isSearchMatch ? 'bg-yellow-500/20' : ''}`}
            onClick={() => {
              onSelectCell(row.id, col.id);
              const current = value === true || value === 'true' || value === 1 || value === '1';
              onCellChange(row.id, col.id, !current);
            }}
          >
            {(value === true || value === 'true' || value === 1 || value === '1') ? (
              <CheckSquare className="w-4 h-4 text-blue-400" />
            ) : (
              <Square className={`w-4 h-4 ${isDarkMode ? 'text-neutral-600' : 'text-neutral-400'}`} />
            )}
          </div>
        );

      case ColumnType.MERGE: {
        // Merge column evaluates mergeInputs in order, first non-empty wins
        const mergeInputs = col.mergeInputs || [];
        let mergeResult = value?.toString() || '';
        if (!mergeResult && mergeInputs.length > 0) {
          for (const input of mergeInputs) {
            // Resolve column references like {{columnId}}
            let resolved = input.template.replace(/\{\{([^}]+)\}\}/g, (_, colId) => {
              const refCol = columns.find(c => c.id === colId || c.header === colId);
              if (refCol) {
                const val = row[refCol.id];
                return val?.toString() || '';
              }
              return '';
            });
            if (resolved.trim()) {
              mergeResult = resolved;
              break;
            }
          }
        }
        return (
          <div 
            className={`px-3 py-2 text-sm h-full flex items-center w-full transition-colors truncate ${
              isSelected ? (isDarkMode ? 'bg-blue-600/5 text-white' : 'bg-blue-600/5 text-black') : isDarkMode ? 'text-neutral-300' : 'text-black'
            } ${isSearchMatch ? 'bg-yellow-500/20' : ''}`}
            onClick={() => onSelectCell(row.id, col.id)}
          >
            {mergeResult || <span className={`italic ${isDarkMode ? 'text-neutral-600' : 'text-black'}`}>No data</span>}
          </div>
        );
      }

      case ColumnType.MESSAGE:
      case ColumnType.WATERFALL:
        return (
          <input
            ref={isSelected ? selectedInputRef : undefined}
            type="text"
            value={value?.toString() || ''}
            onFocus={() => onSelectCell(row.id, col.id)}
            onChange={(e) => onCellChange(row.id, col.id, e.target.value)}
            onKeyDown={(e) => handleCellKeyDown(e, row, col)}
            className={`notion-input px-3 py-2 text-sm transition-colors w-full h-full ${
              isSelected
                ? `bg-blue-600/5 ${isDarkMode ? 'text-white' : 'text-black'}`
                : isDarkMode ? 'text-neutral-300 focus:text-white' : 'text-black'
            } ${isSearchMatch ? 'bg-yellow-500/20' : ''}`}
          />
        );

      default:
        return (
          <input
            ref={isSelected ? selectedInputRef : undefined}
            type="text"
            value={value?.toString() || ''}
            onFocus={() => onSelectCell(row.id, col.id)}
            onChange={(e) => onCellChange(row.id, col.id, e.target.value)}
            onKeyDown={(e) => handleCellKeyDown(e, row, col)}
            className={`notion-input px-3 py-2 text-sm transition-colors ${
              isSelected
                ? `bg-blue-600/5 ${isDarkMode ? 'text-white' : 'text-black'}`
                : isDarkMode ? 'text-neutral-300 focus:text-white' : 'text-black'
            } ${isSearchMatch ? 'bg-yellow-500/20' : ''}`}
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

  const hiddenColumns = columns.filter(col => col.hidden);

  const matchesCondition = (row: RowData, condition: FilterCondition): boolean => {
    const cellValue = row[condition.colId];
    const text = (cellValue === undefined || cellValue === null ? '' : cellValue.toString()).toLowerCase();
    const val = condition.value.toLowerCase();
    switch (condition.operator) {
      case 'equal_to': return text === val;
      case 'not_equal_to': return text !== val;
      case 'contains': return text.includes(val);
      case 'does_not_contain': return !text.includes(val);
      case 'contains_any_of': return val.split(',').some(v => text.includes(v.trim()));
      case 'does_not_contain_any_of': return !val.split(',').some(v => text.includes(v.trim()));
      case 'is_empty': return text === '';
      case 'is_not_empty': return text !== '';
      default: return true;
    }
  };

  // Helper function to check if a cell matches the search query
  const cellMatchesSearch = (row: RowData, colId: string): boolean => {
    if (!columnSearch || !columnSearch.value.trim()) return false;
    const searchValue = columnSearch.value.trim().toLowerCase();
    const cellValue = row[colId];
    const text = (cellValue === undefined || cellValue === null ? '' : cellValue.toString()).toLowerCase();
    return text.includes(searchValue);
  };

  const filteredRows = rows.filter(row => {
    // Search filtering
    if (columnSearch && columnSearch.value.trim()) {
      if (columnSearch.mode === 'global') {
        // Global search: check if any cell in the row matches
        const hasMatch = columns.some(col => cellMatchesSearch(row, col.id));
        if (!hasMatch) return false;
      } else {
        // Column-specific search
        const colId = columnSearch.colId || '';
        if (!cellMatchesSearch(row, colId)) return false;
      }
    }
    // Filter conditions
    if (filterState.conditions.length === 0) return true;
    if (filterState.combinator === 'and') {
      return filterState.conditions.every(c => matchesCondition(row, c));
    } else {
      return filterState.conditions.some(c => matchesCondition(row, c));
    }
  });

  const contextCol = contextMenu ? columns.find(col => col.id === contextMenu.colId) : null;
  const cellContextCol = cellContextMenu ? columns.find(col => col.id === cellContextMenu.colId) : null;
  const colorOptions = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#A855F7', '#22D3EE', '#E879F9', '#F97316', '#94A3B8'];

  const demoHighlightClass = 'demo-cell-highlight';

  return (
    <div
      ref={scrollContainerRef}
      className={`flex-1 overflow-auto relative ${
        isDarkMode ? 'bg-[#0b1120]' : 'bg-white'
      }`}
    >
      {/* Demo: loading overlay */}
      {loadingOverlay && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          aria-hidden
        >
          <div className={`flex flex-col items-center gap-3 rounded-xl px-6 py-4 shadow-xl ${
            isDarkMode ? 'bg-[#1e293b] border border-[#334155]' : 'bg-white border border-neutral-200'
          }`}>
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-neutral-700'}`}>
              Loading data…
            </span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes demoHighlightBlink {
          0%, 100% { box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.6); }
          50% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.9); }
        }
        .demo-cell-highlight {
          animation: demoHighlightBlink 0.6s ease-in-out 4;
        }
      `}</style>
      
      {/* Enrichment Side Panel */}
      {enrichmentPopup?.isOpen && (
          <>
             <EnrichmentPopup 
                data={enrichmentPopup.data}
                onClose={() => setEnrichmentPopup(null)}
                onMapField={(key, val) => {
                    if (onMapEnrichmentData) onMapEnrichmentData(enrichmentPopup.rowId, key, val, enrichmentPopup.colId);
                }}
                onPushToList={(key, items) => {
                    if (onPushToList) onPushToList(enrichmentPopup.rowId, key, items);
                }}
                mappedFields={mappedFieldKeys}
             />
          </>
      )}

      {/* Edit Column Modal */}
      {editingColId && (
        <div className="fixed inset-0 z-[250] flex justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingColId(null)} />
            <div className={`relative h-full w-full max-w-sm shadow-2xl flex flex-col animate-in fade-in slide-in-from-right duration-200 ${
              isDarkMode ? 'bg-[#1a2638] border-l border-[#263a4f]' : 'bg-white border-l border-neutral-200'
            }`}>
                <div className={`flex items-center justify-between px-4 py-3 border-b ${isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200'}`}>
                    <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Edit Field Settings</h3>
                    <button onClick={() => setEditingColId(null)} className={`p-2 rounded-lg text-neutral-500 ${isDarkMode ? 'hover:bg-[#1e2d3d]' : 'hover:bg-neutral-100'}`}><X className="w-5 h-5"/></button>
                </div>

                <div className={`flex-1 overflow-y-auto px-4 py-5 space-y-5 ${isDarkMode ? 'bg-[#131d2e]' : 'bg-neutral-50'}`}>
                    <div className="space-y-1">
                        <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Field Name</label>
                        <input 
                            className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all ${isDarkMode ? 'bg-[#131d2e] border border-[#263a4f] text-white' : 'bg-white border border-neutral-300 text-gray-900'}`}
                            value={editColState.header}
                            onChange={e => setEditColState({...editColState, header: e.target.value})}
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Data Type</label>
                            <select 
                                className={`w-full rounded-xl px-4 py-3 text-sm outline-none ${isDarkMode ? 'bg-[#131d2e] border border-[#263a4f] text-white' : 'bg-white border border-neutral-300 text-gray-900'}`}
                                value={editColState.type}
                                onChange={e => {
                                    const nextType = e.target.value as ColumnType;
                                    setEditColState(prev => {
                                        const nextOptions = nextType === ColumnType.SELECT
                                          ? (prev.options?.length ? prev.options : defaultSelectOptions)
                                          : prev.options;
                                        return { ...prev, type: nextType, options: nextOptions };
                                    });
                                }}
                            >
                                <option value={ColumnType.TEXT}>Text</option>
                                <option value={ColumnType.NUMBER}>Number</option>
                                <option value={ColumnType.CURRENCY}>Currency</option>
                                <option value={ColumnType.DATE}>Date</option>
                                <option value={ColumnType.URL}>URL</option>
                                <option value={ColumnType.EMAIL}>Email</option>
                                <option value={ColumnType.IMAGE}>Image from URL</option>
                                <option value={ColumnType.CHECKBOX}>Checkbox</option>
                                <option value={ColumnType.SELECT}>Select</option>
                                <option value={ColumnType.FORMULA}>Formula</option>
                                <option value={ColumnType.ENRICHMENT}>AI Enrichment</option>
                                <option value={ColumnType.HTTP}>HTTP</option>
                                <option value={ColumnType.MESSAGE}>Message</option>
                                <option value={ColumnType.WATERFALL}>Waterfall</option>
                                <option value={ColumnType.MERGE}>Merge</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Width (px)</label>
                            <input 
                                type="number"
                                className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all ${isDarkMode ? 'bg-[#131d2e] border border-[#263a4f] text-white' : 'bg-white border border-neutral-300 text-gray-900'}`}
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
                            className={`w-full rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-blue-500 transition-all ${isDarkMode ? 'bg-[#131d2e] border border-[#263a4f] text-white' : 'bg-white border border-neutral-300 text-gray-900'}`}
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

                    {editColState.type === ColumnType.SELECT && (
                        <div className={`space-y-3 pt-4 border-t ${isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200'}`}>
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Select Options</label>
                                <button
                                    onClick={addSelectOption}
                                    className="text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300"
                                >
                                    Add Option
                                </button>
                            </div>
                            <div className="space-y-2">
                                {(!editColState.options || editColState.options.length === 0) && (
                                    <div className="text-[10px] text-neutral-500">No options yet. Add one to enable colored tags.</div>
                                )}
                                {(editColState.options || []).map((opt, idx) => (
                                    <div key={opt.id || idx} className="flex items-center gap-2">
                                        <input
                                            className={`flex-1 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 transition-all ${isDarkMode ? 'bg-[#131d2e] border border-[#263a4f] text-white' : 'bg-white border border-neutral-300 text-gray-900'}`}
                                            value={opt.label}
                                            onChange={e => updateSelectOption(idx, { label: e.target.value })}
                                            placeholder="Option label"
                                        />
                                        <input
                                            type="color"
                                            value={opt.color || '#6B7280'}
                                            onChange={e => updateSelectOption(idx, { color: e.target.value })}
                                            className={`h-9 w-10 bg-transparent rounded-lg border ${isDarkMode ? 'border-[#263a4f]' : 'border-neutral-300'}`}
                                            aria-label="Option color"
                                        />
                                        <button
                                            onClick={() => removeSelectOption(idx)}
                                            className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                            aria-label="Remove option"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
                <div className={`px-4 py-4 border-t ${isDarkMode ? 'border-[#1e2d3d] bg-[#131d2e]' : 'border-neutral-200 bg-neutral-50'}`}>
                  <button 
                      onClick={saveColumnEdits}
                      className={`w-full text-xs font-bold py-3.5 rounded-xl transition-all shadow-xl active:scale-95 ${isDarkMode ? 'bg-white hover:bg-neutral-200 text-black' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                  >
                      Save Changes
                  </button>
                </div>
            </div>
        </div>
      )}

      {contextMenu && contextCol && (
        <div
          ref={menuRef}
          className={`fixed w-64 rounded-xl shadow-2xl z-[90] py-1 animate-in fade-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-[#1a2638] border border-[#263a4f]' : 'bg-white border border-neutral-200'}`}
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className={`px-3 py-2 border-b ${isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200'}`}>
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Column Actions</span>
          </div>

          <div className={`p-1 border-b ${isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200'}`}>
            <button
              onClick={() => startRename(contextCol)}
              className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 font-medium transition-colors ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}
            >
              <Pencil className="w-3.5 h-3.5 text-blue-400" />
              Rename column
            </button>
            <button
              onClick={() => openEditModal(contextCol)}
              className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 font-medium transition-colors ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}
            >
              <Settings2 className="w-3.5 h-3.5 text-amber-400" />
              Edit column
            </button>
            {contextCol.type === ColumnType.HTTP && (
              <button
                onClick={() => {
                  if (onConfigureHttpRequest) onConfigureHttpRequest(contextCol.id);
                  setContextMenu(null);
                }}
                className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 font-medium transition-colors ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}
              >
                <Settings2 className="w-3.5 h-3.5 text-blue-400" />
                Configure HTTP
              </button>
            )}
            {contextCol.connectedAgentId && (
              <button
                onClick={() => {
                  if (onConfigureAgent) onConfigureAgent(contextCol.id);
                  setContextMenu(null);
                }}
                className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 font-medium transition-colors ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}
              >
                <Bot className="w-3.5 h-3.5 text-purple-400" />
                Edit Agent
              </button>
            )}
            {contextCol.linkedColumn ? (
              <button
                onClick={() => {
                  if (onUnlinkColumn) onUnlinkColumn(contextCol.id);
                  setContextMenu(null);
                }}
                className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 font-medium transition-colors ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}
              >
                <Link className="w-3.5 h-3.5 text-blue-400" />
                Unlink Column
              </button>
            ) : (
              <button
                onClick={() => {
                  if (onLinkColumn) onLinkColumn(contextCol.id);
                  setContextMenu(null);
                }}
                className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 font-medium transition-colors ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}
              >
                <Link className="w-3.5 h-3.5 text-blue-400" />
                Link to Sheet
              </button>
            )}
          </div>

          <div className={`p-1 border-b ${isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200'}`}>
            <div className="relative group/insertleft">
              <button className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 font-medium transition-colors ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}>
                <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
                Insert 1 column left
                <ChevronRight className="w-3.5 h-3.5 ml-auto text-neutral-500" />
              </button>
              <div className="absolute left-full top-0 pl-1 hidden group-hover/insertleft:block z-10">
                <div className={`w-52 rounded-xl shadow-2xl py-1 max-h-80 overflow-y-auto ${isDarkMode ? 'bg-[#1a2638] border border-[#263a4f]' : 'bg-white border border-neutral-200'}`}>
                  {COLUMN_TYPE_CATEGORIES.map((category, catIdx) => (
                    <div key={`il-${category.label}`}>
                      {catIdx > 0 && <div className={`my-1 ${isDarkMode ? 'border-t border-[#263a4f]' : 'border-t border-neutral-100'}`} />}
                      {category.items.map(item => (
                        <button
                          key={`insert-left-${item.label}`}
                          onClick={() => {
                            if (item.type === 'USE_AI') {
                              onUseAI?.();
                            } else {
                              handleInsertColumnWithType(contextMenu.colIndex, item.type as ColumnType);
                            }
                            setContextMenu(null);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2.5 font-medium transition-colors ${
                            isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-50'
                          } ${item.type === 'USE_AI' ? (isDarkMode ? 'text-purple-300' : 'text-purple-600') : ''}`}
                        >
                          <span className={item.type === 'USE_AI' ? 'text-purple-400' : isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}>
                            {item.icon}
                          </span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="relative group/insertright">
              <button className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 font-medium transition-colors ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                Insert 1 column right
                <ChevronRight className="w-3.5 h-3.5 ml-auto text-neutral-500" />
              </button>
              <div className="absolute left-full top-0 pl-1 hidden group-hover/insertright:block z-10">
                <div className={`w-52 rounded-xl shadow-2xl py-1 max-h-80 overflow-y-auto ${isDarkMode ? 'bg-[#1a2638] border border-[#263a4f]' : 'bg-white border border-neutral-200'}`}>
                  {COLUMN_TYPE_CATEGORIES.map((category, catIdx) => (
                    <div key={`ir-${category.label}`}>
                      {catIdx > 0 && <div className={`my-1 ${isDarkMode ? 'border-t border-[#263a4f]' : 'border-t border-neutral-100'}`} />}
                      {category.items.map(item => (
                        <button
                          key={`insert-right-${item.label}`}
                          onClick={() => {
                            if (item.type === 'USE_AI') {
                              onUseAI?.();
                            } else {
                              handleInsertColumnWithType(contextMenu.colIndex + 1, item.type as ColumnType);
                            }
                            setContextMenu(null);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2.5 font-medium transition-colors ${
                            isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-50'
                          } ${item.type === 'USE_AI' ? (isDarkMode ? 'text-purple-300' : 'text-purple-600') : ''}`}
                        >
                          <span className={item.type === 'USE_AI' ? 'text-purple-400' : isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}>
                            {item.icon}
                          </span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={`p-1 border-b ${isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200'}`}>
            <button
              onClick={() => openDescriptionEditor(contextCol, contextMenu.x + 10, contextMenu.y + 10)}
              className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 font-medium transition-colors ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}
            >
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              Edit description
            </button>
            <div className="relative group/color">
              <button className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 font-medium transition-colors ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}>
                <Palette className="w-3.5 h-3.5 text-pink-400" />
                Change color
                <ChevronRight className="w-3.5 h-3.5 ml-auto text-neutral-500" />
              </button>
              <div className="absolute left-full top-0 pl-1 hidden group-hover/color:block z-10">
                <div className={`w-40 rounded-xl shadow-2xl py-2 ${isDarkMode ? 'bg-[#1a2638] border border-[#263a4f]' : 'bg-white border border-neutral-200'}`}>
                  <button
                    onClick={() => applyHeaderColor(contextCol, '')}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}
                  >
                    <Eye className="w-3.5 h-3.5 text-neutral-400" />
                    Default
                  </button>
                  <div className="px-3 pb-1 pt-2 grid grid-cols-5 gap-2">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        onMouseEnter={() => applyHeaderColor(contextCol, color)}
                        onFocus={() => applyHeaderColor(contextCol, color)}
                        className={`w-5 h-5 rounded-full border ${isDarkMode ? 'border-[#263a4f]' : 'border-neutral-300'}`}
                        style={{ backgroundColor: color }}
                        aria-label={`Set color ${color}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="relative group/changetype">
              <button className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 font-medium transition-colors ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}>
                <span className="text-cyan-400">{getColumnTypeIcon(contextCol.type, 'w-3.5 h-3.5')}</span>
                {contextCol.type}
                <ChevronRight className="w-3.5 h-3.5 ml-auto text-neutral-500" />
              </button>
              <div className="absolute left-full top-0 pl-1 hidden group-hover/changetype:block z-10">
                <div className={`w-48 rounded-xl shadow-2xl py-1 max-h-80 overflow-y-auto ${isDarkMode ? 'bg-[#1a2638] border border-[#263a4f]' : 'bg-white border border-neutral-200'}`}>
                  {Object.values(ColumnType).map(type => (
                    <button
                      key={`type-${type}`}
                      onClick={() => applyColumnType(contextCol, type)}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}
                    >
                      {contextCol.type === type ? (
                        <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <span className={isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}>{getColumnTypeIcon(type, 'w-3.5 h-3.5')}</span>
                      )}
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={`p-1 border-b ${isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200'}`}>
            <button
              onClick={() => {
                onDuplicateColumn(contextCol.id);
                setContextMenu(null);
              }}
              className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 font-medium transition-colors ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}
            >
              <Copy className="w-3.5 h-3.5 text-neutral-300" />
              Duplicate
            </button>
          </div>

          <div className={`p-1 border-b ${isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200'}`}>
            <button
              onClick={() => {
                onSortColumn(contextCol.id, 'asc');
                setContextMenu(null);
              }}
              className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 font-medium transition-colors ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}
            >
              <ArrowDown className="w-3.5 h-3.5 text-neutral-300" />
              Sort A → Z
            </button>
            <button
              onClick={() => {
                onSortColumn(contextCol.id, 'desc');
                setContextMenu(null);
              }}
              className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 font-medium transition-colors ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}
            >
              <ArrowUp className="w-3.5 h-3.5 text-neutral-300" />
              Sort Z → A
            </button>
          </div>

          <div className={`p-1 border-b ${isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200'}`}>
            <div className="relative group">
              <button className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 font-medium transition-colors ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}>
                <CheckSquare className="w-3.5 h-3.5 text-red-400" />
                Dedupe
                <ChevronRight className="w-3.5 h-3.5 ml-auto text-neutral-500" />
              </button>
              <div className={`absolute left-full top-0 ml-1 w-40 rounded-xl shadow-2xl py-1 hidden group-hover:block ${isDarkMode ? 'bg-[#1a2638] border border-[#263a4f]' : 'bg-white border border-neutral-200'}`}>
                {(['oldest', 'newest'] as const).map(mode => (
                  <button
                    key={`dedupe-${mode}`}
                    onClick={() => {
                      toggleDeduplication(contextCol, mode);
                      setContextMenu(null);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}
                  >
                    {contextCol.deduplication?.active && contextCol.deduplication?.keep === mode ? (
                      <CheckSquare className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 text-neutral-400" />
                    )}
                    Keep {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={`p-1 border-b ${isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200'}`}>
            <button
              onClick={() => {
                onAddFilterCondition(contextCol.id);
                setContextMenu(null);
              }}
              className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 font-medium transition-colors ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}
            >
              <Filter className="w-3.5 h-3.5 text-blue-400" />
              Filter on this column
            </button>
            <button
              onClick={() => {
                onColumnSearchChange({ colId: contextCol.id, value: '', mode: 'column' });
                setContextMenu(null);
              }}
              className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 font-medium transition-colors ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}
            >
              <Search className="w-3.5 h-3.5 text-emerald-400" />
              Search in column
            </button>
          </div>

          {contextCol.connectedAgentId && (
            <div className={`p-1 border-b ${isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200'}`}>
              <div className="relative">
                <button
                  onClick={() => setAgentRunMenu({ colId: contextCol.id, x: contextMenu.x + 250, y: contextMenu.y + 120 })}
                  className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 font-medium transition-colors ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}
                >
                  <Play className="w-3.5 h-3.5 text-blue-400" />
                  Run column
                  <ChevronRight className="w-3.5 h-3.5 ml-auto text-neutral-500" />
                </button>
              </div>
            </div>
          )}

          <div className="p-1">
            <button
              onClick={() => {
                onPinColumn(contextCol.id);
                setContextMenu(null);
              }}
              className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 font-medium transition-colors ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}
            >
              <Pin className="w-3.5 h-3.5 text-neutral-300" />
              {contextCol.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button
              onClick={() => {
                onHideColumn(contextCol.id);
                setContextMenu(null);
              }}
              className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 font-medium transition-colors ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}
            >
              <EyeOff className="w-3.5 h-3.5 text-neutral-300" />
              {contextCol.hidden ? 'Unhide' : 'Hide'}
            </button>
            <button
              onClick={() => {
                onDeleteColumn(contextCol.id);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 text-xs text-red-300 hover:bg-red-500/10 rounded-lg flex items-center gap-2 font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>
      )}

      {agentRunMenu && contextCol?.connectedAgentId && (
        <div
          className={`fixed w-64 rounded-xl shadow-2xl z-[95] py-1 animate-in fade-in zoom-in-95 duration-200 ${
            isDarkMode ? 'bg-[#1a2638] border border-[#263a4f]' : 'bg-white border border-neutral-200'
          }`}
          style={{ top: agentRunMenu.y, left: agentRunMenu.x }}
        >
          <div className={`px-3 py-2 border-b ${isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200'}`}>
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Choose number of rows</span>
          </div>
          <div className="p-1">
            {selectedRows.size > 0 && (
              <button
                onClick={() => runAgentForCount(contextCol.connectedAgentId!, 'selected')}
                className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between gap-2 font-medium transition-colors ${
                  isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                Run selected rows
                <span className="text-[10px] text-neutral-500">{selectedRows.size} total</span>
              </button>
            )}
            {[10, 25, 50, 100].map(count => (
              <button
                key={count}
                onClick={() => runAgentForCount(contextCol.connectedAgentId!, count)}
                className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between gap-2 font-medium transition-colors ${
                  isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                Run first {count} rows
                <span className="text-[10px] text-neutral-500">{Math.min(count, rows.length)} total</span>
              </button>
            ))}
            <button
              onClick={() => runAgentForCount(contextCol.connectedAgentId!, 'all')}
              className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between gap-2 font-medium transition-colors ${
                isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              Run all rows
              <span className="text-[10px] text-neutral-500">{rows.length} total</span>
            </button>
          </div>
        </div>
      )}

      {descriptionEditor && (
        <div
          ref={descriptionRef}
          className={`fixed z-[95] w-72 rounded-xl shadow-2xl p-3 space-y-3 ${isDarkMode ? 'bg-[#1a2638] border border-[#263a4f]' : 'bg-white border border-neutral-200'}`}
          style={{ top: descriptionEditor.y, left: descriptionEditor.x }}
        >
          <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Column Description</div>
          <textarea
            className={`w-full h-20 rounded-lg px-3 py-2 text-xs outline-none resize-none ${isDarkMode ? 'bg-[#131d2e] border border-[#263a4f] text-neutral-200' : 'bg-white border border-neutral-300 text-gray-900'}`}
            value={descriptionEditor.value}
            onChange={(e) => setDescriptionEditor(prev => prev ? { ...prev, value: e.target.value } : prev)}
            placeholder="Add a description..."
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDescriptionEditor(null)}
              className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={saveDescription}
              className="px-3 py-1.5 text-[10px] uppercase tracking-widest bg-blue-600 text-white rounded-md hover:bg-blue-500"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {cellContextMenu && (
        <div
          className={`fixed w-56 rounded-xl shadow-2xl z-[95] py-1 animate-in fade-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-[#1a2638] border border-[#263a4f]' : 'bg-white border border-neutral-200'}`}
          style={{ top: cellContextMenu.y, left: cellContextMenu.x }}
        >
          <div className={`p-1 border-b ${isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200'}`}>
            <button
              onClick={() => {
                onRunCell(cellContextMenu.rowId, cellContextMenu.colId);
                setCellContextMenu(null);
              }}
              disabled={!cellContextCol?.connectedAgentId && !(cellContextCol?.type === ColumnType.HTTP && cellContextCol?.connectedHttpRequestId)}
              className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}
            >
              <Play className="w-3.5 h-3.5 text-blue-400" />
              Run 1 cell
            </button>
          </div>
          <div className={`p-1 border-b ${isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200'}`}>
            <button
              onClick={async () => {
                const value = getCellValueText(cellContextMenu.rowId, cellContextMenu.colId);
                try {
                  await navigator.clipboard.writeText(value);
                } catch {}
                onCellChange(cellContextMenu.rowId, cellContextMenu.colId, '');
                setCellContextMenu(null);
              }}
              className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 font-medium transition-colors ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}
            >
              <Scissors className="w-3.5 h-3.5 text-neutral-300" />
              Cut
            </button>
            <button
              onClick={async () => {
                const value = getCellValueText(cellContextMenu.rowId, cellContextMenu.colId);
                try {
                  await navigator.clipboard.writeText(value);
                } catch {}
                setCellContextMenu(null);
              }}
              className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 font-medium transition-colors ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}
            >
              <Copy className="w-3.5 h-3.5 text-neutral-300" />
              Copy
            </button>
            <button
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  onCellChange(cellContextMenu.rowId, cellContextMenu.colId, text);
                } catch {}
                setCellContextMenu(null);
              }}
              className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 font-medium transition-colors ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-neutral-300" />
              Paste
            </button>
          </div>
          <div className={`p-1 border-b ${isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200'}`}>
            <button
              onClick={() => {
                onInsertRow(cellContextMenu.rowIndex);
                setCellContextMenu(null);
              }}
              className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 font-medium transition-colors ${isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'}`}
            >
              <Rows className="w-3.5 h-3.5 text-neutral-300" />
              Insert row
            </button>
          </div>
          <div className="p-1">
            <button
              onClick={() => {
                onDeleteRow(cellContextMenu.rowId);
                setCellContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 text-xs text-red-300 hover:bg-red-500/10 rounded-lg flex items-center gap-2 font-medium transition-colors"
            >
              <Trash className="w-3.5 h-3.5" />
              Delete 1 row
            </button>
          </div>
        </div>
      )}

      {selectMenu && (() => {
        const selectCol = columns.find(c => c.id === selectMenu.colId);
        const selectRow = rows.find(r => r.id === selectMenu.rowId);
        if (!selectCol) return null;
        const selectedValue = selectRow?.[selectMenu.colId]?.toString() || '';
        const options = selectCol.options || [];

        return (
          <div
            ref={selectMenuRef}
            className={`fixed z-[120] rounded-xl shadow-2xl border animate-in fade-in zoom-in-95 duration-150 ${
              isDarkMode ? 'bg-[#111827] border-[#263a4f]' : 'bg-white border-neutral-200'
            }`}
            style={{ top: selectMenu.y, left: selectMenu.x, minWidth: Math.max(selectMenu.width, 220) }}
          >
            <div className="p-1 max-h-64 overflow-y-auto">
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => {
                  onCellChange(selectMenu.rowId, selectMenu.colId, '');
                  setSelectMenu(null);
                }}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                  isDarkMode ? 'text-neutral-300 hover:bg-[#1e2d3d]' : 'text-black hover:bg-neutral-100'
                }`}
              >
                Select...
              </button>
              {options.length === 0 && (
                <div className={`px-3 py-2 text-xs ${isDarkMode ? 'text-neutral-500' : 'text-black'}`}>
                  No options
                </div>
              )}
              {options.map(opt => (
                <button
                  key={opt.id}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    onCellChange(selectMenu.rowId, selectMenu.colId, opt.label);
                    setSelectMenu(null);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors ${
                    isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-black hover:bg-neutral-100'
                  } ${selectedValue === opt.label ? (isDarkMode ? 'bg-[#1e2d3d]' : 'bg-neutral-100') : ''}`}
                >
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    style={{
                      backgroundColor: `${opt.color || '#111827'}22`,
                      color: opt.color || (isDarkMode ? '#e5e7eb' : '#111827'),
                      border: `1px solid ${(opt.color || '#111827')}55`
                    }}
                  >
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="min-w-max border-collapse">
        
        {/* Spreadsheet Header (A, B, C...) */}
        <div
          className={`flex sticky top-0 z-20 h-6 border-b ${
            isDarkMode ? 'bg-[#0f172a] border-[#1e2d3d]' : 'bg-neutral-50 border-neutral-200'
          }`}
        >
             <div
               style={{ position: 'sticky', left: STICKY_LEFT_INDEX, zIndex: 11 }}
               className={`w-12 border-r shrink-0 ${
                 isDarkMode ? 'border-[#1e2d3d] bg-[#0f172a]' : 'border-neutral-200 bg-neutral-50'
               }`}
             /> {/* Index col spacer */}
             <div
               style={{ position: 'sticky', left: STICKY_LEFT_CHECKBOX, zIndex: 11 }}
               className={`w-10 border-r shrink-0 ${
                 isDarkMode ? 'border-[#1e2d3d] bg-[#0f172a]' : 'border-neutral-200 bg-neutral-50'
               }`}
             /> {/* Checkbox col spacer */}
             {onRunOwnership && (
               <div
                 style={{ position: 'sticky', left: STICKY_LEFT_OWNERSHIP, zIndex: 11 }}
                 className={`w-10 border-r shrink-0 ${
                   isDarkMode ? 'border-[#1e2d3d] bg-[#0f172a]' : 'border-neutral-200 bg-neutral-50'
                 }`}
               />
             )} {/* Ownership action col spacer */}
            {visibleColumns.map((col, idx) => (
                 <div
                   key={col.id}
                   style={{
                     width: col.width,
                     ...(idx === 0 ? { position: 'sticky' as const, left: stickyFirstDataLeft, zIndex: 11 } : {}),
                   }}
                   className={`border-r flex items-center justify-center text-[9px] font-bold shrink-0 ${
                     isDarkMode ? 'border-[#1e2d3d] text-neutral-500 bg-[#0f172a]' : 'border-neutral-200 text-black bg-neutral-50'
                   } ${highlightedColumnIds?.has(col.id) ? demoHighlightClass : ''}`}
                 >
                     {getColumnLetter(idx)}
                 </div>
             ))}
             <div className="flex-1" />
        </div>

        {/* Main Header */}
        <div
          className={`flex border-b sticky top-6 z-10 h-10 ${
            isDarkMode ? 'bg-[#0f172a] border-[#1e2d3d]' : 'bg-neutral-50 border-neutral-200'
          }`}
        >
          <div
            style={{ position: 'sticky', left: STICKY_LEFT_INDEX, zIndex: 11 }}
            className={`w-12 border-r flex items-center justify-center text-[10px] font-mono shrink-0 ${
              isDarkMode ? 'border-[#1e2d3d] bg-[#0f172a] text-[#4a6078]' : 'border-neutral-200 bg-neutral-50 text-black'
            }`}
          >
            #
          </div>
          <div
            style={{ position: 'sticky', left: STICKY_LEFT_CHECKBOX, zIndex: 11 }}
            className={`w-10 border-r flex items-center justify-center shrink-0 ${
              isDarkMode ? 'border-[#1e2d3d] bg-[#0f172a]' : 'border-neutral-200 bg-neutral-50'
            }`}
          >
             <Square className={`w-3.5 h-3.5 ${isDarkMode ? 'text-[#3a5068]' : 'text-neutral-300'}`} />
          </div>
          {onRunOwnership && (
            <div
              style={{ position: 'sticky', left: STICKY_LEFT_OWNERSHIP, zIndex: 11 }}
              className={`w-10 border-r flex items-center justify-center shrink-0 ${
                isDarkMode ? 'border-[#1e2d3d] bg-[#0f172a]' : 'border-neutral-200 bg-neutral-50'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-cyan-500/60" />
            </div>
          )}
          {visibleColumns.map((col, index) => (
            <div
              key={col.id}
              style={{
                width: col.width,
                ...(index === 0 ? { position: 'sticky' as const, left: stickyFirstDataLeft, zIndex: 11 } : {}),
              }}
              onContextMenu={(e) => openContextMenu(e, col)}
              className={`relative px-3 py-1.5 border-r text-[12px] font-semibold tracking-normal flex flex-col justify-center group transition-colors shrink-0 ${
                isDarkMode
                  ? 'border-[#1e2d3d] bg-[#0f172a] hover:bg-[#162032] text-[#5a7a94]'
                  : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100/60 text-black'
              } ${highlightedColumnIds?.has(col.id) ? demoHighlightClass : ''}`}
            >
              <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 truncate">
                <span className={isDarkMode ? 'text-[#4a6a84]' : 'text-black'}>
                  {getColumnTypeIcon(col.type)}
                </span>
                {col.headerColor && (
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.headerColor }} />
                )}
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
                {col.linkedColumn && (
                    <div className="text-blue-400" title="Linked Column">
                        <Link className="w-3 h-3" />
                    </div>
                )}
                {renamingColId === col.id ? (
                  <input
                    className={`rounded px-2 py-0.5 text-[11px] font-bold outline-none ${isDarkMode ? 'bg-[#131d2e] border border-[#263a4f] text-white' : 'bg-white border border-neutral-300 text-gray-900'}`}
                    value={renameValue}
                    autoFocus
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') setRenamingColId(null);
                    }}
                  />
                ) : (
                  <span className={col.deduplication?.active ? (isDarkMode ? 'text-white' : 'text-black') : ''}>{col.header}</span>
                )}
                {col.description && (
                  <FileText className="w-3 h-3 text-neutral-600" title={col.description} />
                )}
              </div>
              
              <div className="flex items-center gap-1 transition-opacity opacity-0 group-hover:opacity-100">
                {col.type === ColumnType.HTTP ? (
                    col.connectedHttpRequestId ? (
                        <button 
                            onClick={() => onRunHttpRequest(col.connectedHttpRequestId!)}
                            className="p-1 hover:bg-blue-600 hover:text-white rounded text-blue-500 transition-colors"
                            title="Run HTTP"
                        >
                            <Play className="w-3 h-3 fill-current" />
                        </button>
                    ) : (
                        <button 
                            onClick={() => onConfigureHttpRequest && onConfigureHttpRequest(col.id)}
                            className="p-1 hover:bg-neutral-700 rounded text-neutral-600 hover:text-white transition-colors"
                            title="Configure HTTP"
                        >
                            <Settings2 className="w-3 h-3" />
                        </button>
                    )
                ) : col.connectedAgentId ? (
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
              </div>
              </div>
              {/* SELECT distribution bar */}
              {col.type === ColumnType.SELECT && col.options && col.options.length > 0 && (
                <div className="flex w-full h-1 rounded-full overflow-hidden mt-1" title="Option distribution">
                  {col.options.map(opt => {
                    const count = rows.filter(r => r[col.id]?.toString() === opt.label).length;
                    const pct = rows.length ? (count / rows.length) * 100 : 0;
                    return pct > 0 ? (
                      <div 
                        key={opt.id} 
                        style={{ width: `${pct}%`, backgroundColor: opt.color }} 
                        className="h-full transition-all duration-300"
                        title={`${opt.label}: ${Math.round(pct)}%`} 
                      />
                    ) : null;
                  })}
                </div>
              )}

              <div
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  resizingRef.current = {
                    colId: col.id,
                    startX: event.clientX,
                    startWidth: col.width
                  };
                }}
                className={`absolute right-0 top-0 h-full w-1.5 cursor-col-resize ${
                  isDarkMode ? 'hover:bg-blue-400/40' : 'hover:bg-blue-500/30'
                }`}
                title="Resize column"
              />
            </div>
          ))}
          {onRunOwnership && (
            <button 
              onClick={() => onRunOwnership()}
              className={`px-4 hover:bg-cyan-600/20 hover:border-cyan-500/50 transition-colors border-r flex items-center justify-center min-w-[50px] group ${
                isDarkMode ? 'border-[#1e2d3d] bg-[#0f172a]' : 'border-neutral-200 bg-neutral-50'
              }`}
              title="Run Ownership (bulk)"
            >
              <Users className="w-4 h-4 text-cyan-500 group-hover:text-cyan-400 transition-colors" />
            </button>
          )}
          {hiddenColumns.length > 0 && (
            <div ref={hiddenMenuRef} className="relative">
              <button
                onClick={() => setHiddenMenuOpen(!hiddenMenuOpen)}
                className={`px-3 h-full border-r flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  isDarkMode ? 'border-[#1e2d3d] bg-[#0f172a] text-[#5a7a94] hover:text-white hover:bg-[#1e2d3d]' : 'border-neutral-200 bg-neutral-50 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
                title="Hidden columns"
              >
                <EyeOff className="w-3.5 h-3.5" />
                {hiddenColumns.length}
              </button>
              {hiddenMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-[#1a1a1a] border border-neutral-700 rounded-xl shadow-2xl z-[60] py-1 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-3 py-2 border-b border-neutral-800">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Hidden Columns</span>
                  </div>
                  <div className="p-1">
                    {hiddenColumns.map(col => (
                      <button
                        key={col.id}
                        onClick={() => onHideColumn(col.id)}
                        className="w-full text-left px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 rounded-lg flex items-center gap-2 font-medium transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Show {col.header}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="relative" ref={addColumnMenuRef}>
            <button 
              onClick={() => setAddColumnMenuOpen(!addColumnMenuOpen)}
              className={`px-4 transition-colors border-r flex items-center justify-center min-w-[50px] group h-full ${
                isDarkMode ? 'hover:bg-[#1e2d3d] border-[#1e2d3d] bg-[#0f172a]' : 'hover:bg-neutral-100 border-neutral-200 bg-neutral-50'
              }`}
              title="Add column"
            >
              <Plus className={`w-4 h-4 transition-colors ${isDarkMode ? 'text-[#5a7a94] group-hover:text-white' : 'text-neutral-400 group-hover:text-neutral-700'}`} />
            </button>
            {addColumnMenuOpen && (
              <div className={`absolute right-0 top-full mt-1 w-52 rounded-xl shadow-2xl z-[60] py-1 animate-in fade-in zoom-in-95 duration-200 ${
                isDarkMode ? 'bg-[#1a2638] border border-[#263a4f]' : 'bg-white border border-neutral-200 shadow-lg'
              }`}>
                {COLUMN_TYPE_CATEGORIES.map((category, catIdx) => (
                  <div key={category.label}>
                    {catIdx > 0 && <div className={`my-1 ${isDarkMode ? 'border-t border-[#263a4f]' : 'border-t border-neutral-100'}`} />}
                    {category.items.map(item => (
                      <button
                        key={item.label}
                        onClick={() => {
                          if (item.type === 'USE_AI') {
                            onUseAI?.();
                          } else {
                            const defaultNames: Record<string, string> = {
                              [ColumnType.ENRICHMENT]: 'Enrichment',
                              [ColumnType.MESSAGE]: 'Message',
                              [ColumnType.WATERFALL]: 'Waterfall',
                              [ColumnType.FORMULA]: 'Formula',
                              [ColumnType.MERGE]: 'Merge',
                              [ColumnType.CHECKBOX]: 'Checkbox',
                            };
                            onAddColumn({ 
                              header: defaultNames[item.type as string] || 'New Field', 
                              type: item.type as ColumnType, 
                              width: 180 
                            });
                          }
                          setAddColumnMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 font-medium transition-colors ${
                          isDarkMode 
                            ? 'text-neutral-200 hover:bg-[#1e2d3d]' 
                            : 'text-neutral-700 hover:bg-neutral-50'
                        } ${item.type === 'USE_AI' ? (isDarkMode ? 'text-purple-300' : 'text-purple-600') : ''}`}
                      >
                        <span className={
                          item.type === 'USE_AI' 
                            ? 'text-purple-400' 
                            : isDarkMode ? 'text-neutral-400' : 'text-neutral-500'
                        }>
                          {item.icon}
                        </span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
             <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
               isDarkMode ? 'bg-[#0f172a]' : 'bg-neutral-100'
             }`}>
                <Plus className={`w-6 h-6 ${isDarkMode ? 'text-[#3a5068]' : 'text-neutral-400'}`} />
             </div>
             <p className={`text-sm ${isDarkMode ? 'text-[#5a7a94]' : 'text-neutral-400'}`}>No data in this vertical. Start by adding a row.</p>
          </div>
        ) : filteredRows.map((row, index) => {
          const isRowSelected = selectedRows.has(row.id);
          return (
            <div key={row.id} className={`flex border-b group h-10 transition-colors ${
              isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200'
            } ${isRowSelected
                ? 'bg-blue-500/10'
                : isDarkMode ? 'hover:bg-[#131d2e]' : 'hover:bg-blue-50/40'
            }`}>
              <div
                style={{ position: 'sticky', left: STICKY_LEFT_INDEX, zIndex: 10 }}
                className={`w-12 border-r flex items-center justify-center text-[10px] font-mono shrink-0 ${
                  isDarkMode
                    ? 'border-[#1e2d3d] text-[#4a6078] bg-[#0c1220] group-hover:bg-[#131d2e]'
                    : 'border-neutral-200 text-neutral-400 bg-neutral-50/80 group-hover:bg-neutral-100/60'
                }`}
              >
                {index + 1}
              </div>
              <div
                style={{ position: 'sticky', left: STICKY_LEFT_CHECKBOX, zIndex: 10 }}
                className={`w-10 border-r flex items-center justify-center cursor-pointer shrink-0 ${
                  isDarkMode ? 'border-[#1e2d3d] bg-[#0c1220] group-hover:bg-[#131d2e]' : 'border-neutral-200 bg-neutral-50/80 group-hover:bg-neutral-100/60'
                }`}
                onClick={(e) => onSelectRow(row.id, e.shiftKey || e.metaKey)}
              >
                {isRowSelected ? (
                  <CheckSquare className="w-4 h-4 text-blue-500 fill-current" />
                ) : (
                  <Square className={`w-4 h-4 ${isDarkMode ? 'text-[#3a5068] group-hover:text-[#5a7a94]' : 'text-neutral-300 group-hover:text-neutral-400'}`} />
                )}
              </div>
              {onRunOwnership && (
                <div
                  style={{ position: 'sticky', left: STICKY_LEFT_OWNERSHIP, zIndex: 10 }}
                  className={`w-10 border-r flex items-center justify-center shrink-0 ${
                    isDarkMode
                      ? 'border-[#1e2d3d] bg-[#0c1220] group-hover:bg-[#131d2e]'
                      : 'border-neutral-200 bg-neutral-50/80 group-hover:bg-neutral-100/60'
                  }`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRunOwnership(row.id);
                    }}
                    className="p-1.5 hover:bg-cyan-600/20 hover:text-cyan-400 rounded text-cyan-500/60 transition-colors opacity-0 group-hover:opacity-100"
                    title="Run Ownership"
                  >
                    <Users className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {visibleColumns.map((col, colIdx) => {
                const cellKey = `${row.id}:${col.id}`;
                const isHighlighted = highlightedCellKeys?.has(cellKey) || highlightedColumnIds?.has(col.id);
                return (
                  <div
                    key={col.id}
                    style={{
                      width: col.width,
                      ...(colIdx === 0 ? { position: 'sticky' as const, left: stickyFirstDataLeft, zIndex: 10 } : {}),
                    }}
                    onContextMenu={(e) => openCellContextMenu(e, row, col, index)}
                    className={`border-r notion-cell transition-all flex items-center h-full shrink-0 ${
                      isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200'
                    } ${
                      isDarkMode && colIdx === 0 ? 'bg-[#0c1220] group-hover:bg-[#131d2e]' : ''
                    } ${
                      !isDarkMode && colIdx === 0 ? 'bg-neutral-50/80 group-hover:bg-neutral-100/60' : ''
                    } ${
                      selectedCell?.rowId === row.id && selectedCell?.colId === col.id ? 'ring-1 ring-inset ring-blue-500 bg-blue-500/5' : ''
                    } ${isHighlighted ? demoHighlightClass : ''}`}
                  >
                    {renderCell(row, col)}
                  </div>
                );
              })}
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
