export const API_BASE = "https://custom.mizcall.com";

export async function apiFetch<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export async function apiFetchWithRefresh<T>(
  path: string,
  token: string | null,
  refreshToken: string | null,
  onTokens?: (token: string, refreshToken?: string | null, extra?: any) => Promise<void> | void,
  options?: RequestInit,
): Promise<T> {
  const attempt = async (bearer: string | null) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options?.headers as Record<string, string> | undefined),
    };
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    return fetch(`${API_BASE}${path}`, { ...options, headers });
  };

  let res = await attempt(token);
  if (res.status !== 401 || !refreshToken) {
    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try {
        const body = await res.json();
        if (body?.error) message = body.error;
      } catch {
        // ignore
      }
      throw new Error(message);
    }
    return res.json() as Promise<T>;
  }

  // try refresh
  const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!refreshRes.ok) {
    let message = `Refresh failed (${refreshRes.status})`;
    try {
      const body = await refreshRes.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  const refreshData = await refreshRes.json();
  if (onTokens) await onTokens(refreshData.token, refreshData.refreshToken ?? refreshToken, refreshData);

  res = await attempt(refreshData.token);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}
