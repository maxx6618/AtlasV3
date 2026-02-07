
import React, { useState, useRef, useEffect } from 'react';
import { Bot, Play, Plus, Hash, Globe, Cpu } from 'lucide-react';
import { AgentConfig, AgentType, ColumnDefinition, AgentProvider } from '../types';

interface AgentPanelProps {
  agents: AgentConfig[];
  columns: ColumnDefinition[];
  onRunAgent: (agentId: string) => void;
  onAddAgent: (agent: Partial<AgentConfig>) => void;
}

const PROVIDER_MODELS = {
  [AgentProvider.GOOGLE]: [
    { id: 'gemini-3-flash-preview', label: 'Gemini 3.0 Flash' },
    { id: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro' },
    { id: 'gemini-2.5-flash-latest', label: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-flash-lite-latest', label: 'Gemini 2.5 Flash Lite' },
  ],
  [AgentProvider.OPENAI]: [
    { id: 'o1', label: 'o1' },
    { id: 'o1-mini', label: 'o1 Mini' },
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  ],
  [AgentProvider.ANTHROPIC]: [
    { id: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },
    { id: 'claude-3-opus-latest', label: 'Claude 3 Opus' },
  ]
};

const AgentPanel: React.FC<AgentPanelProps> = ({ agents, columns, onRunAgent, onAddAgent }) => {
  const [showForm, setShowForm] = useState(false);
  const [slashMenu, setSlashMenu] = useState<{ open: boolean; target: 'prompt' | 'condition'; x: number; y: number; filter: string } | null>(null);
  
  const [targetColId, setTargetColId] = useState<string>(columns[0]?.id || '');
  const [newAgent, setNewAgent] = useState<Partial<AgentConfig>>({
    name: '',
    type: AgentType.WEB_SEARCH,
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

    const targetHeader = columns.find(c => c.id === targetColId)?.header || 'Enriched Data';

    // Extract inputs from prompt looking for /field_id
    const inputs = Array.from(new Set(
      (newAgent.prompt?.match(/\/([a-zA-Z0-9_]+)/g) || [])
        .map(s => s.substring(1))
        .filter(id => columns.some(c => c.id === id))
    ));

    onAddAgent({ ...newAgent, inputs, outputs: [], outputColumnName: targetHeader });
    setShowForm(false);
    setNewAgent({ 
        name: '', 
        type: AgentType.WEB_SEARCH, 
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
    <div className="w-80 h-full bg-[#111] border-l border-neutral-800 flex flex-col relative">
      {slashMenu && (
        <div 
          className="absolute z-[100] w-56 bg-[#1a1a1a] border border-neutral-700 rounded-lg shadow-2xl py-1 overflow-hidden"
          style={{ top: '30%', right: '10%' }}
        >
          <div className="px-3 py-1.5 text-[10px] font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-800">
            Select Field
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredColumns.map(col => (
              <button
                key={col.id}
                onMouseDown={(e) => { e.preventDefault(); insertField(col.id); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-300 hover:bg-blue-600 hover:text-white transition-colors"
              >
                <Hash className="w-3 h-3 opacity-50" />
                {col.header}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-400" />
          <h2 className="text-sm font-semibold text-white">Tab Agents</h2>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className={`p-1 rounded transition-colors ${showForm ? 'bg-blue-600 text-white' : 'hover:bg-neutral-800 text-neutral-400'}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {showForm && (
          <div className="bg-[#181818] border border-neutral-700 rounded-lg p-4 space-y-3 shadow-xl">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">New Agent</h3>
            <input 
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="Agent Name"
              value={newAgent.name}
              onChange={e => setNewAgent({...newAgent, name: e.target.value})}
            />
            
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-500 font-bold uppercase">Type</label>
              <select 
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-white outline-none"
                value={newAgent.type}
                onChange={e => setNewAgent({...newAgent, type: e.target.value as AgentType})}
              >
                <option value={AgentType.WEB_SEARCH}>Live Web Search</option>
                <option value={AgentType.TEXT}>Text Generation</option>
                <option value={AgentType.REASONING}>Deep Reasoning (o1)</option>
                <option value={AgentType.HUBSPOT}>HubSpot Sync</option>
              </select>
            </div>

            {newAgent.type !== AgentType.HUBSPOT && (
                <>
                    <div className="space-y-1">
                        <label className="text-[10px] text-neutral-500 font-bold uppercase flex items-center gap-1"><Globe className="w-3 h-3"/> Provider</label>
                        <select 
                            className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-xs text-white outline-none"
                            value={newAgent.provider}
                            onChange={e => {
                                const p = e.target.value as AgentProvider;
                                setNewAgent({...newAgent, provider: p, modelId: PROVIDER_MODELS[p][0].id });
                            }}
                            disabled={newAgent.type === AgentType.WEB_SEARCH || newAgent.type === AgentType.REASONING}
                        >
                            <option value={AgentProvider.GOOGLE}>Google Gemini</option>
                            <option value={AgentProvider.OPENAI}>OpenAI</option>
                            <option value={AgentProvider.ANTHROPIC}>Anthropic</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-neutral-500 font-bold uppercase flex items-center gap-1"><Cpu className="w-3 h-3"/> Model</label>
                        <select 
                            className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-xs text-white outline-none"
                            value={newAgent.modelId}
                            onChange={e => setNewAgent({...newAgent, modelId: e.target.value})}
                            disabled={newAgent.type === AgentType.WEB_SEARCH || newAgent.type === AgentType.REASONING}
                        >
                            {PROVIDER_MODELS[newAgent.provider || AgentProvider.GOOGLE].map(m => (
                                <option key={m.id} value={m.id}>{m.label}</option>
                            ))}
                        </select>
                    </div>
                </>
            )}
            
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-500 font-bold uppercase">Prompt</label>
              <textarea 
                ref={promptRef}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-white min-h-[80px] focus:outline-none focus:border-blue-500 font-mono"
                placeholder="Type / to reference fields..."
                value={newAgent.prompt}
                onChange={e => handleTextChange(e, 'prompt')}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-neutral-500 font-bold uppercase">Condition</label>
              <textarea 
                ref={conditionRef}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-xs text-neutral-400 min-h-[40px] focus:outline-none focus:border-blue-500 font-mono"
                placeholder="Skip logic (e.g. /email != '')"
                value={newAgent.condition}
                onChange={e => handleTextChange(e, 'condition')}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-neutral-500 font-bold uppercase">Target Output Field</label>
              <select 
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-white outline-none"
                value={targetColId}
                onChange={e => setTargetColId(e.target.value)}
              >
                {columns.map(c => <option key={c.id} value={c.id}>{c.header}</option>)}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={handleAdd} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded">Create</button>
              <button onClick={() => setShowForm(false)} className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold py-2 rounded">Cancel</button>
            </div>
          </div>
        )}

        {agents.map((agent) => (
          <div key={agent.id} className="bg-[#181818] border border-neutral-800 rounded-lg p-4 group">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-tight">{agent.name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    agent.type === AgentType.WEB_SEARCH ? 'bg-blue-900/30 text-blue-400' : 
                    agent.type === AgentType.REASONING ? 'bg-purple-900/30 text-purple-400' :
                    'bg-neutral-800 text-neutral-400'
                  }`}>
                    {agent.type}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">{agent.prompt}</p>
                {agent.provider !== AgentProvider.GOOGLE && (
                     <div className="mt-1 flex items-center gap-1 text-[9px] text-neutral-600">
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
