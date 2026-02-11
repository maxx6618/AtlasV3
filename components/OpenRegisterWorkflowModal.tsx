
import React, { useState, useEffect, useMemo } from 'react';
import { X, Database, Play, CheckCircle2, AlertTriangle, Loader2, Building2, Users, ToggleLeft, ToggleRight, ArrowRight, RefreshCw, Zap } from 'lucide-react';
import { ColumnDefinition, RowData, WorkflowConfig } from '../types';
import { ENRICHMENT_STATUS } from '../services/openRegisterWorkflow';
import { InputMapping } from '../services/openRegisterAgent';

interface OpenRegisterWorkflowModalProps {
  columns: ColumnDefinition[];
  rows: RowData[];
  workflowConfig?: WorkflowConfig;
  onClose: () => void;
  onRunCompanyEnrichment: (mapping: InputMapping) => void;
  onRunOwnerEnrichment: (mapping: InputMapping, includeProkurist: boolean) => void;
  onSaveConfig: (config: WorkflowConfig) => void;
  isProcessing: boolean;
  isDarkMode: boolean;
}

const StatusBadge: React.FC<{ label: string; count: number; color: string; isDarkMode: boolean }> = ({ label, count, color, isDarkMode }) => (
  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isDarkMode ? 'border-[#1e2d3d] bg-[#131d2e]' : 'border-neutral-200 bg-neutral-50'}`}>
    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
    <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>{label}</span>
    <span className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{count}</span>
  </div>
);

const FallbackStep: React.FC<{ num: number; label: string; mapped: boolean; isDarkMode: boolean }> = ({ num, label, mapped, isDarkMode }) => (
  <div className="flex items-center gap-2">
    <span className={`text-[9px] font-mono w-4 text-center ${mapped ? 'text-cyan-500' : isDarkMode ? 'text-neutral-700' : 'text-neutral-500'}`}>{num}.</span>
    <span className={`text-[10px] font-medium ${mapped ? isDarkMode ? 'text-white' : 'text-gray-900' : isDarkMode ? 'text-neutral-600' : 'text-neutral-700'}`}>{label}</span>
    {mapped ? <CheckCircle2 className="w-3 h-3 text-emerald-500 ml-auto" /> : <span className={`text-[9px] ${isDarkMode ? 'text-neutral-700' : 'text-neutral-500'} ml-auto`}>--</span>}
  </div>
);

const OpenRegisterWorkflowModal: React.FC<OpenRegisterWorkflowModalProps> = ({
  columns, rows, workflowConfig, onClose, onRunCompanyEnrichment, onRunOwnerEnrichment, onSaveConfig, isProcessing, isDarkMode,
}) => {
  const bgMain = isDarkMode ? 'bg-[#0b1120]' : 'bg-white';
  const bgSecondary = isDarkMode ? 'bg-[#0f172a]' : 'bg-neutral-50';
  const bgTertiary = isDarkMode ? 'bg-[#131d2e]' : 'bg-white';
  const borderMain = isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200';
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-neutral-500' : 'text-neutral-600';
  const textTertiary = isDarkMode ? 'text-neutral-400' : 'text-neutral-500';
  const hoverBg = isDarkMode ? 'hover:bg-[#1e2d3d]' : 'hover:bg-neutral-100';

  const [websiteCol, setWebsiteCol] = useState(workflowConfig?.websiteCol || '');
  const [companyNameCol, setCompanyNameCol] = useState(workflowConfig?.companyNameCol || '');
  const [companyIdCol, setCompanyIdCol] = useState(workflowConfig?.companyIdCol || '');
  const [includeProkurist, setIncludeProkurist] = useState(workflowConfig?.includeProkurist ?? false);
  const [companyAuto, setCompanyAuto] = useState(workflowConfig?.companyAutoEnrich ?? false);
  const [ownerAuto, setOwnerAuto] = useState(workflowConfig?.ownerAutoEnrich ?? false);

  // Auto-detect columns
  useEffect(() => {
    if (workflowConfig?.websiteCol || workflowConfig?.companyNameCol || workflowConfig?.companyIdCol) return;
    for (const col of columns) {
      const h = col.header.toLowerCase();
      const id = col.id.toLowerCase();
      if (!websiteCol && (id === 'company_website' || id === 'website' || h.includes('website') || h.includes('url'))) setWebsiteCol(col.id);
      if (!companyNameCol && (id === 'company_name' || h.includes('company name') || h === 'name')) setCompanyNameCol(col.id);
      if (!companyIdCol && (id === 'company_id' || h.includes('company id'))) setCompanyIdCol(col.id);
    }
  }, [columns]);

  // Save config when toggles change
  useEffect(() => {
    onSaveConfig({
      companyAutoEnrich: companyAuto,
      ownerAutoEnrich: ownerAuto,
      includeProkurist,
      websiteCol,
      companyNameCol,
      companyIdCol,
    });
  }, [companyAuto, ownerAuto, includeProkurist, websiteCol, companyNameCol, companyIdCol]);

  const companyCounts = useMemo(() => {
    const c = { open: 0, done: 0, error: 0, auto: 0, empty: 0 };
    rows.forEach(r => {
      const s = r['company_enrichment']?.toString() || '';
      if (s === 'Open') c.open++;
      else if (s === 'Done') c.done++;
      else if (s === 'Error') c.error++;
      else if (s === 'Auto') c.auto++;
      else c.empty++;
    });
    return c;
  }, [rows]);

  const ownerCounts = useMemo(() => {
    const c = { open: 0, done: 0, error: 0, auto: 0, empty: 0 };
    rows.forEach(r => {
      const s = r['owner_enrichment']?.toString() || '';
      if (s === 'Open') c.open++;
      else if (s === 'Done') c.done++;
      else if (s === 'Error') c.error++;
      else if (s === 'Auto') c.auto++;
      else c.empty++;
    });
    return c;
  }, [rows]);

  const companyReadyCount = companyCounts.open + companyCounts.empty;
  const ownerReadyCount = ownerCounts.open;
  const hasAnyInput = websiteCol || companyNameCol || companyIdCol;
  const canRunCompany = hasAnyInput && companyReadyCount > 0 && !isProcessing;
  const canRunOwner = ownerReadyCount > 0 && !isProcessing;
  const mapping: InputMapping = { companyIdCol, websiteCol, companyNameCol };

  const AutoToggle: React.FC<{ label: string; description: string; active: boolean; onToggle: () => void }> = ({ label, description, active, onToggle }) => (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${borderMain} ${isDarkMode ? 'bg-[#0f172a]/50' : 'bg-neutral-100'}`}>
      <div>
        <div className="flex items-center gap-2">
          {active && <Zap className="w-3 h-3 text-cyan-400" />}
          <p className={`text-[10px] font-bold ${textPrimary}`}>{label}</p>
        </div>
        <p className={`text-[9px] ${textTertiary} mt-0.5`}>{description}</p>
      </div>
      <button onClick={onToggle} className="transition-colors">
        {active ? <ToggleRight className="w-8 h-8 text-cyan-500" /> : <ToggleLeft className={`w-8 h-8 ${isDarkMode ? 'text-neutral-600' : 'text-neutral-400'}`} />}
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200]" onClick={onClose}>
      <div className={`absolute top-0 right-0 h-screen w-[740px] ${bgMain} border-l ${borderMain} shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300`} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className={`px-8 py-6 border-b ${borderMain} flex items-center justify-between ${bgMain} shrink-0`}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-900/30 rounded-2xl border border-cyan-800/30 shadow-inner">
              <Database className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className={`text-sm font-black ${textPrimary} uppercase tracking-widest`}>OpenRegister Workflow</h2>
              <p className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest mt-1`}>Two-Stage Enrichment Pipeline</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2.5 ${hoverBg} rounded-xl ${textSecondary} ${isDarkMode ? 'hover:text-white' : 'hover:text-gray-900'} transition-colors`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">

          {/* Input Mapping */}
          <div className={`p-5 rounded-xl border ${borderMain} ${bgSecondary}`}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
              <h3 className={`text-[10px] ${textTertiary} font-black uppercase tracking-[0.2em]`}>Input Mapping</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest`}>Website (Primary)</label>
                <select value={websiteCol} onChange={e => setWebsiteCol(e.target.value)} className={`w-full ${bgTertiary} border ${borderMain} rounded-xl px-3 py-2.5 text-xs ${textPrimary} outline-none focus:border-cyan-500/50`}>
                  <option value="">-- Not mapped --</option>
                  {columns.map(col => <option key={col.id} value={col.id}>{col.header}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest`}>Company Name (Fallback)</label>
                <select value={companyNameCol} onChange={e => setCompanyNameCol(e.target.value)} className={`w-full ${bgTertiary} border ${borderMain} rounded-xl px-3 py-2.5 text-xs ${textPrimary} outline-none focus:border-cyan-500/50`}>
                  <option value="">-- Not mapped --</option>
                  {columns.map(col => <option key={col.id} value={col.id}>{col.header}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest`}>Company ID</label>
                <select value={companyIdCol} onChange={e => setCompanyIdCol(e.target.value)} className={`w-full ${bgTertiary} border ${borderMain} rounded-xl px-3 py-2.5 text-xs ${textPrimary} outline-none focus:border-cyan-500/50`}>
                  <option value="">-- Not mapped --</option>
                  {columns.map(col => <option key={col.id} value={col.id}>{col.header}</option>)}
                </select>
              </div>
            </div>
            <div className={`mt-4 p-3 rounded-lg border ${borderMain} ${isDarkMode ? 'bg-[#0f172a]/50' : 'bg-neutral-100'}`}>
              <p className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest mb-2`}>Resolution Order</p>
              <div className="space-y-1.5">
                <FallbackStep num={1} label="Company ID (direct)" mapped={!!companyIdCol} isDarkMode={isDarkMode} />
                <FallbackStep num={2} label="Website Lookup (primary)" mapped={!!websiteCol} isDarkMode={isDarkMode} />
                <FallbackStep num={3} label="Name Search (fallback)" mapped={!!companyNameCol} isDarkMode={isDarkMode} />
              </div>
            </div>
          </div>

          {/* Stage 1: Company Enrichment */}
          <div className={`p-5 rounded-xl border-2 ${companyReadyCount > 0 ? 'border-blue-500/30' : borderMain} ${bgSecondary}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${companyReadyCount > 0 ? 'bg-blue-500/15 text-blue-400' : isDarkMode ? 'bg-[#1e2d3d] text-neutral-600' : 'bg-neutral-200 text-neutral-500'}`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-xs font-black ${textPrimary} uppercase tracking-widest`}>Stage 1: Company Enrichment</h3>
                  <p className={`text-[10px] ${textSecondary} mt-1`}>Legal form, address, employees, financials.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {companyAuto && <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">AUTO</span>}
                <div className={`px-3 py-1.5 rounded-full text-[10px] font-black ${companyReadyCount > 0 ? 'bg-blue-500/15 text-blue-400' : isDarkMode ? 'bg-[#1e2d3d] text-neutral-600' : 'bg-neutral-200 text-neutral-500'}`}>
                  {companyReadyCount} ready
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <StatusBadge label="Open" count={companyCounts.open} color="#3B82F6" isDarkMode={isDarkMode} />
              <StatusBadge label="Done" count={companyCounts.done} color="#22C55E" isDarkMode={isDarkMode} />
              {companyCounts.error > 0 && <StatusBadge label="Error" count={companyCounts.error} color="#EF4444" isDarkMode={isDarkMode} />}
              {companyCounts.empty > 0 && <StatusBadge label="No Status" count={companyCounts.empty} color="#6B7280" isDarkMode={isDarkMode} />}
            </div>

            <AutoToggle
              label="Auto Company Enrichment"
              description="Automatically enrich new rows and rows set to 'Open'"
              active={companyAuto}
              onToggle={() => setCompanyAuto(!companyAuto)}
            />

            <button
              onClick={() => onRunCompanyEnrichment(mapping)}
              disabled={!canRunCompany}
              className={`w-full mt-4 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${
                canRunCompany
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                  : isDarkMode ? 'bg-[#1e2d3d] text-neutral-600 cursor-not-allowed' : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
              }`}
            >
              {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Running...</> : <><Play className="w-4 h-4 fill-current" /> Run Company Enrichment ({companyReadyCount})</>}
            </button>

            {!hasAnyInput && (
              <div className="mt-3 bg-red-500/5 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <p className={`text-[10px] ${textSecondary}`}>Map at least one input column above.</p>
              </div>
            )}
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center gap-3">
            <div className={`h-px flex-1 ${isDarkMode ? 'bg-[#1e2d3d]' : 'bg-neutral-200'}`} />
            <div className={`flex items-center gap-2 ${textTertiary} text-[10px] font-bold uppercase tracking-widest`}>
              <RefreshCw className="w-3.5 h-3.5" />
              Set rows to "Open" for Owner Enrichment
            </div>
            <div className={`h-px flex-1 ${isDarkMode ? 'bg-[#1e2d3d]' : 'bg-neutral-200'}`} />
          </div>

          {/* Stage 2: Owner Enrichment */}
          <div className={`p-5 rounded-xl border-2 ${ownerReadyCount > 0 ? 'border-orange-500/30' : borderMain} ${bgSecondary}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${ownerReadyCount > 0 ? 'bg-orange-500/15 text-orange-400' : isDarkMode ? 'bg-[#1e2d3d] text-neutral-600' : 'bg-neutral-200 text-neutral-500'}`}>
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-xs font-black ${textPrimary} uppercase tracking-widest`}>Stage 2: Owner Enrichment</h3>
                  <p className={`text-[10px] ${textSecondary} mt-1`}>Managing directors + owners to Persons sheet.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {ownerAuto && <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">AUTO</span>}
                <div className={`px-3 py-1.5 rounded-full text-[10px] font-black ${ownerReadyCount > 0 ? 'bg-orange-500/15 text-orange-400' : isDarkMode ? 'bg-[#1e2d3d] text-neutral-600' : 'bg-neutral-200 text-neutral-500'}`}>
                  {ownerReadyCount} ready
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <StatusBadge label="Open" count={ownerCounts.open} color="#F97316" isDarkMode={isDarkMode} />
              <StatusBadge label="Done" count={ownerCounts.done} color="#22C55E" isDarkMode={isDarkMode} />
              {ownerCounts.error > 0 && <StatusBadge label="Error" count={ownerCounts.error} color="#EF4444" isDarkMode={isDarkMode} />}
            </div>

            <div className="space-y-3 mb-4">
              <AutoToggle
                label="Auto Owner Enrichment"
                description="Automatically enrich rows set to 'Open'"
                active={ownerAuto}
                onToggle={() => setOwnerAuto(!ownerAuto)}
              />
              <AutoToggle
                label="Include Prokuristen"
                description="Extract Prokuristen alongside Managing Directors"
                active={includeProkurist}
                onToggle={() => setIncludeProkurist(!includeProkurist)}
              />
            </div>

            <div className={`mb-4 ${isDarkMode ? 'bg-amber-500/5' : 'bg-amber-50'} border border-amber-500/20 rounded-lg p-3 flex items-start gap-2`}>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className={`text-[10px] ${textSecondary}`}>AG/SE companies are automatically skipped for ownership. Directors will still be extracted.</p>
            </div>

            <button
              onClick={() => onRunOwnerEnrichment(mapping, includeProkurist)}
              disabled={!canRunOwner}
              className={`w-full py-3.5 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${
                canRunOwner
                  ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.15)]'
                  : isDarkMode ? 'bg-[#1e2d3d] text-neutral-600 cursor-not-allowed' : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
              }`}
            >
              {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Running...</> : <><Play className="w-4 h-4 fill-current" /> Run Owner Enrichment ({ownerReadyCount})</>}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-8 py-4 border-t ${borderMain} ${bgSecondary} flex items-center justify-between`}>
          <div className={`text-[10px] ${textTertiary} font-bold`}>{rows.length} total rows</div>
          <button onClick={onClose} className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest ${textSecondary} ${isDarkMode ? 'hover:text-white' : 'hover:text-gray-900'} transition-colors`}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default OpenRegisterWorkflowModal;
