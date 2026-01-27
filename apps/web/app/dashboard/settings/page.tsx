'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getApiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';

const ME_QUERY = `
  query Me {
    me {
      id
      email
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

const CREATE_INVITATION = `
  mutation CreateInvitation($email: String!, $organizationId: String!, $role: Role!) {
    createInvitation(email: $email, organizationId: $organizationId, role: $role) {
      id
      email
      token
    }
  }
`;

type Organization = {
  id: string;
  name: string;
};

type Membership = {
  organization: Organization;
  role: string;
};

type User = {
  id: string;
  email: string;
  memberships: Membership[];
};

type MeQueryResponse = {
  me: User | null;
};

export default function SettingsPage() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [organizationId, setOrganizationId] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getAuthToken } = useAuthToken();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = await getAuthToken();
        const client = getApiClient(token);
        const data = await client.request<MeQueryResponse>(ME_QUERY);
        
        if (data.me) {
          setUser(data.me);
          // Default to first organization if available
          if (data.me.memberships.length > 0) {
            setOrganizationId(data.me.memberships[0].organization.id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
        setError('Failed to load user profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [getAuthToken]);

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!organizationId) {
      alert("Please select an organization.");
      return;
    }

    setSubmitting(true);
    
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      
      await client.request(CREATE_INVITATION, {
        email,
        organizationId,
        role
      });
      
      alert("Invitation created successfully!");
      setEmail('');
    } catch (error) {
      console.error(error);
      alert("Failed to send invitation. Make sure you are logged in and have permission.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading settings...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">{error}</div>;
  }

  if (!user || user.memberships.length === 0) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-yellow-700">
            You do not belong to any organization yet. Please ask an administrator to invite you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      
      <section className="bg-card p-6 rounded-xl border shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Invite New Member</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Invitations allow other users to join your organization with a specific role.
        </p>
        
        <form onSubmit={handleInvite} className="space-y-4">
          {/* Organization Selector */}
          <div>
            <label htmlFor="organization" className="block text-sm font-medium mb-2">
              Organization
            </label>
            <select
              id="organization"
              className="w-full p-2.5 rounded-lg border bg-background"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              disabled={user.memberships.length <= 1}
            >
              {user.memberships.map((m) => (
                <option key={m.organization.id} value={m.organization.id}>
                  {m.organization.name}
                </option>
              ))}
            </select>
            {user.memberships.length <= 1 && (
              <p className="text-xs text-muted-foreground mt-1">
                You are inviting to {user.memberships.find(m => m.organization.id === organizationId)?.organization.name || 'your organization'}.
              </p>
            )}
          </div>

          {/* Email Input */}
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

          {/* Role Selector */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium mb-2">
              Role
            </label>
            <select
              id="role"
              className="w-full p-2.5 rounded-lg border bg-background"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
              <option value="RESIDENT">Resident</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Admins can manage settings and invites. Residents/Members have limited access.
            </p>
          </div>
          
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Sending..." : "Create Invitation"}
          </Button>
        </form>
      </section>
    </div>
  );
}