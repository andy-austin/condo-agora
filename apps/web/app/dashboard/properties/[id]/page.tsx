'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getApiClient } from '@/lib/api';
import {
  GET_HOUSE,
  UPDATE_HOUSE,
  type House,
  type GetHouseResponse,
  type UpdateHouseResponse,
} from '@/lib/queries/house';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function HouseDetailPage() {
  const params = useParams();
  const houseId = params.id as string;
  const { getAuthToken } = useAuthToken();

  const [house, setHouse] = useState<House | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchHouse = async () => {
      try {
        const token = await getAuthToken();
        const client = getApiClient(token);
        const data = await client.request<GetHouseResponse>(GET_HOUSE, {
          id: houseId,
        });

        if (!data.house) {
          setError('Property not found.');
          return;
        }

        setHouse(data.house);
        setEditName(data.house.name);
      } catch (err) {
        console.error('Failed to load property:', err);
        setError('Failed to load property details.');
      } finally {
        setLoading(false);
      }
    };

    fetchHouse();
  }, [houseId, getAuthToken]);

  const handleSave = async () => {
    if (!editName.trim() || !house) return;

    setSaving(true);
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      const data = await client.request<UpdateHouseResponse>(UPDATE_HOUSE, {
        id: house.id,
        name: editName.trim(),
      });

      setHouse({ ...house, name: data.updateHouse.name });
      setEditing(false);
    } catch (err) {
      console.error('Failed to update property:', err);
      alert('Failed to update property name.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading property...</div>;
  }

  if (error || !house) {
    return (
      <div className="p-8">
        <p className="text-destructive mb-4">{error || 'Property not found.'}</p>
        <Link href="/dashboard/properties" className="text-primary hover:underline">
          Back to Properties
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard/properties"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; All Properties
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            {editing ? (
              <div className="flex items-center gap-2 flex-1 mr-4">
                <input
                  type="text"
                  className="text-2xl font-semibold bg-background border rounded-lg px-3 py-1 flex-1"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                />
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setEditName(house.name);
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <>
                <CardTitle className="text-2xl">{house.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(true)}
                >
                  Edit
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Created {new Date(house.createdAt).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Residents</CardTitle>
            <Badge variant="secondary">
              {house.residents.length} {house.residents.length === 1 ? 'resident' : 'residents'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {house.residents.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No residents assigned yet. Invite members from the{' '}
              <Link href="/dashboard/settings" className="text-primary hover:underline">
                Settings
              </Link>{' '}
              page.
            </p>
          ) : (
            <div className="space-y-3">
              {house.residents.map((resident) => (
                <div
                  key={resident.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="text-sm">
                    <span className="font-medium">Member</span>
                    <span className="text-muted-foreground ml-2">
                      ID: {resident.userId.slice(0, 8)}...
                    </span>
                  </div>
                  <Badge variant="outline">{resident.role}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
