
import React, { useState } from 'react';
import { X, ArrowRight, Plus, ExternalLink, Copy, Search, Type, Hash, Calendar, Check, MoreHorizontal, Globe } from 'lucide-react';

interface EnrichmentPopupProps {
  data: Record<string, any>;
  onClose: () => void;
  onMapField: (key: string, value: any) => void;
  onDeleteField?: (key: string) => void;
  mappedFields: Set<string>; // Keys that already exist as columns
}

const EnrichmentPopup: React.FC<EnrichmentPopupProps> = ({ 
  data, 
  onClose, 
  onMapField,
  mappedFields
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const sources = Array.isArray(data._sources) ? data._sources : [];
  const displayData = Object.entries(data).filter(([key]) => key !== '_sources');
  
  const filteredData = displayData.filter(([key, val]) => 
    key.toLowerCase().includes(searchTerm.toLowerCase()) || 
    String(val).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeIcon = (value: any) => {
    if (typeof value === 'number') return <Hash className="w-3.5 h-3.5 text-blue-400" />;
    if (typeof value === 'boolean') return <Check className="w-3.5 h-3.5 text-green-400" />;
    return <Type className="w-3.5 h-3.5 text-neutral-400" />;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  return (
    <div className="fixed top-0 right-0 h-screen w-[450px] bg-[#090909] border-l border-neutral-800 shadow-2xl z-[500] flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#090909]">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Cell Details</h2>
          <button 
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-400 transition-colors border border-neutral-800"
          >
            <Copy className="w-3 h-3" />
            Copy JSON
          </button>
        </div>
        <button onClick={onClose} className="p-2 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg transition-all">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-neutral-800 bg-[#090909]">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input 
                className="w-full bg-[#111] border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-700 transition-all"
                placeholder="Search keys or values..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

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
            
            return (
              <div key={key} className="group relative pl-4 border-l-2 border-transparent hover:border-blue-500 transition-all">
                <div className="flex items-start gap-3 mb-2">
                   <div className="mt-0.5 shrink-0 opacity-70">
                      {getTypeIcon(value)}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-300">{key}</span>
                        {isMapped && (
                            <span className="text-[9px] bg-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded border border-neutral-700">Mapped</span>
                        )}
                      </div>
                   </div>
                   <button 
                        onClick={() => onMapField(key, value)}
                        className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-md transition-all ${
                            isMapped 
                            ? 'text-neutral-600 cursor-default' 
                            : 'bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white'
                        }`}
                        title="Add to table"
                        disabled={isMapped}
                    >
                        {isMapped ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                   </button>
                </div>
                
                <div className={`text-xs text-neutral-400 leading-relaxed font-mono bg-[#111] rounded-lg p-3 border border-neutral-800/50 ${isLongText ? 'whitespace-pre-wrap' : ''}`}>
                    {String(value)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Sources */}
      {sources.length > 0 && (
        <div className="p-6 border-t border-neutral-800 bg-[#0c0c0c]">
             <div className="flex items-center gap-2 mb-3">
                <Globe className="w-3.5 h-3.5 text-neutral-500" />
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Sources Used</span>
             </div>
             <div className="flex flex-col gap-2">
                {sources.map((src: string, idx: number) => (
                    <a 
                        key={idx} 
                        href={src.startsWith('http') ? src : `https://${src}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-2 p-2 rounded-lg bg-[#111] hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 transition-all group"
                    >
                        <div className="p-1 bg-blue-500/10 rounded">
                            <ExternalLink className="w-3 h-3 text-blue-500" />
                        </div>
                        <span className="text-[10px] text-neutral-400 truncate flex-1">{src}</span>
                    </a>
                ))}
             </div>
        </div>
      )}
    </div>
  );
};

export default EnrichmentPopup;
