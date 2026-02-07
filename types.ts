
export type CellValue = string | number | boolean | null;

export enum ColumnType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  SELECT = 'SELECT',
  FORMULA = 'FORMULA',
  ENRICHMENT = 'ENRICHMENT'
}

export interface SelectOption {
  id: string;
  label: string;
  color: string;
}

export interface DeduplicationConfig {
  active: boolean;
  keep: 'oldest' | 'newest';
}

export interface ColumnDefinition {
  id: string;
  header: string;
  width: number;
  type: ColumnType;
  formula?: string;
  defaultValue?: string; 
  options?: SelectOption[];
  agentId?: string;
  deduplication?: DeduplicationConfig;
  connectedAgentId?: string;
}

export enum AgentType {
  WEB_SEARCH = 'WEB_SEARCH',
  TEXT = 'TEXT',
  REASONING = 'REASONING',
  HUBSPOT = 'HUBSPOT'
}

export enum AgentProvider {
  GOOGLE = 'GOOGLE',
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC'
}

export interface AgentConfig {
  id: string;
  name: string;
  type: AgentType;
  provider: AgentProvider;
  modelId: string;
  prompt: string;
  inputs: string[]; 
  outputs: string[]; // Used as Schema definition (Keys)
  outputColumnName: string; // The specific column header where JSON blob is stored
  condition?: string;
}

export interface RowData {
  id: string;
  [key: string]: CellValue;
}

export interface TabData {
  id: string;
  name: string;
  color: string;
  columns: ColumnDefinition[];
  rows: RowData[];
  agents: AgentConfig[];
}

export interface AppSettings {
  googleApiKey: string;
  openaiApiKey: string;
  anthropicApiKey: string;
}
