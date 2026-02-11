
// ═══════════════════════════════════════════════════════════════
// OpenRegister Workflow — Two-Stage Pipeline
// Stage 1: Company Enrichment (company details only)
// Stage 2: Owner Enrichment (directors + owners → Persons sheet)
// ═══════════════════════════════════════════════════════════════

import {
  lookupByWebsite,
  searchCompany,
  getCompanyDetails,
  getCompanyOwners,
  extractDirectors,
  extractOwners,
  mergePersons,
  normalizeName,
  EnrichedPerson,
  InputMapping,
} from './openRegisterAgent';

// ── Enrichment Status Values ──────────────────────────────────

export const ENRICHMENT_STATUS = {
  OPEN: 'Open',
  DONE: 'Done',
  ERROR: 'Error',
  AUTO: 'Auto',
} as const;

export type EnrichmentStatus = typeof ENRICHMENT_STATUS[keyof typeof ENRICHMENT_STATUS];

// ── Result Types ──────────────────────────────────────────────

export interface CompanyEnrichmentResult {
  companyUpdates: Record<string, any>;
  resolvedCompanyId: string;
  error?: string;
}

export interface OwnerEnrichmentResult {
  persons: EnrichedPerson[];
  ownershipStructure: string;
  ownershipData: any[];
  companyUpdates: Record<string, any>;
  error?: string;
}

export interface OwnerEnrichmentOptions {
  includeProkurist: boolean;
}

// ── Helper: Parse company_id from various response shapes ─────

const parseCompanyId = (data: any): string => {
  return data?.company_id || data?.id || data?.company?.id || data?.company?.company_id || data?.register?.company_id || '';
};

