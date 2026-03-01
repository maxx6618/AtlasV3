
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

import {
  serperGoogleSearch,
  extractCompanyFromNorthData,
  expandUmlauts,
} from './serperService';

// ── Subsidiary Detection ──────────────────────────────
// Words indicating a subsidiary / non-parent entity

const SUBSIDIARY_INDICATORS = [
  'immobilien', 'insurance', 'property', 'systems', 'protection',
  'solutions', 'services', 'digital', 'consulting', 'vermögen',
  'immo', 'logistik', 'energy', 'financial', 'ventures', 'capital',
  'association', 'verein', 'partners', 'großhandel', 'verlag',
  'beteiligungs', 'pensionsfonds', 'healthcare', 'automotive',
  'mantel', 'verwaltung', 'freizeitgruppe', 'robotics', 'ebike',
  'performance', 'dematic', 'electronics', 'paket', 'express',
  'real estate', 'beteiligung', 'stiftung', 'luftsport', 'fischen',
  'supply chain', 'freight',
];

/**
 * Check if a company name looks like the parent holding, not a subsidiary.
 * Must contain brandKeyword and must NOT contain subsidiary indicators.
 */
const isLikelyParent = (name: string, brandKeyword: string): boolean => {
  const nameLower = name.toLowerCase();
  const keywords = brandKeyword.toLowerCase().split(/\s+/);
  for (const kw of keywords) {
    if (!nameLower.includes(kw)) return false;
  }
  for (const sub of SUBSIDIARY_INDICATORS) {
    if (nameLower.includes(sub)) return false;
  }
  return true;
};

/**
 * Score how likely a company is the parent. Higher = better.
 * Prefers shorter names with AG/SE/KGaA legal forms.
 */
const scoreParent = (name: string, brandKeyword: string): number => {
  if (!isLikelyParent(name, brandKeyword)) return -1;
  let score = 100 - name.length * 0.5;
  const lower = name.toLowerCase();
  if (lower.includes('aktiengesellschaft') || / ag(\s|$|,)/.test(lower)) score += 15;
  if (/ se(\s|$|,)/.test(lower)) score += 15;
  if (lower.includes('kgaa')) score += 12;
  if (lower.includes('gmbh') && !lower.includes('co.')) score += 5;
  return score;
};

/**
 * From a list of OpenRegister search results, pick the most likely parent.
 */
const findBestParent = (
  items: any[],
  brandKeyword: string
): { item: any; score: number } | null => {
  let best: any = null;
  let bestScore = -1;
  for (const item of items || []) {
    const nameObj = item?.name;
    const iname = typeof nameObj === 'object' ? nameObj?.name || '' : String(nameObj || '');
    const s = scoreParent(iname, brandKeyword);
    if (s > bestScore) {
      bestScore = s;
      best = item;
    }
  }
  return best && bestScore > 0 ? { item: best, score: bestScore } : null;
};

