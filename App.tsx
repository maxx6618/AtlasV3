
import React, { useState, useCallback, useMemo, useEffect, useRef, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import Grid from './components/Grid';
import SheetTabBar from './components/SheetTabBar';
import AgentModal from './components/AgentModal';
import ApiKeyModal, { ApiKeyProvider } from './components/ApiKeyModal';
import HttpRequestModal from './components/HttpRequestModal';
import CRMSyncModal from './components/CRMSyncModal';
import SettingsModal from './components/SettingsModal';
import FormulaBar from './components/FormulaBar';
import SelectionBar from './components/SelectionBar';
import StatusBar from './components/StatusBar';
import TableSettingsPanel from './components/TableSettingsPanel';
import UploadModal, { IGNORE_COLUMN, NEW_COLUMN, UploadImportPayload } from './components/UploadModal';
import { INITIAL_VERTICALS } from './constants';
import { COMPANY_COLUMNS, PERSON_COLUMNS } from './constants';
import { VerticalData, SheetTab, AgentConfig, AgentType, AgentProvider, ColumnDefinition, ColumnType, RowData, AppSettings, HttpRequestConfig, FilterState, ColumnSearch, LinkedColumn, WorkflowConfig } from './types';
import OpenRegisterModal from './components/OpenRegisterModal';
import OpenRegisterWorkflowModal from './components/OpenRegisterWorkflowModal';
import LinkColumnModal from './components/LinkColumnModal';
import { executeHttpRequest } from './services/httpRequestService';
import { AgentExecutionMetadata } from './types';

// Helper function to resolve column references in text
const resolveReferences = (text: string, row: RowData, columns: ColumnDefinition[]) => {
  let resolved = text;
  const sortedCols = [...columns].sort((a, b) => b.id.length - a.id.length);
  sortedCols.forEach(col => {
    const val = row[col.id]?.toString() || '';
    const regex = new RegExp(`/${col.id}(?!\\w)`, 'g');
    resolved = resolved.replace(regex, val);
  });
  return resolved;
};

// Helper function to evaluate condition
const evaluateCondition = (condition: string, row: RowData, columns: ColumnDefinition[]): boolean => {
  if (!condition || !condition.trim()) return true;
  
  try {
    // Resolve column references in condition
    const resolvedCondition = resolveReferences(condition, row, columns);
    
    // Create a safe evaluation context
    const context: Record<string, any> = {};
    columns.forEach(col => {
      const val = row[col.id];
      // Convert to appropriate type for evaluation
      if (val === null || val === undefined || val === '') {
        context[col.id] = null;
      } else if (typeof val === 'number') {
        context[col.id] = val;
      } else {
        context[col.id] = String(val);
      }
    });
    
    // Use Function constructor for safer evaluation
    const func = new Function(...Object.keys(context), `return ${resolvedCondition}`);
    return func(...Object.values(context)) === true;
  } catch (e) {
    console.error('Condition evaluation error:', e);
    return true; // Default to running if condition fails to evaluate
  }
};
import { runEnrichmentAction, InputMapping, EnrichmentAction } from './services/openRegisterAgent';
import { runCompanyEnrichment, runOwnerEnrichment, ENRICHMENT_STATUS } from './services/openRegisterWorkflow';
import { runAgentTask, runSearchAndStructure, runSearchAgent, runJSONTask, getLastTokenCount, clearLastTokenCount } from './services/geminiService';
import { runOpenAIAgent } from './services/openaiService';
import { runAnthropicAgent } from './services/anthropicService';
import { apifySearchAndCollect } from './services/apifyService';
import { serperGoogleSearch } from './services/serperService';
import { Loader2, Plus, Bot, CloudUpload, CheckCircle2, Link, Database, Upload, AlertTriangle } from 'lucide-react';
import LoginPage from './components/LoginPage';
import DemoChatOverlay from './components/DemoChatOverlay';
// DemoReactorLoading removed — new opening uses slide-out + blue flash in LoginPage
import { playEngineSound } from './services/demoVoiceService';
import { loadVerticals, saveAllVerticals, saveVertical, deleteVertical, saveSheet, deleteSheet, saveRow, deleteRow } from './services/supabaseDataService';
import { loadAppSettings, saveAppSettings } from './services/supabaseSettingsService';
import { realtimeService } from './services/supabaseRealtimeService';
import { coerceCellValue, createColumnId, inferColumnType } from './services/importService';

const LOCAL_VERTICALS_KEY = 'atlas_verticals';
const LOCAL_SETTINGS_KEY = 'atlas_settings';

const loadLocalVerticals = (): VerticalData[] | null => {
  try {
    const raw = localStorage.getItem(LOCAL_VERTICALS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.warn('Failed to load local verticals:', error);
    return null;
  }
};

const getDefaultModelByProvider = (provider: AgentProvider) => {
  switch (provider) {
    case AgentProvider.OPENAI:
      return 'gpt-5-nano';
    case AgentProvider.ANTHROPIC:
      return 'claude-haiku-4-5';
    default:
      return 'gemini-2.0-flash-lite';
  }
};

const getDefaultAppSettings = (): AppSettings => ({
  googleApiKey: '',
  openaiApiKey: '',
  anthropicApiKey: '',
  serperApiKey: '',
  apifyApiKey: '',
  elevenLabsApiKey: '',
  apifyWebSearchEnabled: false,
  openRegisterApiKey: '',
  researchSteps: 2,
  uploadMatchProvider: AgentProvider.GOOGLE,
  uploadMatchModelId: 'gemini-2.0-flash-lite',
  uploadMatchConfidence: 0.5,
  uploadMatchEnabled: true
});

const normalizeAppSettings = (settings: Partial<AppSettings>): AppSettings => {
  const merged = { ...getDefaultAppSettings(), ...settings };
  const steps = Number(merged.researchSteps);
  const normalizedSteps = Number.isFinite(steps)
    ? Math.min(5, Math.max(2, Math.round(steps)))
    : 2;

  return {
    ...merged,
    researchSteps: normalizedSteps,
    uploadMatchConfidence: Math.min(1, Math.max(0, merged.uploadMatchConfidence ?? 0.5)),
    uploadMatchModelId:
      merged.uploadMatchModelId ||
      getDefaultModelByProvider(merged.uploadMatchProvider || AgentProvider.GOOGLE),
    uploadMatchProvider: merged.uploadMatchProvider || AgentProvider.GOOGLE,
    uploadMatchEnabled: merged.uploadMatchEnabled ?? true,
    apifyWebSearchEnabled: merged.apifyWebSearchEnabled ?? false,
    googleApiKey: merged.googleApiKey || '',
    openaiApiKey: merged.openaiApiKey || '',
    anthropicApiKey: merged.anthropicApiKey || '',
    serperApiKey: merged.serperApiKey || '',
    apifyApiKey: merged.apifyApiKey || '',
    elevenLabsApiKey: merged.elevenLabsApiKey || ''
  };
};

const loadLocalAppSettings = (): Partial<AppSettings> | null => {
  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    console.warn('Failed to load local settings:', error);
    return null;
  }
};

const persistLocalAppSettings = (settings: AppSettings) => {
  try {
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to persist local settings:', error);
  }
};

type DemoEntryStage = 'login' | 'slideOut' | 'loading' | 'blueFlash' | 'dashboard';
const DEMO_SLIDE_OUT_MS = 700;
const DEMO_LOADING_MS = 1800;
const DEMO_FLASH_MS = 150;

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  // ── Demo Mode (isolated – remove this block to remove demo) ──
  const [demoMode, setDemoMode] = useState(false);
  const [demoWithVoice, setDemoWithVoice] = useState(true);
  const [demoSpeed, setDemoSpeed] = useState(1.0); // 1.0 = normal, 0.67 = 1.5x
  const [demoEmail, setDemoEmail] = useState<string | undefined>(undefined);
  const [demoPassword, setDemoPassword] = useState<string | undefined>(undefined);
  const [demoEntryStage, setDemoEntryStage] = useState<DemoEntryStage>('login');
  const [demoGridHighlightCells, setDemoGridHighlightCells] = useState<Set<string>>(new Set());
  const [demoGridHighlightColumns, setDemoGridHighlightColumns] = useState<Set<string>>(new Set());
  const [demoGridScrollToColumnId, setDemoGridScrollToColumnId] = useState<string | null>(null);
  const [demoGridLoading, setDemoGridLoading] = useState(false);
  const demoGridHighlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ── End Demo Mode ──
  const Dashboard = React.lazy(() => import('./components/Dashboard'));
  const initialVerticals = useMemo(() => loadLocalVerticals() || INITIAL_VERTICALS, []);
  const [verticals, setVerticals] = useState<VerticalData[]>(initialVerticals);
  const [activeVerticalId, setActiveVerticalId] = useState<string>(initialVerticals[0]?.id || '');
  const [activeSheetId, setActiveSheetId] = useState<string>(initialVerticals[0]?.sheets?.[0]?.id || '');
  const [isDashboardOpen, setIsDashboardOpen] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingCells, setProcessingCells] = useState<Set<string>>(new Set());
  const processingAbortRef = useRef<AbortController | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  
  // Supabase state
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [supabaseEnabled, setSupabaseEnabled] = useState<boolean>(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef<boolean>(false);

  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  // ── Supabase Initial Load ────────────────────────────────────────────

  useEffect(() => {
    const initializeSupabase = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        // Support both new publishable key and legacy anon key
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (supabaseUrl && supabaseKey) {
          setSupabaseEnabled(true);
          setIsLoadingData(true);

          let remoteSettings: AppSettings | null = null;
          try {
            remoteSettings = await loadAppSettings();
          } catch (error) {
            console.warn('Failed to load settings from Supabase:', error);
          }

          const localSettings = loadLocalAppSettings() || {};
          const mergedSettings = normalizeAppSettings(remoteSettings || localSettings);
          setAppSettings(mergedSettings);
          persistLocalAppSettings(mergedSettings);

          if (!remoteSettings && Object.keys(localSettings).length > 0) {
            saveAppSettings(mergedSettings).catch(error => {
              console.warn('Failed to seed settings to Supabase:', error);
            });
          }
          
          const loadedVerticals = await loadVerticals();
          
          if (loadedVerticals.length > 0) {
            setVerticals(loadedVerticals);
            if (loadedVerticals[0]?.sheets?.[0]?.id) {
              setActiveVerticalId(loadedVerticals[0].id);
              setActiveSheetId(loadedVerticals[0].sheets[0].id);
            }
          } else {
            // No data in Supabase, use initial data and save it
            await saveAllVerticals(INITIAL_VERTICALS);
          }
        } else {
          console.warn('Supabase credentials not configured. Using local data only.');
          setSupabaseEnabled(false);
          const localVerticals = loadLocalVerticals();
          if (localVerticals && localVerticals.length > 0) {
            setVerticals(localVerticals);
            if (localVerticals[0]?.sheets?.[0]?.id) {
              setActiveVerticalId(localVerticals[0].id);
              setActiveSheetId(localVerticals[0].sheets[0].id);
            }
          }
        }
      } catch (error) {
        console.error('Error initializing Supabase:', error);
        setSupabaseEnabled(false);
        // Fallback to INITIAL_VERTICALS on error
      } finally {
        setIsLoadingData(false);
      }
    };

    if (isLoggedIn && !demoMode) {
      initializeSupabase();
    } else if (isLoggedIn && demoMode) {
      // Demo mode: hold loading state while entry sequence is active
      if (demoEntryStage !== 'dashboard') {
        setIsLoadingData(true);
      }
    } else {
      setIsLoadingData(false);
    }
  }, [isLoggedIn, demoMode, demoEntryStage]);

  useEffect(() => {
    if (!demoMode) {
      setDemoEntryStage('login');
      return;
    }
    if (!isLoggedIn) {
      setDemoEntryStage('login');
    }
  }, [demoMode, isLoggedIn]);

  // slideOut -> loading -> blueFlash -> dashboard
  useEffect(() => {
    if (!demoMode || demoEntryStage !== 'slideOut') return;
    const t = setTimeout(() => setDemoEntryStage('loading'), DEMO_SLIDE_OUT_MS);
    return () => clearTimeout(t);
  }, [demoMode, demoEntryStage]);

  useEffect(() => {
    if (!demoMode || demoEntryStage !== 'loading') return;
    const t = setTimeout(() => setDemoEntryStage('blueFlash'), DEMO_LOADING_MS);
    return () => clearTimeout(t);
  }, [demoMode, demoEntryStage]);

  useEffect(() => {
    if (!demoMode || demoEntryStage !== 'blueFlash') return;
    const t = setTimeout(() => {
      setDemoEntryStage('dashboard');
      setIsLoadingData(false);
    }, DEMO_FLASH_MS);
    return () => clearTimeout(t);
  }, [demoMode, demoEntryStage]);

  useEffect(() => {
    if (supabaseEnabled || demoMode) return; // Block persistence during demo
    try {
      localStorage.setItem(LOCAL_VERTICALS_KEY, JSON.stringify(verticals));
    } catch (error) {
      console.warn('Failed to persist local verticals:', error);
    }
  }, [verticals, supabaseEnabled, demoMode]);

  // ── Debounced Save Function ─────────────────────────────────────────

  const debouncedSave = useCallback(async (verticalsToSave: VerticalData[]) => {
    if (!supabaseEnabled || isSavingRef.current || demoMode) return; // Block during demo

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        isSavingRef.current = true;
        await saveAllVerticals(verticalsToSave);
      } catch (error) {
        console.error('Error saving to Supabase:', error);
        showNotification('Error saving data. Please try again.');
      } finally {
        isSavingRef.current = false;
      }
    }, 500); // 500ms debounce
  }, [supabaseEnabled, demoMode]);

  // ── Real-time Subscriptions ─────────────────────────────────────────

  useEffect(() => {
    if (!supabaseEnabled || !isLoggedIn || demoMode) return; // Block during demo

    // Subscribe to verticals changes
    const unsubscribeVerticals = realtimeService.subscribeToVerticals((updatedVerticals) => {
      setVerticals(updatedVerticals);
    });

    // Subscribe to active vertical's sheets
    const unsubscribeSheets = realtimeService.subscribeToSheets(activeVerticalId, (updatedSheet) => {
      setVerticals(prev => prev.map(v => {
        if (v.id !== activeVerticalId) return v;
        return {
          ...v,
          sheets: v.sheets.map(s => s.id === updatedSheet.id ? updatedSheet : s)
        };
      }));
    });

    // Subscribe to active sheet's rows
    const unsubscribeRows = realtimeService.subscribeToRows(activeSheetId, (updatedRows, sheetId) => {
      setVerticals(prev => prev.map(v => {
        if (v.id !== activeVerticalId) return v;
        return {
          ...v,
          sheets: v.sheets.map(s => {
            if (s.id === sheetId) {
              return { ...s, rows: updatedRows };
            }
            return s;
          })
        };
      }));
    });

    return () => {
      unsubscribeVerticals();
      unsubscribeSheets();
      unsubscribeRows();
    };
  }, [supabaseEnabled, isLoggedIn, activeVerticalId, activeSheetId, demoMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      realtimeService.unsubscribeAll();
    };
  }, []);
  
  // Theme State (Persisted)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('atlas_theme');
    if (saved === null) return true; // Default to dark mode
    return saved === 'dark';
  });

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (!demoMode) {
      localStorage.setItem('atlas_theme', newTheme ? 'dark' : 'light');
    }
    document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
  };

  // Apply theme on mount and when it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);
  
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [targetColumnId, setTargetColumnId] = useState<string | undefined>(undefined);

  const [isCRMSyncModalOpen, setIsCRMSyncModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isHttpModalOpen, setIsHttpModalOpen] = useState(false);
  const [isOpenRegisterModalOpen, setIsOpenRegisterModalOpen] = useState(false);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isTableSettingsOpen, setIsTableSettingsOpen] = useState(false);
  const [isLinkColumnModalOpen, setIsLinkColumnModalOpen] = useState(false);
  const [targetLinkColumnId, setTargetLinkColumnId] = useState<string | null>(null);
  const [targetHttpColumnId, setTargetHttpColumnId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [apiKeyModalState, setApiKeyModalState] = useState<{ open: boolean; provider: ApiKeyProvider | null }>({
    open: false,
    provider: null
  });

  const closeAllPanels = () => {
    setIsAgentModalOpen(false);
    setIsCRMSyncModalOpen(false);
    setIsHttpModalOpen(false);
    setIsOpenRegisterModalOpen(false);
    setIsUploadModalOpen(false);
  };

  const [selectedCell, setSelectedCell] = useState<{ rowId: string, colId: string } | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [filterState, setFilterState] = useState<FilterState>({ combinator: 'and', conditions: [] });
  const [columnSearch, setColumnSearch] = useState<ColumnSearch | null>(null);
  const [isFormulaBarVisible, setIsFormulaBarVisible] = useState(true);

  // Settings State (Persisted)
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const localSettings = loadLocalAppSettings() || {};
    return normalizeAppSettings(localSettings);
  });

  const openApiKeyModal = useCallback((provider: ApiKeyProvider) => {
    setApiKeyModalState({ open: true, provider });
  }, []);

  const closeApiKeyModal = useCallback(() => {
    setApiKeyModalState({ open: false, provider: null });
  }, []);

  const persistSettings = useCallback(
    (settings: AppSettings) => {
      if (demoMode) return; // Block persistence during demo

      if (supabaseEnabled) {
        saveAppSettings(settings)
          .then(() => {
            persistLocalAppSettings(settings);
          })
          .catch(error => {
            console.warn('Failed to save settings to Supabase:', error);
            persistLocalAppSettings(settings);
          });
        return;
      }

      persistLocalAppSettings(settings);
    },
    [supabaseEnabled, demoMode]
  );

  const handleSaveSettings = (newSettings: AppSettings) => {
    const sanitizedSettings = normalizeAppSettings(newSettings);
    setAppSettings(sanitizedSettings);
    persistSettings(sanitizedSettings);
    setIsSettingsModalOpen(false);
    showNotification('Settings saved successfully.');

    // API keys are managed server-side via Vercel env vars
  };

  const saveSettingsPatch = useCallback(
    (patch: Partial<AppSettings>) => {
      setAppSettings(prev => {
        const next = normalizeAppSettings({ ...prev, ...patch });
        persistSettings(next);
        return next;
      });
    },
    [persistSettings]
  );

  const testAndSaveApiKey = useCallback(async (provider: ApiKeyProvider, apiKey: string) => {
    // API keys are managed server-side. Test via proxy endpoints.
    switch (provider) {
      case 'GOOGLE': {
        await runAgentTask('gemini-2.5-flash', 'Test connection');
        break;
      }
      case 'OPENAI': {
        const response = await fetch('/api/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'test' }),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || 'OpenAI key test failed');
        }
        break;
      }
      case 'ANTHROPIC': {
        const response = await fetch('/api/anthropic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'test' }),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || 'Anthropic key test failed');
        }
        break;
      }
      case 'SERPER': {
        const result = await serperGoogleSearch('test', undefined, 1);
        if (result.error) throw new Error(`Serper key test failed: ${result.error}`);
        break;
      }
      case 'APIFY': {
        const result = await apifySearchAndCollect('test', undefined, 1);
        if (result.error) throw new Error(`Apify key test failed: ${result.error}`);
        break;
      }
      default:
        break;
    }
  }, []);

  // Keys are server-side, always available
  const ensureApiKey = useCallback((_provider: ApiKeyProvider, _apiKey?: string) => {
    return true;
  }, []);

  // ── Derived state ──────────────────────────────────────────────

  // Fallback empty sheet/vertical when verticals is empty (e.g. during demo init)
  const EMPTY_SHEET: SheetTab = useMemo(() => ({
    id: '__empty__', name: '', color: '#888', columns: [], rows: [], agents: [], httpRequests: [],
  }), []);
  const EMPTY_VERTICAL: VerticalData = useMemo(() => ({
    id: '__empty__', name: '', color: '#888', sheets: [EMPTY_SHEET],
  }), [EMPTY_SHEET]);

  const activeVertical = useMemo(() =>
    verticals.find(v => v.id === activeVerticalId) || verticals[0] || EMPTY_VERTICAL,
    [verticals, activeVerticalId, EMPTY_VERTICAL]
  );

  const activeSheet = useMemo(() =>
    activeVertical.sheets.find(s => s.id === activeSheetId) || activeVertical.sheets[0] || EMPTY_SHEET,
    [activeVertical, activeSheetId, EMPTY_SHEET]
  );
  const activeSheetRef = useRef<SheetTab>(activeSheet);

  const hasAnyLlmKey = true; // Keys are managed server-side

  useEffect(() => {
    activeSheetRef.current = activeSheet;
  }, [activeSheet]);

  const activeColumn = useMemo(() => 
    activeSheet.columns.find(c => c.id === selectedCell?.colId),
    [activeSheet, selectedCell]
  );

  const activeDedupeColumn = useMemo(
    () => activeSheet.columns.find(col => col.deduplication?.active),
    [activeSheet]
  );

  const selectedCellValue = useMemo(() => {
    if (!selectedCell) return '';
    const row = activeSheet.rows.find(r => r.id === selectedCell.rowId);
    if (!row) return '';
    
    if (activeColumn?.type === ColumnType.FORMULA) {
      return activeColumn.formula || '';
    }
    return row[selectedCell.colId]?.toString() || '';
  }, [selectedCell, activeSheet, activeColumn]);

  // ── Helper: update a specific sheet inside the verticals state ──

  const updateSheet = useCallback((
    verticalId: string,
    sheetId: string,
    updater: (sheet: SheetTab) => SheetTab
  ) => {
    setVerticals(prev => {
      const updated = prev.map(v => {
        if (v.id !== verticalId) return v;
        return {
          ...v,
          sheets: v.sheets.map(s => s.id === sheetId ? updater(s) : s)
        };
      });
      
      // Debounced save to Supabase
      if (supabaseEnabled) {
        debouncedSave(updated);
      }
      
      return updated;
    });
  }, [supabaseEnabled, debouncedSave]);

  /** Update the currently active sheet */
  const updateActiveSheet = useCallback((updater: (sheet: SheetTab) => SheetTab) => {
    updateSheet(activeVerticalId, activeSheetId, updater);
  }, [activeVerticalId, activeSheetId, updateSheet]);

  // ── Navigation ──────────────────────────────────────────────────

  const handleVerticalSelect = (id: string) => {
    setActiveVerticalId(id);
    const vertical = verticals.find(v => v.id === id);
    if (vertical && vertical.sheets.length > 0) {
      setActiveSheetId(vertical.sheets[0].id);
    }
    setIsDashboardOpen(false);
    setSelectedCell(null);
    setSelectedRows(new Set());
  };

  const handleSheetSelect = (id: string) => {
    setActiveSheetId(id);
    setSelectedCell(null);
    setSelectedRows(new Set());
  };

  const handleSelectAllRows = () => {
    setSelectedRows(new Set(activeSheet.rows.map(row => row.id)));
  };

  const handleClearSelectedRows = () => {
    setSelectedRows(new Set());
  };

  const clearAllFilters = () => {
    setFilterState({ combinator: 'and', conditions: [] });
  };

  const handleShowAllColumns = () => {
    updateActiveSheet(sheet => ({
      ...sheet,
      columns: sheet.columns.map(c => ({ ...c, hidden: false }))
    }));
  };

  const handleHideAllColumns = () => {
    updateActiveSheet(sheet => ({
      ...sheet,
      columns: sheet.columns.map(c => ({ ...c, hidden: true }))
    }));
  };

  const handleDashboardSelect = () => {
    setIsDashboardOpen(true);
  };

  // ── Sheet tab management ────────────────────────────────────────

  const handleAddSheet = async () => {
    const newId = `sheet-${Date.now()}`;
    const newSheet: SheetTab = {
      id: newId,
      name: 'New Sheet',
      color: '#6366F1',
      columns: [
        { id: 'col_1', header: 'Name', width: 200, type: ColumnType.TEXT },
      ],
      rows: [],
      agents: [],
      httpRequests: []
    };
    
    setVerticals(prev => {
      const updated = prev.map(v => {
        if (v.id !== activeVerticalId) return v;
        return { ...v, sheets: [...v.sheets, newSheet] };
      });
      
      // Save to Supabase immediately for new sheets (skip during demo)
      if (supabaseEnabled && !demoMode) {
        saveSheet(newSheet, activeVerticalId).catch(err => {
          console.error('Error saving new sheet:', err);
        });
      }
      
      return updated;
    });
    setActiveSheetId(newId);
  };

  const handleRenameSheet = (id: string, name: string) => {
    updateSheet(activeVerticalId, id, sheet => ({ ...sheet, name }));
  };

  const handleRecolorSheet = (id: string, color: string) => {
    updateSheet(activeVerticalId, id, sheet => ({ ...sheet, color }));
  };

  const handleDeleteSheet = async (id: string) => {
    // Delete from Supabase first (skip during demo)
    if (supabaseEnabled && !demoMode) {
      try {
        await deleteSheet(id);
      } catch (error) {
        console.error('Error deleting sheet from Supabase:', error);
        showNotification('Error deleting sheet. Please try again.');
        return;
      }
    }
    
    setVerticals(prev => prev.map(v => {
      if (v.id !== activeVerticalId) return v;
      const filtered = v.sheets.filter(s => s.id !== id);
      if (filtered.length === 0) return v; // don't allow empty
      return { ...v, sheets: filtered };
    }));
    if (activeSheetId === id) {
      const remaining = activeVertical.sheets.filter(s => s.id !== id);
      if (remaining.length > 0) setActiveSheetId(remaining[0].id);
    }
  };

  // ── Column operations ───────────────────────────────────────────

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

    updateActiveSheet(sheet => {
      const newColumns = [...sheet.columns];
      if (typeof index === 'number') {
        newColumns.splice(index, 0, newCol);
      } else {
        newColumns.push(newCol);
      }
      const updatedRows = sheet.rows.map(row => ({
        ...row,
        [colId]: newCol.defaultValue || (colData.type === ColumnType.NUMBER ? 0 : '')
      }));
      return { ...sheet, columns: newColumns, rows: updatedRows };
    });
    
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
        if (val) {
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

  const calculateLinkedColumns = (
    sheet: SheetTab,
    allSheets: SheetTab[]
  ): SheetTab => {
    const newRows = sheet.rows.map(row => {
      const updatedRow = { ...row };
      
      sheet.columns.forEach(col => {
        if (col.linkedColumn) {
          const { sourceSheetId, sourceColumnId, matchColumnId, sourceMatchColumnId } = col.linkedColumn;
          
          // Finde Source Sheet
          const sourceSheet = allSheets.find(s => s.id === sourceSheetId);
          if (!sourceSheet) {
            updatedRow[col.id] = '#SHEET!';
            return;
          }
          
          // Finde Match-Wert in aktueller Zeile
          const matchValue = row[matchColumnId];
          if (!matchValue) {
            updatedRow[col.id] = '';
            return;
          }
          
          // Finde entsprechende Zeile im Source Sheet
          const sourceRow = sourceSheet.rows.find(r => 
            r[sourceMatchColumnId]?.toString() === matchValue.toString()
          );
          
          if (!sourceRow) {
            updatedRow[col.id] = '';
            return;
          }
          
          // Hole Wert aus Source Spalte
          const sourceCol = sourceSheet.columns.find(c => c.id === sourceColumnId);
          if (!sourceCol) {
            updatedRow[col.id] = '#COL!';
            return;
          }
          
          updatedRow[col.id] = sourceRow[sourceColumnId]?.toString() || '';
        }
      });
      
      return updatedRow;
    });
    
    return { ...sheet, rows: newRows };
  };

  const recalculateSheet = (sheet: SheetTab, allSheets: SheetTab[]): SheetTab => {
    // 1. Zuerst normale Formeln berechnen
    let calculatedSheet = sheet;
    calculatedSheet.rows = sheet.rows.map(row => {
      const updatedRow = { ...row };
      sheet.columns.forEach(col => {
        if (col.type === ColumnType.FORMULA && col.formula) {
          try {
            const expression = resolveReferences(col.formula, updatedRow, sheet.columns);
            updatedRow[col.id] = expression.replace(/['"]\s*\+\s*['"]/g, '').replace(/['"]/g, '');
          } catch (e) {
            updatedRow[col.id] = '#ERR!';
          }
        }
      });
      return updatedRow;
    });
    
    // 2. Dann Linked Columns berechnen
    calculatedSheet = calculateLinkedColumns(calculatedSheet, allSheets);
    
    return calculatedSheet;
  };

  const handleImport = async (payload: UploadImportPayload) => {
    const { target, parsed, mapping, targetSheetId, newSheetName, newVerticalName, fileName } = payload;
    if (!parsed.headers.length) {
      showNotification('No headers found to import.');
      return;
    }

    const headerValues = new Map<string, Array<string | number | null>>();
    parsed.headers.forEach(header => {
      headerValues.set(header, parsed.rows.map(row => row[header] ?? null));
    });

    const buildColumns = (existingColumns: ColumnDefinition[]) => {
      const usedIds = new Set(existingColumns.map(col => col.id));
      const newColumns: ColumnDefinition[] = [];
      const headerToColumnId: Record<string, string> = {};

      parsed.headers.forEach(header => {
        const mappedId = mapping[header];
        if (mappedId === IGNORE_COLUMN) {
          return;
        }
        const existing = existingColumns.find(col => col.id === mappedId);
        if (mappedId && mappedId !== NEW_COLUMN && existing) {
          headerToColumnId[header] = existing.id;
          return;
        }

        let baseId = createColumnId(header);
        let uniqueId = baseId;
        let counter = 1;
        while (usedIds.has(uniqueId) || newColumns.some(col => col.id === uniqueId)) {
          counter += 1;
          uniqueId = `${baseId}_${counter}`;
        }
        usedIds.add(uniqueId);

        const values = headerValues.get(header) || [];
        newColumns.push({
          id: uniqueId,
          header,
          width: 180,
          type: inferColumnType(values)
        });
        headerToColumnId[header] = uniqueId;
      });

      return { newColumns, headerToColumnId };
    };

    const buildRows = (columns: ColumnDefinition[], headerToColumnId: Record<string, string>) => {
      const now = Date.now();
      return parsed.rows.map((row, index) => {
        const rowId = `row-${now}-${index}`;
        const nextRow: RowData = { id: rowId };
        columns.forEach(col => {
          nextRow[col.id] = col.defaultValue || (col.type === ColumnType.NUMBER ? 0 : '');
        });
      parsed.headers.forEach(header => {
        if (mapping[header] === IGNORE_COLUMN) return;
          const colId = headerToColumnId[header];
          if (!colId) return;
          const col = columns.find(c => c.id === colId);
          if (!col) return;
          nextRow[colId] = coerceCellValue(row[header] ?? null, col.type);
        });
        return nextRow;
      });
    };

    if (target === 'existing' && targetSheetId) {
      updateSheet(activeVerticalId, targetSheetId, sheet => {
        const { newColumns, headerToColumnId } = buildColumns(sheet.columns);
        const mergedColumns = [...sheet.columns, ...newColumns];
        const newRows = buildRows(mergedColumns, headerToColumnId);
        return recalculateSheet({
          ...sheet,
          columns: mergedColumns,
          rows: [...sheet.rows, ...newRows]
        }, activeVertical.sheets);
      });
      showNotification(`Imported ${parsed.rows.length} row${parsed.rows.length !== 1 ? 's' : ''} into "${activeVertical.sheets.find(s => s.id === targetSheetId)?.name || 'tab'}".`);
      setIsUploadModalOpen(false);
      return;
    }

    const { newColumns, headerToColumnId } = buildColumns([]);
    const rows = buildRows(newColumns, headerToColumnId);

    if (target === 'new-sheet') {
      const newId = `sheet-${Date.now()}`;
      const sheetName = newSheetName?.trim() || fileName?.replace(/\.[^.]+$/, '') || 'Imported Sheet';
      const newSheet: SheetTab = {
        id: newId,
        name: sheetName,
        color: '#6366F1',
        columns: newColumns,
        rows,
        agents: [],
        httpRequests: []
      };

      setVerticals(prev => {
        const updated = prev.map(v => {
          if (v.id !== activeVerticalId) return v;
          return { ...v, sheets: [...v.sheets, newSheet] };
        });
        if (supabaseEnabled && !demoMode) {
          saveSheet(newSheet, activeVerticalId).catch(err => {
            console.error('Error saving imported sheet:', err);
          });
        }
        return updated;
      });
      setActiveSheetId(newId);
      setIsDashboardOpen(false);
      showNotification(`Created tab "${sheetName}" with ${rows.length} row${rows.length !== 1 ? 's' : ''}.`);
      setIsUploadModalOpen(false);
      return;
    }

    const verticalId = `vertical-${Date.now()}`;
    const sheetId = `sheet-${Date.now()}`;
    const verticalName = newVerticalName?.trim() || fileName?.replace(/\.[^.]+$/, '') || 'Imported Vertical';
    const newVertical: VerticalData = {
      id: verticalId,
      name: verticalName,
      color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
      sheets: [{
        id: sheetId,
        name: 'Imported Sheet',
        color: '#3B82F6',
        columns: newColumns,
        rows,
        agents: [],
        httpRequests: []
      }]
    };

    if (supabaseEnabled && !demoMode) {
      try {
        await saveVertical(newVertical);
      } catch (error) {
        console.error('Error saving imported vertical:', error);
        showNotification('Error creating vertical. Please try again.');
        return;
      }
    }

    setVerticals(prev => [...prev, newVertical]);
    setActiveVerticalId(verticalId);
    setActiveSheetId(sheetId);
    setIsDashboardOpen(false);
    showNotification(`Created vertical "${verticalName}" with ${rows.length} row${rows.length !== 1 ? 's' : ''}.`);
    setIsUploadModalOpen(false);
  };

  const handleLinkColumn = (colId: string, linkedColumn: LinkedColumn) => {
    updateActiveSheet(sheet => {
      const newCols = sheet.columns.map(c => 
        c.id === colId ? { ...c, linkedColumn } : c
      );
      return recalculateSheet({ ...sheet, columns: newCols }, activeVertical.sheets);
    });
    setIsLinkColumnModalOpen(false);
    setTargetLinkColumnId(null);
    showNotification(`Column linked to "${activeVertical.sheets.find(s => s.id === linkedColumn.sourceSheetId)?.name || 'sheet'}"`);
  };

  const handleUnlinkColumn = (colId: string) => {
    updateActiveSheet(sheet => {
      const newCols = sheet.columns.map(c => 
        c.id === colId ? { ...c, linkedColumn: undefined } : c
      );
      return recalculateSheet({ ...sheet, columns: newCols }, activeVertical.sheets);
    });
    showNotification('Column unlinked');
  };

  const handleUpdateColumn = (colId: string, updates: Partial<ColumnDefinition>) => {
    updateActiveSheet(sheet => {
      const newCols = sheet.columns.map(c => c.id === colId ? { ...c, ...updates } : c);
      let newRows = [...sheet.rows];

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
        } else {
          showNotification(`No duplicates found in "${newCols.find(c => c.id === colId)?.header}"`);
        }
      }

      return recalculateSheet({ ...sheet, columns: newCols, rows: newRows }, activeVertical.sheets);
    });
  };

  const handleDeleteColumn = (colId: string) => {
    if (activeSheet.columns.length <= 1) {
      showNotification('Cannot delete the last column.');
      return;
    }
    updateActiveSheet(sheet => {
      const targetCol = sheet.columns.find(c => c.id === colId);
      const newColumns = sheet.columns.filter(c => c.id !== colId);
      const newRows = sheet.rows.map(row => {
        const next = { ...row };
        delete next[colId];
        return next;
      });
      return { ...sheet, columns: newColumns, rows: newRows };
    });
    if (selectedCell?.colId === colId) {
      setSelectedCell(null);
    }
    showNotification(`Column "${activeSheet.columns.find(c => c.id === colId)?.header || 'Field'}" deleted.`);
  };

  const handleDuplicateColumn = (colId: string) => {
    updateActiveSheet(sheet => {
      const idx = sheet.columns.findIndex(c => c.id === colId);
      if (idx === -1) return sheet;
      const source = sheet.columns[idx];
      const newId = `field_${Date.now()}`;
      const newHeader = `${source.header} (copy)`;
      const duplicated: ColumnDefinition = {
        ...source,
        id: newId,
        header: newHeader,
        hidden: false
      };
      const newColumns = [...sheet.columns];
      newColumns.splice(idx + 1, 0, duplicated);
      const newRows = sheet.rows.map(row => ({
        ...row,
        [newId]: row[colId] ?? (duplicated.defaultValue || (duplicated.type === ColumnType.NUMBER ? 0 : ''))
      }));
      return { ...sheet, columns: newColumns, rows: newRows };
    });
    showNotification('Column duplicated.');
  };

  const handleSortColumn = (colId: string, direction: 'asc' | 'desc') => {
    updateActiveSheet(sheet => {
      const col = sheet.columns.find(c => c.id === colId);
      if (!col) return sheet;
      const dir = direction === 'asc' ? 1 : -1;
      const sorted = sheet.rows
        .map((row, index) => ({ row, index }))
        .sort((a, b) => {
          const aVal = a.row[colId];
          const bVal = b.row[colId];
          const aEmpty = aVal === undefined || aVal === null || aVal === '';
          const bEmpty = bVal === undefined || bVal === null || bVal === '';
          if (aEmpty && bEmpty) return a.index - b.index;
          if (aEmpty) return 1;
          if (bEmpty) return -1;

          if (col.type === ColumnType.NUMBER) {
            const aNum = Number(aVal);
            const bNum = Number(bVal);
            if (Number.isNaN(aNum) && Number.isNaN(bNum)) return a.index - b.index;
            if (Number.isNaN(aNum)) return 1;
            if (Number.isNaN(bNum)) return -1;
            return (aNum - bNum) * dir;
          }

          const aStr = aVal?.toString() ?? '';
          const bStr = bVal?.toString() ?? '';
          const cmp = aStr.localeCompare(bStr, undefined, { sensitivity: 'base', numeric: true });
          if (cmp === 0) return a.index - b.index;
          return cmp * dir;
        })
        .map(item => item.row);
      return { ...sheet, rows: sorted };
    });
    showNotification(`Sorted ${direction === 'asc' ? 'A → Z' : 'Z → A'}.`);
  };

  const handlePinColumn = (colId: string) => {
    updateActiveSheet(sheet => {
      const newColumns = sheet.columns.map(col =>
        col.id === colId ? { ...col, pinned: !col.pinned } : col
      );
      const pinnedCols = newColumns.filter(c => c.pinned);
      const unpinnedCols = newColumns.filter(c => !c.pinned);
      return { ...sheet, columns: [...pinnedCols, ...unpinnedCols] };
    });
  };

  const handleHideColumn = (colId: string) => {
    updateActiveSheet(sheet => {
      const newColumns = sheet.columns.map(col =>
        col.id === colId ? { ...col, hidden: !col.hidden } : col
      );
      return { ...sheet, columns: newColumns };
    });
  };

  const triggerAutoUpdate = (rowId: string, colId?: string) => {
    if (isProcessingRef.current) return;
    setTimeout(() => {
      const sheet = activeSheetRef.current;
      if (!sheet.autoUpdate || isProcessingRef.current) return;
      const agents = colId ? sheet.agents.filter(agent => agent.inputs.includes(colId)) : sheet.agents;
      if (agents.length === 0) return;

      void (async () => {
        for (const agent of agents) {
          if (processingAbortRef.current?.signal.aborted) return;
          await executeAgent(agent.id, rowId);
        }
      })();
    }, 0);
  };

  // ── Row operations ──────────────────────────────────────────────

  const handleAddRow = () => {
    const newRowId = `row-${Date.now()}`;
    const newRow: RowData = { id: newRowId };
    activeSheet.columns.forEach(col => {
      newRow[col.id] = col.defaultValue || (col.type === ColumnType.NUMBER ? 0 : '');
    });

    updateActiveSheet(sheet => {
      const tempSheet = { ...sheet, rows: [...sheet.rows, newRow] };
      return recalculateSheet(tempSheet, activeVertical.sheets);
    });

    triggerAutoUpdate(newRowId);
  };

  const handleInsertRowAt = (index: number) => {
    const newRowId = `row-${Date.now()}`;
    const newRow: RowData = { id: newRowId };
    activeSheet.columns.forEach(col => {
      newRow[col.id] = col.defaultValue || (col.type === ColumnType.NUMBER ? 0 : '');
    });

    updateActiveSheet(sheet => {
      const newRows = [...sheet.rows];
      const insertIndex = Math.min(Math.max(index + 1, 0), newRows.length);
      newRows.splice(insertIndex, 0, newRow);
      return recalculateSheet({ ...sheet, rows: newRows }, activeVertical.sheets);
    });

    triggerAutoUpdate(newRowId);
  };

  const handleDeleteRow = (rowId: string) => {
    updateActiveSheet(sheet => ({
      ...sheet,
      rows: sheet.rows.filter(r => r.id !== rowId)
    }));
    if (selectedCell?.rowId === rowId) {
      setSelectedCell(null);
    }
    setSelectedRows(prev => {
      if (!prev.has(rowId)) return prev;
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
  };

  const handleRunCell = (rowId: string, colId: string) => {
    const col = activeSheet.columns.find(c => c.id === colId);
    if (!col) return;
    if (col.type === ColumnType.HTTP && col.connectedHttpRequestId) {
      void runHttpRequest(col.connectedHttpRequestId, rowId);
      return;
    }
    if (col.connectedAgentId) {
      void executeAgent(col.connectedAgentId, rowId);
    }
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

  const findSheetsLinkedToColumn = (
    sourceSheetId: string,
    sourceColumnId: string,
    allSheets: SheetTab[]
  ): Set<string> => {
    const dependentSheetIds = new Set<string>();
    
    allSheets.forEach(sheet => {
      const hasLink = sheet.columns.some(col => 
        col.linkedColumn?.sourceSheetId === sourceSheetId &&
        col.linkedColumn?.sourceColumnId === sourceColumnId
      );
      if (hasLink) {
        dependentSheetIds.add(sheet.id);
      }
    });
    
    return dependentSheetIds;
  };

  const handleCellChange = useCallback((rowId: string, colId: string, value: any) => {
    updateActiveSheet(sheet => {
      const newRows = sheet.rows.map(row => {
        if (row.id !== rowId) return row;
        return { ...row, [colId]: value };
      });

      let updatedSheet = recalculateSheet({ ...sheet, rows: newRows }, activeVertical.sheets);
      
      const colDef = updatedSheet.columns.find(c => c.id === colId);
      if (colDef?.deduplication?.active && value) {
        updatedSheet.rows = performDeduplication(updatedSheet.rows, colId, colDef.deduplication.keep);
      }

      // Finde alle Sheets, die auf diese Spalte verlinken
      const dependentSheets = findSheetsLinkedToColumn(sheet.id, colId, activeVertical.sheets);
      
      // Recalculate abhängige Sheets
      if (dependentSheets.size > 0) {
        setVerticals(prev => prev.map(v => {
          if (v.id !== activeVerticalId) return v;
          return {
            ...v,
            sheets: v.sheets.map(s => {
              if (dependentSheets.has(s.id)) {
                return recalculateSheet(s, v.sheets);
              }
              return s;
            })
          };
        }));
      }

      return updatedSheet;
    });
    triggerAutoUpdate(rowId, colId);
    // Auto-enrich when enrichment status changes to Open
    if (colId === 'company_enrichment' || colId === 'owner_enrichment') {
      autoEnrichRow(rowId, colId, value);
    }
  }, [triggerAutoUpdate, updateActiveSheet, activeVerticalId, activeVertical]);

  const handleFormulaBarChange = (newValue: string) => {
    if (!selectedCell) return;
    if (activeColumn?.type === ColumnType.FORMULA) {
      updateActiveSheet(sheet => {
        const newCols = sheet.columns.map(c => 
          c.id === selectedCell.colId ? { ...c, formula: newValue } : c
        );
        return recalculateSheet({ ...sheet, columns: newCols }, activeVertical.sheets);
      });
    } else {
      handleCellChange(selectedCell.rowId, selectedCell.colId, newValue);
    }
  };

  const handleFormulaBarKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!selectedCell) return;
    const rows = activeSheet.rows;
    const cols = activeSheet.columns.filter(c => !c.hidden);

    if (e.key === 'Enter') {
      e.preventDefault();
      const rowIdx = rows.findIndex(r => r.id === selectedCell.rowId);
      if (rowIdx >= 0 && rowIdx < rows.length - 1) {
        setSelectedCell({ rowId: rows[rowIdx + 1].id, colId: selectedCell.colId });
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const colIdx = cols.findIndex(c => c.id === selectedCell.colId);
      if (e.shiftKey) {
        if (colIdx > 0) {
          setSelectedCell({ rowId: selectedCell.rowId, colId: cols[colIdx - 1].id });
        }
      } else if (colIdx >= 0 && colIdx < cols.length - 1) {
        setSelectedCell({ rowId: selectedCell.rowId, colId: cols[colIdx + 1].id });
      }
    }
  };

  // ── Vertical management ─────────────────────────────────────────

  const handleAddVertical = async () => {
    const newId = `vertical-${Date.now()}`;
    const sheetId = `sheet-${Date.now()}`;
    const newVertical: VerticalData = {
      id: newId,
      name: 'New Vertical',
      color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
      sheets: [{
        id: sheetId,
        name: 'Companies',
        color: '#3B82F6',
        columns: [...COMPANY_COLUMNS],
        rows: [],
        agents: [],
        httpRequests: []
      }]
    };
    
    // Save to Supabase immediately for new verticals (skip during demo)
    if (supabaseEnabled && !demoMode) {
      try {
        await saveVertical(newVertical);
      } catch (error) {
        console.error('Error saving new vertical:', error);
        showNotification('Error creating vertical. Please try again.');
        return;
      }
    }
    
    setVerticals(prev => [...prev, newVertical]);
    setActiveVerticalId(newId);
    setActiveSheetId(sheetId);
    setIsDashboardOpen(false);
  };

  // ── Agents ──────────────────────────────────────────────────────

  const handleAddAgent = (agentData: Partial<AgentConfig>) => {
    const newAgent: AgentConfig = {
      id: `agent-${Date.now()}`,
      name: agentData.name || 'Untitled Agent',
      type: agentData.type || AgentType.GOOGLE_SEARCH,
      provider: agentData.provider || AgentProvider.GOOGLE,
      modelId: agentData.modelId || 'gemini-3-flash-preview',
      prompt: agentData.prompt || '',
      inputs: agentData.inputs || [],
      outputs: agentData.outputs || [],
      outputColumnName: agentData.outputColumnName || 'Enriched Data',
      condition: agentData.condition,
      rowsToDeploy: agentData.rowsToDeploy || 10
    };

    updateActiveSheet(sheet => {
      const newColumns: ColumnDefinition[] = [...sheet.columns];
      const newRows = [...sheet.rows];
      
      let colId = newColumns.find(c => c.header === newAgent.outputColumnName)?.id;
      
      if (!colId) {
        colId = `gen_${Date.now()}`;
        newColumns.push({
          id: colId,
          header: newAgent.outputColumnName,
          type: ColumnType.ENRICHMENT,
          width: 200,
          connectedAgentId: newAgent.id
        });
        newRows.forEach(row => { row[colId!] = ''; });
      } else {
        const idx = newColumns.findIndex(c => c.id === colId);
        if (idx >= 0) {
          newColumns[idx] = { ...newColumns[idx], connectedAgentId: newAgent.id };
        }
      }

      return { 
        ...sheet, 
        columns: newColumns,
        rows: newRows,
        agents: [...sheet.agents, newAgent] 
      };
    });
    
    showNotification(`Agent "${newAgent.name}" deployed.`);
    
    // Auto-run agent for specified number of rows
    if (newAgent.rowsToDeploy && newAgent.rowsToDeploy > 0) {
      setTimeout(() => {
        const sheet = activeSheetRef.current;
        const deployedAgent = sheet.agents.find(a => a.id === newAgent.id);
        if (deployedAgent) {
          const rowsToRun = sheet.rows.slice(0, Math.min(newAgent.rowsToDeploy!, sheet.rows.length));
          const rowIds = rowsToRun.map(r => r.id);
          if (rowIds.length > 0) {
            executeAgent(newAgent.id, undefined, rowIds);
          }
        }
      }, 100);
    }
  };

  const handleUpdateAgent = (agentId: string, updates: Partial<AgentConfig>) => {
    updateActiveSheet(sheet => {
      const updatedAgents = sheet.agents.map(a => 
        a.id === agentId ? { ...a, ...updates } : a
      );
      return { ...sheet, agents: updatedAgents };
    });
    showNotification(`Agent updated.`);
  };

  const handleConfigureAgent = (colId: string) => {
    closeAllPanels();
    setTargetColumnId(colId);
    setIsAgentModalOpen(true);
  };

  const handleCloseAgentModal = () => {
    setIsAgentModalOpen(false);
    setTargetColumnId(undefined);
  };

  // ── HTTP Requests ───────────────────────────────────────────────

  const handleAddHttpRequest = (config: HttpRequestConfig) => {
    updateActiveSheet(sheet => {
      const httpRequests = [...(sheet.httpRequests || []), config];
      let newColumns = [...sheet.columns];
      let newRows = [...sheet.rows];

      if (targetHttpColumnId) {
        newColumns = newColumns.map(col => col.id === targetHttpColumnId ? { ...col, connectedHttpRequestId: config.id, type: ColumnType.HTTP } : col);
      } else {
        const colId = `http_${Date.now()}`;
        newColumns.push({
          id: colId,
          header: config.name,
          type: ColumnType.HTTP,
          width: 220,
          connectedHttpRequestId: config.id
        });
        newRows = newRows.map(row => ({ ...row, [colId]: '' }));
      }

      return { ...sheet, columns: newColumns, rows: newRows, httpRequests };
    });
    setIsHttpModalOpen(false);
    setTargetHttpColumnId(null);
    showNotification(`HTTP request "${config.name}" saved.`);
  };

  const runHttpRequest = async (configId: string, targetRowId?: string) => {
    const config = activeSheet.httpRequests?.find(c => c.id === configId);
    if (!config) {
      showNotification('HTTP config not found.');
      return;
    }
    const httpColumn = activeSheet.columns.find(c => c.connectedHttpRequestId === configId);
    if (!httpColumn) {
      showNotification('No HTTP column linked to this config.');
      return;
    }

    const rowsToProcess = targetRowId
      ? activeSheet.rows.filter(r => r.id === targetRowId)
      : (selectedRows.size > 0 ? activeSheet.rows.filter(r => selectedRows.has(r.id)) : activeSheet.rows);

    if (rowsToProcess.length === 0) return;

    const controller = createProcessingController();
    const { signal } = controller;
    setIsProcessing(true);
    setProcessingCells(prev => {
      const next = new Set(prev);
      rowsToProcess.forEach(row => {
        next.add(`${row.id}:${httpColumn.id}`);
      });
      return next;
    });

    try {
      await Promise.all(rowsToProcess.map(async (row) => {
        try {
          if (signal.aborted) return;
          const { raw, updates } = await executeHttpRequest(config, row, activeSheet.columns, signal);
          if (signal.aborted) return;
          const rawValue = typeof raw === 'string' ? raw : JSON.stringify(raw);
          updateActiveSheet(sheet => ({
            ...sheet,
            rows: sheet.rows.map(r => r.id !== row.id ? r : { ...r, ...updates, [httpColumn.id]: rawValue })
          }));
        } catch (e: any) {
          if (signal.aborted) return;
          updateActiveSheet(sheet => ({
            ...sheet,
            rows: sheet.rows.map(r => r.id !== row.id ? r : { ...r, [httpColumn.id]: `#ERR: ${e?.message || 'Request failed'}` })
          }));
        } finally {
          setProcessingCells(prev => {
            const next = new Set(prev);
            next.delete(`${row.id}:${httpColumn.id}`);
            return next;
          });
        }
      }));
    } finally {
      clearProcessingController(controller);
    }

    if (signal.aborted) return;

    setIsProcessing(false);
    showNotification(`HTTP request complete for ${rowsToProcess.length} record${rowsToProcess.length !== 1 ? 's' : ''}.`);
  };

  // ── Ownership Agent ────────────────────────────────────────────

  const runOwnershipAgent = async (targetRowId?: string) => {
    if (!appSettings.openRegisterApiKey) {
      showNotification('OpenRegister API Key missing. Add it in Settings.');
      return;
    }

    const rowsToProcess = targetRowId
      ? activeSheet.rows.filter(r => r.id === targetRowId)
      : (selectedRows.size > 0 ? activeSheet.rows.filter(r => selectedRows.has(r.id)) : activeSheet.rows);

    if (rowsToProcess.length === 0) return;

    // Auto-detect column mappings
    let companyIdCol = '';
    let websiteCol = '';
    let companyNameCol = '';

    for (const col of activeSheet.columns) {
      const h = col.header.toLowerCase();
      const id = col.id.toLowerCase();
      if (!companyIdCol && (id === 'company_id' || h.includes('company id') || h.includes('register'))) {
        companyIdCol = col.id;
      }
      if (!websiteCol && (id === 'company_website' || id === 'website' || h.includes('website') || h.includes('url'))) {
        websiteCol = col.id;
      }
      if (!companyNameCol && (id === 'company_name' || h.includes('company name') || h === 'name')) {
        companyNameCol = col.id;
      }
    }

    if (!companyIdCol && !websiteCol && !companyNameCol) {
      showNotification('No identifiable input columns found. Need Company ID, Website, or Company Name.');
      return;
    }

    const mapping: InputMapping = { companyIdCol, websiteCol, companyNameCol };

    const controller = createProcessingController();
    const { signal } = controller;
    setIsProcessing(true);

    const ownershipCol = activeSheet.columns.find(c => c.id === 'ownership_data');
    if (ownershipCol) {
      setProcessingCells(prev => {
        const next = new Set(prev);
        rowsToProcess.forEach(row => next.add(`${row.id}:${ownershipCol.id}`));
        return next;
      });
    }

    const allCompanyUpdates: Record<string, Record<string, any>> = {};
    const allPersonResults: Array<Record<string, any>> = [];
    let errorCount = 0;

    try {
      await Promise.all(rowsToProcess.map(async (row) => {
        try {
          if (signal.aborted) return;
          const result = await runEnrichmentAction('ownership_only', row as Record<string, any>, mapping, appSettings.openRegisterApiKey);
          if (signal.aborted) return;

          if (result.error) {
            errorCount += 1;
            allCompanyUpdates[row.id] = { ownership_data: `#ERR: ${result.error}` };
          } else {
            // Only set fields that have values (don't overwrite with empty)
            const updates: Record<string, any> = {};
            for (const [k, v] of Object.entries(result.companyUpdates)) {
              if (v !== undefined && v !== null && v !== '') {
                updates[k] = v;
              }
            }
            allCompanyUpdates[row.id] = updates;
            allPersonResults.push(...result.persons);
          }
        } catch (e: any) {
          if (signal.aborted) return;
          errorCount += 1;
          allCompanyUpdates[row.id] = { ownership_data: `#ERR: ${e?.message || 'Unknown error'}` };
        } finally {
          if (ownershipCol) {
            setProcessingCells(prev => {
              const next = new Set(prev);
              next.delete(`${row.id}:${ownershipCol.id}`);
              return next;
            });
          }
        }
      }));
    } finally {
      clearProcessingController(controller);
    }

    if (signal.aborted) return;

    // Update company rows in the active sheet
    updateActiveSheet(sheet => ({
      ...sheet,
      rows: sheet.rows.map(row => {
        const updates = allCompanyUpdates[row.id];
        return updates ? { ...row, ...updates } : row;
      })
    }));

    // Append persons to the Persons sheet within the same vertical
    if (allPersonResults.length > 0) {
      setVerticals(prev => prev.map(v => {
        if (v.id !== activeVerticalId) return v;

        let personsSheet = v.sheets.find(s => s.name.toLowerCase().includes('person'));
        let sheets = [...v.sheets];

        if (!personsSheet) {
          personsSheet = {
            id: `persons-${Date.now()}`,
            name: 'Persons',
            color: '#EF4444',
            columns: [...PERSON_COLUMNS],
            rows: [],
            agents: [],
            httpRequests: []
          };
          sheets = [...sheets, personsSheet];
        }

        const existingKeys = new Set(
          personsSheet.rows.map(row => {
            const keyCompany = (row.company_id || row.company_website || '').toString().trim().toLowerCase();
            const keyName = (row.full_name || '').toString().trim().toLowerCase();
            const keyRole = (row.role || '').toString().trim().toLowerCase();
            return `${keyCompany}::${keyName}::${keyRole}`;
          })
        );

        const newRows: RowData[] = [];
        const now = Date.now();

        allPersonResults.forEach((person, idx) => {
          const keyCompany = (person.company_id || person.company_website || '').toString().trim().toLowerCase();
          const keyName = (person.full_name || '').toString().trim().toLowerCase();
          const keyRole = (person.role || '').toString().trim().toLowerCase();
          const key = `${keyCompany}::${keyName}::${keyRole}`;
          if (existingKeys.has(key)) return;
          existingKeys.add(key);

          const rowId = `person-${now}-${idx}`;
          const row: RowData = { id: rowId };
          personsSheet!.columns.forEach(col => {
            const value = person[col.id];
            row[col.id] = value !== undefined && value !== null ? value : '';
          });
          newRows.push(row);
        });

        if (newRows.length === 0) return { ...v, sheets };

        const updatedSheets = sheets.map(s => {
          if (s.id !== personsSheet!.id) return s;
          return { ...s, rows: [...s.rows, ...newRows] };
        });

        return { ...v, sheets: updatedSheets };
      }));
    }

    setIsProcessing(false);
    const successCount = rowsToProcess.length - errorCount;
    const personMsg = allPersonResults.length > 0 ? ` ${allPersonResults.length} person(s) added.` : '';
    showNotification(`Ownership: ${successCount}/${rowsToProcess.length} row${rowsToProcess.length !== 1 ? 's' : ''} processed.${personMsg}`);
  };

  // ── OpenRegister Enrichment ───────────────────────────────────

  const handleRunOpenRegister = async (action: EnrichmentAction, mapping: InputMapping) => {
    if (!appSettings.openRegisterApiKey) {
      showNotification('OpenRegister API Key missing. Add it in Settings.');
      return;
    }

    const rowsToProcess = selectedRows.size > 0
      ? activeSheet.rows.filter(r => selectedRows.has(r.id))
      : activeSheet.rows;

    if (rowsToProcess.length === 0) return;

    const controller = createProcessingController();
    const { signal } = controller;
    setIsProcessing(true);
    setIsOpenRegisterModalOpen(false);

    const ownershipCol = activeSheet.columns.find(c => c.id === 'ownership_data');
    if (ownershipCol) {
      setProcessingCells(prev => {
        const next = new Set(prev);
        rowsToProcess.forEach(row => next.add(`${row.id}:${ownershipCol.id}`));
        return next;
      });
    }

    const allCompanyUpdates: Record<string, Record<string, any>> = {};
    const allPersonResults: Array<Record<string, any>> = [];
    let errorCount = 0;

    try {
      await Promise.all(rowsToProcess.map(async (row) => {
        try {
          if (signal.aborted) return;
          const result = await runEnrichmentAction(action, row as Record<string, any>, mapping, appSettings.openRegisterApiKey);
          if (signal.aborted) return;

          if (result.error) {
            errorCount += 1;
            allCompanyUpdates[row.id] = { ownership_data: `#ERR: ${result.error}` };
          } else {
            // Only set fields that have values (don't overwrite with empty)
            const updates: Record<string, any> = {};
            for (const [k, v] of Object.entries(result.companyUpdates)) {
              if (v !== undefined && v !== null && v !== '') {
                updates[k] = v;
              }
            }
            allCompanyUpdates[row.id] = updates;
            allPersonResults.push(...result.persons);
          }
        } catch (e: any) {
          if (signal.aborted) return;
          errorCount += 1;
          allCompanyUpdates[row.id] = { ownership_data: `#ERR: ${e?.message || 'Unknown error'}` };
        } finally {
          if (ownershipCol) {
            setProcessingCells(prev => {
              const next = new Set(prev);
              next.delete(`${row.id}:${ownershipCol.id}`);
              return next;
            });
          }
        }
      }));
    } finally {
      clearProcessingController(controller);
    }

    if (signal.aborted) return;

    // Update company rows in the active sheet
    updateActiveSheet(sheet => ({
      ...sheet,
      rows: sheet.rows.map(row => {
        const updates = allCompanyUpdates[row.id];
        return updates ? { ...row, ...updates } : row;
      })
    }));

    // Append persons to the Persons sheet within the same vertical
    if (allPersonResults.length > 0) {
      setVerticals(prev => prev.map(v => {
        if (v.id !== activeVerticalId) return v;

        let personsSheet = v.sheets.find(s => s.name.toLowerCase().includes('person'));
        let sheets = [...v.sheets];

        if (!personsSheet) {
          personsSheet = {
            id: `persons-${Date.now()}`,
            name: 'Persons',
            color: '#EF4444',
            columns: [...PERSON_COLUMNS],
            rows: [],
            agents: [],
            httpRequests: []
          };
          sheets = [...sheets, personsSheet];
        }

        const existingKeys = new Set(
          personsSheet.rows.map(row => {
            const keyCompany = (row.company_id || row.company_website || '').toString().trim().toLowerCase();
            const keyName = (row.full_name || '').toString().trim().toLowerCase();
            const keyRole = (row.role || '').toString().trim().toLowerCase();
            return `${keyCompany}::${keyName}::${keyRole}`;
          })
        );

        const newRows: RowData[] = [];
        const now = Date.now();

        allPersonResults.forEach((person, idx) => {
          const keyCompany = (person.company_id || person.company_website || '').toString().trim().toLowerCase();
          const keyName = (person.full_name || '').toString().trim().toLowerCase();
          const keyRole = (person.role || '').toString().trim().toLowerCase();
          const key = `${keyCompany}::${keyName}::${keyRole}`;
          if (existingKeys.has(key)) return;
          existingKeys.add(key);

          const rowId = `person-${now}-${idx}`;
          const row: RowData = { id: rowId };
          personsSheet!.columns.forEach(col => {
            const value = person[col.id];
            row[col.id] = value !== undefined && value !== null ? value : '';
          });
          newRows.push(row);
        });

        if (newRows.length === 0) return { ...v, sheets };

        const updatedSheets = sheets.map(s => {
          if (s.id !== personsSheet!.id) return s;
          return { ...s, rows: [...s.rows, ...newRows] };
        });

        return { ...v, sheets: updatedSheets };
      }));
    }

    setIsProcessing(false);
    const successCount = rowsToProcess.length - errorCount;
    const personMsg = allPersonResults.length > 0 ? ` ${allPersonResults.length} person(s) added.` : '';
    showNotification(`OpenRegister: ${successCount}/${rowsToProcess.length} row${rowsToProcess.length !== 1 ? 's' : ''} enriched.${personMsg}`);
  };

  // ── OpenRegister Workflow (Two-Stage Pipeline) ─────────────────

  const handleSaveWorkflowConfig = (config: WorkflowConfig) => {
    updateActiveSheet(sheet => ({ ...sheet, workflowConfig: config }));
  };

  const enrichCompanyRows = async (rowIds: string[], mapping: InputMapping, closeModal = true) => {
    if (!appSettings.openRegisterApiKey) {
      showNotification('OpenRegister API Key missing. Add it in Settings.');
      return;
    }

    const sheet = activeSheetRef.current;
    const rowsToProcess = rowIds.length > 0
      ? sheet.rows.filter(r => rowIds.includes(r.id))
      : sheet.rows.filter(r => {
          const s = r['company_enrichment']?.toString() || '';
          return s === ENRICHMENT_STATUS.OPEN || s === '';
        });

    if (rowsToProcess.length === 0) {
      showNotification('No rows ready for Company Enrichment.');
      return;
    }

    console.log('[Workflow] Starting company enrichment for', rowsToProcess.length, 'rows');
    const controller = createProcessingController();
    const { signal } = controller;
    setIsProcessing(true);
    if (closeModal) setIsWorkflowModalOpen(false);

    let successCount = 0;
    let errorCount = 0;

    try {
      for (const row of rowsToProcess) {
        if (signal.aborted) break;

        try {
          const result = await runCompanyEnrichment(row as Record<string, any>, mapping, appSettings.openRegisterApiKey);

          if (result.error) {
            errorCount++;
            console.log('[Workflow] Error for row', row.id, ':', result.error);
            updateActiveSheet(s => ({
              ...s,
              rows: s.rows.map(r =>
                r.id !== row.id ? r : { ...r, company_enrichment: ENRICHMENT_STATUS.ERROR }
              ),
            }));
          } else {
            successCount++;
            const updates: Record<string, any> = {};
            for (const [k, v] of Object.entries(result.companyUpdates)) {
              if (v !== undefined && v !== null && v !== '') {
                updates[k] = v;
              }
            }
            updates.company_enrichment = ENRICHMENT_STATUS.DONE;

            updateActiveSheet(s => ({
              ...s,
              rows: s.rows.map(r =>
                r.id !== row.id ? r : { ...r, ...updates }
              ),
            }));
          }
        } catch (e: any) {
          errorCount++;
          console.error('[Workflow] Exception for row', row.id, ':', e);
          updateActiveSheet(s => ({
            ...s,
            rows: s.rows.map(r =>
              r.id !== row.id ? r : { ...r, company_enrichment: ENRICHMENT_STATUS.ERROR }
            ),
          }));
        }
      }
    } finally {
      clearProcessingController(controller);
    }

    setIsProcessing(false);
    showNotification(`Company Enrichment: ${successCount}/${rowsToProcess.length} enriched, ${errorCount} errors.`);
  };

  const handleCompanyEnrichment = async (mapping: InputMapping) => {
    await enrichCompanyRows([], mapping, true);
  };

  const enrichOwnerRows = async (rowIds: string[], mapping: InputMapping, includeProkurist: boolean, closeModal = true) => {
    if (!appSettings.openRegisterApiKey) {
      showNotification('OpenRegister API Key missing. Add it in Settings.');
      return;
    }

    const sheet = activeSheetRef.current;
    const rowsToProcess = rowIds.length > 0
      ? sheet.rows.filter(r => rowIds.includes(r.id))
      : sheet.rows.filter(r => r['owner_enrichment']?.toString() === ENRICHMENT_STATUS.OPEN);

    if (rowsToProcess.length === 0) {
      showNotification('No rows ready for Owner Enrichment.');
      return;
    }

    console.log('[Workflow] Starting owner enrichment for', rowsToProcess.length, 'rows');
    const controller = createProcessingController();
    const { signal } = controller;
    setIsProcessing(true);
    if (closeModal) setIsWorkflowModalOpen(false);

    let successCount = 0;
    let errorCount = 0;
    const allPersonResults: Array<Record<string, any>> = [];

    try {
      for (const row of rowsToProcess) {
        if (signal.aborted) break;

        try {
          const result = await runOwnerEnrichment(
            row as Record<string, any>,
            mapping,
            appSettings.openRegisterApiKey,
            { includeProkurist }
          );

          if (result.error) {
            errorCount++;
            console.log('[Workflow] Owner error for row', row.id, ':', result.error);
            updateActiveSheet(s => ({
              ...s,
              rows: s.rows.map(r =>
                r.id !== row.id ? r : { ...r, owner_enrichment: ENRICHMENT_STATUS.ERROR }
              ),
            }));
          } else {
            successCount++;
            const updates: Record<string, any> = { ...result.companyUpdates };
            updates.owner_enrichment = ENRICHMENT_STATUS.DONE;

            updateActiveSheet(s => ({
              ...s,
              rows: s.rows.map(r =>
                r.id !== row.id ? r : { ...r, ...updates }
              ),
            }));

            allPersonResults.push(...result.persons);
          }
        } catch (e: any) {
          errorCount++;
          console.error('[Workflow] Owner exception for row', row.id, ':', e);
          updateActiveSheet(s => ({
            ...s,
            rows: s.rows.map(r =>
              r.id !== row.id ? r : { ...r, owner_enrichment: ENRICHMENT_STATUS.ERROR }
            ),
          }));
        }
      }
    } finally {
      clearProcessingController(controller);
    }

    // Push persons to Persons sheet with LinkedColumns
    if (allPersonResults.length > 0) {
      setVerticals(prev => prev.map(v => {
        if (v.id !== activeVerticalId) return v;

        let personsSheet = v.sheets.find(s => s.name.toLowerCase().includes('person'));
        let sheets = [...v.sheets];
        const companiesSheetId = activeSheetId;

        if (!personsSheet) {
          personsSheet = {
            id: `persons-${Date.now()}`,
            name: 'Persons',
            color: '#EF4444',
            columns: [...PERSON_COLUMNS],
            rows: [],
            agents: [],
            httpRequests: [],
          };
          sheets = [...sheets, personsSheet];
        }

        // Setup LinkedColumns if not already configured
        const linkedConfigs: Record<string, { sourceColumnId: string }> = {
          linked_company_name: { sourceColumnId: 'company_name' },
          linked_company_id: { sourceColumnId: 'company_id' },
          linked_legal_form: { sourceColumnId: 'legal_form' },
          linked_city: { sourceColumnId: 'address_city' },
        };

        let updatedColumns = [...personsSheet.columns];
        let columnsChanged = false;

        for (const [colId, config] of Object.entries(linkedConfigs)) {
          const colIdx = updatedColumns.findIndex(c => c.id === colId);
          if (colIdx >= 0 && !updatedColumns[colIdx].linkedColumn) {
            updatedColumns[colIdx] = {
              ...updatedColumns[colIdx],
              linkedColumn: {
                sourceSheetId: companiesSheetId,
                sourceColumnId: config.sourceColumnId,
                matchColumnId: 'company_website',
                sourceMatchColumnId: 'company_website',
              },
            };
            columnsChanged = true;
          }
        }

        // Dedup persons
        const existingKeys = new Set(
          personsSheet.rows.map(row => {
            const keyCompany = (row.company_website || '').toString().trim().toLowerCase();
            const keyName = (row.full_name || '').toString().trim().toLowerCase();
            return `${keyCompany}::${keyName}`;
          })
        );

        const newRows: RowData[] = [];
        const now = Date.now();

        allPersonResults.forEach((person, idx) => {
          const keyCompany = (person.company_website || '').toString().trim().toLowerCase();
          const keyName = (person.full_name || '').toString().trim().toLowerCase();
          const key = `${keyCompany}::${keyName}`;
          if (existingKeys.has(key)) return;
          existingKeys.add(key);

          const rowId = `person-${now}-${idx}`;
          const row: RowData = { id: rowId };
          // Set person-specific fields
          row['full_name'] = person.full_name || '';
          row['first_name'] = person.first_name || '';
          row['last_name'] = person.last_name || '';
          row['role'] = person.role || '';
          row['type'] = person.type || '';
          row['percentage_share'] = person.percentage_share ?? '';
          row['date_of_birth'] = person.date_of_birth || '';
          row['age'] = person.age ?? '';
          row['company_website'] = person.company_website || '';
          // Linked columns will be resolved automatically
          newRows.push(row);
        });

        if (newRows.length === 0 && !columnsChanged) return { ...v, sheets };

        const updatedSheets = sheets.map(s => {
          if (s.id !== personsSheet!.id) return s;
          return {
            ...s,
            columns: columnsChanged ? updatedColumns : s.columns,
            rows: [...s.rows, ...newRows],
          };
        });

        return { ...v, sheets: updatedSheets };
      }));
    }

    setIsProcessing(false);
    const personMsg = allPersonResults.length > 0 ? ` ${allPersonResults.length} person(s) added.` : '';
    showNotification(`Owner Enrichment: ${successCount}/${rowsToProcess.length} enriched, ${errorCount} errors.${personMsg}`);
  };

  const handleOwnerEnrichment = async (mapping: InputMapping, includeProkurist: boolean) => {
    await enrichOwnerRows([], mapping, includeProkurist, true);
  };

  // Auto-trigger: enrich a single row when its status changes to Open
  const autoEnrichRow = (rowId: string, colId: string, value: any) => {
    if (isProcessingRef.current) return;
    const sheet = activeSheetRef.current;
    const config = sheet.workflowConfig;
    if (!config) return;
    const mapping: InputMapping = {
      companyIdCol: config.companyIdCol,
      websiteCol: config.websiteCol,
      companyNameCol: config.companyNameCol,
    };

    if (colId === 'company_enrichment' && value === ENRICHMENT_STATUS.OPEN && config.companyAutoEnrich) {
      console.log('[Workflow] Auto-triggering company enrichment for row', rowId);
      setTimeout(() => enrichCompanyRows([rowId], mapping, false), 0);
    }
    if (colId === 'owner_enrichment' && value === ENRICHMENT_STATUS.OPEN && config.ownerAutoEnrich) {
      console.log('[Workflow] Auto-triggering owner enrichment for row', rowId);
      setTimeout(() => enrichOwnerRows([rowId], mapping, config.includeProkurist, false), 0);
    }
  };

  // Auto-enrich new rows if auto is enabled
  const autoEnrichNewRow = (rowId: string) => {
    const sheet = activeSheetRef.current;
    const config = sheet.workflowConfig;
    if (!config || !config.companyAutoEnrich) return;
    const mapping: InputMapping = {
      companyIdCol: config.companyIdCol,
      websiteCol: config.websiteCol,
      companyNameCol: config.companyNameCol,
    };
    console.log('[Workflow] Auto-enriching new row', rowId);
    setTimeout(() => enrichCompanyRows([rowId], mapping, false), 100);
  };

  // ── AI Agent Execution ──────────────────────────────────────────

  const executeAgent = async (agentId: string, targetRowId?: string, rowIdsOverride?: string[]) => {
    const sheet = activeSheetRef.current;
    const agent = sheet.agents.find(a => a.id === agentId);
    if (!agent) return;
    const controller = createProcessingController();
    const { signal } = controller;
    setIsProcessing(true);
    if (!targetRowId) {
      setIsAgentModalOpen(false);
    }
    
    const rowsToProcess = rowIdsOverride && rowIdsOverride.length > 0
      ? sheet.rows.filter(r => rowIdsOverride.includes(r.id))
      : targetRowId
        ? sheet.rows.filter(r => r.id === targetRowId)
        : (selectedRows.size > 0 
          ? sheet.rows.filter(r => selectedRows.has(r.id)) 
          : sheet.rows);

    const targetCol = sheet.columns.find(c => c.header === agent.outputColumnName);
    if (!targetCol) {
      setIsProcessing(false);
      showNotification("Target column not found.");
      clearProcessingController(controller);
      return;
    }

    setProcessingCells(prev => {
      const next = new Set(prev);
      rowsToProcess.forEach(row => next.add(`${row.id}:${targetCol.id}`));
      return next;
    });

    let processedCount = 0;

    if (rowsToProcess.length === 0) {
      setIsProcessing(false);
      clearProcessingController(controller);
      return;
    }

    // API keys are managed server-side via Vercel env vars

    try {
      await Promise.all(rowsToProcess.map(async (row) => {
        const startTime = Date.now();
        let stepsTaken = 0;
        let tokensUsed: number | undefined;
        
        try {
          if (signal.aborted) return;
          
          // Evaluate condition - skip if condition is false
          if (agent.condition) {
            const shouldRun = evaluateCondition(agent.condition, row, sheet.columns);
            if (!shouldRun) {
              setProcessingCells(prev => {
                const next = new Set(prev);
                next.delete(`${row.id}:${targetCol.id}`);
                return next;
              });
              return;
            }
          }
          
          // Check for missing inputs - only skip if truly missing (not empty string)
          const missingInputs = agent.inputs.filter(inputId => {
            const val = row[inputId];
            return val === undefined || val === null;
          });
          if (missingInputs.length > 0) {
            setProcessingCells(prev => {
              const next = new Set(prev);
              next.delete(`${row.id}:${targetCol.id}`);
              return next;
            });
            return;
          }

          const inputContext: any = {};
          agent.inputs.forEach(inputId => {
          const col = sheet.columns.find(c => c.id === inputId);
            if (col) inputContext[col.header] = row[inputId];
          });

        const resolvedPrompt = resolveReferences(agent.prompt, row, sheet.columns);
          const inputSummary = Object.entries(inputContext).map(([k, v]) => `${k}: ${v}`).join('\n');

          let resultData: any = {};
          let sources: any[] = [];

          if (signal.aborted) return;

          if (agent.type === AgentType.GOOGLE_SEARCH) {
          let searchContext = '';
          let searchSources: string[] = [];
          stepsTaken = 1;

          {
            const searchQuery = `${resolvedPrompt} ${inputSummary}`.substring(0, 300);
            const serperResult = await serperGoogleSearch(searchQuery, undefined, 8);
            if (serperResult.results.length > 0) {
              searchSources = serperResult.results.map(r => r.url);
              searchContext = serperResult.results
                .map((r, i) => `[${i+1}] ${r.title}\n    URL: ${r.url}\n    ${r.description}`)
                .join('\n\n');
              stepsTaken++;
            }
          }

          if (!searchContext && appSettings.apifyWebSearchEnabled) {
            const searchQuery = `${resolvedPrompt} ${inputSummary}`.substring(0, 300);
            const apifyResult = await apifySearchAndCollect(searchQuery, undefined, 8);
            if (apifyResult.searchResults.length > 0) {
              searchSources = apifyResult.searchResults.map(r => r.url);
              searchContext = apifyResult.searchResults
                .map((r, i) => `[${i+1}] ${r.title}\n    URL: ${r.url}\n    ${r.description}`)
                .join('\n\n');
              stepsTaken++;
            }
          }

          if (searchContext) {
            const structurePrompt = [
              `Based on the following real-time Google search results, extract and structure the requested information.`,
              ``, `--- SEARCH RESULTS ---`, searchContext, `--- END RESULTS ---`, ``,
              `Original task: ${resolvedPrompt}`, `Context data: ${inputSummary}`, ``,
              `Return a JSON object with these keys: ${JSON.stringify(agent.outputs)}.`,
              `If information for a key was not found, set its value to null.`,
              `Include actual URLs from the search results where relevant.`,
            ].join('\n');

            const systemInstruction = "You are a data extraction agent. Use ONLY the provided search results to answer. Return a single valid JSON object. Do not hallucinate or invent URLs.";
            if (signal.aborted) return;
            let rawJson = '';
            switch (agent.provider) {
              case AgentProvider.OPENAI:
                rawJson = await runOpenAIAgent(agent.modelId, structurePrompt, systemInstruction);
                break;
              case AgentProvider.ANTHROPIC:
                rawJson = await runAnthropicAgent(agent.modelId, structurePrompt, systemInstruction);
                break;
              default:
                rawJson = await runJSONTask('gemini-2.5-flash', structurePrompt, systemInstruction);
                break;
            }
            stepsTaken++;

            try { resultData = JSON.parse(rawJson.replace(/```json|```/g, '').trim()); } catch { resultData = { result: rawJson }; }
            resultData._sources = searchSources;
          } else {
            if (agent.provider === AgentProvider.GOOGLE) {
              const searchPrompt = [`Research the following:`, resolvedPrompt, ``, `Context data:`, inputSummary].join('\n');
              const structurePrompt = `Original task: "${resolvedPrompt}"`;
              if (signal.aborted) return;
              const searchResult = await runSearchAndStructure(searchPrompt, structurePrompt, agent.outputs, appSettings.researchSteps);
              stepsTaken = appSettings.researchSteps + 1; // Research steps + final structuring step
              try { const cleanJson = searchResult.text.replace(/```json|```/g, '').trim(); resultData = JSON.parse(cleanJson); } catch { resultData = { result: searchResult.text }; }
              if (searchResult.sources.length > 0) {
                resultData._sources = searchResult.sources.map((s: any) => s.web?.uri || s.web?.title).filter(Boolean);
              }
            } else {
              const taskPrompt = [`Research and find information about the following:`, resolvedPrompt, ``, `Context data:`, inputSummary, ``, `Return a JSON object with these keys: ${JSON.stringify(agent.outputs)}.`, `If information for a key was not found, set its value to null.`].join('\n');
              const systemInstruction = "You are a research agent. Provide the best information you can from your knowledge. Return a single valid JSON object.";
              if (signal.aborted) return;
              let rawResponse = '';
              switch (agent.provider) {
                case AgentProvider.OPENAI:
                  rawResponse = await runOpenAIAgent(agent.modelId, taskPrompt, systemInstruction);
                  break;
                case AgentProvider.ANTHROPIC:
                  rawResponse = await runAnthropicAgent(agent.modelId, taskPrompt, systemInstruction);
                  break;
                default:
                  rawResponse = await runJSONTask(agent.modelId || 'gemini-2.5-flash', taskPrompt, systemInstruction);
                  break;
              }
              try { resultData = JSON.parse(rawResponse.replace(/```json|```/g, '').trim()); } catch { resultData = { result: rawResponse }; }
            }
          }

        } else if (agent.type === AgentType.WEB_SEARCH) {
          let rawResponse = '';
          let searchContext = '';

          {
            const searchQuery = `${resolvedPrompt} ${inputSummary}`.substring(0, 300);
            const serperResult = await serperGoogleSearch(searchQuery, undefined, 8);
            if (serperResult.results.length > 0) {
              resultData._sources = serperResult.results.map(r => r.url);
              searchContext = serperResult.results
                .map((r, i) => `[${i+1}] ${r.title}\n    URL: ${r.url}\n    ${r.description}`)
                .join('\n\n');
            }
          }

          if (!searchContext && appSettings.apifyWebSearchEnabled) {
            const searchQuery = `${resolvedPrompt} ${inputSummary}`.substring(0, 300);
            const apifyResult = await apifySearchAndCollect(searchQuery, undefined, 8);
            if (apifyResult.searchResults.length > 0) {
              resultData._sources = apifyResult.searchResults.map(r => r.url);
              searchContext = apifyResult.searchResults
                .map((r, i) => `[${i+1}] ${r.title}\n    URL: ${r.url}\n    ${r.description}`)
                .join('\n\n');
            }
          }

          if (!searchContext && agent.provider === AgentProvider.GOOGLE) {
            try {
              const searchPrompt = [`Research the following:`, resolvedPrompt, ``, `Context data:`, inputSummary].join('\n');
              const structurePrompt = `Original task: "${resolvedPrompt}"`;
              if (signal.aborted) return;
              const searchResult = await runSearchAndStructure(searchPrompt, structurePrompt, agent.outputs, appSettings.researchSteps);
              rawResponse = searchResult.text;
              if (searchResult.sources.length > 0) sources = searchResult.sources;
            } catch (e) { console.error('Gemini search fallback failed:', e); }
          }

          if (searchContext && !rawResponse) {
            const structurePrompt = [
              `Based on the following real-time Google search results, extract and structure the requested information.`,
              ``, `--- SEARCH RESULTS ---`, searchContext, `--- END RESULTS ---`, ``,
              `Original task: ${resolvedPrompt}`, `Context data: ${inputSummary}`, ``,
              `Return a JSON object with these keys: ${JSON.stringify(agent.outputs)}.`,
              `If information for a key was not found, set its value to null.`,
              `Include actual URLs from the search results where relevant.`,
            ].join('\n');
            const systemInstruction = "You are a data extraction agent. Use ONLY the provided search results to answer. Return a single valid JSON object. Do not hallucinate or invent URLs.";

            switch (agent.provider) {
              case AgentProvider.OPENAI:
                if (signal.aborted) return;
                rawResponse = await runOpenAIAgent(agent.modelId, structurePrompt, systemInstruction);
                break;
              case AgentProvider.ANTHROPIC:
                if (signal.aborted) return;
                rawResponse = await runAnthropicAgent(agent.modelId, structurePrompt, systemInstruction);
                break;
              default:
                if (signal.aborted) return;
                rawResponse = await runJSONTask(agent.modelId || 'gemini-2.5-flash', structurePrompt, systemInstruction);
                break;
            }
          } else if (!rawResponse) {
            const taskPrompt = [`Research and find information about the following:`, resolvedPrompt, ``, `Context data:`, inputSummary, ``, `Return a JSON object with these keys: ${JSON.stringify(agent.outputs)}.`, `If information for a key was not found, set its value to null.`].join('\n');
            const systemInstruction = "You are a research agent. Provide the best information you can from your knowledge. Return a single valid JSON object.";
            switch (agent.provider) {
              case AgentProvider.OPENAI:
                if (signal.aborted) return;
                rawResponse = await runOpenAIAgent(agent.modelId, taskPrompt, systemInstruction);
                break;
              case AgentProvider.ANTHROPIC:
                if (signal.aborted) return;
                rawResponse = await runAnthropicAgent(agent.modelId, taskPrompt, systemInstruction);
                break;
              default:
                if (signal.aborted) return;
                rawResponse = await runJSONTask(agent.modelId || 'gemini-2.5-flash', taskPrompt, systemInstruction);
                break;
            }
          }

          try { resultData = JSON.parse(rawResponse.replace(/```json|```/g, '').trim()); } catch { resultData = { result: rawResponse }; }
          if (sources.length > 0 && !resultData._sources) {
            resultData._sources = sources.map((s: any) => s.web?.uri || s.web?.title).filter(Boolean);
          }

          } else if (agent.type === AgentType.CONTENT_CREATION) {
          stepsTaken = 1;
          const taskPrompt = [`Generate content based on the following instructions:`, resolvedPrompt, ``, `Context data:`, inputSummary, ``, `Return a JSON object with these keys: ${JSON.stringify(agent.outputs)}.`].join('\n');
          const systemInstruction = "You are an expert content creation agent. Generate high-quality, compelling, well-structured content based on the instructions and input data. Be creative yet accurate. Return a single valid JSON object.";
          let rawResponse = '';
          switch (agent.provider) {
            case AgentProvider.OPENAI:
              if (signal.aborted) return;
              rawResponse = await runOpenAIAgent(agent.modelId, taskPrompt, systemInstruction);
              break;
            case AgentProvider.ANTHROPIC:
              if (signal.aborted) return;
              rawResponse = await runAnthropicAgent(agent.modelId, taskPrompt, systemInstruction);
              break;
            default:
              if (signal.aborted) return;
              rawResponse = await runJSONTask(agent.modelId, taskPrompt, systemInstruction);
              break;
          }
          try { resultData = JSON.parse(rawResponse.replace(/```json|```/g, '').trim()); } catch { resultData = { result: rawResponse }; }
        }

          if (signal.aborted) return;

          // Capture token usage from the last Gemini call
          const lastTokens = getLastTokenCount();
          if (lastTokens) {
            tokensUsed = (tokensUsed || 0) + lastTokens;
          }
          clearLastTokenCount();

          // Add execution metadata
          const executionTime = Date.now() - startTime;
          const metadata: AgentExecutionMetadata = {
            stepsTaken,
            tokensUsed,
            executionTime,
            agentId: agent.id,
            agentName: agent.name
          };
          resultData._metadata = metadata;

          updateActiveSheet(sheet => {
            const updatedRows = sheet.rows.map(r => {
              if (r.id !== row.id) return r;
              return { ...r, [targetCol.id]: JSON.stringify(resultData) };
            });
            return recalculateSheet({ ...sheet, rows: updatedRows }, activeVertical.sheets);
          });

          processedCount++;
        } catch (e: any) {
          console.error(`Agent error for row ${row.id}:`, e);
          // Store error in result
          const errorResult = {
            error: e.message || 'Unknown error',
            _metadata: {
              stepsTaken: 0,
              executionTime: Date.now() - startTime,
              agentId: agent.id,
              agentName: agent.name
            }
          };
          updateActiveSheet(sheet => {
            const updatedRows = sheet.rows.map(r => {
              if (r.id !== row.id) return r;
              return { ...r, [targetCol.id]: JSON.stringify(errorResult) };
            });
            return recalculateSheet({ ...sheet, rows: updatedRows }, activeVertical.sheets);
          });
        } finally {
          setProcessingCells(prev => {
            const next = new Set(prev);
            next.delete(`${row.id}:${targetCol.id}`);
            return next;
          });
        }
      }));
    } finally {
      clearProcessingController(controller);
    }

    if (signal.aborted) return;

    setIsProcessing(false);
    showNotification(`Enrichment complete: ${processedCount}/${rowsToProcess.length} records processed.`);
  };

  // ── Enrichment mapping ──────────────────────────────────────────

  const handleMapEnrichmentData = (rowId: string, key: string, value: any, enrichmentColId?: string) => {
    updateActiveSheet(sheet => {
      let targetColId = sheet.columns.find(c => c.header === key)?.id;
      let newColumns = [...sheet.columns];

      if (!targetColId) {
        targetColId = `field_${Date.now()}`;
        newColumns.push({ id: targetColId, header: key, type: ColumnType.TEXT, width: 200, defaultValue: '' });
        showNotification(`Created column "${key}"`);
      }

      // Extract the same key from ALL rows that have enrichment data in the same column
      const newRows = sheet.rows.map(r => {
        if (!enrichmentColId) {
          // Fallback: only update the clicked row
          if (r.id !== rowId) return r;
          const stringValue = Array.isArray(value) ? value.join(', ') : String(value);
          return { ...r, [targetColId!]: stringValue };
        }

        // Parse the enrichment JSON for this row and extract the key
        const rawValue = r[enrichmentColId];
        if (!rawValue) return r;

        try {
          const parsed = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
          if (parsed && typeof parsed === 'object' && key in parsed) {
            const fieldVal = parsed[key];
            const stringValue = Array.isArray(fieldVal) ? fieldVal.join(', ') : String(fieldVal ?? '');
            return { ...r, [targetColId!]: stringValue };
          }
        } catch (e) {
          // Skip rows with invalid JSON
        }
        return r;
      });

      return recalculateSheet({ ...sheet, columns: newColumns, rows: newRows }, activeVertical.sheets);
    });
  };

  const handlePushToList = (rowId: string, key: string, items: any[]) => {
    if (!Array.isArray(items) || items.length === 0) return;
    
    const sourceRow = activeSheet.rows.find(r => r.id === rowId);
    if (!sourceRow) return;

    updateActiveSheet(sheet => {
      // Create new sheet tab for the list
      const newSheetId = `list-${Date.now()}`;
      const newSheetName = `${key} (from row ${rowId.slice(-6)})`;
      
      // Create columns: one for the list item, one for reference to source row
      const listColumns: ColumnDefinition[] = [
        { id: 'item', header: key, type: ColumnType.TEXT, width: 300, defaultValue: '' },
        { id: 'source_row_id', header: 'Source Row ID', type: ColumnType.TEXT, width: 150, defaultValue: '' }
      ];
      
      // Create rows from list items
      const listRows: RowData[] = items.map((item, idx) => ({
        id: `${newSheetId}-row-${idx}`,
        item: String(item),
        source_row_id: rowId
      }));

      const newSheet: SheetTab = {
        id: newSheetId,
        name: newSheetName,
        color: '#8B5CF6',
        columns: listColumns,
        rows: listRows,
        agents: [],
        httpRequests: []
      };

      // Add to current vertical
      setVerticals(prev => prev.map(v => {
        if (v.id !== activeVerticalId) return v;
        return { ...v, sheets: [...v.sheets, newSheet] };
      }));

      showNotification(`Created new tab "${newSheetName}" with ${items.length} items.`);
      return sheet;
    });
  };

  // ── CRM Sync ────────────────────────────────────────────────────

  const handleCRMSync = async (mode: 'all' | 'selected', direction: 'push' | 'pull') => {
    setIsProcessing(true);
    setIsCRMSyncModalOpen(false);
    await new Promise(r => setTimeout(r, 2000));
    updateActiveSheet(sheet => {
      const targetRows = mode === 'selected' ? selectedRows : new Set(sheet.rows.map(r => r.id));
      const newRows = sheet.rows.map(row => {
        if (targetRows.has(row.id)) {
          return { ...row, sync_status: direction === 'push' ? 'Synced' : 'Pulled' };
        }
        return row;
      });
      return { ...sheet, rows: newRows };
    });
    setIsProcessing(false);
    showNotification(`CRM ${direction === 'push' ? 'Export' : 'Import'} success.`);
  };

  // ── Utilities ───────────────────────────────────────────────────

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const createProcessingController = () => {
    const controller = new AbortController();
    processingAbortRef.current = controller;
    return controller;
  };

  const clearProcessingController = (controller: AbortController) => {
    if (processingAbortRef.current === controller) {
      processingAbortRef.current = null;
    }
  };

  const handleStopProcessing = () => {
    if (processingAbortRef.current) {
      processingAbortRef.current.abort();
      processingAbortRef.current = null;
    }
    setIsProcessing(false);
    setProcessingCells(new Set());
    showNotification('Processing stopped.');
  };

  const handleSaveTableSettings = (payload: {
    name: string;
    description: string;
    autoUpdate: boolean;
    dedupeActive: boolean;
    dedupeColumnId: string;
    dedupeKeep: 'oldest' | 'newest';
  }) => {
    if (payload.dedupeActive && !payload.dedupeColumnId) {
      showNotification('Select a column to enable deduplication.');
      return;
    }

    updateActiveSheet(sheet => {
      const newColumns = sheet.columns.map(col => {
        if (!payload.dedupeActive) {
          if (!col.deduplication) return col;
          return { ...col, deduplication: { ...col.deduplication, active: false } };
        }
        const shouldActivate = col.id === payload.dedupeColumnId;
        return {
          ...col,
          deduplication: {
            active: shouldActivate,
            keep: shouldActivate ? payload.dedupeKeep : (col.deduplication?.keep || payload.dedupeKeep)
          }
        };
      });

      let newRows = sheet.rows;
      if (payload.dedupeActive && payload.dedupeColumnId) {
        const beforeCount = newRows.length;
        newRows = performDeduplication(newRows, payload.dedupeColumnId, payload.dedupeKeep);
        const removedCount = beforeCount - newRows.length;
        if (removedCount > 0) {
          const colName = newColumns.find(c => c.id === payload.dedupeColumnId)?.header || 'selected column';
          showNotification(`Removed ${removedCount} duplicate row${removedCount !== 1 ? 's' : ''} based on "${colName}"`);
        } else {
          const colName = newColumns.find(c => c.id === payload.dedupeColumnId)?.header || 'selected column';
          showNotification(`No duplicates found in "${colName}"`);
        }
      }

      return recalculateSheet({
        ...sheet,
        name: payload.name,
        description: payload.description,
        autoUpdate: payload.autoUpdate,
        columns: newColumns,
        rows: newRows
      }, activeVertical.sheets);
    });

    setIsTableSettingsOpen(false);
  };

  const handleOpenHttpModal = (colId?: string) => {
    closeAllPanels();
    setTargetHttpColumnId(colId || null);
    setIsHttpModalOpen(true);
  };

  const handleMainDragOver = (event: React.DragEvent<HTMLElement>) => {
    if (!event.dataTransfer?.types?.includes('Files')) return;
    event.preventDefault();
    setIsDragActive(true);
  };

  const handleMainDragLeave = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragActive(false);
  };

  const handleMainDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    closeAllPanels();
    setDroppedFile(file);
    setIsUploadModalOpen(true);
  };

  // ── Demo: Snapshot/Restore + Callback Refs ──────────────────────────────
  // Architecture: The demo runs in an isolated sandbox. Before it starts we
  // deep-clone the whole app state into `demoSnapshotRef`. While running,
  // every persistence path (localStorage, Supabase, Realtime) is blocked via
  // `demoMode` guards scattered through the codebase. When it ends we restore
  // the snapshot so the real user data is untouched.
  //
  // The DemoChatOverlay orchestrates the flow via callback-refs defined below.
  // We use refs (not plain callbacks) so the overlay always invokes the latest
  // closure without needing to re-render.

  const demoSnapshotRef = useRef<{
    verticals: VerticalData[];
    activeVerticalId: string;
    activeSheetId: string;
    isDashboardOpen: boolean;
  } | null>(null);

  // ── Callback refs – always point at the latest closure ──
  const demoAddVerticalRef = useRef<(v: VerticalData) => void>(() => {});
  const demoNavigateRef = useRef<(vId: string, sId: string) => void>(() => {});
  const demoAddRowRef = useRef<(vId: string, sId: string, row: RowData) => void>(() => {});
  const demoAddColumnsRef = useRef<(vId: string, sId: string, cols: ColumnDefinition[]) => void>(() => {});
  const demoUpdateRowsRef = useRef<(vId: string, sId: string, updates: { rowId: string; data: Record<string, any> }[]) => void>(() => {});
  const demoAddSheetRef = useRef<(vId: string, sheet: SheetTab) => void>(() => {});
  const demoFilterRowsRef = useRef<(vId: string, sId: string, keepIds: string[]) => void>(() => {});
  const demoTriggerImportRef = useRef<(payload: UploadImportPayload) => void>(() => {});
  const demoOpenUploadRef = useRef<(file: File) => void>(() => {});
  const demoCloseUploadRef = useRef<() => void>(() => {});
  const demoOpenAgentModalRef = useRef<() => void>(() => {});
  const demoCloseAgentModalRef = useRef<() => void>(() => {});
  const demoToggleThemeRef = useRef<() => void>(() => {});

  // -- addVertical: push a brand-new vertical into state
  demoAddVerticalRef.current = (vertical: VerticalData) => {
    setVerticals(prev => [...prev, vertical]);
  };

  // -- navigate: switch the active vertical + sheet (closes dashboard)
  demoNavigateRef.current = (verticalId: string, sheetId: string) => {
    setActiveVerticalId(verticalId);
    setActiveSheetId(sheetId);
    setIsDashboardOpen(false);
  };

  // -- addRow: append a single row to a specific sheet
  demoAddRowRef.current = (verticalId: string, sheetId: string, row: RowData) => {
    setVerticals(prev =>
      prev.map(v =>
        v.id === verticalId
          ? { ...v, sheets: v.sheets.map(s => s.id === sheetId ? { ...s, rows: [...s.rows, row] } : s) }
          : v
      )
    );
  };

  // -- addColumns: append columns (skip duplicates), initialise empty values on existing rows
  demoAddColumnsRef.current = (verticalId: string, sheetId: string, cols: ColumnDefinition[]) => {
    setVerticals(prev =>
      prev.map(v => {
        if (v.id !== verticalId) return v;
        return {
          ...v,
          sheets: v.sheets.map(s => {
            if (s.id !== sheetId) return s;
            const newCols = cols.filter(c => !s.columns.some(ec => ec.id === c.id));
            if (newCols.length === 0) return s;
            // Initialise existing rows with default values for the new columns
            const updatedRows = s.rows.map(r => {
              const patch: Record<string, any> = {};
              newCols.forEach(c => {
                if (r[c.id] === undefined) {
                  patch[c.id] = c.defaultValue ?? '';
                }
              });
              return Object.keys(patch).length > 0 ? { ...r, ...patch } : r;
            });
            return { ...s, columns: [...s.columns, ...newCols], rows: updatedRows };
          }),
        };
      })
    );
  };

  // -- updateRows: batch-patch row data by rowId
  demoUpdateRowsRef.current = (verticalId: string, sheetId: string, updates: { rowId: string; data: Record<string, any> }[]) => {
    const updMap = new Map(updates.map(u => [u.rowId, u.data]));
    setVerticals(prev =>
      prev.map(v =>
        v.id === verticalId
          ? { ...v, sheets: v.sheets.map(s => s.id === sheetId
              ? { ...s, rows: s.rows.map(r => {
                  const patch = updMap.get(r.id);
                  return patch ? { ...r, ...patch } : r;
                })}
              : s) }
          : v
      )
    );
  };

  // -- addSheet: append a whole sheet tab to a vertical
  demoAddSheetRef.current = (verticalId: string, sheet: SheetTab) => {
    setVerticals(prev =>
      prev.map(v =>
        v.id === verticalId
          ? { ...v, sheets: [...v.sheets, sheet] }
          : v
      )
    );
  };

  // -- filterRows: keep only rows whose IDs are in the keepIds set
  demoFilterRowsRef.current = (verticalId: string, sheetId: string, keepIds: string[]) => {
    const keepSet = new Set(keepIds);
    setVerticals(prev =>
      prev.map(v =>
        v.id === verticalId
          ? { ...v, sheets: v.sheets.map(s => s.id === sheetId
              ? { ...s, rows: s.rows.filter(r => keepSet.has(r.id)) }
              : s) }
          : v
      )
    );
  };

  // -- triggerImport: run the real handleImport logic with a given payload
  demoTriggerImportRef.current = (payload: UploadImportPayload) => {
    handleImport(payload);
  };

  // -- openUploadModal / closeUploadModal: control the UploadModal with a fake file
  demoOpenUploadRef.current = (file: File) => {
    setDroppedFile(file);
    setIsUploadModalOpen(true);
  };
  demoCloseUploadRef.current = () => {
    setIsUploadModalOpen(false);
    setDroppedFile(null);
  };
  demoOpenAgentModalRef.current = () => {
    setIsAgentModalOpen(true);
  };
  demoCloseAgentModalRef.current = () => {
    setIsAgentModalOpen(false);
  };
  demoToggleThemeRef.current = () => {
    setIsDarkMode(prev => !prev);
  };

  // Demo grid highlight: set and clear after delay
  const onDemoGridHighlight = useCallback((
    cells?: Set<string>,
    columns?: Set<string>,
    scrollToColId?: string | null
  ) => {
    if (demoGridHighlightTimeoutRef.current) {
      clearTimeout(demoGridHighlightTimeoutRef.current);
      demoGridHighlightTimeoutRef.current = null;
    }
    setDemoGridHighlightCells(cells ?? new Set());
    setDemoGridHighlightColumns(columns ?? new Set());
    setDemoGridScrollToColumnId(scrollToColId ?? null);
    demoGridHighlightTimeoutRef.current = setTimeout(() => {
      setDemoGridHighlightCells(new Set());
      setDemoGridHighlightColumns(new Set());
      setDemoGridScrollToColumnId(null);
      demoGridHighlightTimeoutRef.current = null;
    }, 2500);
  }, []);
  const onDemoGridLoading = useCallback((loading: boolean) => {
    setDemoGridLoading(loading);
  }, []);

  // ── Render ──────────────────────────────────────────────

  const isDemoEntryReady = !demoMode || demoEntryStage === 'dashboard';

  // Demo overlay – always rendered via Portal so it survives login/loading transitions
  const demoOverlay = demoMode ? (
    <DemoChatOverlay
      withVoice={demoWithVoice}
      speedMultiplier={demoSpeed}
      isLoggedIn={isLoggedIn}
      isEntryReady={isDemoEntryReady}
      setLoginEmail={setDemoEmail}
      setLoginPassword={setDemoPassword}
      triggerLogin={() => {
        setIsLoadingData(true);
        setIsLoggedIn(true);
        setDemoEntryStage('slideOut');
      }}
      addVertical={(v) => demoAddVerticalRef.current(v)}
      navigateToVertical={(vId, sId) => demoNavigateRef.current(vId, sId)}
      addRowToSheet={(vId, sId, r) => demoAddRowRef.current(vId, sId, r)}
      addColumns={(vId, sId, cols) => demoAddColumnsRef.current(vId, sId, cols)}
      updateRows={(vId, sId, upds) => demoUpdateRowsRef.current(vId, sId, upds)}
      addSheet={(vId, sheet) => demoAddSheetRef.current(vId, sheet)}
      filterRows={(vId, sId, keep) => demoFilterRowsRef.current(vId, sId, keep)}
      openUploadModal={(file) => demoOpenUploadRef.current(file)}
      closeUploadModal={() => demoCloseUploadRef.current()}
      openAgentModal={() => demoOpenAgentModalRef.current()}
      closeAgentModal={() => demoCloseAgentModalRef.current()}
      toggleTheme={() => demoToggleThemeRef.current()}
      onDemoGridHighlight={onDemoGridHighlight}
      onDemoGridLoading={onDemoGridLoading}
      onStopDemo={() => {
        // ── Restore snapshot: revert all state to pre-demo values ──
        if (demoSnapshotRef.current) {
          setVerticals(demoSnapshotRef.current.verticals);
          setActiveVerticalId(demoSnapshotRef.current.activeVerticalId);
          setActiveSheetId(demoSnapshotRef.current.activeSheetId);
          setIsDashboardOpen(demoSnapshotRef.current.isDashboardOpen);
          demoSnapshotRef.current = null;
        }
        // Close any modals the demo may have opened
        setIsUploadModalOpen(false);
        setDroppedFile(null);
        // Exit demo mode and return to login screen
        setDemoMode(false);
        setDemoEmail(undefined);
        setDemoPassword(undefined);
        setDemoEntryStage('login');
        setIsLoadingData(false);
        setIsLoggedIn(false);
      }}
    />
  ) : null;

  const showLogin =
    !isLoggedIn ||
    (demoMode && (demoEntryStage === 'login' || demoEntryStage === 'slideOut' || demoEntryStage === 'loading' || demoEntryStage === 'blueFlash'));
  const showDemoBlueFlash = demoMode && isLoggedIn && demoEntryStage === 'blueFlash';

  return (
  <>
    {/* Demo overlay rendered at a stable position so it survives login/loading transitions */}
    {demoOverlay}

    {showLogin ? (
      <LoginPage
        onLogin={() => setIsLoggedIn(true)}
        onStartDemo={() => {
          demoSnapshotRef.current = { verticals: JSON.parse(JSON.stringify(verticals)), activeVerticalId, activeSheetId, isDashboardOpen };
          setVerticals([]); setDemoWithVoice(true); setDemoSpeed(1.0); setDemoMode(true); setDemoEntryStage('login');
        }}
        onStartDemoSilent={() => {
          demoSnapshotRef.current = { verticals: JSON.parse(JSON.stringify(verticals)), activeVerticalId, activeSheetId, isDashboardOpen };
          setVerticals([]); setDemoWithVoice(false); setDemoSpeed(1.0); setDemoMode(true); setDemoEntryStage('login');
        }}
        onStartDemoFast={() => {
          demoSnapshotRef.current = { verticals: JSON.parse(JSON.stringify(verticals)), activeVerticalId, activeSheetId, isDashboardOpen };
          setVerticals([]); setDemoWithVoice(true); setDemoSpeed(0.67); setDemoMode(true); setDemoEntryStage('login');
        }}
        demoEmail={demoMode ? demoEmail : undefined}
        demoPassword={demoMode ? demoPassword : undefined}
        demoEntryStage={demoMode ? demoEntryStage : undefined}
      />
    ) : isLoadingData ? (
      (
        /* ── Normal loading screen ── */
        <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }}>
          <div className="text-center">
            <Loader2 className="animate-spin mx-auto mb-4" size={48} style={{ color: '#3b82f6' }} />
            <p style={{ color: isDarkMode ? '#e2e8f0' : '#1e293b' }}>Loading data...</p>
          </div>
        </div>
      )
    ) : (
    <div className={`flex h-screen w-screen overflow-hidden selection:bg-blue-500/30 ${
      isDarkMode 
        ? 'bg-[#0b1120] text-white' 
        : 'bg-gray-50 text-gray-900'
    }`}>
      <Sidebar 
        verticals={verticals} 
        activeVerticalId={activeVerticalId} 
        isDashboardOpen={isDashboardOpen}
        onVerticalSelect={handleVerticalSelect}
        onDashboardSelect={handleDashboardSelect}
        onAddVertical={handleAddVertical}
        onSettingsClick={() => setIsSettingsModalOpen(true)}
        isDarkMode={isDarkMode}
      />

      <main
        className="flex-1 flex flex-col relative overflow-hidden"
        onDragOver={handleMainDragOver}
        onDragLeave={handleMainDragLeave}
        onDrop={handleMainDrop}
      >
        {notification && (
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-[100] px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500 backdrop-blur-md ${
            isDarkMode
              ? 'bg-blue-600 text-white border border-white/20'
              : 'bg-blue-500 text-white border border-blue-300/30'
          }`}>
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-bold tracking-tight uppercase tracking-wider">{notification}</span>
          </div>
        )}

        {!hasAnyLlmKey && (
          <div className={`absolute top-16 left-1/2 -translate-x-1/2 z-[95] px-4 py-2 rounded-xl shadow-lg flex items-center gap-3 border ${
            isDarkMode
              ? 'bg-[#0f172a] text-[#e2e8f0] border-[#1e2d3d]'
              : 'bg-white text-gray-900 border-neutral-200'
          }`}>
            <AlertTriangle className={`w-4 h-4 ${isDarkMode ? 'text-amber-300' : 'text-amber-500'}`} />
            <span className="text-xs font-semibold tracking-wide">
              Please connect LLM to use ATLAS properly.
            </span>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border transition-colors ${
                isDarkMode
                  ? 'border-[#2a3c52] text-[#9db1c5] hover:text-white hover:border-[#3b5573]'
                  : 'border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:border-neutral-300'
              }`}
            >
              API Settings
            </button>
          </div>
        )}

        {isDragActive && (
          <div className="absolute inset-6 border-2 border-dashed border-blue-400/70 rounded-2xl bg-blue-500/10 z-[90] flex items-center justify-center text-xs uppercase tracking-widest text-blue-200">
            Drop file to upload
          </div>
        )}

        {isDashboardOpen ? (
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center text-sm text-neutral-400">
                Loading dashboard...
              </div>
            }
          >
            <Dashboard verticals={verticals} />
          </Suspense>
        ) : (
          <>
            <div className={`h-12 border-b flex items-center justify-between px-5 shrink-0 ${
              isDarkMode
                ? 'bg-[#0f172a] border-[#1e2d3d]'
                : 'bg-white border-neutral-200'
            }`}>
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]" 
                  style={{ backgroundColor: activeVertical.color }} 
                />
                <h2 className={`text-sm font-bold tracking-tight ${
                  isDarkMode ? 'text-white/90' : 'text-gray-900'
                }`}>{activeVertical.name}</h2>
                <span className={`text-[10px] font-medium ${
                  isDarkMode ? 'text-[#4a6078]' : 'text-neutral-400'
                }`}>/</span>
                <span className={`text-xs font-medium ${
                  isDarkMode ? 'text-[#7b93a8]' : 'text-neutral-600'
                }`}>{activeSheet.name}</span>
              </div>
              
              <div className="flex items-center gap-2">
                {isProcessing && (
                  <div className="flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase tracking-widest bg-blue-400/10 px-4 py-1.5 rounded-full border border-blue-400/20 mr-4 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Atlas Thinking
                  </div>
                )}
                
                <button 
                  onClick={() => { closeAllPanels(); setIsAgentModalOpen(true); }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${
                    isDarkMode
                      ? 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300'
                      : 'bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-purple-800'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  Agents
                </button>

                <button 
                  onClick={() => { closeAllPanels(); setIsCRMSyncModalOpen(true); }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${
                    isDarkMode
                      ? 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 hover:text-orange-300'
                      : 'bg-orange-50 hover:bg-orange-100 text-orange-700 hover:text-orange-800'
                  }`}
                >
                  <CloudUpload className="w-3.5 h-3.5" />
                  CRM Sync
                </button>

                <button 
                  onClick={() => { closeAllPanels(); setIsUploadModalOpen(true); }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${
                    isDarkMode
                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload
                </button>

                <button 
                  onClick={() => handleOpenHttpModal()}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${
                    isDarkMode
                      ? 'bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 hover:text-pink-300'
                      : 'bg-pink-50 hover:bg-pink-100 text-pink-700 hover:text-pink-800'
                  }`}
                >
                  <Link className="w-3.5 h-3.5" />
                  HTTP Builder
                </button>

                <button 
                  onClick={() => { closeAllPanels(); setIsOpenRegisterModalOpen(true); }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${
                    isDarkMode
                      ? 'bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 hover:text-teal-300'
                      : 'bg-teal-50 hover:bg-teal-100 text-teal-700 hover:text-teal-800'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  OpenRegister
                </button>

                <button 
                  onClick={() => { closeAllPanels(); setIsWorkflowModalOpen(true); }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${
                    isDarkMode
                      ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300'
                      : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700 hover:text-cyan-800'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  Workflow
                </button>

                <div className={`w-px h-5 mx-1.5 ${
                  isDarkMode ? 'bg-[#1e2d3d]' : 'bg-neutral-200'
                }`} />

                <button 
                  onClick={handleAddRow}
                  className={`flex items-center gap-1.5 px-4 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 ${
                    isDarkMode
                      ? 'bg-slate-700 hover:bg-slate-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
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
              onKeyDown={handleFormulaBarKeyDown}
              isDarkMode={isDarkMode}
            />

            <SelectionBar
              columns={activeSheet.columns}
              rows={activeSheet.rows}
              selectedRows={selectedRows}
              filterState={filterState}
              onFilterStateChange={setFilterState}
              columnSearch={columnSearch}
              onColumnSearchChange={setColumnSearch}
              onSelectAllRows={handleSelectAllRows}
              onClearSelectedRows={handleClearSelectedRows}
              onToggleColumnHidden={handleHideColumn}
              onShowAllColumns={handleShowAllColumns}
              onHideAllColumns={handleHideAllColumns}
              onClearAllFilters={clearAllFilters}
              onSortColumn={handleSortColumn}
              isDarkMode={isDarkMode}
            />

            <Grid 
              columns={activeSheet.columns} 
              rows={activeSheet.rows} 
              selectedCell={selectedCell}
              selectedRows={selectedRows}
              onSelectCell={(rowId, colId) => setSelectedCell({ rowId, colId })}
              onSelectRow={handleSelectRow}
              onCellChange={handleCellChange} 
              onAddColumn={handleAddColumn}
              onUpdateColumn={handleUpdateColumn}
              onDeleteColumn={handleDeleteColumn}
              onDuplicateColumn={handleDuplicateColumn}
              onSortColumn={handleSortColumn}
              onPinColumn={handlePinColumn}
              onHideColumn={handleHideColumn}
              onInsertRow={handleInsertRowAt}
              onDeleteRow={handleDeleteRow}
              onRunCell={handleRunCell}
              onRunAgent={(agentId, rowIds) => executeAgent(agentId, undefined, rowIds)}
              onRunHttpRequest={runHttpRequest}
              onRunOwnership={runOwnershipAgent}
              onConfigureHttpRequest={handleOpenHttpModal}
              onConfigureAgent={handleConfigureAgent}
              onLinkColumn={(colId) => {
                setTargetLinkColumnId(colId);
                setIsLinkColumnModalOpen(true);
              }}
              onUnlinkColumn={handleUnlinkColumn}
              onUseAI={() => { closeAllPanels(); setIsAgentModalOpen(true); }}
              filterState={filterState}
              onAddFilterCondition={(colId: string) => {
                setFilterState(prev => ({
                  ...prev,
                  conditions: [...prev.conditions, { id: `f_${Date.now()}`, colId, operator: 'contains', value: '' }]
                }));
              }}
              columnSearch={columnSearch}
              onColumnSearchChange={setColumnSearch}
              processingCells={processingCells}
              onMapEnrichmentData={handleMapEnrichmentData}
              onPushToList={(rowId, key, items) => handlePushToList(rowId, key, items)}
              isDarkMode={isDarkMode}
              highlightedCellKeys={demoMode ? demoGridHighlightCells : undefined}
              highlightedColumnIds={demoMode ? demoGridHighlightColumns : undefined}
              scrollToColumnId={demoMode ? demoGridScrollToColumnId : undefined}
              loadingOverlay={demoMode ? demoGridLoading : undefined}
            />

            <StatusBar
              isProcessing={isProcessing}
              onStop={handleStopProcessing}
              onOpenTableSettings={() => setIsTableSettingsOpen(true)}
              isDarkMode={isDarkMode}
            />

            {/* Bottom sheet tabs */}
            <SheetTabBar
              sheets={activeVertical.sheets}
              activeSheetId={activeSheetId}
              onSheetSelect={handleSheetSelect}
              onAddSheet={handleAddSheet}
              onRenameSheet={handleRenameSheet}
              onRecolorSheet={handleRecolorSheet}
              onDeleteSheet={handleDeleteSheet}
              isDarkMode={isDarkMode}
            />
          </>
        )}
      </main>

      {isSettingsModalOpen && (
        <SettingsModal 
          onClose={() => setIsSettingsModalOpen(false)}
          settings={appSettings}
          onSave={handleSaveSettings}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
        />
      )}

      {apiKeyModalState.open && apiKeyModalState.provider && (
        <ApiKeyModal
          provider={apiKeyModalState.provider}
          onClose={closeApiKeyModal}
          onTestAndSave={(key) => testAndSaveApiKey(apiKeyModalState.provider as ApiKeyProvider, key)}
          isDarkMode={isDarkMode}
        />
      )}

      {isUploadModalOpen && (
        <UploadModal
          columns={activeSheet.columns}
          sheets={activeVertical.sheets}
          activeSheetId={activeSheetId}
          matchConfig={{
            provider: appSettings.uploadMatchProvider,
            modelId: appSettings.uploadMatchModelId,
            confidenceThreshold: appSettings.uploadMatchConfidence,
            useFuzzyMatching: appSettings.uploadMatchEnabled
          }}
          isDarkMode={isDarkMode}
          initialFile={droppedFile}
          onInitialFileConsumed={() => setDroppedFile(null)}
          onClose={() => {
            setIsUploadModalOpen(false);
            setDroppedFile(null);
          }}
          onImport={handleImport}
        />
      )}

      {isTableSettingsOpen && (
        <TableSettingsPanel
          onClose={() => setIsTableSettingsOpen(false)}
          onSave={handleSaveTableSettings}
          columns={activeSheet.columns}
          name={activeSheet.name}
          description={activeSheet.description}
          autoUpdate={activeSheet.autoUpdate}
          dedupeActive={Boolean(activeDedupeColumn?.deduplication?.active)}
          dedupeColumnId={activeDedupeColumn?.id}
          dedupeKeep={activeDedupeColumn?.deduplication?.keep || 'oldest'}
          isDarkMode={isDarkMode}
        />
      )}

      {isAgentModalOpen && (
        <AgentModal 
          agents={activeSheet.agents} 
          columns={activeSheet.columns}
          onRunAgent={executeAgent}
          onAddAgent={handleAddAgent}
          onUpdateAgent={handleUpdateAgent}
          onClose={handleCloseAgentModal}
          selectedRowsCount={selectedRows.size}
          totalRowsCount={activeSheet.rows.length}
          initialTargetColId={targetColumnId}
          matchProvider={appSettings.uploadMatchProvider}
          matchModelId={appSettings.uploadMatchModelId}
          existingAgent={targetColumnId ? activeSheet.agents.find(a => {
            const col = activeSheet.columns.find(c => c.id === targetColumnId);
            return col?.connectedAgentId === a.id;
          }) : undefined}
          isDarkMode={isDarkMode}
        />
      )}

      {isHttpModalOpen && (
        <HttpRequestModal
          columns={activeSheet.columns}
          onClose={() => {
            setIsHttpModalOpen(false);
            setTargetHttpColumnId(null);
          }}
          onSave={handleAddHttpRequest}
          onTest={async (config) => {
            const row = selectedCell
              ? activeSheet.rows.find(r => r.id === selectedCell.rowId)
              : activeSheet.rows[0];
            if (!row) throw new Error('No rows available to test.');
            const result = await executeHttpRequest(config, row, activeSheet.columns);
            return result.raw;
          }}
          isDarkMode={isDarkMode}
        />
      )}

      {isCRMSyncModalOpen && (
        <CRMSyncModal 
          onClose={() => setIsCRMSyncModalOpen(false)}
          onSync={handleCRMSync}
          selectedRowsCount={selectedRows.size}
          isDarkMode={isDarkMode}
        />
      )}

      {isOpenRegisterModalOpen && (
        <OpenRegisterModal
          columns={activeSheet.columns}
          onClose={() => setIsOpenRegisterModalOpen(false)}
          onRun={handleRunOpenRegister}
          selectedRowsCount={selectedRows.size}
          totalRowsCount={activeSheet.rows.length}
          isProcessing={isProcessing}
          isDarkMode={isDarkMode}
        />
      )}

      {isWorkflowModalOpen && (
        <OpenRegisterWorkflowModal
          columns={activeSheet.columns}
          rows={activeSheet.rows}
          workflowConfig={activeSheet.workflowConfig}
          onClose={() => setIsWorkflowModalOpen(false)}
          onRunCompanyEnrichment={handleCompanyEnrichment}
          onRunOwnerEnrichment={handleOwnerEnrichment}
          onSaveConfig={handleSaveWorkflowConfig}
          isProcessing={isProcessing}
          isDarkMode={isDarkMode}
        />
      )}

      {isLinkColumnModalOpen && targetLinkColumnId && (
        <LinkColumnModal
          isOpen={isLinkColumnModalOpen}
          onClose={() => {
            setIsLinkColumnModalOpen(false);
            setTargetLinkColumnId(null);
          }}
          onSave={(config) => handleLinkColumn(targetLinkColumnId, config)}
          currentSheet={activeSheet}
          allSheets={activeVertical.sheets}
          targetColumnId={targetLinkColumnId}
          isDarkMode={isDarkMode}
        />
      )}

    </div>
    )}
  </>
  );
};

export default App;
