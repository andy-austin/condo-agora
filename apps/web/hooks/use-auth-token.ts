import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

/**
 * Custom hook to retrieve the current Clerk authentication token.
 * This token should be included in the 'Authorization' header as a Bearer token
 * for all authenticated requests to the backend API.
 */
export function useAuthToken() {
  const { getToken } = useAuth();

  const getAuthToken = useCallback(async () => {
    try {
      return await getToken();
    } catch (error) {
      console.error("Failed to get auth token:", error);
      return null;
    }
  }, [getToken]);

  return { getAuthToken };
}
