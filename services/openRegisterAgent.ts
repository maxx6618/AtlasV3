
// ═══════════════════════════════════════════════════════════════
// OpenRegister API Client — All 15 Endpoints + Enrichment Engine
// Base: https://api.openregister.de
// Auth: API key in Authorization header
// ═══════════════════════════════════════════════════════════════

const BASE_URL = 'https://api.openregister.de';

// ── Generic fetch helper ──────────────────────────────────────

const fetchJson = async (url: string, apiKey: string, options?: RequestInit): Promise<any> => {
  const headers: Record<string, string> = {
    Authorization: apiKey,
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type') || '';
  const raw = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof raw === 'string' ? raw : JSON.stringify(raw);
    throw new Error(`OpenRegister ${response.status}: ${message}`);
  }

  return raw;
};

const buildQuery = (params: Record<string, string | number | boolean | undefined>) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
};

// ═══════════════════════════════════════════════════════════════
// 1. SEARCH ENDPOINTS
// ═══════════════════════════════════════════════════════════════

export const searchCompany = async (
  apiKey: string,
  params: {
    query?: string;
    register_number?: string;
    register_type?: 'HRB' | 'HRA' | 'PR' | 'GnR' | 'VR';
    register_court?: string;
    active?: boolean;
    legal_form?: string;
    incorporation_date?: string;
    page?: number;
    per_page?: number;
  }
) => {
  const qs = buildQuery(params as any);
  return fetchJson(`${BASE_URL}/v0/search/company${qs}`, apiKey);
};

export const autocompleteCompany = async (apiKey: string, query: string) => {
  const qs = buildQuery({ query });
  return fetchJson(`${BASE_URL}/v1/autocomplete/company${qs}`, apiKey);
};

export const advancedSearchCompany = async (
  apiKey: string,
  body: { query?: any; filters?: any[]; location?: any; pagination?: { page?: number; per_page?: number } }
) => {
  return fetchJson(`${BASE_URL}/v1/search/company`, apiKey, {
    method: 'POST',
    body: JSON.stringify(body)
  });
};

export const lookupByWebsite = async (apiKey: string, url: string) => {
  const qs = buildQuery({ url });
  return fetchJson(`${BASE_URL}/v0/search/lookup${qs}`, apiKey);
};

// ═══════════════════════════════════════════════════════════════
// 2. COMPANY ENDPOINTS
// ═══════════════════════════════════════════════════════════════

export const getCompanyDetails = async (
  apiKey: string, companyId: string, options?: { realtime?: boolean; export?: boolean }
) => {
  const qs = buildQuery(options as any || {});
  return fetchJson(`${BASE_URL}/v1/company/${encodeURIComponent(companyId)}${qs}`, apiKey);
};

export const getCompanyOwners = async (
  apiKey: string, companyId: string, options?: { realtime?: boolean }
) => {
  const qs = buildQuery(options as any || {});
  return fetchJson(`${BASE_URL}/v1/company/${encodeURIComponent(companyId)}/owners${qs}`, apiKey);
};

export const getCompanyHoldings = async (apiKey: string, companyId: string) => {
  return fetchJson(`${BASE_URL}/v1/company/${encodeURIComponent(companyId)}/holdings`, apiKey);
};

export const getCompanyFinancials = async (apiKey: string, companyId: string) => {
  return fetchJson(`${BASE_URL}/v1/company/${encodeURIComponent(companyId)}/financials`, apiKey);
};

export const getCompanyUBOs = async (apiKey: string, companyId: string) => {
  return fetchJson(`${BASE_URL}/v1/company/${encodeURIComponent(companyId)}/ubo`, apiKey);
};

// ═══════════════════════════════════════════════════════════════
// 3. PERSON ENDPOINTS
// ═══════════════════════════════════════════════════════════════

export const searchPerson = async (apiKey: string, body: Record<string, any>) => {
  return fetchJson(`${BASE_URL}/v1/search/person`, apiKey, { method: 'POST', body: JSON.stringify(body) });
};

export const getPersonDetails = async (apiKey: string, personId: string) => {
  return fetchJson(`${BASE_URL}/v1/person/${encodeURIComponent(personId)}`, apiKey);
};

export const getPersonHoldings = async (apiKey: string, personId: string) => {
  return fetchJson(`${BASE_URL}/v1/person/${encodeURIComponent(personId)}/holdings`, apiKey);
};

