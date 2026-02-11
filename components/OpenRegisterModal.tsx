
import React, { useState, useEffect } from 'react';
import { X, Database, Play, CheckCircle2, AlertTriangle, ChevronDown, Loader2, ToggleLeft, ToggleRight, Search, Building2, Users, BarChart3, Phone, ArrowRight } from 'lucide-react';
import { ColumnDefinition } from '../types';
import { ENRICHMENT_ACTIONS, EnrichmentAction, InputMapping } from '../services/openRegisterAgent';

interface OpenRegisterModalProps {
  columns: ColumnDefinition[];
  onClose: () => void;
  onRun: (action: EnrichmentAction, mapping: InputMapping) => void;
  selectedRowsCount: number;
  totalRowsCount: number;
  isProcessing: boolean;
  isDarkMode: boolean;
}

const ACTION_ICONS: Record<EnrichmentAction, React.ReactNode> = {
  full_enrichment: <Building2 className="w-4 h-4" />,
  company_details: <Building2 className="w-4 h-4" />,
  directors_only: <Users className="w-4 h-4" />,
  ownership_only: <Users className="w-4 h-4" />,
  financials: <BarChart3 className="w-4 h-4" />,
  contact_info: <Phone className="w-4 h-4" />,
  company_search: <Search className="w-4 h-4" />,
};

