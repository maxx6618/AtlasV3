import React, { useState, useEffect } from 'react';
import { X, Save, Key, ShieldCheck, Sun, Moon } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  settings,
  onSave,
  isDarkMode,
  onToggleTheme
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  const handleChange = (key: keyof AppSettings, value: string) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleStepChange = (value: number) => {
    const stepValue = Number.isFinite(value) ? Math.min(5, Math.max(2, Math.round(value))) : 2;
    setLocalSettings(prev => ({ ...prev, researchSteps: stepValue }));
  };

  const handleUploadConfidence = (value: number) => {
    const normalized = Math.min(1, Math.max(0, value));
    setLocalSettings(prev => ({ ...prev, uploadMatchConfidence: normalized }));
  };

  const getCheapModelOptions = (provider: string) => {
    switch (provider) {
      case 'OPENAI':
        return ['gpt-5-nano', 'gpt-5-mini', 'gpt-4o-mini'];
      case 'ANTHROPIC':
        return ['claude-haiku-4-5', 'claude-sonnet-4-5'];
      default:
        return ['gemini-2.0-flash-lite', 'gemini-2.5-flash-lite', 'gemini-2.5-flash'];
    }
  };

  const bg = isDarkMode ? 'bg-[#131d2e]' : 'bg-white';
  const bgBody = isDarkMode ? 'bg-[#0b1120]' : 'bg-neutral-50';
  const border = isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200';
  const inputCls = `w-full rounded-xl px-3 py-2 text-xs focus:outline-none transition-all font-mono ${
    isDarkMode
      ? 'bg-[#131d2e] border border-[#1e2d3d] text-white placeholder-neutral-700'
      : 'bg-white border border-neutral-300 text-gray-900 placeholder-neutral-400'
  }`;
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-[#5a7a94]' : 'text-neutral-500';

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <style>{`
        .settings-modal-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .settings-modal-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .settings-modal-scroll::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? '#4a5568' : '#9ca3af'};
          border-radius: 4px;
        }
        .settings-modal-scroll::-webkit-scrollbar-thumb:hover {
          background: ${isDarkMode ? '#6b7280' : '#6b7280'};
        }
      `}</style>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-lg max-h-[90vh] ${bg} border ${border} rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200`}>
        
        <div className={`p-4 border-b ${border} flex items-center justify-between ${bg} shrink-0`}>
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-[#0f172a] border-[#1e2d3d]' : 'bg-neutral-100 border-neutral-200'}`}>
                <Key className={`w-5 h-5 ${textPrimary}`} />
             </div>
             <div>
                <h2 className={`text-sm font-bold ${textPrimary} uppercase tracking-wider`}>Settings</h2>
                <p className={`text-[10px] ${textSecondary} font-medium`}>API keys, scheme, and usage</p>
             </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-lg ${textSecondary} transition-colors ${isDarkMode ? 'hover:bg-[#1e2d3d]' : 'hover:bg-neutral-100'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div 
          className={`flex-1 overflow-y-auto p-4 space-y-4 settings-modal-scroll ${bgBody}`}
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: isDarkMode ? '#4a5568 transparent' : '#9ca3af transparent'
          }}
        >
            
            <div className="space-y-2">
                <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-[#4a6078]' : 'text-neutral-400'}`}>Appearance</p>
                <div className={`flex items-center justify-between rounded-xl px-3 py-2 border ${isDarkMode ? 'bg-[#131d2e] border-[#1e2d3d]' : 'bg-white border-neutral-200'}`}>
                    <div>
                        <div className={`text-xs font-semibold ${isDarkMode ? 'text-neutral-200' : 'text-neutral-800'}`}>Color Scheme</div>
                        <div className={`text-[10px] ${textSecondary}`}>Switch between dark and light mode</div>
                    </div>
                    <button
                        onClick={onToggleTheme}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${
                          isDarkMode
                            ? 'border-[#1e2d3d] bg-[#0f172a] text-neutral-300 hover:text-white hover:bg-[#1e2d3d]'
                            : 'border-neutral-300 bg-neutral-100 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'
                        }`}
                        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                        {isDarkMode ? 'Light' : 'Dark'}
                    </button>
                </div>
            </div>

            <div className="space-y-2.5">
                <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-[#4a6078]' : 'text-neutral-400'}`}>Agent Settings</p>

                <div className="space-y-1.5">
                    <label className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-2">
                        OpenRegister API Key
                    </label>
                    <input 
                        type="password"
                        className={`${inputCls} focus:border-cyan-500`}
                        placeholder="sk_live_..."
                        value={localSettings.openRegisterApiKey}
                        onChange={e => handleChange('openRegisterApiKey', e.target.value)}
                    />
                    <p className={`text-[10px] italic ${isDarkMode ? 'text-[#4a6078]' : 'text-neutral-400'}`}>Used for ownership lookups via OpenRegister.</p>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] text-blue-400 font-bold uppercase tracking-widest flex items-center gap-2">
                        Research Steps (2-5)
                    </label>
                    <input 
                        type="number"
                        min={2}
                        max={5}
                        step={1}
                        className={`${inputCls} focus:border-blue-500`}
                        value={localSettings.researchSteps ?? 2}
                        onChange={e => handleStepChange(Number(e.target.value))}
                    />
                    <p className={`text-[10px] italic ${isDarkMode ? 'text-[#4a6078]' : 'text-neutral-400'}`}>Limits the number of research steps for search agents. Default is 2.</p>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] text-purple-300 font-bold uppercase tracking-widest flex items-center gap-2">
                        Apify Web Search
                    </label>
                    <div className={`flex items-center justify-between rounded-xl px-3 py-2 border ${isDarkMode ? 'bg-[#131d2e] border-[#1e2d3d]' : 'bg-white border-neutral-200'}`}>
                        <div>
                            <div className={`text-xs font-semibold ${isDarkMode ? 'text-neutral-200' : 'text-neutral-800'}`}>Enable Apify for Web Search</div>
                            <div className={`text-[10px] ${textSecondary}`}>Uses Apify search results when enabled.</div>
                        </div>
                        <button
                            onClick={() => setLocalSettings(prev => ({ ...prev, apifyWebSearchEnabled: !prev.apifyWebSearchEnabled }))}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${
                              localSettings.apifyWebSearchEnabled
                                ? isDarkMode
                                  ? 'border-purple-500/40 bg-purple-500/10 text-purple-300'
                                  : 'border-purple-500/30 bg-purple-50 text-purple-700'
                                : isDarkMode
                                  ? 'border-[#1e2d3d] bg-[#0f172a] text-neutral-400'
                                  : 'border-neutral-300 bg-neutral-100 text-neutral-500'
                            }`}
                        >
                            {localSettings.apifyWebSearchEnabled ? 'On' : 'Off'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-[#4a6078]' : 'text-neutral-400'}`}>Upload Settings</p>

                <div className="space-y-1.5">
                    <label className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-2">
                        Fuzzy Matching
                    </label>
                    <div className={`flex items-center justify-between rounded-xl px-3 py-2 border ${isDarkMode ? 'bg-[#131d2e] border-[#1e2d3d]' : 'bg-white border-neutral-200'}`}>
                        <div>
                            <div className={`text-xs font-semibold ${isDarkMode ? 'text-neutral-200' : 'text-neutral-800'}`}>Enable fuzzy match</div>
                            <div className={`text-[10px] ${textSecondary}`}>Uses AI to map headers.</div>
                        </div>
                        <button
                            onClick={() => setLocalSettings(prev => ({ ...prev, uploadMatchEnabled: !prev.uploadMatchEnabled }))}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${
                              localSettings.uploadMatchEnabled
                                ? isDarkMode
                                  ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                                  : 'border-cyan-500/30 bg-cyan-50 text-cyan-700'
                                : isDarkMode
                                  ? 'border-[#1e2d3d] bg-[#0f172a] text-neutral-400'
                                  : 'border-neutral-300 bg-neutral-100 text-neutral-500'
                            }`}
                        >
                            {localSettings.uploadMatchEnabled ? 'On' : 'Off'}
                        </button>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] text-blue-400 font-bold uppercase tracking-widest flex items-center gap-2">
                        Matching Provider
                    </label>
                    <select
                        className={`${inputCls} focus:border-blue-500`}
                        value={localSettings.uploadMatchProvider}
                        onChange={e => {
                          const provider = e.target.value as any;
                          const defaultModel =
                            provider === 'OPENAI' ? 'gpt-5-nano' :
                            provider === 'ANTHROPIC' ? 'claude-haiku-4-5' :
                            'gemini-2.0-flash-lite';
                          setLocalSettings(prev => ({ ...prev, uploadMatchProvider: provider, uploadMatchModelId: defaultModel }));
                        }}
                    >
                        <option value="GOOGLE">Gemini</option>
                        <option value="OPENAI">OpenAI</option>
                        <option value="ANTHROPIC">Anthropic</option>
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] text-blue-400 font-bold uppercase tracking-widest flex items-center gap-2">
                        Matching Model
                    </label>
                    <input
                        type="text"
                        className={`${inputCls} focus:border-blue-500`}
                        list="upload-model-options"
                        placeholder="Select or type a model name"
                        value={localSettings.uploadMatchModelId}
                        onChange={e => setLocalSettings(prev => ({ ...prev, uploadMatchModelId: e.target.value }))}
                    />
                    <datalist id="upload-model-options">
                      {getCheapModelOptions(localSettings.uploadMatchProvider).map(model => (
                        <option key={model} value={model} />
                      ))}
                    </datalist>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {getCheapModelOptions(localSettings.uploadMatchProvider).map(model => (
                        <button
                          key={model}
                          onClick={() => setLocalSettings(prev => ({ ...prev, uploadMatchModelId: model }))}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${
                            isDarkMode
                              ? 'border-[#1e2d3d] bg-[#0f172a] text-neutral-400 hover:text-white hover:bg-[#1e2d3d]'
                              : 'border-neutral-300 bg-neutral-100 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'
                          }`}
                        >
                          {model}
                        </button>
                      ))}
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] text-blue-400 font-bold uppercase tracking-widest flex items-center gap-2">
                        Confidence Threshold ({Math.round((localSettings.uploadMatchConfidence ?? 0.5) * 100)}%)
                    </label>
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={localSettings.uploadMatchConfidence ?? 0.5}
                        onChange={e => handleUploadConfidence(Number(e.target.value))}
                        className="w-full"
                    />
                    <p className={`text-[10px] italic ${isDarkMode ? 'text-[#4a6078]' : 'text-neutral-400'}`}>Below this threshold, mappings are flagged for review.</p>
                </div>
            </div>

            <div className={`p-3 rounded-xl flex gap-2 border ${isDarkMode ? 'bg-[#0f172a]/50 border-[#1e2d3d]' : 'bg-blue-50 border-blue-100'}`}>
                <ShieldCheck className={`w-4 h-4 shrink-0 ${isDarkMode ? 'text-[#5a7a94]' : 'text-blue-400'}`} />
                <p className={`text-[10px] leading-relaxed ${isDarkMode ? 'text-[#5a7a94]' : 'text-blue-600'}`}>
                    API keys for LLM providers (Gemini, OpenAI, Anthropic, Serper, Apify, ElevenLabs) are managed securely on the server. Only the OpenRegister key is stored locally.
                </p>
            </div>

            <div className={`flex justify-end gap-3 pt-2 border-t ${border} shrink-0`}>
                <button 
                    onClick={onClose}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition-colors ${isDarkMode ? 'text-[#5a7a94] hover:text-white' : 'text-neutral-500 hover:text-neutral-900'}`}
                >
                    Cancel
                </button>
                <button 
                    onClick={() => onSave(localSettings)}
                    className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 flex items-center gap-2 ${
                      isDarkMode
                        ? 'bg-white hover:bg-neutral-200 text-black'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                >
                    <Save className="w-4 h-4" />
                    Save Settings
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
