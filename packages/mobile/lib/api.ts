const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://scriptengine-production.up.railway.app';

async function request<T>(
  path: string,
  options: RequestInit & { token?: string; timeoutMs?: number } = {}
): Promise<T> {
  const { token, timeoutMs = 90_000, ...init } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body?.error ?? `Request failed: ${res.status}`);
    }
    return res.json() as Promise<T>;
  } catch (e: any) {
    if (e.name === 'AbortError') {
      throw new Error('Request timed out — the server is taking too long. Try again.');
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
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

// ---------- Types ----------
export interface ApiTenant {
  id: string;
  clerkUserId: string;
  email: string;
  niche: string;
  city?: string | null;
  callToAction?: string | null;
  tier: 'free' | 'pro' | 'founders' | 'team';
  scriptsPerDay: number;
  scriptsToday: number;
  createdAt: string;
  updatedAt: string;
}

// ---------- Tenants ----------
export const createTenant = (
  data: { email: string; niche: string; city?: string; callToAction?: string },
  token: string
) => request<ApiTenant>('/api/tenants', { method: 'POST', body: JSON.stringify(data), token });

export const getMe = (token: string) => request<ApiTenant>('/api/tenants/me', { token });

export const updateProfile = (
  data: { niche?: string; city?: string; callToAction?: string },
  token: string
) => request<ApiTenant>('/api/tenants/me', { method: 'PATCH', body: JSON.stringify(data), token });

// ---------- Scripts ----------
export const getScripts = (status: string, token: string) =>
  request<ApiScript[]>(`/api/scripts?status=${encodeURIComponent(status)}`, { token });

export const getAllScripts = (token: string) =>
  request<ApiScript[]>('/api/scripts', { token });

export const getTodayScripts = (token: string) =>
  request<ApiScript[]>('/api/scripts/today', { token });

export const getScript = (id: string, token: string) =>
  request<ApiScript>(`/api/scripts/${id}`, { token });

export const generateScript = (
  data: { scriptType?: string; seriesId?: string; additionalContext?: string },
  token: string
) => request<ApiScript>('/api/scripts/generate', { method: 'POST', body: JSON.stringify(data), token });

export async function generateScriptFromPhotos(
  photos: Array<{ uri: string; mimeType?: string }>,
  scriptType: string,
  additionalContext: string | undefined,
  token: string
): Promise<ApiScript> {
  const formData = new FormData();
  photos.forEach((photo, idx) => {
    formData.append('photos', {
      uri: photo.uri,
      name: `photo_${idx}.jpg`,
      type: photo.mimeType ?? 'image/jpeg',
    } as any);
  });
  formData.append('scriptType', scriptType);
  if (additionalContext) formData.append('additionalContext', additionalContext);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  try {
    const res = await fetch(`${API_URL}/api/scripts/generate-from-photos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body?.error ?? `Request failed: ${res.status}`);
    }
    return res.json() as Promise<ApiScript>;
  } catch (e: any) {
    if (e.name === 'AbortError') {
      throw new Error('Request timed out — the server is taking too long. Try again.');
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

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
