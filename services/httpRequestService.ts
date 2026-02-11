import { ColumnDefinition, HttpAuthType, HttpMethod, HttpRequestConfig, RowData } from '../types';

const resolveReferences = (text: string, row: RowData, columns: ColumnDefinition[]) => {
  let resolved = text;
  const sortedCols = [...columns].sort((a, b) => b.id.length - a.id.length);
  sortedCols.forEach(col => {
    const val = row[col.id]?.toString() || '';
    const regex = new RegExp(`/${col.id}(?!\\w)`, 'g');
    resolved = resolved.replace(regex, val);
  });
  return resolved;
};

const resolveRecordReferences = (
  input: Record<string, string>,
  row: RowData,
  columns: ColumnDefinition[]
) => {
  return Object.entries(input).reduce<Record<string, string>>((acc, [key, val]) => {
    acc[key] = resolveReferences(val, row, columns);
    return acc;
  }, {});
};

const getValueByPath = (data: any, path: string) => {
  if (!path) return undefined;
  const normalized = path.replace(/\[(\d+)\]/g, '.$1');
  const parts = normalized.split('.').filter(Boolean);
  let current = data;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
};

const applyAuth = (
  config: HttpRequestConfig,
  url: string,
  headers: Record<string, string>
) => {
  switch (config.auth.type) {
    case HttpAuthType.API_KEY: {
      if (config.auth.apiKeyHeader && config.auth.apiKeyValue) {
        headers[config.auth.apiKeyHeader] = config.auth.apiKeyValue;
        return { url, headers };
      }
      if (config.auth.apiKeyQueryParam && config.auth.apiKeyValue) {
        const param = encodeURIComponent(config.auth.apiKeyQueryParam);
        const value = encodeURIComponent(config.auth.apiKeyValue);
        const separator = url.includes('?') ? '&' : '?';
        return { url: `${url}${separator}${param}=${value}`, headers };
      }
      return { url, headers };
    }
    case HttpAuthType.BEARER: {
      if (config.auth.bearerToken) {
        headers.Authorization = `Bearer ${config.auth.bearerToken}`;
      }
      return { url, headers };
    }
    case HttpAuthType.BASIC: {
      if (config.auth.basicUser && config.auth.basicPassword) {
        const encoded = btoa(`${config.auth.basicUser}:${config.auth.basicPassword}`);
        headers.Authorization = `Basic ${encoded}`;
      }
      return { url, headers };
    }
    case HttpAuthType.NONE:
    default:
      return { url, headers };
  }
};

export const executeHttpRequest = async (
  config: HttpRequestConfig,
  row: RowData,
  columns: ColumnDefinition[],
  signal?: AbortSignal
) => {
  const resolvedUrl = resolveReferences(config.url, row, columns);
  const resolvedHeaders = resolveRecordReferences(config.headers || {}, row, columns);
  const bodyTemplate = config.body ? resolveReferences(config.body, row, columns) : undefined;

  const { url, headers } = applyAuth(config, resolvedUrl, { ...resolvedHeaders });

  const fetchOptions: RequestInit = {
    method: config.method,
    headers,
    signal
  };

  if (config.method !== HttpMethod.GET && config.method !== HttpMethod.DELETE && bodyTemplate) {
    fetchOptions.body = bodyTemplate;
    if (!fetchOptions.headers) fetchOptions.headers = {};
    if (!('Content-Type' in fetchOptions.headers)) {
      (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
    }
  }

  const response = await fetch(url, fetchOptions);
  const contentType = response.headers.get('content-type') || '';
  const raw = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof raw === 'string' ? raw : JSON.stringify(raw);
    throw new Error(`HTTP ${response.status}: ${message}`);
  }

  const mappingUpdates = Object.entries(config.responseMapping || {}).reduce<Record<string, any>>(
    (acc, [path, columnHeader]) => {
      const targetCol = columns.find(c => c.header === columnHeader);
      if (!targetCol) return acc;
      const value = getValueByPath(raw, path);
      if (value === undefined) return acc;
      acc[targetCol.id] = typeof value === 'string' ? value : JSON.stringify(value);
      return acc;
    },
    {}
  );

  return { raw, updates: mappingUpdates };
};
