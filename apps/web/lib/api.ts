import { GraphQLClient } from "graphql-request";

const endpoint = "/api/graphql";

let _tokenPromise: Promise<string | null> | null = null;
let _tokenExpiresAt = 0;

function getAuthToken(): Promise<string | null> {
  const now = Date.now();
  if (_tokenPromise && now < _tokenExpiresAt) {
    return _tokenPromise;
  }
  _tokenPromise = fetch("/api/auth/token")
    .then((r) => r.json())
    .then((d) => d.token as string | null)
    .catch(() => null);
  // Cache for 50 minutes (token expires in 1 hour)
  _tokenExpiresAt = now + 50 * 60 * 1000;
  return _tokenPromise;
}

/**
 * Creates a GraphQL client that sends authenticated requests to the
 * FastAPI backend. On Vercel, /api/graphql routes directly to Python,
 * so the client fetches an HS256 JWT from /api/auth/token and includes
 * it in the Authorization header.
 */
export const getApiClient = () => {
  return new GraphQLClient(endpoint, {
    requestMiddleware: async (request) => {
      const token = await getAuthToken();
      if (token) {
        return {
          ...request,
          headers: {
            ...(request.headers as Record<string, string>),
            Authorization: `Bearer ${token}`,
          },
        };
      }
      return request;
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
