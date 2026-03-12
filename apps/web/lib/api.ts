import { GraphQLClient } from "graphql-request";

const endpoint = "/api/graphql";

let _cachedToken: string | null = null;
let _tokenExpiresAt = 0;

async function getAuthToken(): Promise<string | null> {
  const now = Date.now();
  if (_cachedToken && now < _tokenExpiresAt) {
    return _cachedToken;
  }
  try {
    const res = await fetch("/api/auth/token");
    const data = await res.json();
    const token = data.token as string | null;
    if (token) {
      _cachedToken = token;
      // Cache for 50 minutes (token expires in 1 hour)
      _tokenExpiresAt = now + 50 * 60 * 1000;
    } else {
      // Don't cache null tokens — retry on next request
      _cachedToken = null;
      _tokenExpiresAt = 0;
    }
    return token;
  } catch {
    _cachedToken = null;
    _tokenExpiresAt = 0;
    return null;
  }
}

/**
 * Creates a GraphQL client that sends authenticated requests to the
 * FastAPI backend. On Vercel, /api/graphql routes directly to Python,
 * so the client fetches an HS256 JWT from /api/auth/token and includes
 * it in the Authorization header.
 */
export const getApiClient = () => {
  return new GraphQLClient(endpoint, {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = await getAuthToken();
      const headers = new Headers(init?.headers);
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return fetch(input, { ...init, headers });
    },
  });
};

/**
 * Basic fetch wrapper for REST endpoints (like webhooks or health checks if needed).
 */
export const apiFetch = async (path: string, options: RequestInit = {}, token?: string | null) => {
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};
