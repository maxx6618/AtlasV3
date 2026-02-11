import { useMemo, useState } from 'react';
import { X, ToggleLeft, ToggleRight, Plus, Play, AlertTriangle } from 'lucide-react';
import { ColumnDefinition, HttpAuthType, HttpMethod, HttpRequestConfig } from '../types';

interface HttpRequestModalProps {
  columns: ColumnDefinition[];
  onClose: () => void;
  onSave: (config: HttpRequestConfig) => void;
  onTest: (config: HttpRequestConfig) => Promise<any>;
  isDarkMode: boolean;
}

type KeyValuePair = { key: string; value: string };
type MappingPair = { path: string; columnHeader: string };

const HttpRequestModal = ({ columns, onClose, onSave, onTest, isDarkMode }: HttpRequestModalProps) => {
  const bgMain = isDarkMode ? 'bg-[#0b1120]' : 'bg-white';
  const bgSecondary = isDarkMode ? 'bg-[#0f172a]' : 'bg-neutral-50';
  const bgTertiary = isDarkMode ? 'bg-[#131d2e]' : 'bg-white';
  const borderMain = isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200';
  const borderSecondary = isDarkMode ? 'border-[#263a4f]' : 'border-neutral-300';
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-neutral-500' : 'text-neutral-600';
  const textTertiary = isDarkMode ? 'text-neutral-400' : 'text-neutral-500';
  const hoverBg = isDarkMode ? 'hover:bg-[#1e2d3d]' : 'hover:bg-neutral-100';
  const hoverBgSecondary = isDarkMode ? 'hover:bg-[#0f172a]' : 'hover:bg-neutral-50';
  const [name, setName] = useState('HTTP Request');
  const [method, setMethod] = useState<HttpMethod>(HttpMethod.GET);
  const [url, setUrl] = useState('');
  const [authType, setAuthType] = useState<HttpAuthType>(HttpAuthType.NONE);
  const [apiKeyMode, setApiKeyMode] = useState<'header' | 'query'>('header');
  const [apiKeyHeader, setApiKeyHeader] = useState('X-API-Key');
  const [apiKeyQueryParam, setApiKeyQueryParam] = useState('api_key');
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [bearerToken, setBearerToken] = useState('');
  const [basicUser, setBasicUser] = useState('');
  const [basicPassword, setBasicPassword] = useState('');
  const [headers, setHeaders] = useState<KeyValuePair[]>([]);
  const [body, setBody] = useState('');
  const [inputs, setInputs] = useState<Set<string>>(new Set());
  const [responseMappings, setResponseMappings] = useState<MappingPair[]>([]);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const hasBody = method !== HttpMethod.GET && method !== HttpMethod.DELETE;

  const columnsByHeader = useMemo(() => new Set(columns.map(c => c.header)), [columns]);

  const toggleInput = (colId: string) => {
    setInputs(prev => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      return next;
    });
  };

  const addHeader = () => setHeaders(prev => [...prev, { key: '', value: '' }]);
  const updateHeader = (idx: number, key: string, value: string) => {
    setHeaders(prev => prev.map((item, i) => (i === idx ? { key, value } : item)));
  };
  const removeHeader = (idx: number) => {
    setHeaders(prev => prev.filter((_, i) => i !== idx));
  };

  const addMapping = () => setResponseMappings(prev => [...prev, { path: '', columnHeader: '' }]);
  const updateMapping = (idx: number, path: string, columnHeader: string) => {
    setResponseMappings(prev => prev.map((item, i) => (i === idx ? { path, columnHeader } : item)));
  };
  const removeMapping = (idx: number) => {
    setResponseMappings(prev => prev.filter((_, i) => i !== idx));
  };

  const buildConfig = (): HttpRequestConfig => {
    const headerRecord = headers.reduce<Record<string, string>>((acc, item) => {
      if (!item.key) return acc;
      acc[item.key] = item.value;
      return acc;
    }, {});

    const mappingRecord = responseMappings.reduce<Record<string, string>>((acc, item) => {
      if (!item.path || !item.columnHeader) return acc;
      acc[item.path] = item.columnHeader;
      return acc;
    }, {});

    return {
      id: `http_${Date.now()}`,
      name,
      url,
      method,
      auth: {
        type: authType,
        apiKeyHeader: apiKeyMode === 'header' ? apiKeyHeader : undefined,
        apiKeyQueryParam: apiKeyMode === 'query' ? apiKeyQueryParam : undefined,
        apiKeyValue: authType === HttpAuthType.API_KEY ? apiKeyValue : undefined,
        bearerToken: authType === HttpAuthType.BEARER ? bearerToken : undefined,
        basicUser: authType === HttpAuthType.BASIC ? basicUser : undefined,
        basicPassword: authType === HttpAuthType.BASIC ? basicPassword : undefined
      },
      headers: headerRecord,
      body: hasBody ? body : undefined,
      inputs: Array.from(inputs),
      responseMapping: mappingRecord
    };
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const result = await onTest(buildConfig());
      setTestResult(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
    } catch (e: any) {
      setTestError(e?.message || 'Test failed.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (!name.trim() || !url.trim()) {
      setTestError('Please provide a name and URL.');
      return;
    }
    onSave(buildConfig());
  };

  return (
    <div className="fixed inset-0 z-[200]" onClick={onClose}>
      <div className={`absolute top-0 right-0 h-screen w-[700px] ${bgMain} border-l ${borderMain} shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300`} onClick={e => e.stopPropagation()}>
        <div className={`px-8 py-6 border-b ${borderMain} flex items-center justify-between ${bgMain} shrink-0`}>
          <div>
            <h2 className={`text-sm font-black ${textPrimary} uppercase tracking-widest italic`}>Atlas HTTP Builder</h2>
            <p className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest mt-1`}>Connect any REST API</p>
          </div>
          <button onClick={onClose} className={`p-2.5 ${hoverBg} rounded-xl ${textSecondary} ${isDarkMode ? 'hover:text-white' : 'hover:text-gray-900'} transition-colors`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`flex flex-1 overflow-hidden ${bgMain}`}>
          <div className={`w-72 border-r ${borderMain} ${bgSecondary} flex flex-col shrink-0`}>
            <div className={`p-6 border-b ${borderMain}/50`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <h3 className={`text-[10px] ${textTertiary} font-black uppercase tracking-[0.2em]`}>Input Columns</h3>
              </div>
              <p className={`text-[10px] ${isDarkMode ? 'text-neutral-600' : 'text-neutral-700'} font-medium`}>Select columns to use as variables.</p>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
              {columns.map(col => {
                const isActive = inputs.has(col.id);
                return (
                  <button
                    key={col.id}
                    onClick={() => toggleInput(col.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all group ${
                      isActive
                        ? `bg-blue-900/10 border-blue-500/30 ${textPrimary} shadow-[0_0_15px_rgba(37,99,235,0.1)]`
                        : `bg-transparent border-transparent ${textSecondary} ${hoverBgSecondary} ${isDarkMode ? 'hover:text-neutral-300' : 'hover:text-gray-900'}`
                    }`}
                  >
                    <span className="text-[11px] font-bold truncate pr-4">{col.header}</span>
                    {isActive ? (
                      <ToggleRight className="w-5 h-5 text-blue-500 shrink-0" />
                    ) : (
                      <ToggleLeft className={`w-5 h-5 ${isDarkMode ? 'text-neutral-700 group-hover:text-neutral-500' : 'text-neutral-400 group-hover:text-neutral-600'} shrink-0`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`flex-1 flex flex-col min-h-0 ${bgMain}`}>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              <div className="max-w-3xl mx-auto space-y-8">
                {(testError || testResult) && (
                  <div className={`border rounded-xl p-4 flex items-start gap-3 ${testError ? 'bg-red-500/10 border-red-500/40' : 'bg-green-500/10 border-green-500/40'}`}>
                    <AlertTriangle className={`w-5 h-5 ${testError ? 'text-red-500' : 'text-green-500'}`} />
                    <div className={`text-xs ${isDarkMode ? 'text-white/80' : 'text-gray-900'} whitespace-pre-wrap`}>
                      {testError || testResult}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest`}>Name</label>
                  <input
                    className={`w-full ${bgTertiary} border ${borderSecondary} rounded-xl px-4 py-3 text-sm ${textPrimary} focus:outline-none focus:border-blue-500 transition-all`}
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest`}>Method</label>
                    <select
                      className={`w-full ${bgTertiary} border ${borderSecondary} rounded-xl px-4 py-3 text-sm ${textPrimary} outline-none`}
                      value={method}
                      onChange={e => setMethod(e.target.value as HttpMethod)}
                    >
                      {Object.values(HttpMethod).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest`}>URL</label>
                    <input
                      className={`w-full ${bgTertiary} border ${borderSecondary} rounded-xl px-4 py-3 text-sm ${textPrimary} focus:outline-none focus:border-blue-500 transition-all`}
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      placeholder="https://api.example.com/endpoint?x=/field_id"
                    />
                  </div>
                </div>

                <div className={`space-y-3 pt-4 border-t ${borderMain}`}>
                  <label className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest`}>Auth</label>
                  <select
                    className={`w-full ${bgTertiary} border ${borderSecondary} rounded-xl px-4 py-3 text-sm ${textPrimary} outline-none`}
                    value={authType}
                    onChange={e => setAuthType(e.target.value as HttpAuthType)}
                  >
                    {Object.values(HttpAuthType).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

                  {authType === HttpAuthType.API_KEY && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest`}>Key Location</label>
                        <select
                          className={`w-full ${bgTertiary} border ${borderSecondary} rounded-xl px-4 py-3 text-sm ${textPrimary} outline-none`}
                          value={apiKeyMode}
                          onChange={e => setApiKeyMode(e.target.value as 'header' | 'query')}
                        >
                          <option value="header">Header</option>
                          <option value="query">Query Param</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest`}>Key</label>
                        <input
                          className={`w-full ${bgTertiary} border ${borderSecondary} rounded-xl px-4 py-3 text-sm ${textPrimary} focus:outline-none focus:border-blue-500 transition-all`}
                          value={apiKeyMode === 'header' ? apiKeyHeader : apiKeyQueryParam}
                          onChange={e => apiKeyMode === 'header' ? setApiKeyHeader(e.target.value) : setApiKeyQueryParam(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <label className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest`}>Value</label>
                        <input
                          className={`w-full ${bgTertiary} border ${borderSecondary} rounded-xl px-4 py-3 text-sm ${textPrimary} focus:outline-none focus:border-blue-500 transition-all`}
                          value={apiKeyValue}
                          onChange={e => setApiKeyValue(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {authType === HttpAuthType.BEARER && (
                    <div className="space-y-2">
                      <label className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest`}>Bearer Token</label>
                      <input
                        className={`w-full ${bgTertiary} border ${borderSecondary} rounded-xl px-4 py-3 text-sm ${textPrimary} focus:outline-none focus:border-blue-500 transition-all`}
                        value={bearerToken}
                        onChange={e => setBearerToken(e.target.value)}
                      />
                    </div>
                  )}

                  {authType === HttpAuthType.BASIC && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest`}>Username</label>
                        <input
                          className={`w-full ${bgTertiary} border ${borderSecondary} rounded-xl px-4 py-3 text-sm ${textPrimary} focus:outline-none focus:border-blue-500 transition-all`}
                          value={basicUser}
                          onChange={e => setBasicUser(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest`}>Password</label>
                        <input
                          type="password"
                          className={`w-full ${bgTertiary} border ${borderSecondary} rounded-xl px-4 py-3 text-sm ${textPrimary} focus:outline-none focus:border-blue-500 transition-all`}
                          value={basicPassword}
                          onChange={e => setBasicPassword(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className={`space-y-3 pt-4 border-t ${borderMain}`}>
                  <div className="flex items-center justify-between">
                    <label className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest`}>Headers</label>
                    <button onClick={addHeader} className="text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300 flex items-center gap-1">
                      <Plus className="w-3 h-3" />
                      Add Header
                    </button>
                  </div>
                  <div className="space-y-2">
                    {headers.length === 0 && (
                      <div className={`text-[10px] ${textSecondary}`}>No headers.</div>
                    )}
                    {headers.map((item, idx) => (
                      <div key={`${item.key}-${idx}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                        <input
                          className={`${bgTertiary} border ${borderSecondary} rounded-lg px-3 py-2 text-xs ${textPrimary} focus:outline-none focus:border-blue-500 transition-all`}
                          placeholder="Header"
                          value={item.key}
                          onChange={e => updateHeader(idx, e.target.value, item.value)}
                        />
                        <input
                          className={`${bgTertiary} border ${borderSecondary} rounded-lg px-3 py-2 text-xs ${textPrimary} focus:outline-none focus:border-blue-500 transition-all`}
                          placeholder="Value"
                          value={item.value}
                          onChange={e => updateHeader(idx, item.key, e.target.value)}
                        />
                        <button
                          onClick={() => removeHeader(idx)}
                          className={`px-3 rounded-lg ${textSecondary} hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs`}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {hasBody && (
                  <div className={`space-y-2 pt-4 border-t ${borderMain}`}>
                    <label className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest`}>Body (JSON)</label>
                    <textarea
                      className={`w-full min-h-[140px] ${bgTertiary} border ${borderSecondary} rounded-xl px-4 py-3 text-xs ${textPrimary} font-mono focus:outline-none focus:border-blue-500 transition-all`}
                      placeholder='{"owner": "/field_id"}'
                      value={body}
                      onChange={e => setBody(e.target.value)}
                    />
                  </div>
                )}

                <div className={`space-y-3 pt-4 border-t ${borderMain}`}>
                  <div className="flex items-center justify-between">
                    <label className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest`}>Response Mapping</label>
                    <button onClick={addMapping} className="text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300 flex items-center gap-1">
                      <Plus className="w-3 h-3" />
                      Add Mapping
                    </button>
                  </div>
                  <div className="space-y-2">
                    {responseMappings.length === 0 && (
                      <div className={`text-[10px] ${textSecondary}`}>Map JSON paths to column headers.</div>
                    )}
                    {responseMappings.map((item, idx) => (
                      <div key={`${item.path}-${idx}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                        <input
                          className={`${bgTertiary} border ${borderSecondary} rounded-lg px-3 py-2 text-xs ${textPrimary} focus:outline-none focus:border-blue-500 transition-all`}
                          placeholder="data.owner.name"
                          value={item.path}
                          onChange={e => updateMapping(idx, e.target.value, item.columnHeader)}
                        />
                        <select
                          className={`${bgTertiary} border ${borderSecondary} rounded-lg px-3 py-2 text-xs ${textPrimary} outline-none`}
                          value={item.columnHeader}
                          onChange={e => updateMapping(idx, item.path, e.target.value)}
                        >
                          <option value="">Select column</option>
                          {columns.map(col => (
                            <option key={col.id} value={col.header}>{col.header}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => removeMapping(idx)}
                          className={`px-3 rounded-lg ${textSecondary} hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs`}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  {responseMappings.some(m => m.columnHeader && !columnsByHeader.has(m.columnHeader)) && (
                    <div className="text-[10px] text-red-400">One or more mapped columns no longer exist.</div>
                  )}
                </div>
              </div>
            </div>

            <div className={`border-t ${borderMain} px-8 py-5 flex items-center justify-between ${bgMain}`}>
              <button
                onClick={handleTest}
                disabled={isTesting}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                {isTesting ? 'Testing...' : 'Test Request'}
              </button>
              <button
                onClick={handleSave}
                className={`${isDarkMode ? 'bg-white hover:bg-neutral-200 text-black' : 'bg-blue-600 hover:bg-blue-700 text-white'} text-xs font-bold py-3.5 px-6 rounded-xl transition-all shadow-xl active:scale-95`}
              >
                Save HTTP Config
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HttpRequestModal;