/** Extract brand keyword from a domain or company_name for subsidiary checks. */
const extractBrand = (row: Record<string, any>, mapping: InputMapping): string => {
  // Prefer company_name if it looks like a proper name
  const name = mapping.companyNameCol ? (row[mapping.companyNameCol] || '').toString().trim() : '';
  if (name && name.length > 1) return name;
  // Fallback: extract from website domain
  const website = mapping.websiteCol ? (row[mapping.websiteCol] || '').toString().trim() : '';
  if (website) {
    const domain = website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    return domain.split('.')[0] || '';
  }
  return '';
};

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
    const brand = extractBrand(row, mapping);
    console.log('[Workflow] Company enrichment starting for row:', row.id, '| brand:', brand);
    let companyId = '';

    // ═══════════════════════════════════════════════════════
    // 1. Check if company_id already exists
    // ═══════════════════════════════════════════════════════
    const directId = mapping.companyIdCol ? row[mapping.companyIdCol]?.toString().trim() : '';
    if (directId) {
      companyId = directId;
      console.log('[Workflow] Found direct company_id:', companyId);
    }

    // ═══════════════════════════════════════════════════════
    // STRATEGY 1: Lookup by website (primary anchor)
    // Validates result is parent company, not subsidiary
    // ═══════════════════════════════════════════════════════
    if (!companyId) {
      const website = mapping.websiteCol ? row[mapping.websiteCol]?.toString().trim() : '';
      if (website) {
        console.log('[Workflow] Strategy 1: URL lookup for', website);
        try {
          const lookup = await lookupByWebsite(apiKey, website);
          const id = parseCompanyId(lookup);
          if (id) {
            // Validate: is this the parent company?
            if (brand) {
              const details = await getCompanyDetails(apiKey, id);
              const resolvedName = details?.name?.name || '';
              if (isLikelyParent(resolvedName, brand)) {
                companyId = id;
                console.log('[Workflow] Strategy 1 ✓ Parent confirmed:', resolvedName);
              } else {
                console.log('[Workflow] Strategy 1 → Subsidiary detected:', resolvedName, '– falling through');
              }
            } else {
              // No brand to validate against, accept the result
              companyId = id;
              console.log('[Workflow] Strategy 1 ✓ Accepted (no brand check):', id);
            }
          }
        } catch (e: any) {
          console.log('[Workflow] Strategy 1 failed:', e.message);
        }
      }
    }

    // ═══════════════════════════════════════════════════════
    // STRATEGY 1b: Serper Google → NorthData name → OR search
    // Uses Google to find the correct parent legal entity name,
    // then searches OpenRegister by that exact name.
    // ═══════════════════════════════════════════════════════
    if (!companyId && brand) {
      console.log('[Workflow] Strategy 1b: Serper search for', brand);
      try {
        const expandedBrand = expandUmlauts(brand);
        const query = `${expandedBrand} Handelsregister AG OR GmbH OR SE OR KG`;
        const serperData = await serperGoogleSearch(query);

        if (!serperData.error) {
          // Collect candidate names from NorthData URLs
          const candidates: string[] = [];
          for (const result of serperData.results.slice(0, 7)) {
            if (result.url.includes('northdata.de')) {
              const ndName = extractCompanyFromNorthData(result.url);
              if (ndName) candidates.push(ndName);
            }
          }
          // Also check Knowledge Graph
          if (serperData.knowledgeGraph?.title) {
            candidates.push(serperData.knowledgeGraph.title);
          }

          // Score candidates and pick best parent
          let bestCandidate: string | null = null;
          let bestCandidateScore = -1;
          for (const c of candidates) {
            const s = scoreParent(c, brand);
            if (s > bestCandidateScore) {
              bestCandidateScore = s;
              bestCandidate = c;
            }
          }

          if (bestCandidate) {
            console.log('[Workflow] Strategy 1b: Best NorthData candidate:', bestCandidate);
            // Search OpenRegister by this exact name
            const searchResult = await searchCompany(apiKey, { query: bestCandidate, per_page: 5 });
            const items = searchResult?.results || searchResult?.companies || (Array.isArray(searchResult) ? searchResult : []);
            const parentMatch = findBestParent(items, brand);
            if (parentMatch) {
              const id = parseCompanyId(parentMatch.item);
              if (id) {
                companyId = id;
                console.log('[Workflow] Strategy 1b ✓ Resolved via Serper→OR:', id);
              }
            }

            // If OR search didn't match, we still have the NorthData name
            // Store it so company details can be fetched
            if (!companyId && bestCandidate) {
              // Try a direct name search as last attempt
              const directSearch = await searchCompany(apiKey, { query: bestCandidate, per_page: 1 });
              const directItems = directSearch?.results || directSearch?.companies || (Array.isArray(directSearch) ? directSearch : []);
              if (directItems.length > 0) {
                const id = parseCompanyId(directItems[0]);
                if (id) {
                  companyId = id;
                  console.log('[Workflow] Strategy 1b ✓ Resolved via direct name:', id);
                }
              }
            }
          }
        }
      } catch (e: any) {
        console.log('[Workflow] Strategy 1b failed:', e.message);
      }
    }

    // ═══════════════════════════════════════════════════════
    // STRATEGY 2: Search by company name (fallback)
    // Uses subsidiary scoring to pick the best result
    // ═══════════════════════════════════════════════════════
    if (!companyId) {
      const name = mapping.companyNameCol ? row[mapping.companyNameCol]?.toString().trim() : '';
      const searchTerm = name || brand;
      if (searchTerm) {
        console.log('[Workflow] Strategy 2: Name search for', searchTerm);
        try {
          const result = await searchCompany(apiKey, { query: searchTerm, per_page: 5 });
          const items = result?.results || result?.companies || (Array.isArray(result) ? result : []);

          if (brand) {
            // Use scoring to find parent
            const parentMatch = findBestParent(items, brand);
            if (parentMatch) {
              const id = parseCompanyId(parentMatch.item);
              if (id) {
                companyId = id;
                console.log('[Workflow] Strategy 2 ✓ Best parent:', id);
              }
            }
          }

          // Fallback: just take the first result
          if (!companyId && items.length > 0) {
            const id = parseCompanyId(items[0]);
            if (id) {
              companyId = id;
              console.log('[Workflow] Strategy 2 ✓ First result:', id);
            }
          }
        } catch (e: any) {
          console.log('[Workflow] Strategy 2 failed:', e.message);
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
