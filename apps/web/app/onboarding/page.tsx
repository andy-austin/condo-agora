'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { getApiClient } from '@/lib/api';
import {
  BULK_SETUP_ORGANIZATION,
  COMPLETE_PROFILE,
  type BulkSetupResult,
  type BulkSetupRow,
} from '@/lib/queries/onboarding';
import { type PropertyRow } from './lib/csv-parser';
import { UserProfileStep } from './steps/user-profile-step';
import { OrgNameStep } from './steps/org-name-step';
import { PropertiesStep } from './steps/properties-step';
import { ConfirmationStep } from './steps/confirmation-step';

export type ProfileData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const t = useTranslations('onboarding');

  const [currentStep, setCurrentStep] = useState(0);
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [orgName, setOrgName] = useState('');
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<BulkSetupResult | null>(null);

  // Determine auth provider from session
  const authProvider: string =
    (session?.user as any)?.authProvider || 'phone';

  // Pre-fill profile from session
  useEffect(() => {
    if (session?.user) {
      const user = session.user as any;
      const nameParts = (user.name || '').split(' ');
      setProfileData({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [session]);

  const steps = [
    { key: 'profile', label: t('stepProfile') },
    { key: 'org', label: t('stepOrg') },
    { key: 'properties', label: t('stepProperties') },
    { key: 'confirm', label: t('stepConfirm') },
  ];

  const handleProfileContinue = async () => {
    try {
      const client = getApiClient();
      await client.request(COMPLETE_PROFILE, {
        input: {
          firstName: profileData.firstName.trim() || undefined,
          lastName: profileData.lastName.trim() || undefined,
          email: profileData.email.trim() || undefined,
        },
      });
      await updateSession({ requiresProfileCompletion: false });
    } catch (err) {
      console.error('Failed to save profile:', err);
    }
    setCurrentStep(1);
  };

  const handleProfileSkip = async () => {
    try {
      const client = getApiClient();
      await client.request(COMPLETE_PROFILE, {
        input: {},
      });
      await updateSession({ requiresProfileCompletion: false });
    } catch (err) {
      console.error('Failed to skip profile:', err);
    }
    setCurrentStep(1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const client = getApiClient();
      const bulkRows: BulkSetupRow[] = rows.map((row) => ({
        rowId: row.id,
        propertyName: row.propertyName,
        firstName: row.firstName || undefined,
        lastName: row.lastName || undefined,
        phone: row.phone || undefined,
        email: row.email || undefined,
      }));

      const result = await client.request<BulkSetupResult>(
        BULK_SETUP_ORGANIZATION,
        {
          input: {
            organizationName: orgName.trim(),
            rows: bulkRows,
          },
        }
      );

      setSubmitResult(result);
      await updateSession({ hasMemberships: true });
    } catch (err) {
      console.error('Failed to create organization:', err);
      setIsSubmitting(false);
      throw err;
    }
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-8">
        {/* Stepper indicator */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep > i
                    ? 'bg-primary text-primary-foreground'
                    : currentStep === i
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {currentStep > i ? '\u2713' : i + 1}
              </div>
              <span
                className={`text-sm hidden sm:inline ${
                  currentStep >= i
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={`w-8 sm:w-12 h-0.5 ${
                    currentStep > i ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        {currentStep === 0 && (
          <UserProfileStep
            data={profileData}
            authProvider={authProvider}
            onChange={setProfileData}
            onContinue={handleProfileContinue}
            onSkip={handleProfileSkip}
          />
        )}

        {currentStep === 1 && (
          <OrgNameStep
            orgName={orgName}
            onChange={setOrgName}
            onNext={() => setCurrentStep(2)}
            onBack={() => setCurrentStep(0)}
          />
        )}

        {currentStep === 2 && (
          <PropertiesStep
            orgName={orgName}
            rows={rows}
            onChange={setRows}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <ConfirmationStep
            orgName={orgName}
            rows={rows}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            result={submitResult}
            onGoToDashboard={handleGoToDashboard}
            onBack={() => setCurrentStep(2)}
          />
        )}
      </div>
    </div>
  );
}