// ═══════════════════════════════════════════════════════════════
// 4. DOCUMENT ENDPOINTS
// ═══════════════════════════════════════════════════════════════

export const getDocumentRealtime = async (
  apiKey: string, companyId: string,
  documentCategory: 'current_printout' | 'chronological_printout' | 'historical_printout' | 'structured_information' | 'shareholder_list' | 'articles_of_association'
) => {
  const qs = buildQuery({ company_id: companyId, document_category: documentCategory });
  return fetchJson(`${BASE_URL}/v1/document${qs}`, apiKey);
};

export const getDocumentStored = async (apiKey: string, documentId: string) => {
  return fetchJson(`${BASE_URL}/v1/document/${encodeURIComponent(documentId)}`, apiKey);
};

// ═══════════════════════════════════════════════════════════════
// 5. WEB DATA ENDPOINTS
// ═══════════════════════════════════════════════════════════════

export const getCompanyContact = async (apiKey: string, companyId: string) => {
  return fetchJson(`${BASE_URL}/v0/company/${encodeURIComponent(companyId)}/contact`, apiKey);
};

// ═══════════════════════════════════════════════════════════════
// ENRICHMENT ENGINE — Types & Helpers
// ═══════════════════════════════════════════════════════════════

export interface EnrichedPerson {
  full_name: string;
  first_name: string;
  last_name: string;
  role: string;
  type: string;
  percentage_share: number | null;
  date_of_birth: string;
  age: number | null;
  company_name: string;
  company_id: string;
  company_website: string;
}

export interface EnrichmentResult {
  companyUpdates: Record<string, any>;
  persons: EnrichedPerson[];
  resolvedCompanyId: string;
  error?: string;
}

export interface InputMapping {
  companyIdCol: string;
  websiteCol: string;
  companyNameCol: string;
}

export type EnrichmentAction =
  | 'full_enrichment'
  | 'company_details'
  | 'ownership_only'
  | 'directors_only'
  | 'financials'
  | 'contact_info'
  | 'company_search';

export const ENRICHMENT_ACTIONS: {
  id: EnrichmentAction;
  label: string;
  description: string;
  outputs: string;
}[] = [
  { id: 'full_enrichment', label: 'Full Enrichment', description: 'Company details + Directors + Owners. Complete workflow.', outputs: 'Company fields + Persons tab' },
  { id: 'company_details', label: 'Company Details', description: 'Legal form, address, employees, financial indicators.', outputs: 'Company fields' },
  { id: 'directors_only', label: 'Directors', description: 'Extract active directors/representatives from company details.', outputs: 'Persons tab' },
  { id: 'ownership_only', label: 'Ownership', description: 'Shareholders and owners. Skipped for AG companies.', outputs: 'Persons tab' },
  { id: 'financials', label: 'Financials', description: 'Balance sheet, income statement from Bundesanzeiger.', outputs: 'Enrichment JSON' },
  { id: 'contact_info', label: 'Contact Info', description: 'Email, phone, website, social media from web data.', outputs: 'Enrichment JSON' },
  { id: 'company_search', label: 'Company Search', description: 'Search by name to resolve company_id. Useful as first step.', outputs: 'company_id, company_name' },
];

// ── Utility helpers ───────────────────────────────────────────

const calculateAge = (dateOfBirth?: string) => {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
};

const splitName = (fullName: string) => {
  const cleaned = (fullName || '').trim();
  if (!cleaned) return { first_name: '', last_name: '' };
  const parts = cleaned.split(/\s+/);
  const prefixes = ['von', 'van', 'de', 'zu', 'vom', 'der', 'den'];
  let lastNameStart = Math.max(parts.length - 1, 0);
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (prefixes.includes(parts[i].toLowerCase())) {
      lastNameStart = i;
      break;
    }
  }
  return {
    first_name: parts.slice(0, lastNameStart).join(' '),
    last_name: parts.slice(lastNameStart).join(' ')
  };
};

/** Normalize a name for dedup: lowercase, map German umlauts, strip accents */
export const normalizeName = (name: string) => {
  if (!name) return '';
  let clean = name.toLowerCase();
  const map: Record<string, string> = { 'ä': 'a', 'ö': 'o', 'ü': 'u', 'ß': 'ss', 'ae': 'a', 'oe': 'o', 'ue': 'u' };
  for (const key in map) {
    clean = clean.replace(new RegExp(key, 'g'), map[key]);
  }
  return clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
};

