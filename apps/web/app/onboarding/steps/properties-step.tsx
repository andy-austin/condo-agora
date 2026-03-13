'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileDown, Grid, AlertTriangle } from 'lucide-react';
import { type PropertyRow } from '../lib/csv-parser';
import { PropertiesTable } from '../components/properties-table';
import { CsvDropzone } from '../components/csv-dropzone';
import { BulkRangeModal } from '../components/bulk-range-modal';

type PropertiesStepProps = {
  orgName: string;
  rows: PropertyRow[];
  onChange: (rows: PropertyRow[]) => void;
  onNext: () => void;
  onBack: () => void;
};

export function PropertiesStep({
  orgName,
  rows,
  onChange,
  onNext,
  onBack,
}: PropertiesStepProps) {
  const t = useTranslations('onboarding');
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [csvError, setCsvError] = useState('');

  const stats = useMemo(() => {
    const total = rows.length;
    const withContact = rows.filter(
      (r) => r.phone?.trim() || r.email?.trim()
    ).length;
    const noContact = total - withContact;
    return { total, withContact, noContact };
  }, [rows]);

  const handleAddRow = () => {
    const newRow: PropertyRow = {
      id: `manual-${Date.now()}`,
      propertyName: '',
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
    };
    onChange([...rows, newRow]);
  };

  const handleCsvImport = (imported: PropertyRow[]) => {
    setCsvError('');
    onChange([...rows, ...imported]);
  };

  const handleBulkAdd = (generated: PropertyRow[]) => {
    onChange([...rows, ...generated]);
  };

  const handleCsvError = (error: string) => {
    setCsvError(error);
  };

  const handleDownloadTemplate = () => {
    const headers = 'property_name,first_name,last_name,phone,email';
    const example = 'Unit 101,John,Doe,+59899123456,john@example.com';
    const csv = `${headers}\n${example}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'onboarding-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Validate: at least 1 row with property name
  const canProceed =
    rows.length > 0 && rows.every((r) => r.propertyName.trim());

  return (
    <div>
      <h2 className="text-xl font-bold mb-1">
        {t('propertiesTitle', { orgName })}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        {t('propertiesSubtitle')}
      </p>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadTemplate}
        >
          <FileDown className="w-4 h-4 mr-1.5" />
          {t('downloadTemplate')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setBulkModalOpen(true)}
        >
          <Grid className="w-4 h-4 mr-1.5" />
          {t('bulkRange')}
        </Button>
        <Button variant="outline" size="sm" onClick={handleAddRow}>
          <Plus className="w-4 h-4 mr-1.5" />
          {t('addRow')}
        </Button>
      </div>

      {/* CSV error */}
      {csvError && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {csvError}
        </div>
      )}

      {/* Dropzone when no rows */}
      {rows.length === 0 && (
        <div className="mb-6">
          <CsvDropzone
            onImport={handleCsvImport}
            onError={handleCsvError}
          />
        </div>
      )}

      {/* Table */}
      <PropertiesTable rows={rows} onChange={onChange} />

      {/* Warning banner for rows without contact */}
      {stats.noContact > 0 && rows.length > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950/20 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-200">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {stats.noContact} {t('warningNoContact')}
          </span>
        </div>
      )}

      {/* Summary bar */}
      {rows.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          <Badge variant="secondary">
            {stats.total} {t('summaryProperties')}
          </Badge>
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
            {stats.withContact} {t('summaryVoters')}
          </Badge>
          {stats.noContact > 0 && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
              {stats.noContact} {t('summaryNoContact')}
            </Badge>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={onBack}>
          {t('back')}
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          {t('reviewConfirm')}
        </Button>
      </div>

      {/* Bulk Range Modal */}
      <BulkRangeModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onAdd={handleBulkAdd}
      />
    </div>
  );
}
