
import React, { useState, useRef, useEffect } from 'react';
import { Bot, Play, Plus, Hash, Globe, Cpu } from 'lucide-react';
import { AgentConfig, AgentType, ColumnDefinition, AgentProvider } from '../types';

interface AgentPanelProps {
  agents: AgentConfig[];
  columns: ColumnDefinition[];
  onRunAgent: (agentId: string) => void;
  onAddAgent: (agent: Partial<AgentConfig>) => void;
  isDarkMode: boolean;
}

const PROVIDER_MODELS = {
  [AgentProvider.GOOGLE]: [
    { id: 'gemini-3-flash-preview', label: 'Gemini 3.0 Flash' },
    { id: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
  ],
  [AgentProvider.OPENAI]: [
    { id: 'o3', label: 'o3' },
    { id: 'o4-mini', label: 'o4-mini' },
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  ],
  [AgentProvider.ANTHROPIC]: [
    { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
    { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
  ]
};

const AgentPanel: React.FC<AgentPanelProps> = ({ agents, columns, onRunAgent, onAddAgent, isDarkMode }) => {
  const bgMain = isDarkMode ? 'bg-[#131d2e]' : 'bg-white';
  const bgSecondary = isDarkMode ? 'bg-[#192436]' : 'bg-neutral-50';
  const bgTertiary = isDarkMode ? 'bg-[#0f172a]' : 'bg-neutral-100';
  const borderMain = isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200';
  const borderSecondary = isDarkMode ? 'border-[#263a4f]' : 'border-neutral-300';
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-neutral-500' : 'text-neutral-600';
  const textTertiary = isDarkMode ? 'text-neutral-400' : 'text-neutral-500';
  const hoverBg = isDarkMode ? 'hover:bg-[#1e2d3d]' : 'hover:bg-neutral-100';
  const [showForm, setShowForm] = useState(false);
  const [slashMenu, setSlashMenu] = useState<{ open: boolean; target: 'prompt' | 'condition'; x: number; y: number; filter: string } | null>(null);
  
  const [targetColId, setTargetColId] = useState<string>(columns[0]?.id || '');
  const [newAgent, setNewAgent] = useState<Partial<AgentConfig>>({
    name: '',
    type: AgentType.GOOGLE_SEARCH,
    provider: AgentProvider.GOOGLE,
    modelId: 'gemini-3-flash-preview',
    prompt: '',
    condition: '',
  });

  const promptRef = useRef<HTMLTextAreaElement>(null);
  const conditionRef = useRef<HTMLTextAreaElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>, field: 'prompt' | 'condition') => {
    const value = e.target.value;
    const cursor = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursor);
    const lastSlash = textBeforeCursor.lastIndexOf('/');

    setNewAgent({ ...newAgent, [field]: value });

    if (lastSlash !== -1 && !textBeforeCursor.substring(lastSlash).includes(' ')) {
      const rect = e.target.getBoundingClientRect();
      setSlashMenu({
        open: true,
        target: field,
        x: rect.left,
        y: rect.top,
        filter: textBeforeCursor.substring(lastSlash + 1).toLowerCase()
      });
    } else {
      setSlashMenu(null);
    }
  };

  const insertField = (colId: string) => {
    if (!slashMenu) return;
    const field = slashMenu.target;
    const value = (newAgent[field] as string) || '';
    const ref = field === 'prompt' ? promptRef : conditionRef;
    if (!ref.current) return;

    const cursor = ref.current.selectionStart;
    const textBeforeCursor = value.substring(0, cursor);
    const lastSlash = textBeforeCursor.lastIndexOf('/');
    
    const newValue = value.substring(0, lastSlash) + `/${colId} ` + value.substring(cursor);
    setNewAgent({ ...newAgent, [field]: newValue });
    setSlashMenu(null);
    
    setTimeout(() => {
      if (ref.current) {
        ref.current.focus();
        const newPos = lastSlash + colId.length + 2;
        ref.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  const handleAdd = () => {
    if (!newAgent.name || !newAgent.prompt) return;

    const targetHeader = columns.find(c => c.id === targetColId)?.header;
    const outputs = targetHeader ? [targetHeader] : [];
    
    // Extract inputs from prompt looking for /field_id
    const inputs = Array.from(new Set(
      (newAgent.prompt?.match(/\/([a-zA-Z0-9_]+)/g) || [])
        .map(s => s.substring(1))
        .filter(id => columns.some(c => c.id === id))
    ));

    onAddAgent({ ...newAgent, inputs, outputs });
    setShowForm(false);
    setNewAgent({ 
        name: '', 
        type: AgentType.GOOGLE_SEARCH, 
        provider: AgentProvider.GOOGLE,
        modelId: 'gemini-3-flash-preview',
        prompt: '', 
        condition: '' 
    });
    setTargetColId(columns[0]?.id || '');
  };

  const filteredColumns = columns.filter(c => 
    c.header.toLowerCase().includes(slashMenu?.filter || '') || 
    c.id.toLowerCase().includes(slashMenu?.filter || '')
  );

  return (
    <div className={`w-80 h-full ${bgMain} border-l ${borderMain} flex flex-col relative`}>
      {slashMenu && (
        <div 
          className={`absolute z-[100] w-56 ${isDarkMode ? 'bg-[#1a2638]' : 'bg-white'} border ${borderSecondary} rounded-lg shadow-2xl py-1 overflow-hidden`}
          style={{ top: '30%', right: '10%' }}
        >
          <div className={`px-3 py-1.5 text-[10px] font-bold ${textSecondary} uppercase tracking-widest border-b ${borderMain}`}>
            Select Field
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredColumns.map(col => (
              <button
                key={col.id}
                onMouseDown={(e) => { e.preventDefault(); insertField(col.id); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${isDarkMode ? 'text-neutral-300' : 'text-gray-700'} hover:bg-blue-600 hover:text-white transition-colors`}
              >
                <Hash className="w-3 h-3 opacity-50" />
                {col.header}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`p-4 border-b ${borderMain} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-400" />
          <h2 className={`text-sm font-semibold ${textPrimary}`}>Tab Agents</h2>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className={`p-1 rounded transition-colors ${showForm ? 'bg-blue-600 text-white' : `${hoverBg} ${textTertiary}`}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {showForm && (
          <div className={`${bgSecondary} border ${borderSecondary} rounded-lg p-4 space-y-3 shadow-xl`}>
            <h3 className={`text-xs font-bold ${textTertiary} uppercase tracking-wider`}>New Agent</h3>
            <input 
              className={`w-full ${bgTertiary} border ${borderSecondary} rounded px-3 py-2 text-sm ${textPrimary} focus:outline-none focus:border-blue-500`}
              placeholder="Agent Name"
              value={newAgent.name}
              onChange={e => setNewAgent({...newAgent, name: e.target.value})}
            />
            
            <div className="space-y-1">
              <label className={`text-[10px] ${textSecondary} font-bold uppercase`}>Type</label>
              <select 
                className={`w-full ${bgTertiary} border ${borderSecondary} rounded px-3 py-2 text-sm ${textPrimary} outline-none`}
                value={newAgent.type}
                onChange={e => setNewAgent({...newAgent, type: e.target.value as AgentType})}
              >
                <option value={AgentType.GOOGLE_SEARCH}>Google Search</option>
                <option value={AgentType.WEB_SEARCH}>Websearch Agent</option>
                <option value={AgentType.CONTENT_CREATION}>Content Creation</option>
              </select>
            </div>

            <div className="space-y-1">
                <label className={`text-[10px] ${textSecondary} font-bold uppercase flex items-center gap-1`}><Globe className="w-3 h-3"/> Provider</label>
                <select 
                    className={`w-full ${bgTertiary} border ${borderSecondary} rounded px-3 py-2 text-xs ${textPrimary} outline-none`}
                    value={newAgent.provider}
                    onChange={e => {
                        const p = e.target.value as AgentProvider;
                        setNewAgent({...newAgent, provider: p, modelId: PROVIDER_MODELS[p][0].id });
                    }}
                    disabled={newAgent.type === AgentType.GOOGLE_SEARCH}
                >
                    <option value={AgentProvider.GOOGLE}>Google Gemini</option>
                    <option value={AgentProvider.OPENAI}>OpenAI</option>
                    <option value={AgentProvider.ANTHROPIC}>Anthropic</option>
                </select>
            </div>
            <div className="space-y-1">
                <label className={`text-[10px] ${textSecondary} font-bold uppercase flex items-center gap-1`}><Cpu className="w-3 h-3"/> Model</label>
                <select 
                    className={`w-full ${bgTertiary} border ${borderSecondary} rounded px-3 py-2 text-xs ${textPrimary} outline-none`}
                    value={newAgent.modelId}
                    onChange={e => setNewAgent({...newAgent, modelId: e.target.value})}
                    disabled={newAgent.type === AgentType.GOOGLE_SEARCH}
                >
                    {PROVIDER_MODELS[newAgent.provider || AgentProvider.GOOGLE].map(m => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                </select>
            </div>
            
            <div className="space-y-1">
              <label className={`text-[10px] ${textSecondary} font-bold uppercase`}>Prompt</label>
              <textarea 
                ref={promptRef}
                className={`w-full ${bgTertiary} border ${borderSecondary} rounded px-3 py-2 text-sm ${textPrimary} min-h-[80px] focus:outline-none focus:border-blue-500 font-mono`}
                placeholder="Type / to reference fields..."
                value={newAgent.prompt}
                onChange={e => handleTextChange(e, 'prompt')}
              />
            </div>

            <div className="space-y-1">
              <label className={`text-[10px] ${textSecondary} font-bold uppercase`}>Condition</label>
              <textarea 
                ref={conditionRef}
                className={`w-full ${bgTertiary} border ${borderSecondary} rounded px-3 py-2 text-xs ${textTertiary} min-h-[40px] focus:outline-none focus:border-blue-500 font-mono`}
                placeholder="Skip logic (e.g. /email != '')"
                value={newAgent.condition}
                onChange={e => handleTextChange(e, 'condition')}
              />
            </div>

            <div className="space-y-1">
              <label className={`text-[10px] ${textSecondary} font-bold uppercase`}>Target Output Field</label>
              <select 
                className={`w-full ${bgTertiary} border ${borderSecondary} rounded px-3 py-2 text-sm ${textPrimary} outline-none`}
                value={targetColId}
                onChange={e => setTargetColId(e.target.value)}
              >
                {columns.map(c => <option key={c.id} value={c.id}>{c.header}</option>)}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={handleAdd} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded">Create</button>
              <button onClick={() => setShowForm(false)} className={`flex-1 ${isDarkMode ? 'bg-[#1e2d3d] hover:bg-[#263a4f] text-neutral-300' : 'bg-neutral-200 hover:bg-neutral-300 text-gray-700'} text-xs font-bold py-2 rounded`}>Cancel</button>
            </div>
          </div>
        )}

        {agents.map((agent) => (
          <div key={agent.id} className={`${bgSecondary} border ${borderMain} rounded-lg p-4 group`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${textPrimary} uppercase tracking-tight`}>{agent.name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    agent.type === AgentType.GOOGLE_SEARCH ? 'bg-blue-900/30 text-blue-400' : 
                    agent.type === AgentType.WEB_SEARCH ? 'bg-emerald-900/30 text-emerald-400' :
                    'bg-amber-900/30 text-amber-400'
                  }`}>
                    {agent.type === AgentType.GOOGLE_SEARCH ? 'Google Search' : 
                     agent.type === AgentType.WEB_SEARCH ? 'Websearch' : 'Content'}
                  </span>
                </div>
                <p className={`text-[11px] ${textSecondary} mt-1 line-clamp-2`}>{agent.prompt}</p>
                {agent.provider !== AgentProvider.GOOGLE && (
                     <div className={`mt-1 flex items-center gap-1 text-[9px] ${isDarkMode ? 'text-neutral-600' : 'text-neutral-700'}`}>
                        <Cpu className="w-2.5 h-2.5"/> {agent.modelId}
                     </div>
                )}
              </div>
              <button 
                onClick={() => onRunAgent(agent.id)}
                className="p-2 bg-blue-600/10 text-blue-500 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgentPanel;