const parseOwners = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.owners)) return data.owners;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const resolveOwnershipStructure = (owners: any[]): string => {
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
// STAGE 1: Company Enrichment
// Resolves company ID and fetches company details only.
// No directors or owners in this stage.
// ═══════════════════════════════════════════════════════════════

export const runCompanyEnrichment = async (
  row: Record<string, any>,
  mapping: InputMapping,
  apiKey: string
): Promise<CompanyEnrichmentResult> => {
  try {
    console.log('[Workflow] Company enrichment starting for row:', row.id);
    console.log('[Workflow] Mapping:', mapping);
    let companyId = '';

    // 1. Check if company_id already exists
    const directId = mapping.companyIdCol ? row[mapping.companyIdCol]?.toString().trim() : '';
    if (directId) {
      companyId = directId;
      console.log('[Workflow] Found direct company_id:', companyId);
    }

    // 2. Lookup by website (primary anchor)
    if (!companyId) {
      const website = mapping.websiteCol ? row[mapping.websiteCol]?.toString().trim() : '';
      if (website) {
        console.log('[Workflow] Looking up website:', website);
        try {
          const lookup = await lookupByWebsite(apiKey, website);
          const id = parseCompanyId(lookup);
          if (id) {
            companyId = id;
            console.log('[Workflow] Website lookup resolved to:', companyId);
          }
        } catch (e: any) {
          console.log('[Workflow] Website lookup failed:', e.message);
        }
      }
    }

    // 3. Search by company name (fallback)
    if (!companyId) {
      const name = mapping.companyNameCol ? row[mapping.companyNameCol]?.toString().trim() : '';
      if (name) {
        console.log('[Workflow] Searching by name:', name);
        try {
          const result = await searchCompany(apiKey, { query: name, per_page: 1 });
          const items = result?.results || result?.companies || (Array.isArray(result) ? result : []);
          if (items.length > 0) {
            const id = parseCompanyId(items[0]);
            if (id) {
              companyId = id;
              console.log('[Workflow] Name search resolved to:', companyId);
            }
          }
        } catch (e: any) {
          console.log('[Workflow] Name search failed:', e.message);
        }
      }
    }

    if (!companyId) {
      console.log('[Workflow] Could not resolve company_id');
      return {
        companyUpdates: {},
        resolvedCompanyId: '',
        error: 'Could not resolve company (need website or company name)',
      };
    }

    // ── Fetch Company Details ──────────────────────────────
    console.log('[Workflow] Fetching company details for:', companyId);
    const company = await getCompanyDetails(apiKey, companyId);
    console.log('[Workflow] Company details received:', company?.name?.name);

    const companyUpdates: Record<string, any> = {
      company_id: companyId,
      company_name: company?.name?.name || '',
      company_website: company?.contact?.website_url || (mapping.websiteCol ? row[mapping.websiteCol] : '') || '',
      legal_form: company?.legal_form || '',
      address_street: company?.address?.street || '',
      address_postal_code: company?.address?.postal_code || '',
      address_city: company?.address?.city || '',
      employees: company?.indicators?.[0]?.employees?.toString() || '',
      net_income: company?.indicators?.[0]?.net_income?.toString() || '',
      financial_data_date: company?.indicators?.[0]?.date || '',
    };

    console.log('[Workflow] Company enrichment done:', Object.keys(companyUpdates).length, 'fields');
    return { companyUpdates, resolvedCompanyId: companyId };
  } catch (e: any) {
    console.error('[Workflow] Company enrichment error:', e.message);
    return {
      companyUpdates: {},
      resolvedCompanyId: '',
      error: e.message || 'Unknown error during company enrichment',
    };
  }
};

// ═══════════════════════════════════════════════════════════════
// STAGE 2: Owner Enrichment
// Requires company_id from Stage 1.
// Fetches directors + owners, merges, and returns persons.
// ═══════════════════════════════════════════════════════════════

export const runOwnerEnrichment = async (
  row: Record<string, any>,
  mapping: InputMapping,
  apiKey: string,
  options: OwnerEnrichmentOptions = { includeProkurist: false }
): Promise<OwnerEnrichmentResult> => {
  try {
    const companyId = row[mapping.companyIdCol]?.toString().trim() || row['company_id']?.toString().trim();
    if (!companyId) {
      return {
        persons: [],
        ownershipStructure: '',
        ownershipData: [],
        companyUpdates: {},
        error: 'No company_id available. Run Company Enrichment first.',
      };
    }

    // ── Fetch Company Details (for directors) ──────────────
    const company = await getCompanyDetails(apiKey, companyId);
    const companyName = company?.name?.name || row['company_name'] || '';
    const companyWebsite = company?.contact?.website_url || row[mapping.websiteCol] || row['company_website'] || '';
    const registerId = company?.register?.company_id || companyId;
    const legalForm = (company?.legal_form || row['legal_form'] || '').toString().toLowerCase();

    const ctx = {
      company_name: companyName,
      company_id: companyId,
      company_website: companyWebsite,
    };

    // ── Extract Directors ──────────────────────────────────
    let directors = extractDirectors(company, ctx);

    // Rename DIRECTOR → Managing Director
    directors = directors.map(d => ({
      ...d,
      role: d.role === 'DIRECTOR' ? 'Managing Director' : d.role,
    }));

    // Filter out Prokuristen if not included
    if (!options.includeProkurist) {
      directors = directors.filter(d => {
        const roleLower = d.role.toLowerCase();
        return !roleLower.includes('prokurist');
      });
    }

    // ── AG Check → Skip Ownership ──────────────────────────
    const isAG = legalForm === 'ag';
    let owners: EnrichedPerson[] = [];
    let ownersList: any[] = [];
    let ownershipStructure = '';
    const companyUpdates: Record<string, any> = {};

    if (isAG) {
      ownershipStructure = 'AG (no ownership data)';
      companyUpdates.ownership_structure = ownershipStructure;
    } else {
      // ── Fetch Owners ────────────────────────────────────
      try {
        const ownersResponse = await getCompanyOwners(apiKey, registerId);
        ownersList = parseOwners(ownersResponse);
        owners = extractOwners(ownersResponse, ctx);
        ownershipStructure = resolveOwnershipStructure(ownersList);
        companyUpdates.ownership_structure = ownershipStructure;
        companyUpdates.ownership_data = JSON.stringify(ownersList);
      } catch {
        ownershipStructure = 'Error fetching owners';
        companyUpdates.ownership_structure = ownershipStructure;
      }
    }

    // ── Merge Directors + Owners (dedup by normalized name) ─
    const mergedPersons = mergePersons(directors, owners);

    return {
      persons: mergedPersons,
      ownershipStructure,
      ownershipData: ownersList,
      companyUpdates,
    };
  } catch (e: any) {
    return {
      persons: [],
      ownershipStructure: '',
      ownershipData: [],
      companyUpdates: {},
      error: e.message || 'Unknown error during owner enrichment',
    };
  }
};
