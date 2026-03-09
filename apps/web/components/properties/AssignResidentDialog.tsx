'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getApiClient } from '@/lib/api';
import {
  GET_ORGANIZATION_MEMBERS,
  type Member,
  type GetMembersResponse,
} from '@/lib/queries/members';
import {
  ASSIGN_RESIDENT_TO_HOUSE,
  type AssignResidentResponse,
} from '@/lib/queries/house';

type AssignResidentDialogProps = {
  organizationId: string;
  houseId: string;
  existingResidentUserIds: string[];
  onAssigned: () => void;
  getAuthToken: () => Promise<string | null>;
};

export default function AssignResidentDialog({
  organizationId,
  houseId,
  existingResidentUserIds,
  onAssigned,
  getAuthToken,
}: AssignResidentDialogProps) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    if (!open) return;

    const fetchMembers = async () => {
      setLoadingMembers(true);
      try {
        const token = await getAuthToken();
        const client = getApiClient(token);
        const data = await client.request<GetMembersResponse>(
          GET_ORGANIZATION_MEMBERS,
          { organizationId }
        );
        // Filter to members not already assigned to this house
        const available = data.organizationMembers.filter(
          (m) => !existingResidentUserIds.includes(m.userId)
        );
        setMembers(available);
        setSelectedUserId('');
      } catch (err) {
        console.error('Failed to load members:', err);
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchMembers();
  }, [open, organizationId, existingResidentUserIds, getAuthToken]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setSubmitting(true);
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      await client.request<AssignResidentResponse>(ASSIGN_RESIDENT_TO_HOUSE, {
        userId: selectedUserId,
        houseId,
      });
      setSelectedUserId('');
      setOpen(false);
      onAssigned();
    } catch (err) {
      console.error('Failed to assign resident:', err);
      const message =
        err instanceof Error ? err.message : 'Failed to assign resident.';
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  const getMemberLabel = (m: Member) => {
    const name = [m.firstName, m.lastName].filter(Boolean).join(' ');
    return name ? `${name} (${m.email})` : m.email;
  };

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        + Add Resident
      </Button>
    );
  }

  return (
    <Card className="max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Add Resident</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="resident-select"
              className="block text-sm font-medium mb-2"
            >
              Select Member
            </label>
            {loadingMembers ? (
              <p className="text-sm text-muted-foreground">Loading members...</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No available members to assign.
              </p>
            ) : (
              <select
                id="resident-select"
                className="w-full p-2.5 rounded-lg border bg-background"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
              >
                <option value="">Choose a member...</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {getMemberLabel(m)}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={submitting || !selectedUserId || loadingMembers}
            >
              {submitting ? 'Assigning...' : 'Assign'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setSelectedUserId('');
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
