
import { useState, useEffect } from 'react';
import { Bot, X, ToggleLeft, ToggleRight, Plus, CheckCircle2, Cpu, Globe, Sparkles, Wand2, Settings2, Box, Search, BrainCircuit, AlertTriangle, Play, ArrowLeft, Zap } from 'lucide-react';
import { AgentConfig, AgentType, AgentProvider, ColumnDefinition } from '../types';
import { runAgentTask, runJSONTask } from '../services/geminiService';

interface AgentModalProps {
  agents: AgentConfig[];
  columns: ColumnDefinition[];
  onRunAgent: (agentId: string) => void;
  onAddAgent: (agent: Partial<AgentConfig>) => void;
  onClose: () => void;
  selectedRowsCount: number;
  initialTargetColId?: string;
  apiKeys: { google: string };
}

const PROVIDER_MODELS = {
  [AgentProvider.GOOGLE]: [
    { id: 'gemini-3-flash-preview', label: 'Gemini 3.0 Flash (Fastest)' },
    { id: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro (High Intelligence)' },
    { id: 'gemini-2.5-flash-latest', label: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-flash-lite-latest', label: 'Gemini 2.5 Flash Lite' },
  ],
  [AgentProvider.OPENAI]: [
    { id: 'o1', label: 'o1 (Deep Reasoning)' },
    { id: 'o1-mini', label: 'o1 Mini (Fast Reasoning)' },
    { id: 'gpt-4o', label: 'GPT-4o (Omni - Best Overall)' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cheap)' },
  ],
  [AgentProvider.ANTHROPIC]: [
    { id: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet (Latest)' },
    { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku (Fast)' },
    { id: 'claude-3-opus-latest', label: 'Claude 3 Opus (Legacy High-Int)' },
  ]
};

const AgentModal = ({ agents, columns, onRunAgent, onAddAgent, onClose, selectedRowsCount, initialTargetColId, apiKeys }: AgentModalProps) => {
  const [view, setView] = useState<'list' | 'create'>(agents.length > 0 ? 'list' : 'create');
  const [name, setName] = useState('');
  const [type, setType] = useState<AgentType>(AgentType.WEB_SEARCH);

  const [provider, setProvider] = useState<AgentProvider>(AgentProvider.GOOGLE);
  const [modelId, setModelId] = useState<string>(PROVIDER_MODELS[AgentProvider.GOOGLE][0].id);

  const [prompt, setPrompt] = useState('');
  const [inputs, setInputs] = useState<Set<string>>(new Set());

  // Output Container Name (The column where JSON is stored)
  const [outputColumnName, setOutputColumnName] = useState(() => {
    if (initialTargetColId) {
      const col = columns.find(c => c.id === initialTargetColId);
      return col?.header || '';
    }
    return '';
  });
  // Schema (The keys we expect in the JSON)
  const [outputs, setOutputs] = useState<string[]>([]);
  const [newOutputName, setNewOutputName] = useState('');

  const [hasCondition, setHasCondition] = useState(false);
  const [conditionPrompt, setConditionPrompt] = useState('');
  const [condition, setCondition] = useState('');

  const [isRefining, setIsRefining] = useState(false);
  const [isGeneratingLogic, setIsGeneratingLogic] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (type === AgentType.WEB_SEARCH) {
        setProvider(AgentProvider.GOOGLE);
        setModelId('gemini-3-pro-preview'); // Best for search
    } else if (type === AgentType.REASONING) {
        setProvider(AgentProvider.OPENAI);
        setModelId('o1'); // Default reasoning model
    }
  }, [type]);

  const toggleInput = (colId: string) => {
    setInputs(prev => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      return next;
    });
  };

  const addOutput = (val: string) => {
    if (!val.trim()) return;
    if (outputs.includes(val.trim())) return;
    setOutputs([...outputs, val.trim()]);
    setNewOutputName('');
  };

  const handleAutoConstruct = async () => {
    if (!prompt.trim()) {
        setErrorMsg("Please enter an instruction prompt first.");
        return;
    }
    if (!apiKeys.google) {
        setErrorMsg("Google API Key is missing. Please check Settings.");
        return;
    }

    setIsRefining(true);
    setErrorMsg(null);
    try {
        const selectedInputs = columns.filter(c => inputs.has(c.id)).map(c => `/${c.id} (${c.header})`).join(', ');
        
        // Use runJSONTask to ensure JSON output and use a reliable model
        const response = await runJSONTask(
            'gemini-2.5-flash-latest', 
            `User Request: "${prompt}"
            Context Fields: ${selectedInputs || "None"}
            Task: Refine prompt, suggest name, suggest container name, extract desired field keys.
            Output JSON schema: { "name": string, "refinedPrompt": string, "outputColumnName": string, "suggestedKeys": string[] }`,
            "You are an Expert Prompt Engineer. You MUST return a valid JSON object.",
            apiKeys.google
        );

        const cleanJson = response?.replace(/```json|```/g, '').trim();
        const result = JSON.parse(cleanJson || '{}');

        if (result.refinedPrompt) setPrompt(result.refinedPrompt);
        if (result.name && !name) setName(result.name);
        if (result.outputColumnName && !outputColumnName) setOutputColumnName(result.outputColumnName);
        if (result.suggestedKeys && Array.isArray(result.suggestedKeys)) {
            const newOutputs = new Set([...outputs, ...result.suggestedKeys]);
            setOutputs(Array.from(newOutputs));
        }

    } catch (e: any) {
        console.error("Auto construct failed", e);
        setErrorMsg(e.message || "Failed to generate config.");
    } finally {
        setIsRefining(false);
    }
  };

  const handleGenerateLogic = async () => {
    if (!conditionPrompt.trim()) return;
    if (!apiKeys.google) {
        setErrorMsg("Google API Key is missing.");
        return;
    }
    setIsGeneratingLogic(true);
    setErrorMsg(null);
    try {
        const response = await runAgentTask(
            'gemini-3-flash-preview',
            `Logic Request: "${conditionPrompt}"
            Available Fields: ${columns.map(c => `/${c.id}`).join(', ')}
            Output JS expression string only.`,
            "Logic Engine. Return pure string.",
            apiKeys.google
        );
        setCondition(response.trim());
    } catch (e: any) {
        console.error("Logic generation failed", e);
        setErrorMsg("Failed to generate logic.");
    } finally {
        setIsGeneratingLogic(false);
    }
  };

  const handleDeploy = () => {
    if (!name || !prompt || !outputColumnName) {
        setErrorMsg("Please fill in Name, Prompt, and Output Container.");
        return;
    }
    
    onAddAgent({
      name,
      type,
      provider,
      modelId,
      prompt,
      inputs: Array.from(inputs),
      outputs, // Stores the schema keys
      outputColumnName,
      condition: hasCondition ? condition : undefined
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl bg-[#090909] border border-neutral-800 rounded-[2rem] shadow-2xl flex flex-col h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-neutral-800 flex items-center justify-between bg-[#090909] shrink-0">
          <div className="flex items-center gap-4">
            {view === 'create' && agents.length > 0 && (
              <button onClick={() => setView('list')} className="p-2.5 hover:bg-neutral-800 rounded-xl text-neutral-500 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="p-3 bg-neutral-900 rounded-2xl border border-neutral-800 shadow-inner">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest italic">Atlas Intelligence</h2>
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">
                {view === 'list' ? 'Deployed Agents' : 'New Agent Construct'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {view === 'list' && (
              <button
                onClick={() => setView('create')}
                className="flex items-center gap-2 bg-white hover:bg-neutral-200 text-black px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                New Agent
              </button>
            )}
            <button onClick={onClose} className="p-2.5 hover:bg-neutral-800 rounded-xl text-neutral-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden bg-[#090909]">

          {/* Agent List View */}
          {view === 'list' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              <div className="max-w-3xl mx-auto space-y-4">
                {agents.length === 0 ? (
                  <div className="text-center py-20">
                    <Bot className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                    <p className="text-sm text-neutral-500 font-bold">No agents deployed yet.</p>
                    <button onClick={() => setView('create')} className="mt-4 text-xs text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider">
                      Create your first agent
                    </button>
                  </div>
                ) : (
                  agents.map(agent => {
                    const inputCols = columns.filter(c => agent.inputs.includes(c.id));
                    const targetCol = columns.find(c => c.header === agent.outputColumnName);
                    return (
                      <div key={agent.id} className="bg-[#0c0c0c] border border-neutral-800 rounded-2xl p-6 hover:border-neutral-700 transition-all group">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-black text-white uppercase tracking-tight">{agent.name}</span>
                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                agent.type === AgentType.WEB_SEARCH ? 'bg-blue-900/30 text-blue-400 border border-blue-500/20' :
                                agent.type === AgentType.REASONING ? 'bg-purple-900/30 text-purple-400 border border-purple-500/20' :
                                'bg-neutral-800 text-neutral-400 border border-neutral-700'
                              }`}>
                                {agent.type === AgentType.WEB_SEARCH ? 'Web Search' : agent.type === AgentType.REASONING ? 'Reasoning' : 'Text'}
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-500 line-clamp-2 mb-3">{agent.prompt}</p>
                            <div className="flex items-center gap-4 text-[10px] text-neutral-600">
                              <span className="flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                {agent.provider === AgentProvider.GOOGLE ? 'Gemini' : agent.provider === AgentProvider.OPENAI ? 'OpenAI' : 'Claude'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Cpu className="w-3 h-3" />
                                {agent.modelId}
                              </span>
                              {targetCol && (
                                <span className="flex items-center gap-1">
                                  <Zap className="w-3 h-3" />
                                  → {targetCol.header}
                                </span>
                              )}
                            </div>
                            {inputCols.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                <span className="text-[9px] text-neutral-600 font-bold uppercase">Inputs:</span>
                                {inputCols.map(c => (
                                  <span key={c.id} className="text-[9px] bg-neutral-900 border border-neutral-800 text-neutral-400 px-2 py-0.5 rounded-md font-bold">{c.header}</span>
                                ))}
                              </div>
                            )}
                            {agent.outputs.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                <span className="text-[9px] text-neutral-600 font-bold uppercase">Schema:</span>
                                {agent.outputs.map((key, i) => (
                                  <span key={i} className="text-[9px] bg-neutral-900 border border-neutral-800 text-neutral-400 px-2 py-0.5 rounded-md font-mono">{key}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => onRunAgent(agent.id)}
                            className="ml-4 shrink-0 flex items-center gap-2 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white px-5 py-3 rounded-xl transition-all text-[10px] font-black uppercase tracking-wider border border-blue-500/20 hover:border-blue-600"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            Run{selectedRowsCount > 0 ? ` (${selectedRowsCount})` : ''}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Create View */}
          {view === 'create' && <>

          {/* Left Sidebar: Inputs */}
          <div className="w-72 border-r border-neutral-800 bg-[#0c0c0c] flex flex-col shrink-0">
            <div className="p-6 border-b border-neutral-800/50">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <h3 className="text-[10px] text-neutral-400 font-black uppercase tracking-[0.2em]">1. Input Context</h3>
                </div>
                <p className="text-[10px] text-neutral-600 font-medium">Select columns the agent can read.</p>
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
                        ? 'bg-blue-900/10 border-blue-500/30 text-white shadow-[0_0_15px_rgba(37,99,235,0.1)]' 
                        : 'bg-transparent border-transparent text-neutral-500 hover:bg-neutral-900 hover:text-neutral-300'
                    }`}
                  >
                    <span className="text-[11px] font-bold truncate pr-4">{col.header}</span>
                    {isActive ? (
                        <ToggleRight className="w-5 h-5 text-blue-500 shrink-0" />
                    ) : (
                        <ToggleLeft className="w-5 h-5 text-neutral-700 group-hover:text-neutral-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Config */}
          <div className="flex-1 flex flex-col min-h-0 bg-[#090909]">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                <div className="max-w-3xl mx-auto space-y-8">
                    
                    {errorMsg && (
                         <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            <span className="text-xs font-bold text-red-400">{errorMsg}</span>
                         </div>
                    )}

                    {/* Top: Name & Type */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2 space-y-2">
                            <label className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                <Settings2 className="w-3 h-3" /> Agent Name
                            </label>
                            <input 
                                className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold placeholder-neutral-700"
                                placeholder="e.g. Lead Researcher"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>

                        {/* Capabilities */}
                         <div className="space-y-2">
                            <label className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                <Sparkles className="w-3 h-3" /> Capability
                            </label>
                            <div className="relative">
                                <select 
                                    className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl px-10 py-3 text-xs text-white outline-none focus:border-blue-500/50 font-bold appearance-none"
                                    value={type}
                                    onChange={e => setType(e.target.value as AgentType)}
                                >
                                    <option value={AgentType.WEB_SEARCH}>Live Web Search (Google)</option>
                                    <option value={AgentType.TEXT}>Text Generation</option>
                                    <option value={AgentType.REASONING}>Deep Reasoning (o1/Pro)</option>
                                </select>
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    {type === AgentType.WEB_SEARCH ? <Search className="w-3.5 h-3.5 text-blue-400" /> : 
                                     type === AgentType.REASONING ? <BrainCircuit className="w-3.5 h-3.5 text-purple-400" /> :
                                     <Bot className="w-3.5 h-3.5 text-neutral-400" />}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Model Selection Row */}
                    <div className="grid grid-cols-2 gap-6 p-5 bg-neutral-900/20 border border-neutral-800 rounded-2xl">
                         <div className="space-y-2">
                            <label className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                <Globe className="w-3 h-3" /> Provider
                            </label>
                            <select 
                                className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-blue-500/50 font-bold"
                                value={provider}
                                onChange={e => {
                                    const newProv = e.target.value as AgentProvider;
                                    setProvider(newProv);
                                    setModelId(PROVIDER_MODELS[newProv][0].id);
                                }}
                                disabled={type === AgentType.WEB_SEARCH}
                            >
                                <option value={AgentProvider.GOOGLE}>Google Gemini</option>
                                <option value={AgentProvider.OPENAI}>OpenAI</option>
                                <option value={AgentProvider.ANTHROPIC}>Anthropic Claude</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                <Cpu className="w-3 h-3" /> Model
                            </label>
                            <select 
                                className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-blue-500/50 font-bold"
                                value={modelId}
                                onChange={e => setModelId(e.target.value)}
                                disabled={type === AgentType.WEB_SEARCH}
                            >
                                {PROVIDER_MODELS[provider].map(m => (
                                    <option key={m.id} value={m.id}>{m.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Prompt Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                2. Instruction Prompt
                            </label>
                            <button 
                                onClick={handleAutoConstruct}
                                disabled={isRefining}
                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 border border-blue-600/20"
                            >
                                {isRefining ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                Auto-Generate Config
                            </button>
                        </div>
                        <textarea 
                            className="w-full bg-neutral-900/30 border border-neutral-800 rounded-2xl p-5 text-sm text-neutral-200 placeholder-neutral-700 focus:outline-none focus:border-blue-500/50 transition-all font-mono resize-none leading-relaxed h-32"
                            placeholder="Describe what the agent should do. E.g., 'Find the CEO name and verify the website'..."
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                        />
                    </div>

                    {/* Logic Section */}
                    <div className="space-y-4">
                         <div className="flex items-center gap-4">
                            <label className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                3. Logic Gate
                            </label>
                            <button 
                                onClick={() => setHasCondition(!hasCondition)}
                                className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${hasCondition ? 'bg-amber-600' : 'bg-neutral-800'}`}
                            >
                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${hasCondition ? 'translate-x-4' : 'translate-x-1'}`} />
                            </button>
                         </div>

                         {hasCondition && (
                            <div className="bg-neutral-900/30 border border-neutral-800 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="flex gap-2">
                                    <input 
                                        className="flex-1 bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:border-amber-500/50 outline-none"
                                        placeholder="Describe logic (e.g. Only run if Website is empty)..."
                                        value={conditionPrompt}
                                        onChange={e => setConditionPrompt(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleGenerateLogic()}
                                    />
                                    <button 
                                        onClick={handleGenerateLogic}
                                        disabled={isGeneratingLogic}
                                        className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-4 rounded-xl transition-all disabled:opacity-50"
                                    >
                                        {isGeneratingLogic ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                    </button>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-mono text-amber-500 uppercase">Code:</span>
                                    <div className="flex-1 bg-black/50 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-amber-500/90 truncate">
                                        {condition || <span className="text-neutral-700 italic">No condition generated</span>}
                                    </div>
                                </div>
                            </div>
                         )}
                    </div>

                    {/* Output Container Section */}
                    <div className="space-y-3">
                        <label className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                            4. Output Container & Schema
                        </label>

                        <div className="flex gap-4 mb-3">
                            <div className="flex-1 space-y-1">
                                <span className="text-[10px] font-bold text-neutral-400">Container Name</span>
                                <input 
                                    className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-700 font-bold focus:border-blue-500/50 outline-none"
                                    placeholder="e.g. Research Data"
                                    value={outputColumnName}
                                    onChange={e => setOutputColumnName(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 min-h-[40px] items-center bg-neutral-900/30 p-3 rounded-xl border border-neutral-800/50">
                            {outputs.map((out, i) => (
                                <div key={i} className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3 py-2 rounded-lg text-[11px] text-white font-bold animate-in zoom-in duration-200">
                                    {out}
                                    <button onClick={() => setOutputs(outputs.filter((_, idx) => idx !== i))} className="text-neutral-600 hover:text-red-500 transition-colors">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}

                            <div className="flex items-center gap-2 bg-neutral-900/50 border border-neutral-800 px-2 py-1.5 rounded-lg focus-within:border-blue-500/50 focus-within:bg-black transition-colors">
                                <Plus className="w-3 h-3 text-neutral-500" />
                                <input 
                                    className="bg-transparent border-none outline-none text-[11px] text-white w-24 placeholder-neutral-600"
                                    placeholder="Add field key..."
                                    value={newOutputName}
                                    onChange={e => setNewOutputName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addOutput(newOutputName)}
                                />
                            </div>
                        </div>
                         <p className="text-[10px] text-neutral-600 italic mt-1">
                            These keys guide the AI's output. Data will be stored in the "{outputColumnName}" column as JSON.
                        </p>
                    </div>

                </div>
            </div>

            {/* Footer Action */}
            <div className="p-6 border-t border-neutral-800 bg-[#0c0c0c] flex justify-end gap-4">
                 <button
                    onClick={onClose}
                    className="px-8 py-4 rounded-xl text-[11px] font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-colors"
                 >
                    Cancel
                 </button>
                 <button
                    onClick={handleDeploy}
                    className="bg-white hover:bg-neutral-200 text-black px-10 py-4 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.15)] flex items-center gap-3"
                >
                    <CheckCircle2 className="w-4 h-4" />
                    Deploy Agent
                </button>
            </div>
          </div>

          </>}
        </div>
      </div>
    </div>
  );
};

export default AgentModal;
