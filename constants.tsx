

import { VerticalData, AgentType, ColumnDefinition, ColumnType, AgentProvider, SelectOption } from './types';

// ── Enrichment Status Options ──
export const COMPANY_ENRICHMENT_OPTIONS: SelectOption[] = [
  { id: 'open', label: 'Open', color: '#3B82F6' },
  { id: 'done', label: 'Done', color: '#22C55E' },
  { id: 'error', label: 'Error', color: '#EF4444' },
  { id: 'auto', label: 'Auto', color: '#06B6D4' },
];

export const OWNER_ENRICHMENT_OPTIONS: SelectOption[] = [
  { id: 'open', label: 'Open', color: '#F97316' },
  { id: 'done', label: 'Done', color: '#22C55E' },
  { id: 'error', label: 'Error', color: '#EF4444' },
  { id: 'auto', label: 'Auto', color: '#06B6D4' },
];

export const COMPANY_COLUMNS: ColumnDefinition[] = [
  { id: 'company_name', header: 'Company Name', width: 220, type: ColumnType.TEXT },
  { id: 'company_website', header: 'Website', width: 220, type: ColumnType.TEXT },
  { id: 'company_enrichment', header: 'Company Enrichment', width: 160, type: ColumnType.SELECT, options: COMPANY_ENRICHMENT_OPTIONS },
  { id: 'owner_enrichment', header: 'Owner Enrichment', width: 160, type: ColumnType.SELECT, options: OWNER_ENRICHMENT_OPTIONS },
  { id: 'company_id', header: 'Company ID', width: 180, type: ColumnType.TEXT },
  { id: 'legal_form', header: 'Legal Form', width: 140, type: ColumnType.TEXT },
  { id: 'employees', header: 'Employees', width: 120, type: ColumnType.TEXT },
  { id: 'address_city', header: 'City', width: 160, type: ColumnType.TEXT },
  { id: 'address_street', header: 'Street', width: 220, type: ColumnType.TEXT },
  { id: 'address_postal_code', header: 'Postal Code', width: 140, type: ColumnType.TEXT },
  { id: 'net_income', header: 'Net Income', width: 140, type: ColumnType.TEXT },
  { id: 'financial_data_date', header: 'Financial Date', width: 140, type: ColumnType.TEXT },
  { id: 'ownership_structure', header: 'Ownership Structure', width: 200, type: ColumnType.TEXT },
  { id: 'ownership_data', header: 'Ownership Data', width: 260, type: ColumnType.ENRICHMENT },
];

export const PERSON_COLUMNS: ColumnDefinition[] = [
  { id: 'full_name', header: 'Full Name', width: 200, type: ColumnType.TEXT },
  { id: 'first_name', header: 'First Name', width: 160, type: ColumnType.TEXT },
  { id: 'last_name', header: 'Last Name', width: 160, type: ColumnType.TEXT },
  { id: 'role', header: 'Role', width: 140, type: ColumnType.TEXT },
  { id: 'type', header: 'Type', width: 140, type: ColumnType.TEXT },
  { id: 'percentage_share', header: 'Share %', width: 120, type: ColumnType.NUMBER },
  { id: 'date_of_birth', header: 'Date of Birth', width: 160, type: ColumnType.TEXT },
  { id: 'age', header: 'Age', width: 80, type: ColumnType.NUMBER },
  { id: 'company_website', header: 'Company Website', width: 220, type: ColumnType.TEXT },
  // The following columns will be configured as LinkedColumns at runtime
  // (sourceSheetId is dynamic, depends on which Companies sheet is active)
  { id: 'linked_company_name', header: 'Company Name', width: 200, type: ColumnType.TEXT },
  { id: 'linked_company_id', header: 'Company ID', width: 180, type: ColumnType.TEXT },
  { id: 'linked_legal_form', header: 'Legal Form', width: 140, type: ColumnType.TEXT },
  { id: 'linked_city', header: 'City', width: 140, type: ColumnType.TEXT },
];

export const INITIAL_VERTICALS: VerticalData[] = [
  {
    id: 'it-services',
    name: 'IT Services',
    color: '#3B82F6',
    sheets: [
      {
        id: 'it-companies',
        name: 'Companies',
        color: '#3B82F6',
        columns: [...COMPANY_COLUMNS],
        rows: [
          { id: '1', company_name: 'LUDES Architekten', company_website: 'ludes.net', company_enrichment: 'Open', owner_enrichment: '', company_id: '', legal_form: '', employees: '', address_city: '', address_street: '', address_postal_code: '', net_income: '', financial_data_date: '', ownership_structure: '', ownership_data: '' },
          { id: '2', company_name: 'Celonis', company_website: 'celonis.com', company_enrichment: 'Open', owner_enrichment: '', company_id: '', legal_form: '', employees: '', address_city: '', address_street: '', address_postal_code: '', net_income: '', financial_data_date: '', ownership_structure: '', ownership_data: '' },
          { id: '3', company_name: 'Hetzner', company_website: 'hetzner.com', company_enrichment: 'Open', owner_enrichment: '', company_id: '', legal_form: '', employees: '', address_city: '', address_street: '', address_postal_code: '', net_income: '', financial_data_date: '', ownership_structure: '', ownership_data: '' },
        ],
        agents: [
          { 
            id: 'a1', 
            name: 'Company Researcher', 
            type: AgentType.GOOGLE_SEARCH, 
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
        id: 'it-persons',
        name: 'Persons',
        color: '#EF4444',
        columns: [...PERSON_COLUMNS],
        rows: [],
        agents: []
      }
    ]
  },
  {
    id: 'engineering',
    name: 'Engineering',
    color: '#EF4444',
    sheets: [
      {
        id: 'eng-companies',
        name: 'Companies',
        color: '#EF4444',
        columns: [...COMPANY_COLUMNS],
        rows: [
          { id: '4', company_name: 'DeepL', company_website: 'deepl.com', company_enrichment: 'Open', owner_enrichment: '', company_id: '', legal_form: '', employees: '', address_city: '', address_street: '', address_postal_code: '', net_income: '', financial_data_date: '', ownership_structure: '', ownership_data: '' },
          { id: '5', company_name: 'Personio', company_website: 'personio.de', company_enrichment: 'Open', owner_enrichment: '', company_id: '', legal_form: '', employees: '', address_city: '', address_street: '', address_postal_code: '', net_income: '', financial_data_date: '', ownership_structure: '', ownership_data: '' },
        ],
        agents: []
      },
      {
        id: 'eng-persons',
        name: 'Persons',
        color: '#F59E0B',
        columns: [...PERSON_COLUMNS],
        rows: [],
        agents: []
      }
    ]
  },
];
