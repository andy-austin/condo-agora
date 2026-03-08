'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthToken } from './use-auth-token';
import { getApiClient } from '@/lib/api';

const ME_ROLE_QUERY = `
  query Me {
    me {
      id
      memberships {
        organization {
          id
          name
        }
        role
      }
    }
  }
`;

type Membership = {
  organization: { id: string; name: string };
  role: string;
};

type MeResponse = {
  me: {
    id: string;
    memberships: Membership[];
  } | null;
};

export function useUserRole() {
  const { getAuthToken } = useAuthToken();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      const data = await client.request<MeResponse>(ME_ROLE_QUERY);

      if (data.me) {
        setMemberships(data.me.memberships);
      }
    } catch (err) {
      console.error('Failed to fetch user role:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  const getRoleForOrg = useCallback(
    (organizationId: string): string | null => {
      const membership = memberships.find(
        (m) => m.organization.id === organizationId
      );
      return membership?.role ?? null;
    },
    [memberships]
  );

  const isAdminForOrg = useCallback(
    (organizationId: string): boolean => {
      return getRoleForOrg(organizationId) === 'ADMIN';
    },
    [getRoleForOrg]
  );

  return {
    memberships,
    loading,
    getRoleForOrg,
    isAdminForOrg,
    refetch: fetchRole,
  };
}
