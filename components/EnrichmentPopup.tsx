
import React, { useState } from 'react';
import { X, ArrowRight, Plus, ExternalLink, Copy, Search, Type, Hash, Calendar, Check, MoreHorizontal, Globe, ChevronDown, ChevronUp, Clock, Zap, List, Eye, EyeOff } from 'lucide-react';
import { AgentExecutionMetadata } from '../types';

interface EnrichmentPopupProps {
  data: Record<string, any>;
  onClose: () => void;
  onMapField: (key: string, value: any) => void;
  onPushToList?: (key: string, items: any[]) => void;
  onDeleteField?: (key: string) => void;
  mappedFields: Set<string>; // Keys that already exist as columns
}

const EnrichmentPopup: React.FC<EnrichmentPopupProps> = ({ 
  data, 
  onClose, 
  onMapField,
  onPushToList,
  mappedFields
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSources, setShowSources] = useState(true);
  const [expandedMetadata, setExpandedMetadata] = useState(false);
  const metadata: AgentExecutionMetadata | undefined = data._metadata;
  const sources = Array.isArray(data._sources) ? data._sources : [];
  const displayData = Object.entries(data).filter(([key]) => key !== '_sources' && key !== '_metadata');
  
  const filteredData = displayData.filter(([key, val]) => 
    key.toLowerCase().includes(searchTerm.toLowerCase()) || 
    String(val).toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const isList = (value: any): boolean => {
    return Array.isArray(value) && value.length > 0;
  };

  const getTypeIcon = (value: any) => {
    if (typeof value === 'number') return <Hash className="w-3.5 h-3.5 text-blue-400" />;
    if (typeof value === 'boolean') return <Check className="w-3.5 h-3.5 text-green-400" />;
    return <Type className="w-3.5 h-3.5 text-neutral-400" />;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  return (
    <div className="fixed top-0 right-0 h-screen w-[450px] bg-[#0b1120] border-l border-[#1e2d3d] shadow-2xl z-[200] flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2d3d] bg-[#0b1120]">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Cell Details</h2>
          <button 
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#0f172a] hover:bg-[#1e2d3d] text-[10px] text-neutral-400 transition-colors border border-[#1e2d3d]"
          >
            <Copy className="w-3 h-3" />
            Copy JSON
          </button>
        </div>
        <button onClick={onClose} className="p-2 text-neutral-500 hover:text-white hover:bg-[#1e2d3d] rounded-lg transition-all">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-[#1e2d3d] bg-[#0b1120]">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input 
                className="w-full bg-[#131d2e] border border-[#1e2d3d] rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#263a4f] transition-all"
                placeholder="Search keys or values..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      {/* Execution Metadata */}
      {metadata && (
        <div className="px-6 py-4 border-b border-[#1e2d3d] bg-[#0f172a]">
          <button
            onClick={() => setExpandedMetadata(!expandedMetadata)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Execution Details</span>
            </div>
            {expandedMetadata ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
          </button>
          {expandedMetadata && (
            <div className="mt-3 space-y-2 pl-6">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Agent:</span>
                <span className="text-neutral-200 font-bold">{metadata.agentName}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Steps Taken:</span>
                <span className="text-blue-400 font-bold">{metadata.stepsTaken}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Tokens Used:</span>
                <span className="text-emerald-400 font-bold">{metadata.tokensUsed ? metadata.tokensUsed.toLocaleString() : 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Time:</span>
                <span className="text-neutral-200 font-bold">{metadata.executionTime >= 1000 ? `${(metadata.executionTime / 1000).toFixed(1)}s` : `${metadata.executionTime}ms`}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
        {filteredData.length === 0 ? (
           <div className="text-center py-10 text-neutral-600 text-xs italic">
             {searchTerm ? 'No matching fields found.' : 'No data available.'}
           </div>
        ) : (
          filteredData.map(([key, value]) => {
            const isMapped = mappedFields.has(key);
            const isLongText = String(value).length > 50;
            const valueIsList = isList(value);
            
            return (
              <div key={key} className="group relative pl-4 border-l-2 border-transparent hover:border-blue-500 transition-all">
                <div className="flex items-start gap-3 mb-2">
                   <div className="mt-0.5 shrink-0 opacity-70">
                      {valueIsList ? <List className="w-3.5 h-3.5 text-purple-400" /> : getTypeIcon(value)}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-300">{key}</span>
                        {valueIsList && (
                          <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/30">List ({value.length} items)</span>
                        )}
                        {isMapped && (
                            <span className="text-[9px] bg-[#1e2d3d] text-neutral-500 px-1.5 py-0.5 rounded border border-[#263a4f]">Mapped</span>
                        )}
                      </div>
                   </div>
                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     {valueIsList && onPushToList ? (
                       <button 
                         onClick={() => onPushToList(key, value)}
                         className="p-1.5 rounded-md bg-purple-600/10 text-purple-500 hover:bg-purple-600 hover:text-white transition-all"
                         title="Push to new tab"
                       >
                         <ArrowRight className="w-3.5 h-3.5" />
                       </button>
                     ) : null}
                     <button 
                        onClick={() => onMapField(key, value)}
                        className={`p-1.5 rounded-md transition-all ${
                            isMapped 
                            ? 'text-neutral-600 cursor-default' 
                            : 'bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white'
                        }`}
                        title={valueIsList ? "Add as column (comma-separated)" : "Add to table"}
                        disabled={isMapped}
                    >
                        {isMapped ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                   </button>
                   </div>
                </div>
                
                <div className={`text-xs text-neutral-400 leading-relaxed font-mono bg-[#131d2e] rounded-lg p-3 border border-[#1e2d3d]/50 ${isLongText ? 'whitespace-pre-wrap' : ''}`}>
                    {valueIsList ? (
                      <div className="space-y-1">
                        {value.slice(0, 5).map((item: any, idx: number) => (
                          <div key={idx} className="text-neutral-300">• {String(item)}</div>
                        ))}
                        {value.length > 5 && <div className="text-neutral-500 italic">... and {value.length - 5} more</div>}
                      </div>
                    ) : (
                      String(value)
                    )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Sources */}
      {sources.length > 0 && (
        <div className="p-6 border-t border-[#1e2d3d] bg-[#0f172a]">
             <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Sources Used ({sources.length})</span>
                </div>
                <button
                  onClick={() => setShowSources(!showSources)}
                  className="p-1.5 rounded-md hover:bg-[#1e2d3d] transition-colors"
                  title={showSources ? "Hide sources" : "Show sources"}
                >
                  {showSources ? <EyeOff className="w-3.5 h-3.5 text-neutral-500" /> : <Eye className="w-3.5 h-3.5 text-neutral-500" />}
                </button>
             </div>
             {showSources && (
               <div className="flex flex-col gap-2">
                  {sources.map((src: string, idx: number) => (
                      <a 
                          key={idx} 
                          href={src.startsWith('http') ? src : `https://${src}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-2 p-2 rounded-lg bg-[#131d2e] hover:bg-[#1e2d3d] border border-[#1e2d3d] hover:border-[#263a4f] transition-all group"
                      >
                          <div className="p-1 bg-blue-500/10 rounded">
                              <ExternalLink className="w-3 h-3 text-blue-500" />
                          </div>
                          <span className="text-[10px] text-neutral-400 truncate flex-1">{src}</span>
                      </a>
                  ))}
               </div>
             )}
        </div>
      )}
    </div>
  );
};

export default EnrichmentPopup;
