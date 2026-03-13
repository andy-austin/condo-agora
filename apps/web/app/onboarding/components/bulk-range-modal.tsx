'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { type PropertyRow } from '../lib/csv-parser';

type BulkRangeModalProps = {
  open: boolean;
  onClose: () => void;
  onAdd: (rows: PropertyRow[]) => void;
};

export function BulkRangeModal({ open, onClose, onAdd }: BulkRangeModalProps) {
  const t = useTranslations('onboarding');

  const [prefix, setPrefix] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    setError('');
    const startNum = parseInt(start);
    const endNum = parseInt(end);

    if (isNaN(startNum) || isNaN(endNum) || startNum > endNum) return;

    const count = endNum - startNum + 1;
    if (count > 200) {
      setError(t('bulkMaxError'));
      return;
    }

    const rows: PropertyRow[] = [];
    for (let i = startNum; i <= endNum; i++) {
      const name = prefix.trim()
        ? `${prefix.trim()} ${i}`
        : `${i}`;
      rows.push({
        id: `bulk-${Date.now()}-${i}`,
        propertyName: name,
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
      });
    }

    onAdd(rows);
    setPrefix('');
    setStart('');
    setEnd('');
    onClose();
  };

  const isValid =
    start !== '' &&
    end !== '' &&
    !isNaN(parseInt(start)) &&
    !isNaN(parseInt(end)) &&
    parseInt(start) <= parseInt(end);

  const inputClass =
    'w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('bulkRange')}</DialogTitle>
          <DialogDescription>
            {t('bulkMaxError')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {t('bulkPrefix')}
            </label>
            <input
              type="text"
              placeholder={t('bulkPrefixPlaceholder')}
              className={inputClass}
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                {t('bulkFrom')}
              </label>
              <input
                type="number"
                placeholder="1"
                className={inputClass}
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                {t('bulkTo')}
              </label>
              <input
                type="number"
                placeholder="20"
                className={inputClass}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              {t('back')}
            </Button>
            <Button onClick={handleAdd} disabled={!isValid}>
              {t('bulkAdd')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
