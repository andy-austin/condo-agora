'use client';

import { useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type CreateHouseDialogProps = {
  // eslint-disable-next-line no-unused-vars
  onSubmit: (_name: string) => Promise<void>;
};

export default function CreateHouseDialog({ onSubmit }: CreateHouseDialogProps) {
  const t = useTranslations('dashboard');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit(name.trim());
      setName('');
      setOpen(false);
    } catch {
      // Error handling is done by the parent
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        {t('properties.addProperty')}
      </Button>
    );
  }

  return (
    <Card className="max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('properties.newProperty')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="house-name" className="block text-sm font-medium mb-2">
              {t('properties.propertyName')}
            </label>
            <input
              id="house-name"
              type="text"
              placeholder={t('properties.propertyPlaceholder')}
              className="w-full p-2.5 rounded-lg border bg-background"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? t('common.creating') : t('common.create')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setName('');
              }}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