const OpenRegisterModal: React.FC<OpenRegisterModalProps> = ({
  columns,
  onClose,
  onRun,
  selectedRowsCount,
  totalRowsCount,
  isProcessing,
  isDarkMode
}) => {
  const bgMain = isDarkMode ? 'bg-[#0b1120]' : 'bg-white';
  const bgSecondary = isDarkMode ? 'bg-[#0f172a]' : 'bg-neutral-50';
  const bgTertiary = isDarkMode ? 'bg-[#131d2e]' : 'bg-white';
  const borderMain = isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200';
  const borderSecondary = isDarkMode ? 'border-[#263a4f]' : 'border-neutral-300';
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-neutral-500' : 'text-neutral-600';
  const textTertiary = isDarkMode ? 'text-neutral-400' : 'text-neutral-500';
  const textQuaternary = isDarkMode ? 'text-neutral-600' : 'text-neutral-700';
  const hoverBg = isDarkMode ? 'hover:bg-[#1e2d3d]' : 'hover:bg-neutral-100';
  const [selectedAction, setSelectedAction] = useState<EnrichmentAction>('full_enrichment');
  const [companyIdCol, setCompanyIdCol] = useState('');
  const [websiteCol, setWebsiteCol] = useState('');
  const [companyNameCol, setCompanyNameCol] = useState('');

  // Auto-detect column mappings on mount
  useEffect(() => {
    for (const col of columns) {
      const h = col.header.toLowerCase();
      const id = col.id.toLowerCase();
      if (!companyIdCol && (id === 'company_id' || h.includes('company id') || h.includes('register'))) {
        setCompanyIdCol(col.id);
      }
      if (!websiteCol && (id === 'company_website' || id === 'website' || h.includes('website') || h.includes('url'))) {
        setWebsiteCol(col.id);
      }
      if (!companyNameCol && (id === 'company_name' || h.includes('company name') || h === 'name')) {
        setCompanyNameCol(col.id);
      }
    }
  }, [columns]);

  const actionConfig = ENRICHMENT_ACTIONS.find(a => a.id === selectedAction)!;

  const hasAnyInput = companyIdCol || websiteCol || companyNameCol;
  const rowCount = selectedRowsCount > 0 ? selectedRowsCount : totalRowsCount;

  // Determine input status
  const getInputStatus = (colId: string, label: string, isPrimary: boolean) => {
    if (colId) return { status: 'mapped' as const, text: columns.find(c => c.id === colId)?.header || colId };
    if (isPrimary) return { status: 'missing' as const, text: `No ${label} column mapped` };
    return { status: 'fallback' as const, text: `Will try fallback` };
  };

  const idStatus = getInputStatus(companyIdCol, 'Company ID', false);
  const webStatus = getInputStatus(websiteCol, 'Website', false);
  const nameStatus = getInputStatus(companyNameCol, 'Company Name', false);

  const needsCompanyId = selectedAction !== 'company_search';
  const canRun = hasAnyInput && !isProcessing;

  const handleRun = () => {
    onRun(selectedAction, { companyIdCol, websiteCol, companyNameCol });
  };

  return (
    <div className="fixed inset-0 z-[200]" onClick={onClose}>
      <div className={`absolute top-0 right-0 h-screen w-[700px] ${bgMain} border-l ${borderMain} shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300`} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className={`px-8 py-6 border-b ${borderMain} flex items-center justify-between ${bgMain} shrink-0`}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-900/30 rounded-2xl border border-cyan-800/30 shadow-inner">
              <Database className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className={`text-sm font-black ${textPrimary} uppercase tracking-widest`}>OpenRegister</h2>
              <p className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest mt-1`}>Enrichment Engine</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2.5 ${hoverBg} rounded-xl ${textSecondary} ${isDarkMode ? 'hover:text-white' : 'hover:text-gray-900'} transition-colors`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`flex flex-1 overflow-hidden ${bgMain}`}>
          
          {/* Left Panel: Input Mapping */}
          <div className={`w-72 border-r ${borderMain} ${bgSecondary} flex flex-col shrink-0`}>
            <div className={`p-6 border-b ${borderMain}/50`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                <h3 className={`text-[10px] ${textTertiary} font-black uppercase tracking-[0.2em]`}>Input Mapping</h3>
              </div>
              <p className={`text-[10px] ${textQuaternary} font-medium`}>Map columns to OpenRegister fields.</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Company ID mapping */}
              <div className="space-y-2">
                <label className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest flex items-center gap-2`}>
                  <StatusDot status={idStatus.status} />
                  Company ID
                </label>
                <select
                  value={companyIdCol}
                  onChange={e => setCompanyIdCol(e.target.value)}
                  className={`w-full ${bgTertiary} border ${borderMain} rounded-xl px-3 py-2.5 text-xs ${textPrimary} outline-none focus:border-cyan-500/50 transition-all`}
                >
                  <option value="">-- Not mapped --</option>
                  {columns.map(col => (
                    <option key={col.id} value={col.id}>{col.header}</option>
                  ))}
                </select>
              </div>

              {/* Website mapping */}
              <div className="space-y-2">
                <label className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest flex items-center gap-2`}>
                  <StatusDot status={webStatus.status} />
                  Website URL
                </label>
                <select
                  value={websiteCol}
                  onChange={e => setWebsiteCol(e.target.value)}
                  className={`w-full ${bgTertiary} border ${borderMain} rounded-xl px-3 py-2.5 text-xs ${textPrimary} outline-none focus:border-cyan-500/50 transition-all`}
                >
                  <option value="">-- Not mapped --</option>
                  {columns.map(col => (
                    <option key={col.id} value={col.id}>{col.header}</option>
                  ))}
                </select>
              </div>

              {/* Company Name mapping */}
              <div className="space-y-2">
                <label className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest flex items-center gap-2`}>
                  <StatusDot status={nameStatus.status} />
                  Company Name
                </label>
                <select
                  value={companyNameCol}
                  onChange={e => setCompanyNameCol(e.target.value)}
                  className={`w-full ${bgTertiary} border ${borderMain} rounded-xl px-3 py-2.5 text-xs ${textPrimary} outline-none focus:border-cyan-500/50 transition-all`}
                >
                  <option value="">-- Not mapped --</option>
                  {columns.map(col => (
                    <option key={col.id} value={col.id}>{col.header}</option>
                  ))}
                </select>
              </div>

              {/* Fallback info */}
              <div className={`${isDarkMode ? 'bg-[#0f172a]/50' : 'bg-neutral-100'} border ${borderMain} rounded-xl p-3 space-y-2`}>
                <p className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest`}>Resolution Order</p>
                <div className="space-y-1.5">
                  <FallbackStep num={1} label="Company ID" mapped={!!companyIdCol} isDarkMode={isDarkMode} />
                  <FallbackStep num={2} label="Website Lookup" mapped={!!websiteCol} isDarkMode={isDarkMode} />
                  <FallbackStep num={3} label="Name Search" mapped={!!companyNameCol} isDarkMode={isDarkMode} />
                </div>
                <p className={`text-[9px] ${textQuaternary} italic mt-2`}>
                  Resolved IDs are written back to the Company ID column for reuse.
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel: Action Selection */}
          <div className={`flex-1 flex flex-col min-h-0 ${bgMain}`}>
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-3xl mx-auto space-y-8">
                
                {/* Action selector */}
                <div className="space-y-3">
                  <label className={`text-[10px] ${textSecondary} font-black uppercase tracking-[0.2em] flex items-center gap-2`}>
                    Enrichment Action
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {ENRICHMENT_ACTIONS.map(action => {
                      const isActive = selectedAction === action.id;
                      return (
                        <button
                          key={action.id}
                          onClick={() => setSelectedAction(action.id)}
                          className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-4 group ${
                            isActive
                              ? 'bg-cyan-900/15 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.08)]'
                              : `${isDarkMode ? 'bg-[#0f172a]/20' : 'bg-neutral-50'} ${borderMain} ${isDarkMode ? 'hover:bg-[#0f172a]/40 hover:border-[#263a4f]' : 'hover:bg-neutral-100 hover:border-neutral-300'}`
                          }`}
                        >
                          <div className={`p-2 rounded-lg shrink-0 ${isActive ? 'bg-cyan-500/20 text-cyan-400' : isDarkMode ? 'bg-[#1e2d3d] text-neutral-500' : 'bg-neutral-200 text-neutral-600'}`}>
                            {ACTION_ICONS[action.id]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${isActive ? textPrimary : isDarkMode ? 'text-neutral-300' : 'text-gray-700'}`}>
                                {action.label}
                              </span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                isActive ? 'bg-cyan-500/20 text-cyan-400' : isDarkMode ? 'bg-[#1e2d3d] text-neutral-600' : 'bg-neutral-200 text-neutral-700'
                              }`}>
                                {action.outputs}
                              </span>
                            </div>
                            <p className={`text-[10px] ${textSecondary} mt-1`}>{action.description}</p>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${
                            isActive ? 'border-cyan-500' : borderSecondary
                          }`}>
                            {isActive && <div className="w-2 h-2 rounded-full bg-cyan-500" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* AG notice */}
                {(selectedAction === 'ownership_only' || selectedAction === 'full_enrichment') && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-400">AG Companies</p>
                      <p className={`text-[10px] ${textSecondary} mt-1`}>
                        Aktiengesellschaft (AG) companies have no ownership data in Handelsregister. 
                        These will be automatically skipped for the ownership step. Directors will still be extracted if available.
                      </p>
                    </div>
                  </div>
                )}

                {/* Input validation */}
                {!hasAnyInput && (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-red-400">No inputs mapped</p>
                      <p className={`text-[10px] ${textSecondary} mt-1`}>
                        Map at least one input column (Company ID, Website, or Company Name) to identify companies.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className={`p-6 border-t ${borderMain} ${bgSecondary} flex items-center justify-between`}>
              <div className={`text-[10px] ${textQuaternary} font-bold`}>
                {selectedRowsCount > 0
                  ? `${selectedRowsCount} row${selectedRowsCount !== 1 ? 's' : ''} selected`
                  : `${totalRowsCount} row${totalRowsCount !== 1 ? 's' : ''} (all)`
                }
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className={`px-6 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest ${textSecondary} ${isDarkMode ? 'hover:text-white' : 'hover:text-gray-900'} transition-colors`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRun}
                  disabled={!canRun}
                  className={`bg-cyan-600 hover:bg-cyan-500 ${isDarkMode ? 'disabled:bg-[#1e2d3d] disabled:text-neutral-600' : 'disabled:bg-neutral-300 disabled:text-neutral-500'} text-white px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.15)] flex items-center gap-3 disabled:shadow-none`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      Run on {rowCount} Row{rowCount !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────

const StatusDot: React.FC<{ status: 'mapped' | 'fallback' | 'missing' }> = ({ status }) => {
  const colors = {
    mapped: 'bg-emerald-500',
    fallback: 'bg-amber-500',
    missing: 'bg-neutral-700'
  };
  return <div className={`w-1.5 h-1.5 rounded-full ${colors[status]}`} />;
};

const FallbackStep: React.FC<{ num: number; label: string; mapped: boolean; isDarkMode: boolean }> = ({ num, label, mapped, isDarkMode }) => (
  <div className="flex items-center gap-2">
    <span className={`text-[9px] font-mono w-4 text-center ${mapped ? 'text-cyan-500' : isDarkMode ? 'text-neutral-700' : 'text-neutral-500'}`}>{num}.</span>
    <span className={`text-[10px] font-medium ${mapped ? isDarkMode ? 'text-white' : 'text-gray-900' : isDarkMode ? 'text-neutral-600' : 'text-neutral-700'}`}>{label}</span>
    {mapped ? (
      <CheckCircle2 className="w-3 h-3 text-emerald-500 ml-auto" />
    ) : (
      <span className={`text-[9px] ${isDarkMode ? 'text-neutral-700' : 'text-neutral-500'} ml-auto`}>--</span>
    )}
  </div>
);

export default OpenRegisterModal;
