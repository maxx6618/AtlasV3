
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Grid from './components/Grid';
import AgentModal from './components/AgentModal';
import CRMSyncModal from './components/CRMSyncModal';
import SettingsModal from './components/SettingsModal';
import Dashboard from './components/Dashboard';
import FormulaBar from './components/FormulaBar';
import { INITIAL_TABS } from './constants';
import { TabData, AgentConfig, AgentType, AgentProvider, ColumnDefinition, ColumnType, RowData, AppSettings } from './types';
import { runSearchAgent, runAgentTask } from './services/geminiService';
import { runOpenAIAgent } from './services/openaiService';
import { runAnthropicAgent } from './services/anthropicService';
import { Loader2, Plus, Bot, CloudUpload, CheckCircle2 } from 'lucide-react';

const App: React.FC = () => {
  const [tabs, setTabs] = useState<TabData[]>(INITIAL_TABS);
  const [activeTabId, setActiveTabId] = useState<string>(INITIAL_TABS[0].id);
  const [isDashboardOpen, setIsDashboardOpen] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingCells, setProcessingCells] = useState<Set<string>>(new Set());
  
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [targetColumnId, setTargetColumnId] = useState<string | undefined>(undefined);

  const [isCRMSyncModalOpen, setIsCRMSyncModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [selectedCell, setSelectedCell] = useState<{ rowId: string, colId: string } | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isFormulaBarVisible, setIsFormulaBarVisible] = useState(true);

  // Settings State (Persisted)
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('atlas_settings');
    return saved ? JSON.parse(saved) : { googleApiKey: '', openaiApiKey: '', anthropicApiKey: '' };
  });

  const handleSaveSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    localStorage.setItem('atlas_settings', JSON.stringify(newSettings));
    setIsSettingsModalOpen(false);
    showNotification('Settings saved successfully.');
  };

  const activeTab = useMemo(() => 
    tabs.find(t => t.id === activeTabId) || tabs[0],
    [tabs, activeTabId]
  );

  const activeColumn = useMemo(() => 
    activeTab.columns.find(c => c.id === selectedCell?.colId),
    [activeTab, selectedCell]
  );

  const selectedCellValue = useMemo(() => {
    if (!selectedCell) return '';
    const row = activeTab.rows.find(r => r.id === selectedCell.rowId);
    if (!row) return '';
    
    if (activeColumn?.type === ColumnType.FORMULA) {
      return activeColumn.formula || '';
    }
    return row[selectedCell.colId]?.toString() || '';
  }, [selectedCell, activeTab, activeColumn]);

  const handleTabSelect = (id: string) => {
    setActiveTabId(id);
    setIsDashboardOpen(false);
    setSelectedCell(null);
    setSelectedRows(new Set());
  };

  const handleDashboardSelect = () => {
    setIsDashboardOpen(true);
  };

  const handleAddColumn = (colData: Partial<ColumnDefinition>, index?: number) => {
    const colId = `field_${Date.now()}`;
    const newCol: ColumnDefinition = {
      id: colId,
      header: colData.header || 'New Field',
      type: colData.type || ColumnType.TEXT,
      width: 180,
      options: colData.type === ColumnType.SELECT ? [
        { id: '1', label: 'Lead', color: '#3B82F6' },
        { id: '2', label: 'Enriched', color: '#10B981' },
        { id: '3', label: 'Priority', color: '#EF4444' }
      ] : undefined,
      formula: colData.type === ColumnType.FORMULA ? '/company_name + " - Verified"' : undefined,
      defaultValue: colData.defaultValue
    };

    setTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab;
      
      const newColumns = [...tab.columns];
      if (typeof index === 'number') {
          newColumns.splice(index, 0, newCol);
      } else {
          newColumns.push(newCol);
      }

      const updatedRows = tab.rows.map(row => ({
        ...row,
        [colId]: newCol.defaultValue || (colData.type === ColumnType.NUMBER ? 0 : '')
      }));
      return { 
        ...tab, 
        columns: newColumns,
        rows: updatedRows
      };
    }));
    
    showNotification(`Field "${newCol.header}" added.`);
  };

  const performDeduplication = (rows: RowData[], colId: string, mode: 'oldest' | 'newest') => {
    const seen = new Map<string, RowData>();
    const rowsToKeep: RowData[] = [];
    
    if (mode === 'oldest') {
        rows.forEach(row => {
            const val = row[colId]?.toString();
            if (!val) {
                rowsToKeep.push(row); 
            } else {
                if (!seen.has(val)) {
                    seen.set(val, row);
                    rowsToKeep.push(row);
                }
            }
        });
    } else {
        const toKeepMap = new Map<string, RowData>();
        rows.forEach(row => {
            const val = row[colId]?.toString();
             if (!val) {
            } else {
                toKeepMap.set(val, row);
            }
        });
        
        rows.forEach(row => {
            const val = row[colId]?.toString();
            if (!val) {
                rowsToKeep.push(row);
            } else {
                if (toKeepMap.get(val) === row) {
                    rowsToKeep.push(row);
                }
            }
        });
    }
    return rowsToKeep;
  };

  const resolveReferences = (text: string, row: any, columns: ColumnDefinition[]) => {
    let resolved = text;
    const sortedCols = [...columns].sort((a, b) => b.id.length - a.id.length);
    sortedCols.forEach(col => {
      const val = row[col.id]?.toString() || '';
      const regex = new RegExp(`/${col.id}(?!\\w)`, 'g');
      resolved = resolved.replace(regex, val);
    });
    return resolved;
  };

  const recalculateTab = (tab: TabData): TabData => {
    const newRows = tab.rows.map(row => {
      const updatedRow = { ...row };
      tab.columns.forEach(col => {
        if (col.type === ColumnType.FORMULA && col.formula) {
          try {
            const expression = resolveReferences(col.formula, updatedRow, tab.columns);
            updatedRow[col.id] = expression.replace(/['"]\s*\+\s*['"]/g, '').replace(/['"]/g, '');
          } catch (e) {
            updatedRow[col.id] = '#ERR!';
          }
        }
      });
      return updatedRow;
    });
    return { ...tab, rows: newRows };
  };

  const handleUpdateColumn = (colId: string, updates: Partial<ColumnDefinition>) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab;
      
      const newCols = tab.columns.map(c => c.id === colId ? { ...c, ...updates } : c);
      let newRows = [...tab.rows];

      if (updates.defaultValue !== undefined) {
          newRows = newRows.map(r => {
             if (!r[colId]) return { ...r, [colId]: updates.defaultValue };
             return r;
          });
      }

      if (updates.deduplication?.active) {
          const beforeCount = newRows.length;
          newRows = performDeduplication(newRows, colId, updates.deduplication.keep);
          const removedCount = beforeCount - newRows.length;
          
          if (removedCount > 0) {
              showNotification(`Removed ${removedCount} duplicate row${removedCount !== 1 ? 's' : ''} based on "${newCols.find(c => c.id === colId)?.header}"`);
          } else if (newRows.length < beforeCount) {
               showNotification(`Duplicates removed from "${newCols.find(c => c.id === colId)?.header}"`);
          } else {
               showNotification(`No duplicates found in "${newCols.find(c => c.id === colId)?.header}"`);
          }
      }

      return recalculateTab({ ...tab, columns: newCols, rows: newRows });
    }));
  };

  const handleAddRow = () => {
    const newRowId = `row-${Date.now()}`;
    const newRow: RowData = { id: newRowId };
    activeTab.columns.forEach(col => {
      newRow[col.id] = col.defaultValue || (col.type === ColumnType.NUMBER ? 0 : '');
    });

    setTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab;
      const tempTab = { ...tab, rows: [...tab.rows, newRow] };
      return recalculateTab(tempTab);
    }));
  };

  const handleSelectRow = (rowId: string, multi: boolean) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        if (!multi) next.clear();
        next.add(rowId);
      }
      return next;
    });
  };

  const handleCellChange = useCallback((rowId: string, colId: string, value: any) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab;
      
      const newRows = tab.rows.map(row => {
        if (row.id !== rowId) return row;
        return { ...row, [colId]: value };
      });

      let updatedTab = recalculateTab({ ...tab, rows: newRows });
      
      const colDef = updatedTab.columns.find(c => c.id === colId);
      if (colDef?.deduplication?.active && value) {
          updatedTab.rows = performDeduplication(updatedTab.rows, colId, colDef.deduplication.keep);
      }

      return updatedTab;
    }));
  }, [activeTabId]);

  const handleFormulaBarChange = (newValue: string) => {
    if (!selectedCell) return;
    if (activeColumn?.type === ColumnType.FORMULA) {
      setTabs(prev => prev.map(tab => {
        if (tab.id !== activeTabId) return tab;
        const newCols = tab.columns.map(c => 
          c.id === selectedCell.colId ? { ...c, formula: newValue } : c
        );
        return recalculateTab({ ...tab, columns: newCols });
      }));
    } else {
      handleCellChange(selectedCell.rowId, selectedCell.colId, newValue);
    }
  };

  const handleAddTab = () => {
    const newId = `vertical-${Date.now()}`;
    const newTab: TabData = {
      id: newId,
      name: 'New Vertical',
      color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
      columns: [...activeTab.columns],
      rows: [],
      agents: []
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
    setIsDashboardOpen(false);
  };

  const handleAddAgent = (agentData: Partial<AgentConfig>) => {
    const newAgent: AgentConfig = {
      id: `agent-${Date.now()}`,
      name: agentData.name || 'Untitled Agent',
      type: agentData.type || AgentType.TEXT,
      provider: agentData.provider || AgentProvider.GOOGLE,
      modelId: agentData.modelId || 'gemini-3-flash-preview',
      prompt: agentData.prompt || '',
      inputs: agentData.inputs || [],
      outputs: agentData.outputs || [],
      outputColumnName: agentData.outputColumnName || 'Enriched Data',
      condition: agentData.condition
    };

    setTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab;
      
      const newColumns: ColumnDefinition[] = [...tab.columns];
      let newRows = [...tab.rows];

      // Create output column if it doesn't exist
      let colId = newColumns.find(c => c.header === newAgent.outputColumnName)?.id;

      if (!colId) {
          colId = `gen_${Date.now()}`;
          newColumns.push({
            id: colId,
            header: newAgent.outputColumnName,
            type: ColumnType.ENRICHMENT, // Store as Enrichment JSON
            width: 200,
            connectedAgentId: newAgent.id
          });
          const newColId = colId;
          newRows = newRows.map(row => ({ ...row, [newColId]: '' }));
      } else {
         // If exists, just link agent
         const idx = newColumns.findIndex(c => c.id === colId);
         if (idx >= 0) {
             newColumns[idx] = { ...newColumns[idx], connectedAgentId: newAgent.id };
         }
      }

      return { 
        ...tab, 
        columns: newColumns,
        rows: newRows,
        agents: [...tab.agents, newAgent] 
      };
    }));
    
    showNotification(`Agent "${newAgent.name}" deployed.`);
  };

  const executeAgent = async (agentId: string) => {
    const agent = activeTab.agents.find(a => a.id === agentId);
    if (!agent) return;
    setIsProcessing(true);
    setIsAgentModalOpen(false);
    
    const rowsToProcess = selectedRows.size > 0 
      ? activeTab.rows.filter(r => selectedRows.has(r.id)) 
      : activeTab.rows;

    const targetCol = activeTab.columns.find(c => c.header === agent.outputColumnName);
    if (!targetCol) {
        setIsProcessing(false);
        showNotification("Target column not found.");
        return;
    }

    setProcessingCells(prev => {
        const next = new Set(prev);
        rowsToProcess.forEach(row => {
            next.add(`${row.id}:${targetCol.id}`);
        });
        return next;
    });

    await Promise.all(rowsToProcess.map(async (row) => {
      try {
        const missingInputs = agent.inputs.filter(inputId => !row[inputId]);
        if (missingInputs.length > 0) return;

        const inputContext: any = {};
        agent.inputs.forEach(inputId => {
           const col = activeTab.columns.find(c => c.id === inputId);
           if (col) inputContext[col.header] = row[inputId];
        });

        // Specialized Prompt for Web Search vs Text
        let systemPrompt = '';
        if (agent.type === AgentType.WEB_SEARCH) {
            systemPrompt = `
              You are a Web Search Agent. 
              GOAL: ${agent.prompt}
              INPUT: ${JSON.stringify(inputContext)}
              REQUIREMENT: Use the Google Search tool to find REAL-TIME information. Do not hallucinate.
              OUTPUT FORMAT: Single JSON object containing keys: ${JSON.stringify(agent.outputs)}.
            `;
        } else {
            systemPrompt = `
              You are a Data Enrichment Agent.
              GOAL: ${agent.prompt}
              INPUT: ${JSON.stringify(inputContext)}
              OUTPUT FORMAT: Single JSON object containing keys: ${JSON.stringify(agent.outputs)}.
            `;
        }

        let rawResponse = '';
        let sources: any[] = [];

        if (agent.type === AgentType.WEB_SEARCH) {
           const searchResult = await runSearchAgent(systemPrompt, appSettings.googleApiKey);
           rawResponse = searchResult.text;
           sources = searchResult.sources;
        } else {
           switch (agent.provider) {
             case AgentProvider.OPENAI:
               rawResponse = await runOpenAIAgent(agent.modelId, systemPrompt, appSettings.openaiApiKey);
               break;
             case AgentProvider.ANTHROPIC:
               rawResponse = await runAnthropicAgent(agent.modelId, systemPrompt, appSettings.anthropicApiKey);
               break;
             case AgentProvider.GOOGLE:
             default:
               rawResponse = await runAgentTask(agent.modelId, systemPrompt, "Return valid JSON object.", appSettings.googleApiKey);
               break;
           }
        }

        let resultData: any = {};
        try {
            const cleanJson = rawResponse.replace(/```json|```/g, '').trim();
            resultData = JSON.parse(cleanJson);
        } catch (e) {
            resultData = { result: rawResponse };
        }
        
        // Merge sources if available
        if (sources.length > 0) {
            resultData._sources = sources.map(s => s.web?.uri || s.web?.title).filter(Boolean);
        }

        // Update the single Enrichment Cell
        setTabs(prev => prev.map(tab => {
            if (tab.id !== activeTabId) return tab;
            const updatedRows = tab.rows.map(r => {
                if (r.id !== row.id) return r;
                return { ...r, [targetCol.id]: JSON.stringify(resultData) };
            });
            return recalculateTab({ ...tab, rows: updatedRows });
        }));

      } catch (e) {
         console.error(e);
      } finally {
        setProcessingCells(prev => {
            const next = new Set(prev);
            next.delete(`${row.id}:${targetCol.id}`);
            return next;
        });
      }
    }));
    
    setIsProcessing(false);
    showNotification(`Enrichment complete for ${rowsToProcess.length} records.`);
  };

  const handleMapEnrichmentData = (rowId: string, key: string, value: any) => {
      setTabs(prev => prev.map(tab => {
          if (tab.id !== activeTabId) return tab;

          let targetColId = tab.columns.find(c => c.header === key)?.id;
          let newColumns = [...tab.columns];

          if (!targetColId) {
              // Create column if it doesn't exist
              targetColId = `field_${Date.now()}`;
              newColumns.push({
                  id: targetColId,
                  header: key,
                  type: ColumnType.TEXT,
                  width: 200,
                  defaultValue: ''
              });
              showNotification(`Created column "${key}"`);
          }

          const newRows = tab.rows.map(r => {
              if (r.id !== rowId) return r;
              // Map the specific value
              return { ...r, [targetColId!]: String(value) };
          });

          return recalculateTab({ ...tab, columns: newColumns, rows: newRows });
      }));
  };

  const handleCRMSync = async (mode: 'all' | 'selected', direction: 'push' | 'pull') => {
    setIsProcessing(true);
    setIsCRMSyncModalOpen(false);
    await new Promise(r => setTimeout(r, 2000));
    setTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab;
      const targetRows = mode === 'selected' ? selectedRows : new Set(tab.rows.map(r => r.id));
      const newRows = tab.rows.map(row => {
        if (targetRows.has(row.id)) {
          return { ...row, sync_status: direction === 'push' ? 'Synced' : 'Pulled' };
        }
        return row;
      });
      return { ...tab, rows: newRows };
    }));
    setIsProcessing(false);
    showNotification(`CRM ${direction === 'push' ? 'Export' : 'Import'} success.`);
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleConfigureAgent = (colId: string) => {
      setTargetColumnId(colId);
      setIsAgentModalOpen(true);
  };

  const handleCloseAgentModal = () => {
      setIsAgentModalOpen(false);
      setTargetColumnId(undefined);
  };

  return (
    <div className="flex h-screen w-screen bg-[#090909] text-white overflow-hidden selection:bg-blue-500/30">
      <Sidebar 
        tabs={tabs} 
        activeTabId={activeTabId} 
        isDashboardOpen={isDashboardOpen}
        onTabSelect={handleTabSelect}
        onDashboardSelect={handleDashboardSelect}
        onAddTab={handleAddTab}
        onSettingsClick={() => setIsSettingsModalOpen(true)}
      />

      <main className="flex-1 flex flex-col relative overflow-hidden">
        {notification && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] bg-blue-600 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500 border border-white/20 backdrop-blur-md">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-bold tracking-tight uppercase tracking-wider">{notification}</span>
          </div>
        )}

        {isDashboardOpen ? (
          <Dashboard tabs={tabs} />
        ) : (
          <>
            <div className="h-14 bg-[#111] border-b border-neutral-800 flex items-center justify-between px-6 shrink-0">
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]" 
                  style={{ backgroundColor: activeTab.color }} 
                />
                <h2 className="text-sm font-bold tracking-tight text-white/90">{activeTab.name}</h2>
              </div>
              
              <div className="flex items-center gap-2">
                {isProcessing && (
                  <div className="flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase tracking-widest bg-blue-400/10 px-4 py-1.5 rounded-full border border-blue-400/20 mr-4 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Atlas Thinking
                  </div>
                )}
                
                <button 
                  onClick={() => setIsAgentModalOpen(true)}
                  className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-neutral-800"
                >
                  <Bot className="w-3.5 h-3.5" />
                  Agents
                </button>

                <button 
                  onClick={() => setIsCRMSyncModalOpen(true)}
                  className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-neutral-800"
                >
                  <CloudUpload className="w-3.5 h-3.5" />
                  CRM Sync
                </button>

                <div className="w-px h-6 bg-neutral-800 mx-2" />

                <button 
                  onClick={handleAddRow}
                  className="flex items-center gap-2 bg-white hover:bg-neutral-200 text-black px-5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Row
                </button>
              </div>
            </div>

            <FormulaBar 
              isVisible={isFormulaBarVisible}
              onToggle={() => setIsFormulaBarVisible(!isFormulaBarVisible)}
              selectedCell={selectedCell}
              activeColumn={activeColumn}
              value={selectedCellValue}
              onChange={handleFormulaBarChange}
            />

            <Grid 
              columns={activeTab.columns} 
              rows={activeTab.rows} 
              selectedCell={selectedCell}
              selectedRows={selectedRows}
              onSelectCell={(rowId, colId) => setSelectedCell({ rowId, colId })}
              onSelectRow={handleSelectRow}
              onCellChange={handleCellChange} 
              onAddColumn={handleAddColumn}
              onUpdateColumn={handleUpdateColumn}
              onRunAgent={executeAgent}
              onConfigureAgent={handleConfigureAgent}
              processingCells={processingCells}
              onMapEnrichmentData={handleMapEnrichmentData}
            />
          </>
        )}
      </main>

      {isSettingsModalOpen && (
        <SettingsModal 
            onClose={() => setIsSettingsModalOpen(false)}
            settings={appSettings}
            onSave={handleSaveSettings}
        />
      )}

      {isAgentModalOpen && (
        <AgentModal 
          agents={activeTab.agents} 
          columns={activeTab.columns}
          onRunAgent={executeAgent}
          onAddAgent={handleAddAgent}
          onClose={handleCloseAgentModal}
          selectedRowsCount={selectedRows.size}
          initialTargetColId={targetColumnId}
          apiKeys={{ google: appSettings.googleApiKey }}
        />
      )}

      {isCRMSyncModalOpen && (
        <CRMSyncModal 
          onClose={() => setIsCRMSyncModalOpen(false)}
          onSync={handleCRMSync}
          selectedRowsCount={selectedRows.size}
        />
      )}
    </div>
  );
};

export default App;
