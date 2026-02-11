import React, { useEffect, useMemo, useState } from 'react';
import { X, CloudUpload, AlertTriangle, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { ColumnDefinition, SheetTab } from '../types';
import { HeaderMatch, ParsedFile, ParsedSheet, matchHeadersWithLLM, normalizeHeader, parseFile } from '../services/importService';

export type UploadTarget = 'existing' | 'new-sheet' | 'new-vertical';
export const NEW_COLUMN = '__new__';
export const IGNORE_COLUMN = '__ignore__';

export interface UploadImportPayload {
  target: UploadTarget;
  targetSheetId?: string;
  newSheetName?: string;
  newVerticalName?: string;
  parsed: ParsedFile;
  mapping: Record<string, string>;
  fileName?: string;
  sheetName?: string;
}

interface UploadModalProps {
  columns: ColumnDefinition[];
  sheets: SheetTab[];
  activeSheetId: string;
  apiKeys?: {
    google?: string;
    openai?: string;
    anthropic?: string;
  };
  matchConfig: {
    provider: string;
    modelId: string;
    confidenceThreshold: number;
    useFuzzyMatching: boolean;
  };
  isDarkMode: boolean;
  initialFile?: File | null;
  onInitialFileConsumed?: () => void;
  onClose: () => void;
  onImport: (payload: UploadImportPayload) => void;
}

const UploadModal: React.FC<UploadModalProps> = ({
  columns,
  sheets,
  activeSheetId,
  apiKeys,
  matchConfig,
  isDarkMode,
  initialFile,
  onInitialFileConsumed,
  onClose,
  onImport
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [mappingBySheet, setMappingBySheet] = useState<Record<string, Record<string, string>>>({});
  const [matchesBySheet, setMatchesBySheet] = useState<Record<string, Record<string, HeaderMatch>>>({});
  const [sheetTargets, setSheetTargets] = useState<Record<string, { target: UploadTarget; targetSheetId?: string; newSheetName?: string; newVerticalName?: string }>>({});
  const [targetSheetId] = useState(activeSheetId);
  const [fileName, setFileName] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const parsedSheets = useMemo<ParsedSheet[]>(() => {
    if (!parsed) return [];
    if (parsed.sheets && parsed.sheets.length > 0) return parsed.sheets;
    return [{ name: parsed.fileName || fileName || 'Sheet 1', headers: parsed.headers, rows: parsed.rows }];
  }, [parsed, fileName]);

  const activeParsedSheet = parsedSheets[activeSheetIndex];

  const targetColumns = useMemo(() => {
    if (!activeParsedSheet) return [];
    const sheetKey = activeParsedSheet.name;
    const currentTarget = sheetTargets[sheetKey]?.target || 'existing';
    const currentTargetSheetId = sheetTargets[sheetKey]?.targetSheetId || activeSheetId;
    if (currentTarget !== 'existing') return [];
    if (currentTargetSheetId) {
      const sheet = sheets.find(s => s.id === currentTargetSheetId);
      if (sheet) return sheet.columns;
    }
    return columns;
  }, [columns, sheets, activeSheetId, activeParsedSheet, sheetTargets]);

  useEffect(() => {
    if (!activeParsedSheet) return;
    const sheetKey = activeParsedSheet.name;
    setSheetTargets(prev => ({
      ...prev,
      [sheetKey]: {
        target: prev[sheetKey]?.target || 'existing',
        targetSheetId: prev[sheetKey]?.targetSheetId || activeSheetId,
        newSheetName: prev[sheetKey]?.newSheetName,
        newVerticalName: prev[sheetKey]?.newVerticalName
      }
    }));
  }, [activeSheetId, activeParsedSheet]);

  const handleFileChange = async (nextFile: File | null) => {
    setFile(nextFile);
    setParsed(null);
    setMappingBySheet({});
    setMatchesBySheet({});
    setSheetTargets({});
    setError(null);
    if (!nextFile) return;
    setIsParsing(true);
    try {
      const parsedFile = await parseFile(nextFile);
      if (parsedFile.headers.length === 0) {
        setError('No headers detected in file.');
        return;
      }
      setParsed({ ...parsedFile, fileName: nextFile.name });
      setActiveSheetIndex(0);
      setFileName(nextFile.name);
    } catch (err: any) {
      setError(err?.message || 'Failed to parse file.');
    } finally {
      setIsParsing(false);
    }
  };

  useEffect(() => {
    if (initialFile) {
      handleFileChange(initialFile);
      onInitialFileConsumed?.();
    }
  }, [initialFile, onInitialFileConsumed]);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const droppedFile = event.dataTransfer?.files?.[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  useEffect(() => {
    if (!parsed || !activeParsedSheet) return;
    const sheetKey = activeParsedSheet.name;
    const currentTarget = sheetTargets[sheetKey]?.target || 'existing';
    const currentTargetSheetId = sheetTargets[sheetKey]?.targetSheetId || activeSheetId;
    const resolvedTargetColumns =
      currentTarget === 'existing'
        ? (sheets.find(s => s.id === currentTargetSheetId)?.columns || columns)
        : [];

    if (currentTarget !== 'existing' || resolvedTargetColumns.length === 0) {
      const nextMapping: Record<string, string> = {};
      activeParsedSheet.headers.forEach(header => {
        nextMapping[header] = NEW_COLUMN;
      });
      setMappingBySheet(prev => ({ ...prev, [sheetKey]: nextMapping }));
      setMatchesBySheet(prev => ({ ...prev, [sheetKey]: {} }));
      return;
    }

    setIsMatching(true);
    matchHeadersWithLLM(activeParsedSheet.headers, resolvedTargetColumns.map(col => col.header), {
      provider: matchConfig.provider as any,
      modelId: matchConfig.modelId,
      confidenceThreshold: matchConfig.confidenceThreshold,
      useFuzzyMatching: matchConfig.useFuzzyMatching,
      apiKey:
        matchConfig.provider === 'OPENAI'
          ? apiKeys?.openai
          : matchConfig.provider === 'ANTHROPIC'
            ? apiKeys?.anthropic
            : apiKeys?.google,
      apiKeys
    })
      .then(result => {
        const nextMapping: Record<string, string> = {};
        const nextMatches: Record<string, HeaderMatch> = {};
        result.forEach(match => {
          const targetCol = resolvedTargetColumns.find(col => col.header === match.targetHeader);
          const confident = match.confidence >= matchConfig.confidenceThreshold;
          nextMapping[match.sourceHeader] = confident && targetCol ? targetCol.id : NEW_COLUMN;
          nextMatches[match.sourceHeader] = match;
        });
        activeParsedSheet.headers.forEach(header => {
          if (!nextMapping[header]) nextMapping[header] = NEW_COLUMN;
        });
        setMappingBySheet(prev => ({ ...prev, [sheetKey]: nextMapping }));
        setMatchesBySheet(prev => ({ ...prev, [sheetKey]: nextMatches }));
      })
      .catch(() => {
        const nextMapping: Record<string, string> = {};
        activeParsedSheet.headers.forEach(header => {
          nextMapping[header] = NEW_COLUMN;
        });
        setMappingBySheet(prev => ({ ...prev, [sheetKey]: nextMapping }));
        setMatchesBySheet(prev => ({ ...prev, [sheetKey]: {} }));
      })
      .finally(() => {
        setIsMatching(false);
      });
  }, [parsed, activeParsedSheet, sheets, columns, apiKeys, matchConfig, sheetTargets, activeSheetId]);

  const canImport = Boolean(parsed && parsedSheets.length > 0 && !isParsing && !isMatching);

  const handleImport = () => {
    if (!parsed) return;
    parsedSheets.forEach(sheet => {
      const sheetKey = sheet.name;
      const targetForSheet = sheetTargets[sheetKey]?.target || 'existing';
      const targetSheetForSheet = sheetTargets[sheetKey]?.targetSheetId || activeSheetId;
      if (targetForSheet === 'existing' && !targetSheetForSheet) {
        setError('Select a target tab.');
        return;
      }
      const newSheetNameForSheet = sheetTargets[sheetKey]?.newSheetName;
      const newVerticalNameForSheet = sheetTargets[sheetKey]?.newVerticalName;
      const mappingForSheet = mappingBySheet[sheetKey] || {};
      onImport({
        target: targetForSheet,
        targetSheetId: targetForSheet === 'existing' ? targetSheetForSheet : undefined,
        newSheetName: targetForSheet === 'new-sheet' ? (newSheetNameForSheet || sheet.name) : undefined,
        newVerticalName: targetForSheet === 'new-vertical' ? (newVerticalNameForSheet || sheet.name) : undefined,
        parsed: { headers: sheet.headers, rows: sheet.rows },
        mapping: mappingForSheet,
        fileName,
        sheetName: sheet.name
      });
    });
  };

  const renderMatchBadge = (header: string) => {
    const match = matchesBySheet[activeParsedSheet?.name || '']?.[header];
    if (!match || !match.targetHeader) {
      return (
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-amber-400">
          <AlertTriangle className="w-3 h-3" /> Review
        </span>
      );
    }
    if (match.confidence >= matchConfig.confidenceThreshold) {
      return (
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-emerald-400">
          <CheckCircle2 className="w-3 h-3" /> Matched
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-amber-400">
        <AlertTriangle className="w-3 h-3" /> Low Conf
      </span>
    );
  };

  const renderSheetTargetControls = () => {
    if (!activeParsedSheet) return null;
    const sheetKey = activeParsedSheet.name;
    const sheetTarget = sheetTargets[sheetKey]?.target || 'existing';
    const sheetTargetId = sheetTargets[sheetKey]?.targetSheetId || activeSheetId;
    const sheetNewName = sheetTargets[sheetKey]?.newSheetName || '';
    const sheetNewVertical = sheetTargets[sheetKey]?.newVerticalName || '';

    return (
      <>
        <div className="space-y-2">
          <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
            Target (Sheet)
          </label>
          <div className="space-y-2">
            <button
              onClick={() =>
                setSheetTargets(prev => ({
                  ...prev,
                  [sheetKey]: { ...prev[sheetKey], target: 'existing' }
                }))
              }
              className={`w-full text-left px-3 py-2 rounded-xl border text-[10px] uppercase tracking-widest font-bold ${
                sheetTarget === 'existing' ? 'border-blue-400/60 text-blue-300 bg-blue-500/10' : 'border-[#1e2d3d] text-neutral-400'
              }`}
            >
              Existing Tab
            </button>
            <button
              onClick={() =>
                setSheetTargets(prev => ({
                  ...prev,
                  [sheetKey]: { ...prev[sheetKey], target: 'new-sheet' }
                }))
              }
              className={`w-full text-left px-3 py-2 rounded-xl border text-[10px] uppercase tracking-widest font-bold ${
                sheetTarget === 'new-sheet' ? 'border-blue-400/60 text-blue-300 bg-blue-500/10' : 'border-[#1e2d3d] text-neutral-400'
              }`}
            >
              New Tab in Current Vertical
            </button>
            <button
              onClick={() =>
                setSheetTargets(prev => ({
                  ...prev,
                  [sheetKey]: { ...prev[sheetKey], target: 'new-vertical' }
                }))
              }
              className={`w-full text-left px-3 py-2 rounded-xl border text-[10px] uppercase tracking-widest font-bold ${
                sheetTarget === 'new-vertical' ? 'border-blue-400/60 text-blue-300 bg-blue-500/10' : 'border-[#1e2d3d] text-neutral-400'
              }`}
            >
              New Vertical
            </button>
          </div>
        </div>

        {sheetTarget === 'existing' && (
          <div className="space-y-2">
            <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
              Target Tab
            </label>
            <select
              value={sheetTargetId}
              onChange={e =>
                setSheetTargets(prev => ({
                  ...prev,
                  [sheetKey]: { ...prev[sheetKey], targetSheetId: e.target.value }
                }))
              }
              className="w-full bg-[#131d2e] border border-[#1e2d3d] rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500/50 transition-all"
            >
              {sheets.map(sheet => (
                <option key={sheet.id} value={sheet.id}>{sheet.name}</option>
              ))}
            </select>
          </div>
        )}

        {sheetTarget === 'new-sheet' && (
          <div className="space-y-2">
            <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
              New Tab Name
            </label>
            <input
              value={sheetNewName}
              onChange={e =>
                setSheetTargets(prev => ({
                  ...prev,
                  [sheetKey]: { ...prev[sheetKey], newSheetName: e.target.value }
                }))
              }
              placeholder={activeParsedSheet.name}
              className="w-full bg-[#131d2e] border border-[#1e2d3d] rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500/50 transition-all"
            />
          </div>
        )}

        {sheetTarget === 'new-vertical' && (
          <div className="space-y-2">
            <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
              New Vertical Name
            </label>
            <input
              value={sheetNewVertical}
              onChange={e =>
                setSheetTargets(prev => ({
                  ...prev,
                  [sheetKey]: { ...prev[sheetKey], newVerticalName: e.target.value }
                }))
              }
              placeholder={activeParsedSheet.name}
              className="w-full bg-[#131d2e] border border-[#1e2d3d] rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500/50 transition-all"
            />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-[200]" onClick={onClose}>
      <div
        className="absolute top-0 right-0 h-screen w-[700px] bg-[#0b1120] border-l border-[#1e2d3d] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300"
        onClick={e => e.stopPropagation()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="px-8 py-6 border-b border-[#1e2d3d] flex items-center justify-between bg-[#0b1120] shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-900/30 rounded-2xl border border-blue-800/30 shadow-inner">
              <CloudUpload className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Upload</h2>
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">
                CSV / Excel Import
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-[#1e2d3d] rounded-xl text-neutral-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden bg-[#0b1120] relative">
          {isDragging && (
            <div className="absolute inset-4 border-2 border-dashed border-blue-400/70 rounded-2xl bg-blue-500/10 flex items-center justify-center text-xs text-blue-200 uppercase tracking-widest z-20">
              Drop file to import
            </div>
          )}
          <div className="w-80 border-r border-[#1e2d3d] bg-[#0f172a] flex flex-col shrink-0">
            <div className="p-6 border-b border-[#1e2d3d]/50">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <h3 className="text-[10px] text-neutral-400 font-black uppercase tracking-[0.2em]">Import Setup</h3>
              </div>
              <p className="text-[10px] text-neutral-600 font-medium">
                Choose file and target destination.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                  File
                </label>
                <label className="flex items-center justify-between gap-2 bg-[#131d2e] border border-[#1e2d3d] rounded-xl px-3 py-2.5 text-xs text-white cursor-pointer hover:border-blue-500/40 transition-all">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                    <span className="truncate">{fileName || 'Select CSV/XLS/XLSX'}</span>
                  </div>
                  <input
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    className="hidden"
                    onChange={e => handleFileChange(e.target.files?.[0] || null)}
                  />
                </label>
                {isParsing && (
                  <p className="text-[10px] text-neutral-500">Parsing file...</p>
                )}
              </div>

              {parsedSheets.length > 1 && (
                <div className="space-y-2">
                  <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                    Excel Sheets
                  </label>
                  <div className="space-y-2">
                    {parsedSheets.map((sheet, idx) => (
                      <button
                        key={sheet.name}
                        onClick={() => setActiveSheetIndex(idx)}
                        className={`w-full text-left px-3 py-2 rounded-xl border text-[10px] uppercase tracking-widest font-bold ${
                          activeSheetIndex === idx ? 'border-blue-400/60 text-blue-300 bg-blue-500/10' : 'border-[#1e2d3d] text-neutral-400'
                        }`}
                      >
                        {sheet.name || `Sheet ${idx + 1}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {renderSheetTargetControls()}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 bg-[#0b1120]">
            <div className="flex-1 overflow-y-auto p-8">
              {!parsed && (
                <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-sm">
                  Upload a CSV or Excel file to preview headers.
                </div>
              )}

              {parsed && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-widest">Header Mapping</h3>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">
                        {isMatching ? 'Matching headers...' : `${activeParsedSheet?.headers.length || 0} headers detected`}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {activeParsedSheet?.headers.map(header => (
                      <div key={header} className="flex items-center justify-between gap-3 bg-[#0f172a] border border-[#1e2d3d] rounded-xl px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-xs text-white font-semibold">{header}</span>
                          {(sheetTargets[activeParsedSheet.name]?.target || 'existing') === 'existing' && (
                            <span className="text-[10px] text-neutral-500 space-y-1">
                              {renderMatchBadge(header)}
                              {(() => {
                                const exactTarget = targetColumns.find(col =>
                                  normalizeHeader(col.header) === normalizeHeader(header)
                                );
                                return exactTarget ? (
                                  <span className="block text-[10px] text-neutral-400">
                                    Exact → {exactTarget.header}
                                  </span>
                                ) : (
                                  <span className="block text-[10px] text-neutral-500">
                                    Exact → None
                                  </span>
                                );
                              })()}
                              {matchConfig.useFuzzyMatching ? (
                                matchesBySheet[activeParsedSheet.name]?.[header]?.targetHeader ? (
                                  <span className="block text-[10px] text-neutral-400">
                                    Fuzzy → {matchesBySheet[activeParsedSheet.name]?.[header]?.targetHeader} ({Math.round((matchesBySheet[activeParsedSheet.name]?.[header]?.confidence || 0) * 100)}%)
                                  </span>
                                ) : (
                                  <span className="block text-[10px] text-neutral-500">Fuzzy → None</span>
                                )
                              ) : (
                                <span className="block text-[10px] text-neutral-500">Fuzzy → Off</span>
                              )}
                            </span>
                          )}
                        </div>
                        <select
                          value={(mappingBySheet[activeParsedSheet.name] || {})[header] || NEW_COLUMN}
                          onChange={e =>
                            setMappingBySheet(prev => ({
                              ...prev,
                              [activeParsedSheet.name]: { ...(prev[activeParsedSheet.name] || {}), [header]: e.target.value }
                            }))
                          }
                          className="bg-[#131d2e] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500/50 transition-all"
                        >
                          <option value={IGNORE_COLUMN}>Ignore column</option>
                          <option value={NEW_COLUMN}>Create new column</option>
                          {targetColumns.map(col => (
                            <option key={col.id} value={col.id}>{col.header}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-8 py-5 border-t border-[#1e2d3d] flex items-center justify-between bg-[#0b1120] shrink-0">
              <div className="text-[10px] text-neutral-500 uppercase tracking-widest">
                {error ? `Error: ${error}` : (parsed ? `${parsed.rows.length} rows ready` : 'No file selected')}
              </div>
              <button
                onClick={handleImport}
                disabled={!canImport}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                  canImport
                    ? 'bg-blue-500 hover:bg-blue-400 text-white'
                    : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                }`}
              >
                <CloudUpload className="w-4 h-4" />
                Import
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