const parseCompanyId = (data: any) => {
  return data?.company_id || data?.id || data?.company?.id || data?.company?.company_id || data?.register?.company_id || '';
};

const parseOwners = (data: any) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.owners)) return data.owners;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const resolveOwnershipStructure = (owners: any[]) => {
  if (!owners || owners.length === 0) return 'No Owners';
  let hasLegal = false;
  let hasNatural = false;
  owners.forEach(owner => {
    if (owner?.type === 'legal_person' || owner?.legal_person) hasLegal = true;
    if (owner?.type === 'natural_person' || owner?.natural_person) hasNatural = true;
  });
  if (hasLegal && hasNatural) return 'Legal/Natural Person';
  if (hasLegal) return 'Legal Person';
  if (hasNatural) return 'Natural Person';
  return 'Unknown';
};

// ═══════════════════════════════════════════════════════════════
// RESOLVE COMPANY ID — 3-step fallback chain
// ═══════════════════════════════════════════════════════════════

export const resolveCompanyId = async (
  row: Record<string, any>,
  mapping: InputMapping,
  apiKey: string
): Promise<string> => {
  // 1. Direct company_id
  const directId = row[mapping.companyIdCol]?.toString().trim();
  if (directId) return directId;

  // 2. Lookup by website
  const website = row[mapping.websiteCol]?.toString().trim();
  if (website) {
    try {
      const lookup = await lookupByWebsite(apiKey, website);
      const id = parseCompanyId(lookup);
      if (id) return id;
    } catch { /* fallthrough */ }
  }

  // 3. Search by company name
  const name = row[mapping.companyNameCol]?.toString().trim();
  if (name) {
    try {
      const result = await searchCompany(apiKey, { query: name, per_page: 1 });
      const items = result?.results || result?.companies || (Array.isArray(result) ? result : []);
      if (items.length > 0) {
        const id = parseCompanyId(items[0]);
        if (id) return id;
      }
    } catch { /* fallthrough */ }
  }

  throw new Error('No identifiable input (need company_id, website, or company_name)');
};

// ═══════════════════════════════════════════════════════════════
// EXTRACT DIRECTORS from company details representation[]
// ═══════════════════════════════════════════════════════════════

export const extractDirectors = (
  companyData: any,
  companyContext: { company_name: string; company_id: string; company_website: string }
): EnrichedPerson[] => {
  const representations = companyData?.representation || [];
  const results: EnrichedPerson[] = [];

  for (const rep of representations) {
    // Only active (end_date === null)
    if (rep.end_date !== null && rep.end_date !== undefined) continue;

    const naturalPerson = rep.natural_person || {};
    const fullName = rep.name || naturalPerson.full_name || '';
    const { first_name, last_name } = splitName(fullName);
    const dateOfBirth = naturalPerson.date_of_birth || '';
    const age = calculateAge(dateOfBirth);

    results.push({
      full_name: fullName,
      first_name: naturalPerson.first_name || first_name || '',
      last_name: naturalPerson.last_name || last_name || '',
      role: rep.role || 'DIRECTOR',
      type: rep.type || 'natural_person',
      percentage_share: null,
      date_of_birth: dateOfBirth,
      age,
      company_name: companyContext.company_name,
      company_id: companyContext.company_id,
      company_website: companyContext.company_website
    });
  }

  return results;
};

// ═══════════════════════════════════════════════════════════════
// EXTRACT OWNERS from /owners response
// ═══════════════════════════════════════════════════════════════

export const extractOwners = (
  ownersData: any,
  companyContext: { company_name: string; company_id: string; company_website: string }
): EnrichedPerson[] => {
  const owners = parseOwners(ownersData);
  return owners.map((owner: any) => {
    const naturalPerson = owner?.natural_person || {};
    const legalPerson = owner?.legal_person || {};
    const type = owner?.type || (naturalPerson?.full_name ? 'natural_person' : legalPerson?.name ? 'legal_person' : 'unknown');
    const fullName = naturalPerson?.full_name || owner?.name || legalPerson?.name || '';
    const { first_name, last_name } = splitName(fullName);
    const dateOfBirth = naturalPerson?.date_of_birth || '';

    return {
      full_name: fullName || '',
      first_name: naturalPerson?.first_name || first_name || '',
      last_name: naturalPerson?.last_name || last_name || '',
      role: 'Owner',
      type,
      percentage_share: owner?.percentage_share ?? null,
      date_of_birth: dateOfBirth,
      age: calculateAge(dateOfBirth),
      company_name: companyContext.company_name,
      company_id: companyContext.company_id,
      company_website: companyContext.company_website
    };
  });
};

