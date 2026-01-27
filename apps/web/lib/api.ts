import { GraphQLClient } from "graphql-request";

const endpoint = "/api/graphql";

/**
 * Creates a GraphQL client with optional authentication.
 * 
 * @param token - The Clerk session token.
 * @returns A GraphQLClient instance configured with the necessary headers.
 */
export const getApiClient = (token?: string | null) => {
  return new GraphQLClient(endpoint, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
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
