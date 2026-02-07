

import { TabData, AgentType, ColumnDefinition, ColumnType, AgentProvider } from './types';

export const INITIAL_COLUMNS: ColumnDefinition[] = [
  { id: 'company_name', header: 'Company Name', width: 200, type: ColumnType.TEXT },
  { id: 'website', header: 'Website', width: 180, type: ColumnType.TEXT },
  { id: 'industry', header: 'Industry', width: 150, type: ColumnType.TEXT },
  { id: 'location', header: 'Location', width: 150, type: ColumnType.TEXT },
  { id: 'linkedin', header: 'LinkedIn', width: 200, type: ColumnType.TEXT },
  { id: 'enriched_data', header: 'Enriched Info', width: 300, type: ColumnType.ENRICHMENT },
  { id: 'sync_status', header: 'HubSpot Status', width: 120, type: ColumnType.TEXT },
];

export const INITIAL_TABS: TabData[] = [
  {
    id: 'it-services',
    name: 'IT Services',
    color: '#3B82F6',
    columns: [...INITIAL_COLUMNS],
    rows: [
      { id: '1', company_name: 'TechFlow Solutions', website: 'techflow.io', industry: 'Cloud Computing', location: 'Berlin', linkedin: 'li/techflow', enriched_data: 'Leading cloud provider', sync_status: 'Synced' },
      { id: '2', company_name: 'CyberGuard Systems', website: 'cyberguard.com', industry: 'Security', location: 'London', linkedin: 'li/cyberguard', enriched_data: '', sync_status: 'Pending' },
      { id: '3', company_name: 'DataNexus', website: 'datanexus.ai', industry: 'AI & Data', location: 'Paris', linkedin: 'li/datanexus', enriched_data: 'Big data analytics', sync_status: 'Synced' },
    ],
    agents: [
      { 
        id: 'a1', 
        name: 'Company Researcher', 
        type: AgentType.WEB_SEARCH, 
        provider: AgentProvider.GOOGLE,
        modelId: 'gemini-3-flash-preview',
        prompt: 'Find the latest news for /company_name and summarize their primary service.', 
        inputs: ['company_name'],
        outputs: ['Enriched Info'],
        outputColumnName: 'Enriched Info'
      }
    ]
  },
  {
    id: 'engineering',
    name: 'Engineering',
    color: '#EF4444',
    columns: [...INITIAL_COLUMNS],
    rows: [
      { id: '4', company_name: 'Precision Mech', website: 'premech.de', industry: 'Mechanical', location: 'Munich', linkedin: 'li/premech', enriched_data: '', sync_status: 'Pending' },
      { id: '5', company_name: 'SolarGrid', website: 'solargrid.energy', industry: 'Energy', location: 'Oslo', linkedin: 'li/solargrid', enriched_data: 'Renewable energy infrastructure', sync_status: 'Synced' },
    ],
    agents: []
  },
];