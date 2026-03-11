'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getApiClient } from '@/lib/api';
import {
  CREATE_ORGANIZATION,
  type CreateOrganizationResponse,
} from '@/lib/queries/organization';
import { CREATE_HOUSE, type CreateHouseResponse } from '@/lib/queries/house';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Step = 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Organization
  const [orgName, setOrgName] = useState('');
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgSlug, setOrgSlug] = useState('');

  // Step 2: Houses
  const [houseName, setHouseName] = useState('');
  const [houses, setHouses] = useState<{ id: string; name: string }[]>([]);
  const [bulkPrefix, setBulkPrefix] = useState('');
  const [bulkStart, setBulkStart] = useState('');
  const [bulkEnd, setBulkEnd] = useState('');

  const handleCreateOrg = async (e: FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;

    setSubmitting(true);
    try {
      const client = getApiClient();
      const data = await client.request<CreateOrganizationResponse>(
        CREATE_ORGANIZATION,
        { name: orgName.trim() }
      );

      setOrgId(data.createOrganization.id);
      setOrgSlug(data.createOrganization.slug);
      setStep(2);
    } catch (err) {
      console.error('Failed to create organization:', err);
      alert('Failed to create organization. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddHouse = async (name: string) => {
    if (!orgId || !name.trim()) return;

    const client = getApiClient();
    const data = await client.request<CreateHouseResponse>(CREATE_HOUSE, {
      organizationId: orgId,
      name: name.trim(),
    });

    setHouses((prev) => [...prev, { id: data.createHouse.id, name: data.createHouse.name }]);
  };

  const handleAddSingleHouse = async (e: FormEvent) => {
    e.preventDefault();
    if (!houseName.trim()) return;

    setSubmitting(true);
    try {
      await handleAddHouse(houseName.trim());
      setHouseName('');
    } catch (err) {
      console.error('Failed to add house:', err);
      alert('Failed to add property.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkAdd = async (e: FormEvent) => {
    e.preventDefault();
    const start = parseInt(bulkStart);
    const end = parseInt(bulkEnd);
    if (isNaN(start) || isNaN(end) || start > end || !bulkPrefix.trim()) return;

    setSubmitting(true);
    try {
      for (let i = start; i <= end; i++) {
        await handleAddHouse(`${bulkPrefix.trim()} ${i}`);
      }
      setBulkPrefix('');
      setBulkStart('');
      setBulkEnd('');
    } catch (err) {
      console.error('Failed to bulk add:', err);
      alert('Some properties may not have been created.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = () => {
    router.push('/dashboard');
  };

  const steps = [
    { num: 1, label: 'Organization' },
    { num: 2, label: 'Properties' },
    { num: 3, label: 'Done' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-2">Set Up Your Community</h1>
        <p className="text-muted-foreground mb-8">
          Get started by creating your organization and adding properties.
        </p>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s.num
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step > s.num ? '✓' : s.num}
              </div>
              <span
                className={`text-sm ${
                  step >= s.num ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={`w-12 h-0.5 ${
                    step > s.num ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Create Organization */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Create Your Organization</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateOrg} className="space-y-4">
                <div>
                  <label htmlFor="org-name" className="block text-sm font-medium mb-2">
                    Organization Name
                  </label>
                  <input
                    id="org-name"
                    type="text"
                    placeholder="e.g. Torre del Sol, Residencial Las Palmas"
                    className="w-full p-2.5 rounded-lg border bg-background"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <Button type="submit" disabled={submitting || !orgName.trim()}>
                  {submitting ? 'Creating...' : 'Create Organization'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Add Houses */}
        {step === 2 && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Add Properties / Units</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Add the houses or units in your community. You can add them one by one
                  or in bulk.
                </p>

                {/* Single add */}
                <form onSubmit={handleAddSingleHouse} className="flex gap-2 mb-6">
                  <input
                    type="text"
                    placeholder="e.g. Unit 101, Block A - 404"
                    className="flex-1 p-2.5 rounded-lg border bg-background"
                    value={houseName}
                    onChange={(e) => setHouseName(e.target.value)}
                  />
                  <Button type="submit" disabled={submitting || !houseName.trim()}>
                    Add
                  </Button>
                </form>

                {/* Bulk add */}
                <details className="border rounded-lg p-4">
                  <summary className="text-sm font-medium cursor-pointer">
                    Bulk add (e.g. Unit 101-120)
                  </summary>
                  <form onSubmit={handleBulkAdd} className="mt-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Prefix</label>
                      <input
                        type="text"
                        placeholder="e.g. Unit, Apt, Block A -"
                        className="w-full p-2 rounded-lg border bg-background text-sm"
                        value={bulkPrefix}
                        onChange={(e) => setBulkPrefix(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">From</label>
                        <input
                          type="number"
                          placeholder="101"
                          className="w-full p-2 rounded-lg border bg-background text-sm"
                          value={bulkStart}
                          onChange={(e) => setBulkStart(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">To</label>
                        <input
                          type="number"
                          placeholder="120"
                          className="w-full p-2 rounded-lg border bg-background text-sm"
                          value={bulkEnd}
                          onChange={(e) => setBulkEnd(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      variant="secondary"
                      disabled={submitting || !bulkPrefix.trim() || !bulkStart || !bulkEnd}
                    >
                      {submitting ? 'Adding...' : 'Add Range'}
                    </Button>
                  </form>
                </details>

                {/* Added houses list */}
                {houses.length > 0 && (
                  <div className="mt-6">
                    <p className="text-sm font-medium mb-2">
                      Added properties ({houses.length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {houses.map((h) => (
                        <Badge key={h.id} variant="secondary">
                          {h.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>
                Skip for now
              </Button>
              <Button onClick={() => setStep(3)} disabled={houses.length === 0}>
                Continue
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">&#10003;</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">You&apos;re All Set!</h2>
              <p className="text-muted-foreground mb-2">
                <span className="font-semibold text-foreground">{orgName}</span> has been
                created{houses.length > 0 ? ` with ${houses.length} properties` : ''}.
              </p>
              {orgSlug && (
                <p className="text-xs text-muted-foreground mb-6">
                  Slug: {orgSlug}
                </p>
              )}
              <p className="text-sm text-muted-foreground mb-8">
                Head to your dashboard to invite members and start managing your community.
              </p>
              <Button onClick={handleFinish} size="lg">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
