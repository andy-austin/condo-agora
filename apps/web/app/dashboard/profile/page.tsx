'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { getApiClient } from '@/lib/api';
import { ME_PROFILE_QUERY, UPDATE_PROFILE } from '@/lib/queries/profile';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  X,
  Check,
  Mail,
  Phone,
  Shield,
  Calendar,
} from 'lucide-react';

type UserProfile = {
  id: string;
  email: string | null;
  phone: string | null;
  authProvider: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  memberships: { organization: { id: string; name: string }; role: string }[];
};

const providerLabels: Record<string, string> = {
  phone: 'WhatsApp',
  email: 'Email',
  google: 'Google',
};

export default function ProfilePage() {
  const t = useTranslations('profile');
  const { update: updateSession } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const client = getApiClient();
        const data = await client.request<{ me: UserProfile }>(
          ME_PROFILE_QUERY
        );
        if (data.me) {
          setProfile(data.me);
          setFirstName(data.me.firstName || '');
          setLastName(data.me.lastName || '');
          setEmail(data.me.email || '');
          setAvatarUrl(data.me.avatarUrl);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  async function handleAvatarUpload(file: File) {
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }
      const { url } = await res.json();
      setAvatarUrl(url);
      setAvatarPreview(null);
    } catch (err) {
      setError(t('uploadError'));
      console.error('Avatar upload failed:', err);
    } finally {
      setUploading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    handleAvatarUpload(file);

    // Reset input so same file can be re-selected
    e.target.value = '';
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const client = getApiClient();
      const input: Record<string, string> = {};
      if (firstName !== (profile?.firstName || '')) input.firstName = firstName;
      if (lastName !== (profile?.lastName || '')) input.lastName = lastName;
      if (email !== (profile?.email || '')) input.email = email;
      if (avatarUrl !== profile?.avatarUrl) {
        input.avatarUrl = avatarUrl || '';
      }

      if (Object.keys(input).length === 0) {
        setSaving(false);
        return;
      }

      await client.request(UPDATE_PROFILE, { input });

      // Update NextAuth session so avatar/name reflect everywhere
      const sessionUpdate: Record<string, string | null> = {};
      if ('avatarUrl' in input) sessionUpdate.image = avatarUrl || null;
      if ('firstName' in input || 'lastName' in input) {
        sessionUpdate.name = [firstName, lastName].filter(Boolean).join(' ') || null;
      }
      if (Object.keys(sessionUpdate).length > 0) {
        await updateSession(sessionUpdate);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      // Update local profile state
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              firstName: firstName || prev.firstName,
              lastName: lastName || prev.lastName,
              email: email || prev.email,
              avatarUrl: avatarUrl || prev.avatarUrl,
            }
          : prev
      );
    } catch (err) {
      setError(t('error'));
      console.error('Profile update failed:', err);
    } finally {
      setSaving(false);
    }
  }

  const displayAvatar = avatarPreview || avatarUrl;
  const initials =
    firstName || lastName
      ? `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
      : email?.[0]?.toUpperCase() || '?';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
        >
          {t('title')}
        </h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="space-y-8">
        {/* Personal Information */}
        <section className="rounded-2xl border border-border p-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
            {t('personalInfo')}
          </h2>

          {/* Avatar */}
          <div className="flex items-center gap-5 mb-6 pb-6 border-b border-border">
            <div className="relative group">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt=""
                  className="w-20 h-20 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
                  <span className="text-xl font-bold text-primary">
                    {initials}
                  </span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                >
                  {t('changeAvatar')}
                </button>
                {avatarUrl && (
                  <>
                    <span className="text-border">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarUrl(null);
                        setAvatarPreview(null);
                      }}
                      className="text-sm text-muted-foreground hover:text-destructive transition-colors"
                    >
                      {t('removeAvatar')}
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t('avatarHint')}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Name fields */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium mb-1.5"
              >
                {t('firstName')}
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t('firstNamePlaceholder')}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium mb-1.5"
              >
                {t('lastName')}
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t('lastNamePlaceholder')}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>
        </section>

        {/* Contact Information */}
        <section className="rounded-2xl border border-border p-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
            {t('contact')}
          </h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="flex items-center gap-2 text-sm font-medium mb-1.5"
              >
                <Mail className="w-4 h-4 text-muted-foreground" />
                {t('email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            {profile?.phone && (
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  {t('phone')}
                </label>
                <div className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-muted-foreground">
                  {profile.phone}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Account Information */}
        <section className="rounded-2xl border border-border p-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
            {t('account')}
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{t('authProvider')}</span>
              </div>
              <span className="text-sm text-muted-foreground px-3 py-1 rounded-full bg-muted">
                {providerLabels[profile?.authProvider || 'phone'] ||
                  profile?.authProvider}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{t('memberSince')}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString()
                  : '—'}
              </span>
            </div>
          </div>
        </section>

        {/* Feedback + Save */}
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center gap-2">
            <X className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-600 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            {t('saved')}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving || uploading}
            className="rounded-xl px-8 py-3 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('saving')}
              </>
            ) : (
              t('save')
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
