
import { useState, useEffect } from 'react';
import { Bot, X, ToggleLeft, ToggleRight, Plus, CheckCircle2, Cpu, Globe, Sparkles, Wand2, Settings2, Box, Search, PenTool, AlertTriangle } from 'lucide-react';
import { AgentConfig, AgentType, AgentProvider, ColumnDefinition } from '../types';
import { runAgentTask, runJSONTask } from '../services/geminiService';
import { runOpenAIAgent } from '../services/openaiService';
import { runAnthropicAgent } from '../services/anthropicService';

interface AgentModalProps {
  agents: AgentConfig[];
  columns: ColumnDefinition[];
  onRunAgent: (agentId: string, rowIds?: string[]) => void;
  onAddAgent: (agent: Partial<AgentConfig>) => void;
  onUpdateAgent?: (agentId: string, updates: Partial<AgentConfig>) => void;
  onClose: () => void;
  selectedRowsCount: number;
  initialTargetColId?: string;
  existingAgent?: AgentConfig;
  totalRowsCount?: number;
  matchProvider?: AgentProvider;
  matchModelId?: string;
  isDarkMode: boolean;
}

const PROVIDER_MODELS = {
  [AgentProvider.GOOGLE]: [
    { id: 'gemini-3-flash-preview', label: 'Gemini 3.0 Flash (Fastest)' },
    { id: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro (Most Intelligent)' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Stable)' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Advanced Reasoning)' },
    { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (Ultra Fast)' },
  ],
  [AgentProvider.OPENAI]: [
    { id: 'o3', label: 'o3 (Most Powerful Reasoning)' },
    { id: 'o4-mini', label: 'o4-mini (Fast Reasoning)' },
    { id: 'gpt-4o', label: 'GPT-4o (Omni)' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cheap)' },
  ],
  [AgentProvider.ANTHROPIC]: [
    { id: 'claude-opus-4-6', label: 'Claude Opus 4.6 (Most Intelligent)' },
    { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (Fast & Smart)' },
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (Fastest)' },
  ]
};

const AgentModal = ({ agents, columns, onRunAgent, onAddAgent, onUpdateAgent, onClose, selectedRowsCount, initialTargetColId, existingAgent, totalRowsCount = 0, matchProvider = AgentProvider.GOOGLE, matchModelId = 'gemini-2.0-flash-lite', isDarkMode }: AgentModalProps) => {
  const isEditMode = !!existingAgent;
  
  const [name, setName] = useState(existingAgent?.name || '');
  const [type, setType] = useState<AgentType>(existingAgent?.type || AgentType.GOOGLE_SEARCH);
  
  const [provider, setProvider] = useState<AgentProvider>(existingAgent?.provider || AgentProvider.GOOGLE);
  const [modelId, setModelId] = useState<string>(existingAgent?.modelId || PROVIDER_MODELS[AgentProvider.GOOGLE][0].id);

  const [prompt, setPrompt] = useState(existingAgent?.prompt || '');
  const [inputs, setInputs] = useState<Set<string>>(new Set(existingAgent?.inputs || []));
  
  // Output Container Name (The column where JSON is stored)
  const [outputColumnName, setOutputColumnName] = useState(existingAgent?.outputColumnName || '');
  // Schema (The keys we expect in the JSON)
  const [outputs, setOutputs] = useState<string[]>(existingAgent?.outputs || []);
  const [newOutputName, setNewOutputName] = useState('');
  
  const [hasCondition, setHasCondition] = useState(!!existingAgent?.condition);
  const [conditionPrompt, setConditionPrompt] = useState('');
  const [condition, setCondition] = useState(existingAgent?.condition || '');

  const [rowsToDeploy, setRowsToDeploy] = useState<number>(existingAgent?.rowsToDeploy || 10);
  const [showDeployPrompt, setShowDeployPrompt] = useState(false);
  const [deployInputValue, setDeployInputValue] = useState('10');
  const [generatedNamePreview, setGeneratedNamePreview] = useState<string>('');

  const [isRefining, setIsRefining] = useState(false);
  const [isGeneratingLogic, setIsGeneratingLogic] = useState(false);
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (type === AgentType.GOOGLE_SEARCH) {
        setProvider(AgentProvider.GOOGLE);
        setModelId('gemini-3-pro-preview'); // Best for search grounding
    }
    // WEB_SEARCH and CONTENT_CREATION allow any provider
  }, [type]);

  // Auto-generate name preview when prompt changes
  useEffect(() => {
    if (!name.trim() && prompt.trim() && !isGeneratingName) {
      let cancelled = false;
      const timeoutId = setTimeout(async () => {
        setIsGeneratingName(true);
        try {
          const generated = await generateAgentName(prompt);
          if (!cancelled) {
            setGeneratedNamePreview(generated);
          }
        } catch (e) {
          // Fallback handled in generateAgentName
          if (!cancelled) {
            setGeneratedNamePreview('AI Agent');
          }
        } finally {
          if (!cancelled) {
            setIsGeneratingName(false);
          }
        }
      }, 500); // Debounce for 500ms
      
      return () => {
        cancelled = true;
        clearTimeout(timeoutId);
      };
    } else if (!prompt.trim()) {
      setGeneratedNamePreview('');
    }
  }, [prompt, name, isGeneratingName]);

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

  const generateAgentName = async (promptText: string): Promise<string> => {
    if (!promptText.trim()) return 'Untitled Agent';
    
    {
      const namePrompt = [
        `Based on the following agent instruction, generate a concise, professional name (2-3 words preferred, max 4 words).`,
        `The name should describe the OUTPUT DATA FIELD or RESULT, not the action.`,
        `Use noun phrases that describe what data is being extracted or generated.`,
        ``,
        `Good examples (descriptive of the data/field):`,
        `- "Industry Classification" (for classifying industries)`,
        `- "Official Domain" (for finding company domains)`,
        `- "LinkedIn Company Page" (for finding LinkedIn pages)`,
        `- "Email Address" (for finding emails)`,
        `- "CEO Name" (for finding CEO names)`,
        `- "Company Revenue" (for extracting revenue data)`,
        `- "Phone Number" (for finding phone numbers)`,
        `- "Company Size" (for determining company size)`,
        ``,
        `Bad examples (too generic or action-focused): "Data Extractor", "Information Finder", "Content Generator", "Domain Finder"`,
        ``,
        `Agent Instruction: "${promptText}"`,
        ``,
        `Return only the name, nothing else. No quotes, no explanation, no "Name:" prefix.`
      ].join('\n');

      const systemInstruction = 'You are a naming assistant. Generate concise, specific names that describe the DATA FIELD or OUTPUT being extracted/generated. Use noun phrases, not action verbs. Return only the name (2-4 words), nothing else.';

      try {
        const providerOrder = [
          { provider: AgentProvider.GOOGLE, modelId: matchModelId || 'gemini-2.0-flash-lite' },
          { provider: AgentProvider.ANTHROPIC, modelId: 'claude-haiku-4-5' },
          { provider: AgentProvider.OPENAI, modelId: 'gpt-4o-mini' },
        ];

        let generatedName = '';
        for (const candidate of providerOrder) {
          try {
            switch (candidate.provider) {
              case AgentProvider.OPENAI:
                generatedName = await runOpenAIAgent(candidate.modelId, namePrompt, undefined, systemInstruction);
                break;
              case AgentProvider.ANTHROPIC:
                generatedName = await runAnthropicAgent(candidate.modelId, namePrompt, undefined, systemInstruction);
                break;
              default:
                generatedName = await runAgentTask(candidate.modelId, namePrompt, systemInstruction);
                break;
            }

            const trimmed = generatedName.trim();
            if (trimmed) {
              try {
                const maybeJson = JSON.parse(trimmed.replace(/```json|```/g, '').trim());
                if (maybeJson?.error) {
                  throw new Error(maybeJson.error);
                }
              } catch {
                // ignore parse errors - likely a normal name response
              }
              break;
            }
          } catch {
            generatedName = '';
          }
        }
        
        // Clean up the response - remove quotes, extra whitespace, explanations, etc.
        let cleaned = generatedName.trim()
          .replace(/^["']|["']$/g, '') // Remove surrounding quotes
          .replace(/^name:\s*/i, '') // Remove "Name:" prefix if present
          .replace(/^the\s+/i, '') // Remove "The" prefix
          .replace(/\.$/, '') // Remove trailing period
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        
        // Remove any explanation text after the name (common in some models)
        const lines = cleaned.split('\n');
        if (lines.length > 0) {
          cleaned = lines[0].trim();
        }
        
        // Remove common prefixes/suffixes that models sometimes add
        cleaned = cleaned
          .replace(/^(agent|name|title):\s*/i, '')
          .replace(/\s*\(.*?\)$/, '') // Remove parenthetical explanations
          .trim();
        
        // Capitalize first letter of each word (Title Case)
        cleaned = cleaned.split(' ').map(word => {
          if (word.length === 0) return '';
          // Handle acronyms (all caps words)
          if (word === word.toUpperCase() && word.length <= 4) {
            return word;
          }
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
        
        if (cleaned && cleaned.length > 0 && cleaned.length < 50) {
          return cleaned;
        }
      } catch (e) {
        console.error('Failed to generate agent name with AI:', e);
      }
    }
    
    // Fallback to pattern-based naming if AI fails
    const lowerPrompt = promptText.toLowerCase();
    
    if (lowerPrompt.includes('find') || lowerPrompt.includes('search')) {
      if (lowerPrompt.includes('domain') || lowerPrompt.includes('website')) {
        return 'Domain Finder';
      }
      if (lowerPrompt.includes('email')) {
        return 'Email Finder';
      }
      if (lowerPrompt.includes('linkedin')) {
        return 'LinkedIn Researcher';
      }
      return 'Data Researcher';
    }
    
    if (lowerPrompt.includes('extract') || lowerPrompt.includes('get')) {
      if (lowerPrompt.includes('contact') || lowerPrompt.includes('person')) {
        return 'Contact Extractor';
      }
      return 'Data Extractor';
    }
    
    if (lowerPrompt.includes('verify') || lowerPrompt.includes('validate')) {
      return 'Data Verifier';
    }
    
    if (lowerPrompt.includes('enrich') || lowerPrompt.includes('enhance')) {
      return 'Data Enricher';
    }
    
    if (lowerPrompt.includes('generate') || lowerPrompt.includes('create')) {
      if (lowerPrompt.includes('content')) {
        return 'Content Generator';
      }
      return 'Content Creator';
    }
    
    if (lowerPrompt.includes('analyze') || lowerPrompt.includes('analysis')) {
      return 'Data Analyzer';
    }
    
    // Extract first few meaningful words as fallback
    const words = promptText.trim().split(/\s+/).slice(0, 3);
    const meaningfulWords = words.filter(w => w.length > 3 && !['the', 'and', 'for', 'with', 'from'].includes(w.toLowerCase()));
    
    if (meaningfulWords.length > 0) {
      return meaningfulWords.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') + ' Agent';
    }
    
    return 'AI Agent';
  };

  const handleAutoConstruct = async () => {
    if (!prompt.trim()) {
        setErrorMsg("Please enter an instruction prompt first.");
        return;
    }
    setIsRefining(true);
    setErrorMsg(null);
    try {
        const selectedInputs = columns.filter(c => inputs.has(c.id)).map(c => `/${c.id} (${c.header})`).join(', ');
        
        const taskPrompt = [
            `User Request: "${prompt}"`,
            `Available Context Fields: ${selectedInputs || "None selected"}`,
            `Task: Based on the user request, do the following:`,
            `1. Refine the user's prompt into a clear, detailed instruction for an AI agent.`,
            `2. Suggest a short agent name.`,
            `3. Suggest an output container/column name where results will be stored.`,
            `4. Extract the desired output field keys (the JSON keys the agent should return).`,
            ``,
            `Return a JSON object with exactly these keys:`,
            `{ "name": string, "refinedPrompt": string, "outputColumnName": string, "suggestedKeys": string[] }`
        ].join('\n');

        const response = await runJSONTask(
            'gemini-2.5-flash', 
            taskPrompt,
            "You are an Expert Prompt Engineer. Return a valid JSON object matching the requested schema. Do not include any explanation outside the JSON."
        );

        let result: any;
        try {
            const cleanJson = response.replace(/```json|```/g, '').trim();
            result = JSON.parse(cleanJson);
        } catch (parseError) {
            console.error("JSON parse failed, raw response:", response);
            throw new Error("Failed to parse AI response. The model returned invalid JSON.");
        }

        if (result.refinedPrompt) {
          setPrompt(result.refinedPrompt);
          // Auto-generate name from refined prompt if name field is empty
          if (!name.trim()) {
            if (result.name) {
              setName(result.name);
            } else {
              // Generate name using AI
              setIsGeneratingName(true);
              try {
                const generated = await generateAgentName(result.refinedPrompt);
                setName(generated);
              } catch (e) {
                setName('AI Agent');
              } finally {
                setIsGeneratingName(false);
              }
            }
          }
        }
        if (result.name && !name.trim()) setName(result.name);
        if (result.outputColumnName && !outputColumnName) setOutputColumnName(result.outputColumnName);
        if (result.suggestedKeys && Array.isArray(result.suggestedKeys)) {
            const newOutputs = new Set([...outputs, ...result.suggestedKeys]);
            setOutputs(Array.from(newOutputs));
        }

    } catch (e: any) {
        console.error("Auto construct failed:", e);
        setErrorMsg(e.message || "Failed to generate config. Check your API key and try again.");
    } finally {
        setIsRefining(false);
    }
  };

  const handleGenerateLogic = async () => {
    if (!conditionPrompt.trim()) return;
    setIsGeneratingLogic(true);
    setErrorMsg(null);
    try {
        const response = await runAgentTask(
            'gemini-3-flash-preview',
            `Logic Request: "${conditionPrompt}"
            Available Fields: ${columns.map(c => `/${c.id}`).join(', ')}
            Output JS expression string only.`,
            "Logic Engine. Return pure string."
        );
        setCondition(response.trim());
    } catch (e: any) {
        console.error("Logic generation failed", e);
        setErrorMsg("Failed to generate logic.");
    } finally {
        setIsGeneratingLogic(false);
    }
  };

  const handleDeploy = async () => {
    if (!prompt || !outputColumnName) {
        setErrorMsg("Please fill in Prompt and Output Container.");
        return;
    }
    
    // Auto-generate name if not provided
    let finalName = name.trim();
    if (!finalName) {
      setIsGeneratingName(true);
      try {
        finalName = await generateAgentName(prompt);
      } catch (e) {
        finalName = 'AI Agent';
      } finally {
        setIsGeneratingName(false);
      }
    }
    
    if (isEditMode && existingAgent && onUpdateAgent) {
      // Update existing agent
      onUpdateAgent(existingAgent.id, {
        name: finalName,
        type,
        provider,
        modelId,
        prompt,
        inputs: Array.from(inputs),
        outputs,
        outputColumnName,
        condition: hasCondition ? condition : undefined,
        rowsToDeploy
      });
      onClose();
    } else {
      // Show deployment prompt for new agent
      setShowDeployPrompt(true);
    }
  };

  const handleConfirmDeploy = async () => {
    const deployCount = deployInputValue === 'all' ? totalRowsCount : parseInt(deployInputValue) || 10;
    const finalRowsToDeploy = Math.max(1, Math.min(deployCount, totalRowsCount || deployCount));
    
    // Auto-generate name if not provided
    let finalName = name.trim();
    if (!finalName) {
      setIsGeneratingName(true);
      try {
        finalName = await generateAgentName(prompt);
      } catch (e) {
        finalName = 'AI Agent';
      } finally {
        setIsGeneratingName(false);
      }
    }
    
    const agentData: Partial<AgentConfig> = {
      name: finalName,
      type,
      provider,
      modelId,
      prompt,
      inputs: Array.from(inputs),
      outputs,
      outputColumnName,
      condition: hasCondition ? condition : undefined,
      rowsToDeploy: finalRowsToDeploy
    };

    onAddAgent(agentData);
    setShowDeployPrompt(false);
    onClose();
  };

  const bgMain = isDarkMode ? 'bg-[#0b1120]' : 'bg-white';
  const bgSecondary = isDarkMode ? 'bg-[#0f172a]' : 'bg-neutral-50';
  const bgTertiary = isDarkMode ? 'bg-[#131d2e]' : 'bg-white';
  const borderMain = isDarkMode ? 'border-[#1e2d3d]' : 'border-neutral-200';
  const borderSecondary = isDarkMode ? 'border-[#263a4f]' : 'border-neutral-300';
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-neutral-500' : 'text-neutral-600';
  const textTertiary = isDarkMode ? 'text-neutral-400' : 'text-neutral-500';
  const textQuaternary = isDarkMode ? 'text-neutral-600' : 'text-neutral-700';
  const hoverBg = isDarkMode ? 'hover:bg-[#1e2d3d]' : 'hover:bg-neutral-100';
  const hoverBgSecondary = isDarkMode ? 'hover:bg-[#0f172a]' : 'hover:bg-neutral-50';

  return (
    <div className="fixed inset-0 z-[200]" onClick={onClose}>
      <div className={`absolute top-0 right-0 h-screen w-[700px] ${bgMain} border-l ${borderMain} shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300`} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className={`px-8 py-6 border-b ${borderMain} flex items-center justify-between ${bgMain} shrink-0`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 ${bgSecondary} rounded-2xl border ${borderMain} shadow-inner`}>
              <Bot className={`w-6 h-6 ${textPrimary}`} />
            </div>
            <div>
              <h2 className={`text-sm font-black ${textPrimary} uppercase tracking-widest italic`}>Atlas Intelligence</h2>
              <p className={`text-[10px] ${textSecondary} font-bold uppercase tracking-widest mt-1`}>{isEditMode ? 'Edit Agent' : 'New Agent Construct'}</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2.5 ${hoverBg} rounded-xl ${textSecondary} ${isDarkMode ? 'hover:text-white' : 'hover:text-gray-900'} transition-colors`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`flex flex-1 overflow-hidden ${bgMain}`}>
          
          {/* Left Sidebar: Inputs */}
          <div className={`w-72 border-r ${borderMain} ${bgSecondary} flex flex-col shrink-0`}>
            <div className={`p-6 border-b ${borderMain}/50`}>
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <h3 className={`text-[10px] ${textTertiary} font-black uppercase tracking-[0.2em]`}>1. Input Context</h3>
                </div>
                <p className={`text-[10px] ${textQuaternary} font-medium`}>Select columns the agent can read.</p>
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

          {/* Right Panel: Config */}
          <div className={`flex-1 flex flex-col min-h-0 ${bgMain}`}>
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
                            <label className={`text-[10px] ${textSecondary} font-black uppercase tracking-[0.2em] flex items-center gap-2`}>
                                <Settings2 className="w-3 h-3" /> Agent Name <span className={`text-[9px] ${textQuaternary} font-normal normal-case`}>(optional - auto-generated)</span>
                            </label>
                            <div className="relative">
                              <input 
                                  className={`w-full ${isDarkMode ? 'bg-[#0f172a]/50' : 'bg-neutral-50'} border ${borderMain} rounded-xl px-4 py-3 text-sm ${textPrimary} focus:outline-none focus:border-blue-500/50 transition-all font-bold ${isDarkMode ? 'placeholder-neutral-700' : 'placeholder-neutral-400'}`}
                                  placeholder={generatedNamePreview || "e.g. Lead Researcher (or leave empty for auto-name)"}
                                  value={name}
                                  onChange={e => setName(e.target.value)}
                              />
                              {!name.trim() && prompt.trim() && (
                                <div className={`absolute right-4 top-1/2 -translate-y-1/2 text-[10px] ${textSecondary} italic flex items-center gap-2`}>
                                  {isGeneratingName ? (
                                    <>
                                      <div className="w-2 h-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                      Generating...
                                    </>
                                  ) : (
                                    <>Will be: "{generatedNamePreview || 'AI Agent'}"</>
                                  )}
                                </div>
                              )}
                            </div>
                        </div>

                        {/* Capabilities */}
                         <div className="space-y-2">
                            <label className={`text-[10px] ${textSecondary} font-black uppercase tracking-[0.2em] flex items-center gap-2`}>
                                <Sparkles className="w-3 h-3" /> Capability
                            </label>
                            <div className="relative">
                                <select 
                                    className={`w-full ${isDarkMode ? 'bg-[#0f172a]/50' : 'bg-neutral-50'} border ${borderMain} rounded-xl px-10 py-3 text-xs ${textPrimary} outline-none focus:border-blue-500/50 font-bold appearance-none`}
                                    value={type}
                                    onChange={e => setType(e.target.value as AgentType)}
                                >
                                    <option value={AgentType.GOOGLE_SEARCH}>Google Search (Grounded)</option>
                                    <option value={AgentType.WEB_SEARCH}>Websearch Agent</option>
                                    <option value={AgentType.CONTENT_CREATION}>Content Creation</option>
                                </select>
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    {type === AgentType.GOOGLE_SEARCH ? <Search className="w-3.5 h-3.5 text-blue-400" /> : 
                                     type === AgentType.WEB_SEARCH ? <Globe className="w-3.5 h-3.5 text-emerald-400" /> :
                                     <PenTool className="w-3.5 h-3.5 text-amber-400" />}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Model Selection Row */}
                    <div className={`grid grid-cols-2 gap-6 p-5 ${isDarkMode ? 'bg-[#0f172a]/20' : 'bg-neutral-100'} border ${borderMain} rounded-2xl`}>
                         <div className="space-y-2">
                            <label className={`text-[10px] ${textSecondary} font-black uppercase tracking-[0.2em] flex items-center gap-2`}>
                                <Globe className="w-3 h-3" /> Provider
                            </label>
                            <select 
                                className={`w-full ${isDarkMode ? 'bg-black' : 'bg-white'} border ${borderMain} rounded-xl px-4 py-3 text-xs ${textPrimary} outline-none focus:border-blue-500/50 font-bold`}
                                value={provider}
                                onChange={e => {
                                    const newProv = e.target.value as AgentProvider;
                                    setProvider(newProv);
                                    setModelId(PROVIDER_MODELS[newProv][0].id);
                                }}
                                disabled={type === AgentType.GOOGLE_SEARCH}
                            >
                                <option value={AgentProvider.GOOGLE}>Google Gemini</option>
                                <option value={AgentProvider.OPENAI}>OpenAI</option>
                                <option value={AgentProvider.ANTHROPIC}>Anthropic Claude</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className={`text-[10px] ${textSecondary} font-black uppercase tracking-[0.2em] flex items-center gap-2`}>
                                <Cpu className="w-3 h-3" /> Model
                            </label>
                            <select 
                                className={`w-full ${isDarkMode ? 'bg-black' : 'bg-white'} border ${borderMain} rounded-xl px-4 py-3 text-xs ${textPrimary} outline-none focus:border-blue-500/50 font-bold`}
                                value={modelId}
                                onChange={e => setModelId(e.target.value)}
                                disabled={type === AgentType.GOOGLE_SEARCH}
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
                            <label className={`text-[10px] ${textSecondary} font-black uppercase tracking-[0.2em] flex items-center gap-2`}>
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
                            className={`w-full ${isDarkMode ? 'bg-[#0f172a]/30' : 'bg-neutral-50'} border ${borderMain} rounded-2xl p-5 text-sm ${isDarkMode ? 'text-neutral-200' : 'text-gray-900'} ${isDarkMode ? 'placeholder-neutral-700' : 'placeholder-neutral-400'} focus:outline-none focus:border-blue-500/50 transition-all font-mono resize-none leading-relaxed h-32`}
                            placeholder="Describe what the agent should do. E.g., 'Find the CEO name and verify the website'..."
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                        />
                    </div>

                    {/* Logic Section */}
                    <div className="space-y-4">
                         <div className="flex items-center gap-4">
                            <label className={`text-[10px] ${textSecondary} font-black uppercase tracking-[0.2em] flex items-center gap-2`}>
                                3. Logic Gate
                            </label>
                            <button 
                                onClick={() => setHasCondition(!hasCondition)}
                                className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${hasCondition ? 'bg-amber-600' : isDarkMode ? 'bg-[#1e2d3d]' : 'bg-neutral-300'}`}
                            >
                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${hasCondition ? 'translate-x-4' : 'translate-x-1'}`} />
                            </button>
                         </div>

                         {hasCondition && (
                            <div className={`${isDarkMode ? 'bg-[#0f172a]/30' : 'bg-neutral-50'} border ${borderMain} rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2`}>
                                <div className="flex gap-2">
                                    <input 
                                        className={`flex-1 ${isDarkMode ? 'bg-black' : 'bg-white'} border ${borderMain} rounded-xl px-4 py-2.5 text-xs ${textPrimary} ${isDarkMode ? 'placeholder-neutral-600' : 'placeholder-neutral-400'} focus:border-amber-500/50 outline-none`}
                                        placeholder="Describe logic (e.g. Only run if Website is empty)..."
                                        value={conditionPrompt}
                                        onChange={e => setConditionPrompt(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleGenerateLogic()}
                                    />
                                    <button 
                                        onClick={handleGenerateLogic}
                                        disabled={isGeneratingLogic}
                                        className={`${isDarkMode ? 'bg-[#1e2d3d] hover:bg-neutral-700 text-neutral-300' : 'bg-neutral-200 hover:bg-neutral-300 text-gray-700'} px-4 rounded-xl transition-all disabled:opacity-50`}
                                    >
                                        {isGeneratingLogic ? <div className={`w-3 h-3 border-2 ${isDarkMode ? 'border-white' : 'border-gray-700'} border-t-transparent rounded-full animate-spin`} /> : <Wand2 className="w-4 h-4" />}
                                    </button>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-mono text-amber-500 uppercase">Code:</span>
                                    <div className={`flex-1 ${isDarkMode ? 'bg-black/50' : 'bg-neutral-100'} border ${borderMain} rounded-lg px-3 py-2 text-xs font-mono text-amber-500/90 truncate`}>
                                        {condition || <span className={isDarkMode ? 'text-neutral-700' : 'text-neutral-500'} italic>No condition generated</span>}
                                    </div>
                                </div>
                            </div>
                         )}
                    </div>

                    {/* Output Container Section */}
                    <div className="space-y-3">
                        <label className={`text-[10px] ${textSecondary} font-black uppercase tracking-[0.2em] flex items-center gap-2`}>
                            4. Output Container & Schema
                        </label>

                        <div className="flex gap-4 mb-3">
                            <div className="flex-1 space-y-1">
                                <span className={`text-[10px] font-bold ${textTertiary}`}>Container Name</span>
                                <input 
                                    className={`w-full ${isDarkMode ? 'bg-[#0f172a]/50' : 'bg-neutral-50'} border ${borderMain} rounded-xl px-4 py-2.5 text-sm ${textPrimary} ${isDarkMode ? 'placeholder-neutral-700' : 'placeholder-neutral-400'} font-bold focus:border-blue-500/50 outline-none`}
                                    placeholder="e.g. Research Data"
                                    value={outputColumnName}
                                    onChange={e => setOutputColumnName(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        <div className={`flex flex-wrap gap-2 min-h-[40px] items-center ${isDarkMode ? 'bg-[#0f172a]/30' : 'bg-neutral-50'} p-3 rounded-xl border ${borderMain}/50`}>
                            {outputs.map((out, i) => (
                                <div key={i} className={`flex items-center gap-2 ${bgSecondary} border ${borderMain} px-3 py-2 rounded-lg text-[11px] ${textPrimary} font-bold animate-in zoom-in duration-200`}>
                                    {out}
                                    <button onClick={() => setOutputs(outputs.filter((_, idx) => idx !== i))} className={`${isDarkMode ? 'text-neutral-600' : 'text-neutral-500'} hover:text-red-500 transition-colors`}>
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}

                            <div className={`flex items-center gap-2 ${isDarkMode ? 'bg-[#0f172a]/50' : 'bg-neutral-100'} border ${borderMain} px-2 py-1.5 rounded-lg focus-within:border-blue-500/50 ${isDarkMode ? 'focus-within:bg-black' : 'focus-within:bg-white'} transition-colors`}>
                                <Plus className={`w-3 h-3 ${textSecondary}`} />
                                <input 
                                    className={`bg-transparent border-none outline-none text-[11px] ${textPrimary} w-24 ${isDarkMode ? 'placeholder-neutral-600' : 'placeholder-neutral-400'}`}
                                    placeholder="Add field key..."
                                    value={newOutputName}
                                    onChange={e => setNewOutputName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addOutput(newOutputName)}
                                />
                            </div>
                        </div>
                         <p className={`text-[10px] ${textQuaternary} italic mt-1`}>
                            These keys guide the AI's output. Data will be stored in the "{outputColumnName}" column as JSON.
                        </p>
                    </div>

                </div>
            </div>

            {/* Footer Action */}
            <div className={`p-6 border-t ${borderMain} ${bgSecondary} flex justify-end gap-4`}>
                 <button 
                    onClick={onClose}
                    className={`px-8 py-4 rounded-xl text-[11px] font-black uppercase tracking-widest ${textSecondary} ${isDarkMode ? 'hover:text-white' : 'hover:text-gray-900'} transition-colors`}
                 >
                    Cancel
                 </button>
                 <button 
                    onClick={handleDeploy}
                    className={`${isDarkMode ? 'bg-white hover:bg-neutral-200 text-black' : 'bg-blue-600 hover:bg-blue-700 text-white'} px-10 py-4 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 ${isDarkMode ? 'shadow-[0_0_20px_rgba(255,255,255,0.15)]' : 'shadow-lg'} flex items-center gap-3`}
                >
                    <CheckCircle2 className="w-4 h-4" />
                    {isEditMode ? 'Update Agent' : 'Deploy Agent'}
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* Deployment Prompt Modal */}
      {showDeployPrompt && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowDeployPrompt(false)}>
          <div className={`${bgMain} border ${borderMain} rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-lg font-black ${textPrimary} uppercase tracking-wider mb-2`}>Deploy Agent</h3>
            <p className={`text-sm ${textTertiary} mb-6`}>How many rows should be automatically deployed?</p>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setDeployInputValue('1')}
                  className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    deployInputValue === '1' 
                      ? 'bg-blue-600 text-white' 
                      : `${isDarkMode ? 'bg-[#1e2d3d] text-neutral-300 hover:bg-[#263a4f]' : 'bg-neutral-200 text-gray-700 hover:bg-neutral-300'}`
                  }`}
                >
                  1 row
                </button>
                <button
                  onClick={() => setDeployInputValue('10')}
                  className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    deployInputValue === '10' 
                      ? 'bg-blue-600 text-white' 
                      : `${isDarkMode ? 'bg-[#1e2d3d] text-neutral-300 hover:bg-[#263a4f]' : 'bg-neutral-200 text-gray-700 hover:bg-neutral-300'}`
                  }`}
                >
                  10 rows
                </button>
                {totalRowsCount > 0 && (
                  <button
                    onClick={() => setDeployInputValue('all')}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                      deployInputValue === 'all' 
                        ? 'bg-blue-600 text-white' 
                        : `${isDarkMode ? 'bg-[#1e2d3d] text-neutral-300 hover:bg-[#263a4f]' : 'bg-neutral-200 text-gray-700 hover:bg-neutral-300'}`
                    }`}
                  >
                    All ({totalRowsCount})
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <span className={`text-sm ${textTertiary} whitespace-nowrap`}>Custom:</span>
                <input
                  type="number"
                  min="1"
                  max={totalRowsCount || 1000}
                  value={deployInputValue === 'all' ? '' : deployInputValue}
                  onChange={e => setDeployInputValue(e.target.value)}
                  className={`flex-1 ${bgSecondary} border ${borderMain} rounded-xl px-4 py-2.5 text-sm ${textPrimary} focus:outline-none focus:border-blue-500/50`}
                  placeholder="Enter number"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDeployPrompt(false)}
                className={`flex-1 px-6 py-3 rounded-xl text-sm font-bold ${textTertiary} ${isDarkMode ? 'hover:text-white' : 'hover:text-gray-900'} ${isDarkMode ? 'bg-[#1e2d3d] hover:bg-[#263a4f]' : 'bg-neutral-200 hover:bg-neutral-300'} transition-all`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeploy}
                className="flex-1 px-6 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Deploy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentModal;