// ═══════════════════════════════════════════════════════════════
// MERGE PERSONS — dedup by normalized name, combine roles
// ═══════════════════════════════════════════════════════════════

export const mergePersons = (directors: EnrichedPerson[], owners: EnrichedPerson[]): EnrichedPerson[] => {
  const merged: Record<string, EnrichedPerson> = {};

  for (const person of [...directors, ...owners]) {
    const key = normalizeName(person.full_name);
    if (!key) continue;

    if (!merged[key]) {
      merged[key] = { ...person };
    } else {
      const existing = merged[key];
      // Merge roles
      if (person.role && existing.role !== person.role) {
        if (!existing.role.includes(person.role)) {
          existing.role = `${existing.role} & ${person.role}`;
        }
      }
      // Fill missing fields
      for (const field of ['first_name', 'last_name', 'date_of_birth', 'type'] as const) {
        if (!existing[field] && person[field]) {
          (existing as any)[field] = person[field];
        }
      }
      if (existing.age === null && person.age !== null) existing.age = person.age;
      if (existing.percentage_share === null && person.percentage_share !== null) {
        existing.percentage_share = person.percentage_share;
      }
    }
  }

  return Object.values(merged);
};

// ═══════════════════════════════════════════════════════════════
// RUN ENRICHMENT ACTION — main dispatcher
// ═══════════════════════════════════════════════════════════════

