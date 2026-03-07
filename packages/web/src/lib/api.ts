// API client for ClipScript backend
// Auth token injection will be wired up in Phase 1C when Clerk is added

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...init } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body?.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ---------- Tenants ----------
export const createTenant = (data: { email: string; niche: string }, token: string) =>
  request('/api/tenants', { method: 'POST', body: JSON.stringify(data), token });

export const getMe = (token: string) =>
  request('/api/tenants/me', { token });

// ---------- Scripts ----------
export const getTodayScripts = (token: string) =>
  request('/api/scripts/today', { token });

export const getScript = (id: string, token: string) =>
  request(`/api/scripts/${id}`, { token });

export const generateScript = (
  data: { scriptType?: string; seriesId?: string; additionalContext?: string },
  token: string
) => request('/api/scripts/generate', { method: 'POST', body: JSON.stringify(data), token });

export const updateScriptStatus = (
  id: string,
  filmingStatus: 'ready' | 'filmed' | 'posted',
  token: string
) =>
  request(`/api/scripts/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ filmingStatus }),
    token,
  });

// ---------- Series ----------
export const getSeries = (token: string) => request('/api/series', { token });

export const createSeries = (data: { name: string }, token: string) =>
  request('/api/series', { method: 'POST', body: JSON.stringify(data), token });

export const getSeriesEpisodes = (seriesId: string, token: string) =>
  request(`/api/series/${seriesId}/episodes`, { token });
