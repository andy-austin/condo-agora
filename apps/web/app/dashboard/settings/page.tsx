'use client';

import { useState, FormEvent } from 'react';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getApiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';

const CREATE_INVITATION = `
  mutation CreateInvitation($email: String!, $organizationId: String!, $role: Role!) {
    createInvitation(email: $email, organizationId: $organizationId, role: $role) {
      id
      email
      token
    }
  }
`;

export default function SettingsPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { getAuthToken } = useAuthToken();

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      
      // Mocking organizationId for now
      // In a real flow, this would come from the current active organization
      const organizationId = "00000000-0000-0000-0000-000000000000"; 
      
      await client.request(CREATE_INVITATION, {
        email,
        organizationId,
        role: "MEMBER"
      });
      
      alert("Invitation created successfully!");
      setEmail('');
    } catch (error) {
      console.error(error);
      alert("Failed to send invitation. Make sure you are logged in and the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      
      <section className="bg-card p-6 rounded-xl border shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Invite New Member</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Invitations allow other users to join your organization with a specific role.
        </p>
        
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email Address
            </label>
            <input 
              id="email"
              type="email" 
              placeholder="colleague@example.com" 
              className="w-full p-2.5 rounded-lg border bg-background"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Processing..." : "Create Invitation"}
          </Button>
        </form>
      </section>
    </div>
  );
}
