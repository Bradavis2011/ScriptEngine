const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://scriptengine-production.up.railway.app';

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...init } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body?.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ---------- Types ----------
export interface ApiScriptSection {
  heading: string;
  script: string;
  bRollSuggestion: string;
  cameraDirection: string;
  textOverlay: string;
}

export interface ApiScriptData {
  coldOpen: string;
  coldOpenCamera: string;
  sections: ApiScriptSection[];
  callToAction: string;
  callToActionCamera: string;
  teleprompterText: string;
  caption: string;
  hashtags: string[];
  totalDurationSeconds: number;
}

export interface ApiScript {
  id: string;
  tenantId: string;
  scriptType: string;
  filmingStatus: string;
  scriptData: ApiScriptData;
  seriesId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSeries {
  id: string;
  tenantId: string;
  name: string;
  episodeCount: number;
  status: string;
  createdAt: string;
}

// ---------- Tenants ----------
export const createTenant = (data: { email: string; niche: string }, token: string) =>
  request('/api/tenants', { method: 'POST', body: JSON.stringify(data), token });

export const getMe = (token: string) => request('/api/tenants/me', { token });

// ---------- Scripts ----------
export const getScripts = (status: string, token: string) =>
  request<ApiScript[]>(`/api/scripts?status=${encodeURIComponent(status)}`, { token });

export const getTodayScripts = (token: string) =>
  request<ApiScript[]>('/api/scripts/today', { token });

export const getScript = (id: string, token: string) =>
  request<ApiScript>(`/api/scripts/${id}`, { token });

export const generateScript = (
  data: { scriptType?: string; seriesId?: string; additionalContext?: string },
  token: string
) => request<ApiScript>('/api/scripts/generate', { method: 'POST', body: JSON.stringify(data), token });

export const updateScriptStatus = (
  id: string,
  filmingStatus: 'ready' | 'filmed' | 'posted',
  token: string
) =>
  request<ApiScript>(`/api/scripts/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ filmingStatus }),
    token,
  });

// ---------- Series ----------
export const getSeries = (token: string) => request<ApiSeries[]>('/api/series', { token });

export const createSeries = (data: { name: string }, token: string) =>
  request<ApiSeries>('/api/series', { method: 'POST', body: JSON.stringify(data), token });
