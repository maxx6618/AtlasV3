
import React from 'react';
import { Calculator, ChevronDown, ChevronUp, Type, Info } from 'lucide-react';
import { ColumnDefinition, ColumnType } from '../types';

interface FormulaBarProps {
  isVisible: boolean;
  onToggle: () => void;
  selectedCell: { rowId: string, colId: string } | null;
  activeColumn: ColumnDefinition | undefined;
  value: string;
  onChange: (value: string) => void;
}

const FormulaBar: React.FC<FormulaBarProps> = ({ 
  isVisible, 
  onToggle, 
  selectedCell, 
  activeColumn, 
  value, 
  onChange 
}) => {
  if (!isVisible) {
    return (
      <button 
        onClick={onToggle}
        className="h-2 w-full bg-[#111] hover:bg-neutral-800 transition-colors flex items-center justify-center group"
      >
        <div className="w-8 h-1 bg-neutral-700 rounded-full group-hover:bg-neutral-500" />
      </button>
    );
  }

  const isFormula = activeColumn?.type === ColumnType.FORMULA;

  return (
    <div className="bg-[#111] border-b border-neutral-800 flex flex-col">
      <div className="flex items-center px-4 py-2 gap-4">
        <div className="flex items-center gap-2 min-w-[120px] border-r border-neutral-800 pr-4">
          {isFormula ? (
            <Calculator className="w-4 h-4 text-blue-400" />
          ) : (
            <Type className="w-4 h-4 text-neutral-500" />
          )}
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 truncate">
            {activeColumn?.header || 'No Selection'}
          </span>
        </div>
        
        <div className="flex-1 flex items-center gap-3">
          <span className="text-blue-500 font-mono text-sm font-bold">fx</span>
          <input
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-sm text-neutral-200 placeholder-neutral-700 font-mono"
            placeholder={isFormula ? "Enter formula (e.g. /company_name + ' Inc')" : "Enter value..."}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={!selectedCell}
          />
        </div>

        <div className="flex items-center gap-2">
          {isFormula && (
            <div className="group relative">
              <Info className="w-3.5 h-3.5 text-neutral-600 hover:text-neutral-400 cursor-help" />
              <div className="absolute right-0 top-6 w-64 bg-[#1a1a1a] border border-neutral-700 p-3 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                <p className="text-[10px] text-neutral-400 leading-relaxed">
                  Formula columns apply to the entire column. Reference fields using <span className="text-blue-400">/field_id</span>.
                </p>
              </div>
            </div>
          )}
          <button 
            onClick={onToggle}
            className="p-1 hover:bg-neutral-800 rounded transition-colors"
          >
            <ChevronUp className="w-4 h-4 text-neutral-500" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormulaBar;
