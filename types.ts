
export type CellValue = string | number | boolean | null;

export enum ColumnType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  SELECT = 'SELECT',
  FORMULA = 'FORMULA',
  ENRICHMENT = 'ENRICHMENT',
  HTTP = 'HTTP',
  CURRENCY = 'CURRENCY',
  DATE = 'DATE',
  URL = 'URL',
  EMAIL = 'EMAIL',
  IMAGE = 'IMAGE',
  CHECKBOX = 'CHECKBOX',
  MESSAGE = 'MESSAGE',
  WATERFALL = 'WATERFALL',
  MERGE = 'MERGE'
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

export interface MergeInput {
  id: string;
  template: string;
  useAI?: boolean;
}

export interface LinkedColumn {
  sourceSheetId: string;      // ID des Source Sheets
  sourceColumnId: string;      // ID der Source Spalte
  matchColumnId: string;       // ID der Match-Spalte im aktuellen Sheet
  sourceMatchColumnId: string; // ID der Match-Spalte im Source Sheet (meist "id")
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
  connectedHttpRequestId?: string;
  description?: string;
  headerColor?: string;
  pinned?: boolean;
  hidden?: boolean;
  mergeInputs?: MergeInput[];
  linkedColumn?: LinkedColumn;
}

export enum AgentType {
  GOOGLE_SEARCH = 'GOOGLE_SEARCH',
  WEB_SEARCH = 'WEB_SEARCH',
  CONTENT_CREATION = 'CONTENT_CREATION'
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
  rowsToDeploy?: number; // Default 10, number of rows to automatically deploy
}

export interface AgentExecutionMetadata {
  stepsTaken: number;
  tokensUsed?: number;
  executionTime: number;
  agentId: string;
  agentName: string;
}

export interface RowData {
  id: string;
  [key: string]: CellValue;
}

export interface WorkflowConfig {
  companyAutoEnrich: boolean;
  ownerAutoEnrich: boolean;
  includeProkurist: boolean;
  websiteCol: string;
  companyNameCol: string;
  companyIdCol: string;
}

// A single sheet tab (like a Google Sheets tab at the bottom)
export interface SheetTab {
  id: string;
  name: string;
  description?: string;
  color: string;
  columns: ColumnDefinition[];
  rows: RowData[];
  agents: AgentConfig[];
  httpRequests?: HttpRequestConfig[];
  autoUpdate?: boolean;
  workflowConfig?: WorkflowConfig;
}

// A vertical (sidebar item) containing multiple sheet tabs
export interface VerticalData {
  id: string;
  name: string;
  color: string;
  sheets: SheetTab[];
}

export interface AppSettings {
  googleApiKey: string;
  openaiApiKey: string;
  anthropicApiKey: string;
  apifyApiKey: string;
  serperApiKey: string;
  apifyWebSearchEnabled: boolean;
  openRegisterApiKey: string;
  researchSteps: number;
  uploadMatchProvider: AgentProvider;
  uploadMatchModelId: string;
  uploadMatchConfidence: number;
  uploadMatchEnabled: boolean;
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE'
}

export enum HttpAuthType {
  NONE = 'NONE',
  API_KEY = 'API_KEY',
  BEARER = 'BEARER',
  BASIC = 'BASIC'
}

export type FilterOperator =
  | 'equal_to'
  | 'not_equal_to'
  | 'contains'
  | 'does_not_contain'
  | 'contains_any_of'
  | 'does_not_contain_any_of'
  | 'is_empty'
  | 'is_not_empty';

export type FilterCombinator = 'and' | 'or';

export interface FilterCondition {
  id: string;
  colId: string;
  operator: FilterOperator;
  value: string;
}

export interface FilterState {
  combinator: FilterCombinator;
  conditions: FilterCondition[];
}

export interface ColumnSearch {
  colId?: string; // Optional for global search
  value: string;
  mode?: 'column' | 'global'; // 'column' for column-specific, 'global' for all cells
}

export interface HttpRequestConfig {
  id: string;
  name: string;
  url: string;
  method: HttpMethod;
  auth: {
    type: HttpAuthType;
    apiKeyHeader?: string;
    apiKeyQueryParam?: string;
    apiKeyValue?: string;
    bearerToken?: string;
    basicUser?: string;
    basicPassword?: string;
  };
  headers: Record<string, string>;
  body?: string;
  inputs: string[];
  responseMapping: Record<string, string>;
}
