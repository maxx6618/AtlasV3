
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
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  isDarkMode?: boolean;
}

const FormulaBar: React.FC<FormulaBarProps> = ({ 
  isVisible, 
  onToggle, 
  selectedCell, 
  activeColumn, 
  value, 
  onChange,
  onKeyDown,
  isDarkMode = true
}) => {
  if (!isVisible) {
    return (
      <button 
        onClick={onToggle}
        className={`h-2 w-full transition-colors flex items-center justify-center group ${
          isDarkMode ? 'bg-[#0f172a] hover:bg-[#1e2d3d]' : 'bg-neutral-50 hover:bg-neutral-100'
        }`}
      >
        <div className={`w-8 h-1 rounded-full ${isDarkMode ? 'bg-neutral-700 group-hover:bg-neutral-500' : 'bg-neutral-300 group-hover:bg-neutral-400'}`} />
      </button>
    );
  }

  const isFormula = activeColumn?.type === ColumnType.FORMULA;

  return (
    <div className={`border-b flex flex-col ${
      isDarkMode ? 'bg-[#0f172a] border-[#1e2d3d]' : 'bg-neutral-50 border-neutral-200'
    }`}>
      <div className="flex items-center px-4 py-2 gap-4">
        <div className={`flex items-center gap-2 min-w-[120px] border-r pr-4 ${
          isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200'
        }`}>
          {isFormula ? (
            <Calculator className="w-4 h-4 text-blue-400" />
          ) : (
            <Type className={`w-4 h-4 ${isDarkMode ? 'text-[#5a7a94]' : 'text-neutral-400'}`} />
          )}
          <span className={`text-[10px] font-bold uppercase tracking-widest truncate ${
            isDarkMode ? 'text-[#7b93a8]' : 'text-neutral-500'
          }`}>
            {activeColumn?.header || 'No Selection'}
          </span>
        </div>
        
        <div className="flex-1 flex items-center gap-3">
          <span className="text-blue-500 font-mono text-sm font-bold">fx</span>
          <input
            type="text"
            className={`flex-1 bg-transparent border-none outline-none text-sm font-mono ${
              isDarkMode ? 'text-neutral-200 placeholder-neutral-700' : 'text-neutral-800 placeholder-neutral-400'
            }`}
            placeholder={isFormula ? "Enter formula (e.g. /company_name + ' Inc')" : "Enter value..."}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={!selectedCell}
          />
        </div>

        <div className="flex items-center gap-2">
          {isFormula && (
            <div className="group relative">
              <Info className={`w-3.5 h-3.5 cursor-help ${isDarkMode ? 'text-[#4a6078] hover:text-[#7b93a8]' : 'text-neutral-400 hover:text-neutral-600'}`} />
              <div className={`absolute right-0 top-6 w-64 p-3 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 ${
                isDarkMode ? 'bg-[#1a2638] border border-[#263a4f]' : 'bg-white border border-neutral-200'
              }`}>
                <p className={`text-[10px] leading-relaxed ${isDarkMode ? 'text-[#7b93a8]' : 'text-neutral-600'}`}>
                  Formula columns apply to the entire column. Reference fields using <span className="text-blue-400">/field_id</span>.
                </p>
              </div>
            </div>
          )}
          <button 
            onClick={onToggle}
            className={`p-1 rounded transition-colors ${isDarkMode ? 'hover:bg-[#1e2d3d]' : 'hover:bg-neutral-200'}`}
          >
            <ChevronUp className={`w-4 h-4 ${isDarkMode ? 'text-[#5a7a94]' : 'text-neutral-400'}`} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormulaBar;
