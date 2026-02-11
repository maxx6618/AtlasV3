import React, { useState } from 'react';
import { X, Key, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

type ApiKeyProvider = 'GOOGLE' | 'OPENAI' | 'ANTHROPIC' | 'SERPER' | 'APIFY';

interface ApiKeyModalProps {
  provider: ApiKeyProvider;
  onClose: () => void;
  onTestAndSave: (apiKey: string) => Promise<void>;
  isDarkMode: boolean;
}

const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  GOOGLE: 'Google Gemini API Key',
  OPENAI: 'OpenAI API Key',
  ANTHROPIC: 'Anthropic API Key',
  SERPER: 'Serper.dev API Key',
  APIFY: 'Apify API Token'
};

const PROVIDER_PLACEHOLDERS: Record<ApiKeyProvider, string> = {
  GOOGLE: 'AIzaSy...',
  OPENAI: 'sk-...',
  ANTHROPIC: 'sk-ant-...',
  SERPER: 'serper_...',
  APIFY: 'apify_api_...'
};

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  provider,
  onClose,
  onTestAndSave,
  isDarkMode
}) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const bgMain = isDarkMode ? 'bg-[#0b1120]' : 'bg-white';
  const borderMain = isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200';
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-[#5a7a94]' : 'text-neutral-500';
  const inputCls = `w-full rounded-xl px-3 py-2 text-xs focus:outline-none transition-all font-mono ${
    isDarkMode
      ? 'bg-[#131d2e] border border-[#1e2d3d] text-white placeholder-neutral-700'
      : 'bg-white border border-neutral-300 text-gray-900 placeholder-neutral-400'
  }`;

  const handleTest = async () => {
    if (!value.trim()) {
      setError('Please enter an API key.');
      return;
    }
    setIsTesting(true);
    setError(null);
    try {
      await onTestAndSave(value.trim());
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Key validation failed.');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className={`relative w-full max-w-md ${bgMain} border ${borderMain} rounded-2xl shadow-2xl overflow-hidden`}>
        <div className={`p-4 border-b ${borderMain} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-[#0f172a] border-[#1e2d3d]' : 'bg-neutral-100 border-neutral-200'}`}>
              <Key className={`w-5 h-5 ${textPrimary}`} />
            </div>
            <div>
              <h2 className={`text-sm font-bold ${textPrimary} uppercase tracking-wider`}>Connect API Key</h2>
              <p className={`text-[10px] ${textSecondary} font-medium`}>Required to continue</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-lg ${textSecondary} transition-colors ${isDarkMode ? 'hover:bg-[#1e2d3d]' : 'hover:bg-neutral-100'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-blue-400 font-bold uppercase tracking-widest flex items-center gap-2">
              {PROVIDER_LABELS[provider]}
            </label>
            <input
              type="password"
              className={`${inputCls} focus:border-blue-500`}
              placeholder={PROVIDER_PLACEHOLDERS[provider]}
              value={value}
              onChange={e => setValue(e.target.value)}
            />
          </div>

          {error && (
            <div className={`p-3 rounded-xl flex gap-2 border ${isDarkMode ? 'bg-red-900/20 border-red-800/40' : 'bg-red-50 border-red-200'}`}>
              <AlertTriangle className={`w-4 h-4 shrink-0 ${isDarkMode ? 'text-red-300' : 'text-red-500'}`} />
              <p className={`text-[10px] leading-relaxed ${isDarkMode ? 'text-red-200' : 'text-red-600'}`}>
                {error}
              </p>
            </div>
          )}
        </div>

        <div className={`p-4 border-t ${borderMain} flex items-center justify-end gap-2`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${isDarkMode ? 'text-[#5a7a94] hover:text-white' : 'text-neutral-500 hover:text-neutral-900'}`}
          >
            Cancel
          </button>
          <button
            onClick={handleTest}
            disabled={isTesting}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 flex items-center gap-2 ${
              isDarkMode
                ? 'bg-white hover:bg-neutral-200 text-black'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {isTesting ? 'Testing...' : 'Test & Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export type { ApiKeyProvider };
export default ApiKeyModal;