export const runEnrichmentAction = async (
  action: EnrichmentAction,
  row: Record<string, any>,
  mapping: InputMapping,
  apiKey: string
): Promise<EnrichmentResult> => {
  try {
    // Resolve company_id (with fallback chain)
    let companyId: string;
    try {
      companyId = await resolveCompanyId(row, mapping, apiKey);
    } catch (e: any) {
      // Company search action doesn't strictly need ID resolution first
      if (action === 'company_search') {
        const name = row[mapping.companyNameCol]?.toString().trim();
        if (!name) return { companyUpdates: {}, persons: [], resolvedCompanyId: '', error: 'No company name for search' };
        const result = await searchCompany(apiKey, { query: name, per_page: 5 });
        const items = result?.results || result?.companies || (Array.isArray(result) ? result : []);
        if (items.length > 0) {
          const first = items[0];
          const id = parseCompanyId(first);
          return {
            companyUpdates: {
              company_id: id,
              company_name: first?.name?.name || first?.name || '',
              legal_form: first?.legal_form || '',
            },
            persons: [],
            resolvedCompanyId: id
          };
        }
        return { companyUpdates: {}, persons: [], resolvedCompanyId: '', error: 'No results found' };
      }
      return { companyUpdates: {}, persons: [], resolvedCompanyId: '', error: e.message };
    }

    const companyUpdates: Record<string, any> = { company_id: companyId };
    let persons: EnrichedPerson[] = [];

    // ── Company Search ────────────────────────────────────────
    if (action === 'company_search') {
      // Already resolved, just return the ID
      try {
        const company = await getCompanyDetails(apiKey, companyId);
        companyUpdates.company_name = company?.name?.name || '';
        companyUpdates.legal_form = company?.legal_form || '';
      } catch { /* optional */ }
      return { companyUpdates, persons: [], resolvedCompanyId: companyId };
    }

    // ── Company Details ───────────────────────────────────────
    if (action === 'company_details' || action === 'full_enrichment' || action === 'directors_only') {
      const company = await getCompanyDetails(apiKey, companyId);
      const companyName = company?.name?.name || '';
      const companyWebsite = company?.contact?.website_url || row[mapping.websiteCol] || '';
      const registerId = company?.register?.company_id || companyId;

      companyUpdates.company_name = companyName;
      companyUpdates.company_website = companyWebsite;
      companyUpdates.legal_form = company?.legal_form || '';
      companyUpdates.address_street = company?.address?.street || '';
      companyUpdates.address_postal_code = company?.address?.postal_code || '';
      companyUpdates.address_city = company?.address?.city || '';
      companyUpdates.employees = company?.indicators?.[0]?.employees?.toString() || '';
      companyUpdates.net_income = company?.indicators?.[0]?.net_income?.toString() || '';
      companyUpdates.financial_data_date = company?.indicators?.[0]?.date || '';

      const ctx = { company_name: companyName, company_id: companyId, company_website: companyWebsite };

      // Extract directors
      if (action === 'directors_only' || action === 'full_enrichment') {
        const directors = extractDirectors(company, ctx);
        persons = directors;
      }

      // Extract owners (skip for AG)
      if (action === 'full_enrichment') {
        const isAG = (company?.legal_form || '').toLowerCase() === 'ag';
        if (!isAG) {
          try {
            const ownersResponse = await getCompanyOwners(apiKey, registerId);
            const owners = extractOwners(ownersResponse, ctx);
            const ownersList = parseOwners(ownersResponse);
            companyUpdates.ownership_structure = resolveOwnershipStructure(ownersList);
            companyUpdates.ownership_data = JSON.stringify(ownersList);
            // Merge directors + owners
            persons = mergePersons(persons, owners);
          } catch {
            companyUpdates.ownership_structure = 'Error';
          }
        } else {
          companyUpdates.ownership_structure = 'AG (no ownership data)';
        }
      }

      return { companyUpdates, persons, resolvedCompanyId: companyId };
    }

    // ── Ownership Only ────────────────────────────────────────
    if (action === 'ownership_only') {
      // Need company details to check AG and get register ID
      const company = await getCompanyDetails(apiKey, companyId);
      const companyName = company?.name?.name || '';
      const companyWebsite = company?.contact?.website_url || row[mapping.websiteCol] || '';
      const registerId = company?.register?.company_id || companyId;
      const ctx = { company_name: companyName, company_id: companyId, company_website: companyWebsite };

      const isAG = (company?.legal_form || '').toLowerCase() === 'ag';
      if (isAG) {
        return {
          companyUpdates: { ...companyUpdates, ownership_structure: 'AG (no ownership data)' },
          persons: [],
          resolvedCompanyId: companyId,
          error: 'AG companies have no ownership data in Handelsregister'
        };
      }

      const ownersResponse = await getCompanyOwners(apiKey, registerId);
      const ownersList = parseOwners(ownersResponse);
      persons = extractOwners(ownersResponse, ctx);
      companyUpdates.ownership_structure = resolveOwnershipStructure(ownersList);
      companyUpdates.ownership_data = JSON.stringify(ownersList);

      return { companyUpdates, persons, resolvedCompanyId: companyId };
    }

    // ── Financials ────────────────────────────────────────────
    if (action === 'financials') {
      const financials = await getCompanyFinancials(apiKey, companyId);
      companyUpdates.ownership_data = JSON.stringify(financials);
      return { companyUpdates, persons: [], resolvedCompanyId: companyId };
    }

    // ── Contact Info ──────────────────────────────────────────
    if (action === 'contact_info') {
      const contact = await getCompanyContact(apiKey, companyId);
      companyUpdates.ownership_data = JSON.stringify(contact);
      return { companyUpdates, persons: [], resolvedCompanyId: companyId };
    }

    return { companyUpdates, persons, resolvedCompanyId: companyId };

  } catch (e: any) {
    return { companyUpdates: {}, persons: [], resolvedCompanyId: '', error: e.message || 'Unknown error' };
  }
};

// ── Legacy: fetchOwnershipData (kept for backwards compat) ────

export const fetchOwnershipData = async (website: string, apiKey: string) => {
  const mapping: InputMapping = { companyIdCol: '', websiteCol: '__website__', companyNameCol: '' };
  const row = { __website__: website };
  const result = await runEnrichmentAction('full_enrichment', row, mapping, apiKey);
  if (result.error) throw new Error(result.error);
  return {
    company_id: result.resolvedCompanyId,
    company_name: result.companyUpdates.company_name || '',
    company_website: result.companyUpdates.company_website || website,
    legal_form: result.companyUpdates.legal_form || '',
    employees: result.companyUpdates.employees || '',
    address_city: result.companyUpdates.address_city || '',
    address_street: result.companyUpdates.address_street || '',
    address_postal_code: result.companyUpdates.address_postal_code || '',
    ownership_structure: result.companyUpdates.ownership_structure || '',
    ownership_data: result.companyUpdates.ownership_data ? JSON.parse(result.companyUpdates.ownership_data) : [],
    persons: result.persons
  };
};
