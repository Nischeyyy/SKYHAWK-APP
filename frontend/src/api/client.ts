import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const TOKEN_KEY = 'skyhawk_auth_token';

/**
 * Module-level callback fired when any authenticated request receives a 401.
 * AuthProvider sets this to clear the session and show a "session expired" message.
 */
let _onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(cb: () => void) {
  _onUnauthorized = cb;
}

async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string | null) {
  if (Platform.OS === 'web') {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    return;
  }
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getToken() {
  return await getStoredToken();
}

/**
 * Upload a file via multipart/form-data (e.g. to POST /uploads).
 * `file` is a React Native picker asset shape: { uri, name?, type? }.
 */
export async function apiUpload<T = any>(
  path: string,
  file: { uri: string; name?: string; type?: string }
): Promise<T> {
  const token = await getStoredToken();
  const form = new FormData();
  form.append('file', {
    uri: file.uri,
    name: file.name || 'upload.jpg',
    type: file.type || 'image/jpeg',
  } as any);

  const res = await fetch(`${BASE}/api${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || `Upload failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

/** Status codes worth retrying on (GET only, to avoid duplicate side-effects). */
const RETRYABLE_STATUS = new Set([408, 502, 503, 504]);
const MAX_RETRIES = 3;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: any; auth?: boolean } = {}
): Promise<T> {
  const { method = 'GET', body, auth = true } = opts;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = await getStoredToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    let res: Response;
    try {
      res = await fetch(`${BASE}/api${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr: any) {
      // Network-level failure (offline, DNS, timeout)
      const isLastAttempt = attempt >= MAX_RETRIES - 1;
      if (isLastAttempt) {
        throw new Error('Network error — check your connection and try again.');
      }
      await sleep(Math.min(500 * 2 ** attempt, 4000));
      continue;
    }

    // 401 on an authenticated call: session expired — clear it and stop retrying.
    if (res.status === 401 && auth) {
      _onUnauthorized?.();
      throw new Error('SESSION_EXPIRED');
    }

    // Retry transient server errors on safe (read-only) requests only.
    if (RETRYABLE_STATUS.has(res.status) && method === 'GET' && attempt < MAX_RETRIES - 1) {
      await sleep(Math.min(500 * 2 ** attempt, 4000));
      continue;
    }

    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const msg = (data && (data.detail || data.message)) || `Request failed (${res.status})`;
      throw new Error(msg);
    }

    return data as T;
  }

  throw new Error('Request failed after retries');
}
