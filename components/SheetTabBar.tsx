
import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Palette } from 'lucide-react';
import { SheetTab } from '../types';

interface SheetTabBarProps {
  sheets: SheetTab[];
  activeSheetId: string;
  onSheetSelect: (id: string) => void;
  onAddSheet: () => void;
  onRenameSheet: (id: string, name: string) => void;
  onRecolorSheet: (id: string, color: string) => void;
  onDeleteSheet: (id: string) => void;
  isDarkMode?: boolean;
}

const TAB_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6',
  '#D946EF', '#84CC16',
];

const SheetTabBar: React.FC<SheetTabBarProps> = ({
  sheets,
  activeSheetId,
  onSheetSelect,
  onAddSheet,
  onRenameSheet,
  onRecolorSheet,
  onDeleteSheet,
  isDarkMode = true
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
        setShowColorPicker(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const startRename = (sheet: SheetTab) => {
    setEditingId(sheet.id);
    setEditValue(sheet.name);
    setContextMenu(null);
  };

  const commitRename = () => {
    if (editingId && editValue.trim()) {
      onRenameSheet(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const handleContextMenu = (e: React.MouseEvent, sheetId: string) => {
    e.preventDefault();
    setContextMenu({ id: sheetId, x: e.clientX, y: e.clientY });
    setShowColorPicker(null);
  };

  return (
    <div className={`h-9 border-t flex items-center px-2 gap-0.5 shrink-0 overflow-x-auto scrollbar-none ${
      isDarkMode ? 'bg-[#0f172a] border-[#1e2d3d]' : 'bg-neutral-50 border-neutral-200'
    }`}>
      {sheets.map(sheet => {
        const isActive = sheet.id === activeSheetId;
        const isEditing = editingId === sheet.id;

        return (
          <button
            key={sheet.id}
            onClick={() => !isEditing && onSheetSelect(sheet.id)}
            onDoubleClick={() => startRename(sheet)}
            onContextMenu={(e) => handleContextMenu(e, sheet.id)}
            className={`relative flex items-center gap-2 px-4 h-7 rounded-t-lg text-xs font-semibold transition-all whitespace-nowrap select-none ${
              isActive
                ? isDarkMode
                  ? 'bg-[#1a2638] text-white border border-[#263a4f] border-b-transparent -mb-px z-10'
                  : 'bg-white text-gray-900 border border-neutral-300 border-b-transparent -mb-px z-10'
                : isDarkMode
                  ? 'text-[#5a7a94] hover:text-neutral-300 hover:bg-[#182234]'
                  : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: sheet.color }}
            />
            {isEditing ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className={`bg-transparent outline-none text-xs w-20 border-b border-blue-500 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span>{sheet.name}</span>
            )}
          </button>
        );
      })}

      <button
        onClick={onAddSheet}
        className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ml-1 ${
          isDarkMode ? 'text-[#4a6078] hover:text-white hover:bg-[#1e2d3d]' : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200'
        }`}
        title="Add sheet tab"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className={`fixed z-[500] w-44 rounded-xl shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-150 ${
            isDarkMode ? 'bg-[#1a2638] border border-[#263a4f]' : 'bg-white border border-neutral-200'
          }`}
          style={{ left: contextMenu.x, top: contextMenu.y - 120 }}
        >
          <button
            onClick={() => {
              const sheet = sheets.find(s => s.id === contextMenu.id);
              if (sheet) startRename(sheet);
            }}
            className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 ${
              isDarkMode ? 'text-neutral-300 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            Rename
          </button>
          <button
            onClick={() => setShowColorPicker(contextMenu.id)}
            className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 ${
              isDarkMode ? 'text-neutral-300 hover:bg-[#1e2d3d]' : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <Palette className="w-3 h-3" />
            Change Color
          </button>
          {sheets.length > 1 && (
            <button
              onClick={() => {
                onDeleteSheet(contextMenu.id);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2"
            >
              <X className="w-3 h-3" />
              Delete
            </button>
          )}

          {showColorPicker === contextMenu.id && (
            <div className={`px-3 py-2 border-t mt-1 ${isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200'}`}>
              <div className="grid grid-cols-6 gap-1.5">
                {TAB_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => {
                      onRecolorSheet(contextMenu.id, color);
                      setContextMenu(null);
                      setShowColorPicker(null);
                    }}
                    className={`w-5 h-5 rounded-full border hover:scale-125 transition-transform ${isDarkMode ? 'border-[#263a4f]' : 'border-neutral-300'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SheetTabBar;
