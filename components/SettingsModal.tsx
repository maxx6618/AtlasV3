import React, { useState, useEffect } from 'react';
import { X, Save, Key, ShieldCheck } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  const handleChange = (key: keyof AppSettings, value: string) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#111] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-[#111]">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-neutral-900 rounded-lg border border-neutral-800">
                <Key className="w-5 h-5 text-white" />
             </div>
             <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">API Configuration</h2>
                <p className="text-[10px] text-neutral-500 font-medium">Connect your AI providers</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 bg-[#090909]">
            
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-[10px] text-blue-400 font-bold uppercase tracking-widest flex items-center gap-2">
                        Google Gemini API Key
                    </label>
                    <input 
                        type="password"
                        className="w-full bg-[#111] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-mono placeholder-neutral-800"
                        placeholder="AIzaSy..."
                        value={localSettings.googleApiKey}
                        onChange={e => handleChange('googleApiKey', e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] text-green-400 font-bold uppercase tracking-widest flex items-center gap-2">
                        OpenAI API Key
                    </label>
                    <input 
                        type="password"
                        className="w-full bg-[#111] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500 transition-all font-mono placeholder-neutral-800"
                        placeholder="sk-..."
                        value={localSettings.openaiApiKey}
                        onChange={e => handleChange('openaiApiKey', e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] text-amber-400 font-bold uppercase tracking-widest flex items-center gap-2">
                        Anthropic API Key
                    </label>
                    <input 
                        type="password"
                        className="w-full bg-[#111] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 transition-all font-mono placeholder-neutral-800"
                        placeholder="sk-ant-..."
                        value={localSettings.anthropicApiKey}
                        onChange={e => handleChange('anthropicApiKey', e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-neutral-900/50 border border-neutral-800 p-4 rounded-xl flex gap-3">
                <ShieldCheck className="w-5 h-5 text-neutral-500 shrink-0" />
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                    Keys are stored securely in your browser's local storage and are never sent to our servers. They are used directly to make API calls to the respective providers.
                </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
                <button 
                    onClick={onClose}
                    className="px-6 py-3 rounded-xl text-xs font-bold text-neutral-500 hover:text-white transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={() => onSave(localSettings)}
                    className="bg-white hover:bg-neutral-200 text-black px-8 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 flex items-center gap-2"
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
