import React, { useEffect, useRef, useState } from 'react';
import { ColumnDefinition, RowData, FilterState, FilterOperator, FilterCondition, ColumnSearch } from '../types';
import { ChevronDown, Columns, Filter, Rows, Search, ArrowDown, ArrowUp, X, Plus, Eye, EyeOff } from 'lucide-react';

const FILTER_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'equal_to', label: 'equal to' },
  { value: 'not_equal_to', label: 'not equal to' },
  { value: 'contains', label: 'contains' },
  { value: 'does_not_contain', label: 'does not contain' },
  { value: 'contains_any_of', label: 'contains any of' },
  { value: 'does_not_contain_any_of', label: 'does not contain any of' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

const NO_VALUE_OPERATORS: FilterOperator[] = ['is_empty', 'is_not_empty'];

interface SelectionBarProps {
  columns: ColumnDefinition[];
  rows: RowData[];
  selectedRows: Set<string>;
  filterState: FilterState;
  onFilterStateChange: (state: FilterState) => void;
  columnSearch: ColumnSearch | null;
  onColumnSearchChange: (search: ColumnSearch | null) => void;
  onSelectAllRows: () => void;
  onClearSelectedRows: () => void;
  onToggleColumnHidden: (colId: string) => void;
  onShowAllColumns: () => void;
  onHideAllColumns: () => void;
  onClearAllFilters: () => void;
  onSortColumn: (colId: string, direction: 'asc' | 'desc') => void;
  isDarkMode: boolean;
}

const SelectionBar: React.FC<SelectionBarProps> = ({
  columns,
  rows,
  selectedRows,
  filterState,
  onFilterStateChange,
  columnSearch,
  onColumnSearchChange,
  onSelectAllRows,
  onClearSelectedRows,
  onToggleColumnHidden,
  onShowAllColumns,
  onHideAllColumns,
  onClearAllFilters,
  onSortColumn,
  isDarkMode
}) => {
  const [openMenu, setOpenMenu] = useState<'columns' | 'rows' | 'filters' | 'sorts' | 'search' | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      if (!barRef.current?.contains(targetNode)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeFilterCount = filterState.conditions.length;
  const hiddenCount = columns.filter(col => col.hidden).length;

  const baseText = isDarkMode ? 'text-[#7b93a8]' : 'text-neutral-600';
  const baseBg = isDarkMode ? 'bg-[#0f172a] border-[#1e2d3d]' : 'bg-neutral-50 border-neutral-200';
  const chipBg = isDarkMode ? 'bg-[#131d2e] border-[#263a4f] text-[#7b93a8]' : 'bg-white border-neutral-200 text-neutral-600';
  const chipHover = isDarkMode ? 'hover:bg-[#182338] hover:text-white' : 'hover:bg-neutral-100 hover:text-neutral-800';
  const dropdownBg = isDarkMode ? 'bg-[#1a2638] border-[#263a4f]' : 'bg-white border-neutral-200';
  const inputBg = isDarkMode ? 'bg-[#131d2e] border-[#263a4f] text-neutral-200' : 'bg-white border-neutral-200 text-neutral-700';
  const labelColor = isDarkMode ? 'text-neutral-400' : 'text-neutral-500';
  const itemHover = isDarkMode ? 'text-neutral-200 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100';

  // --- Filter helpers ---
  const addFilterCondition = (colId?: string) => {
    const defaultColId = colId || columns[0]?.id || '';
    const newCondition: FilterCondition = {
      id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      colId: defaultColId,
      operator: 'contains',
      value: ''
    };
    onFilterStateChange({
      ...filterState,
      conditions: [...filterState.conditions, newCondition]
    });
  };

  const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
    onFilterStateChange({
      ...filterState,
      conditions: filterState.conditions.map(c => c.id === id ? { ...c, ...updates } : c)
    });
  };

  const removeCondition = (id: string) => {
    onFilterStateChange({
      ...filterState,
      conditions: filterState.conditions.filter(c => c.id !== id)
    });
  };

  const toggleCombinator = () => {
    onFilterStateChange({
      ...filterState,
      combinator: filterState.combinator === 'and' ? 'or' : 'and'
    });
  };

  // Open filter menu and pre-fill a column if requested
  const openFilterForColumn = (colId: string) => {
    if (!filterState.conditions.some(c => c.colId === colId && !c.value)) {
      addFilterCondition(colId);
    }
    setOpenMenu('filters');
  };

  return (
    <div
      ref={barRef}
      className={`h-10 border-b flex items-center justify-between px-3 text-[10px] font-bold uppercase tracking-widest ${baseBg} ${baseText}`}
    >
      <div className="flex items-center gap-2">
        <button
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${chipBg} ${chipHover}`}
          title="Default View"
        >
          Default View
          <ChevronDown className="w-3 h-3 opacity-70" />
        </button>

        <div className={`w-px h-4 ${isDarkMode ? 'bg-[#1e2d3d]' : 'bg-neutral-200'}`} />

        {/* ── Columns (visibility) ── */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'columns' ? null : 'columns')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${chipBg} ${chipHover}`}
            title="Select columns"
          >
            <Columns className="w-3.5 h-3.5" />
            Columns
            {hiddenCount > 0 && <span className="text-[9px] opacity-70">({hiddenCount} hidden)</span>}
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>
          {openMenu === 'columns' && (
            <div className={`absolute left-0 mt-1 w-56 rounded-xl shadow-2xl z-[120] border ${dropdownBg}`}>
              <div className={`px-3 py-2 border-b flex items-center justify-between ${isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200'}`}>
                <span className={`text-[9px] font-bold uppercase tracking-widest ${labelColor}`}>
                  Column visibility
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onShowAllColumns}
                    className={`text-[9px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-neutral-300 hover:text-white' : 'text-neutral-500 hover:text-neutral-800'}`}
                  >
                    Show all
                  </button>
                  <button
                    onClick={onHideAllColumns}
                    className={`text-[9px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-neutral-300 hover:text-white' : 'text-neutral-500 hover:text-neutral-800'}`}
                  >
                    Hide all
                  </button>
                </div>
              </div>
              <div className="max-h-64 overflow-auto p-1">
                {columns.map(col => (
                  <button
                    key={col.id}
                    onClick={() => onToggleColumnHidden(col.id)}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between gap-2 font-medium transition-colors ${itemHover}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {col.hidden
                        ? <EyeOff className="w-3.5 h-3.5 opacity-50 shrink-0" />
                        : <Eye className="w-3.5 h-3.5 opacity-50 shrink-0" />
                      }
                      <span className="truncate">{col.header}</span>
                    </div>
                    <span className={`text-[10px] shrink-0 ${col.hidden ? 'text-red-400/70' : 'text-emerald-400/70'}`}>
                      {col.hidden ? 'Hidden' : 'Visible'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Rows ── */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'rows' ? null : 'rows')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${chipBg} ${chipHover}`}
            title="Select rows"
          >
            <Rows className="w-3.5 h-3.5" />
            Rows
            <span className="text-[9px] opacity-70">({selectedRows.size}/{rows.length})</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>
          {openMenu === 'rows' && (
            <div className={`absolute left-0 mt-1 w-48 rounded-xl shadow-2xl z-[120] border ${dropdownBg}`}>
              <div className="p-1">
                <button
                  onClick={() => { onSelectAllRows(); setOpenMenu(null); }}
                  className={`w-full text-left px-3 py-2 text-xs rounded-lg font-medium transition-colors ${itemHover}`}
                >
                  Select all rows
                </button>
                <button
                  onClick={() => { onClearSelectedRows(); setOpenMenu(null); }}
                  className={`w-full text-left px-3 py-2 text-xs rounded-lg font-medium transition-colors ${itemHover}`}
                >
                  Clear selection
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Filters ── */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'filters' ? null : 'filters')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${chipBg} ${chipHover}`}
            title="Filters"
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && <span className="text-[9px] opacity-70">({activeFilterCount})</span>}
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>
          {openMenu === 'filters' && (
            <div className={`absolute left-0 mt-1 rounded-xl shadow-2xl z-[120] border ${dropdownBg}`} style={{ minWidth: '520px' }}>
              <div className={`px-3 py-2 border-b flex items-center justify-between ${isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200'}`}>
                <span className={`text-[9px] font-bold uppercase tracking-widest ${labelColor}`}>Filters</span>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { onClearAllFilters(); }}
                    className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 ${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-700'}`}
                  >
                    <X className="w-3 h-3" />
                    Clear filter
                  </button>
                )}
              </div>

              <div className="p-2 space-y-2 max-h-72 overflow-auto">
                {filterState.conditions.length === 0 && (
                  <div className={`text-xs px-2 py-3 text-center ${labelColor}`}>
                    No filters applied. Click "+ Add filter" below.
                  </div>
                )}

                {filterState.conditions.map((condition, idx) => (
                  <div key={condition.id} className="flex items-center gap-2">
                    {/* Combinator / Where label */}
                    <div className="w-14 shrink-0 text-right">
                      {idx === 0 ? (
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${labelColor}`}>Where</span>
                      ) : (
                        <button
                          onClick={toggleCombinator}
                          className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-[#1e2d3d] text-blue-400 hover:bg-[#263a4f]' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                        >
                          {filterState.combinator.toUpperCase()}
                        </button>
                      )}
                    </div>

                    {/* Column select */}
                    <select
                      value={condition.colId}
                      onChange={(e) => updateCondition(condition.id, { colId: e.target.value })}
                      className={`text-xs rounded-lg px-2 py-1.5 border outline-none w-36 ${inputBg}`}
                    >
                      {columns.map(col => (
                        <option key={col.id} value={col.id}>{col.header}</option>
                      ))}
                    </select>

                    {/* Operator select */}
                    <select
                      value={condition.operator}
                      onChange={(e) => updateCondition(condition.id, { operator: e.target.value as FilterOperator })}
                      className={`text-xs rounded-lg px-2 py-1.5 border outline-none w-44 ${inputBg}`}
                    >
                      {FILTER_OPERATORS.map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>

                    {/* Value input */}
                    {!NO_VALUE_OPERATORS.includes(condition.operator) && (
                      <input
                        value={condition.value}
                        onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                        placeholder="Value..."
                        className={`text-xs rounded-lg px-2 py-1.5 border outline-none flex-1 min-w-0 ${inputBg}`}
                      />
                    )}

                    {/* Remove */}
                    <button
                      onClick={() => removeCondition(condition.id)}
                      className={`p-1 rounded-md shrink-0 ${isDarkMode ? 'text-neutral-500 hover:text-red-400 hover:bg-[#1e2d3d]' : 'text-neutral-400 hover:text-red-500 hover:bg-neutral-100'}`}
                      title="Remove filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add filter button */}
              <div className={`px-3 py-2 border-t ${isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200'}`}>
                <button
                  onClick={() => addFilterCondition()}
                  className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                >
                  <Plus className="w-3 h-3" />
                  Add filter
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Sort ── */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'sorts' ? null : 'sorts')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${chipBg} ${chipHover}`}
            title="Sorts"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            Sort
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>
          {openMenu === 'sorts' && (
            <div className={`absolute left-0 mt-1 w-56 rounded-xl shadow-2xl z-[120] border ${dropdownBg}`}>
              <div className="max-h-64 overflow-auto p-1">
                {columns.map(col => (
                  <div
                    key={col.id}
                    className={`px-3 py-2 text-xs rounded-lg flex items-center justify-between gap-2 ${itemHover}`}
                  >
                    <span className="truncate">{col.header}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { onSortColumn(col.id, 'asc'); setOpenMenu(null); }}
                        className={`p-1 rounded-md ${isDarkMode ? 'text-neutral-300 hover:text-white' : 'text-neutral-400 hover:text-neutral-700'}`}
                        title="Sort A → Z"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { onSortColumn(col.id, 'desc'); setOpenMenu(null); }}
                        className={`p-1 rounded-md ${isDarkMode ? 'text-neutral-300 hover:text-white' : 'text-neutral-400 hover:text-neutral-700'}`}
                        title="Sort Z → A"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Search ── */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'search' ? null : 'search')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${chipBg} ${chipHover}`}
            title="Search"
          >
            <Search className="w-3.5 h-3.5" />
            Search
            {columnSearch && columnSearch.value && columnSearch.value.trim() && <span className="text-[9px] opacity-70">(active)</span>}
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>
          {openMenu === 'search' && (
            <div className={`absolute left-0 mt-1 w-72 rounded-xl shadow-2xl z-[120] border ${dropdownBg}`}>
              <div className={`px-3 py-2 border-b flex items-center justify-between ${isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200'}`}>
                <span className={`text-[9px] font-bold uppercase tracking-widest ${labelColor}`}>
                  {columnSearch?.mode === 'global' ? 'Global search' : 'Search in column'}
                </span>
                {columnSearch && (
                  <button
                    onClick={() => onColumnSearchChange(null)}
                    className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 ${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-700'}`}
                  >
                    <X className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>
              <div className="p-3 space-y-3">
                {/* Search mode toggle */}
                <div className="space-y-1.5">
                  <label className={`text-[9px] font-bold uppercase tracking-widest ${labelColor}`}>Search Mode</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const currentValue = columnSearch?.value || '';
                        onColumnSearchChange({
                          mode: 'column',
                          colId: columnSearch?.colId || columns[0]?.id || '',
                          value: currentValue
                        });
                      }}
                      className={`flex-1 text-xs rounded-lg px-2.5 py-2 border transition-colors ${
                        columnSearch?.mode !== 'global'
                          ? isDarkMode ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' : 'bg-blue-50 border-blue-300 text-blue-700'
                          : inputBg
                      }`}
                    >
                      Column
                    </button>
                    <button
                      onClick={() => {
                        const currentValue = columnSearch?.value || '';
                        onColumnSearchChange({
                          mode: 'global',
                          value: currentValue
                        });
                      }}
                      className={`flex-1 text-xs rounded-lg px-2.5 py-2 border transition-colors ${
                        columnSearch?.mode === 'global'
                          ? isDarkMode ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' : 'bg-blue-50 border-blue-300 text-blue-700'
                          : inputBg
                      }`}
                    >
                      Global
                    </button>
                  </div>
                </div>
                {/* Column selector - only show for column mode */}
                {columnSearch?.mode !== 'global' && (
                  <div className="space-y-1.5">
                    <label className={`text-[9px] font-bold uppercase tracking-widest ${labelColor}`}>Column</label>
                    <select
                      value={columnSearch?.colId || columns[0]?.id || ''}
                      onChange={(e) => {
                        onColumnSearchChange({
                          mode: 'column',
                          colId: e.target.value,
                          value: columnSearch?.value || ''
                        });
                      }}
                      className={`w-full text-xs rounded-lg px-2.5 py-2 border outline-none ${inputBg}`}
                    >
                      {columns.map(col => (
                        <option key={col.id} value={col.id}>{col.header}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className={`text-[9px] font-bold uppercase tracking-widest ${labelColor}`}>Search</label>
                  <input
                    autoFocus
                    value={columnSearch?.value || ''}
                    onChange={(e) => {
                      const searchValue = e.target.value;
                      if (columnSearch?.mode === 'global') {
                        onColumnSearchChange({ mode: 'global', value: searchValue });
                      } else {
                        // Default to column mode if not set
                        const colId = columnSearch?.colId || columns[0]?.id || '';
                        onColumnSearchChange({ mode: 'column', colId, value: searchValue });
                      }
                    }}
                    placeholder="Type to search..."
                    className={`w-full text-xs rounded-lg px-2.5 py-2 border outline-none ${inputBg}`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectionBar;
