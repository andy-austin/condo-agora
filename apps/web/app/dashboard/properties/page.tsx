'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getApiClient } from '@/lib/api';
import {
  GET_HOUSES,
  CREATE_HOUSE,
  DELETE_HOUSE,
  type House,
  type GetHousesResponse,
  type CreateHouseResponse,
  type DeleteHouseResponse,
} from '@/lib/queries/house';
import HouseList from '@/components/properties/HouseList';
import CreateHouseDialog from '@/components/properties/CreateHouseDialog';

const ME_QUERY = `
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

type MeResponse = {
  me: {
    id: string;
    memberships: {
      organization: { id: string; name: string };
      role: string;
    }[];
  } | null;
};

export default function PropertiesPage() {
  const router = useRouter();
  const { getAuthToken } = useAuthToken();

  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState('');
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchHouses = useCallback(async (orgId: string) => {
    const token = await getAuthToken();
    const client = getApiClient(token);
    const data = await client.request<GetHousesResponse>(GET_HOUSES, {
      organizationId: orgId,
    });
    return data.houses;
  }, [getAuthToken]);

  useEffect(() => {
    const init = async () => {
      try {
        const token = await getAuthToken();
        const client = getApiClient(token);
        const meData = await client.request<MeResponse>(ME_QUERY);

        if (!meData.me || meData.me.memberships.length === 0) {
          setError('You are not part of any organization.');
          setLoading(false);
          return;
        }

        const membership = meData.me.memberships[0];
        const orgId = membership.organization.id;
        setOrganizationId(orgId);
        setOrganizationName(membership.organization.name);

        const houseList = await fetchHouses(orgId);

        // Smart Default: if exactly 1 house, redirect to its detail page
        if (houseList.length === 1) {
          router.replace(`/dashboard/properties/${houseList[0].id}`);
          return;
        }

        setHouses(houseList);
      } catch (err) {
        console.error('Failed to load properties:', err);
        setError('Failed to load properties.');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [getAuthToken, fetchHouses, router]);

  const handleCreate = async (name: string) => {
    if (!organizationId) return;

    const token = await getAuthToken();
    const client = getApiClient(token);
    const data = await client.request<CreateHouseResponse>(CREATE_HOUSE, {
      organizationId,
      name,
    });

    const updated = [...houses, data.createHouse];
    setHouses(updated);

    // If this is the first house, redirect to detail page (Smart Default)
    if (updated.length === 1) {
      router.replace(`/dashboard/properties/${data.createHouse.id}`);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      await client.request<DeleteHouseResponse>(DELETE_HOUSE, { id });
      setHouses(houses.filter((h) => h.id !== id));
    } catch (err) {
      console.error('Failed to delete property:', err);
      alert('Failed to delete property. Make sure there are no residents assigned.');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return <div className="p-8">Loading properties...</div>;
  }

  if (error) {
    return <div className="p-8 text-destructive">{error}</div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Properties</h1>
          {organizationName && (
            <p className="text-muted-foreground mt-1">{organizationName}</p>
          )}
        </div>
        <CreateHouseDialog onSubmit={handleCreate} />
      </div>

      <HouseList houses={houses} onDelete={handleDelete} deleting={deleting} />
    </div>
  );
}
