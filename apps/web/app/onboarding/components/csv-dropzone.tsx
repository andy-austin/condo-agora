'use client';

import { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, FileDown } from 'lucide-react';
import { parseOnboardingCSV, type PropertyRow } from '../lib/csv-parser';

type CsvDropzoneProps = {
  onImport: (rows: PropertyRow[]) => void;
  onError: (error: string) => void;
};

export function CsvDropzone({ onImport, onError }: CsvDropzoneProps) {
  const t = useTranslations('onboarding');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith('.csv')) {
        onError(t('csvError'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const result = parseOnboardingCSV(text);
        if (result.error) {
          onError(result.error);
        } else {
          onImport(result.rows);
        }
      };
      reader.onerror = () => {
        onError(t('csvError'));
      };
      reader.readAsText(file);
    },
    [onImport, onError, t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so the same file can be re-selected
      e.target.value = '';
    },
    [handleFile]
  );

  const handleDownloadTemplate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const headers =
        'property_name,first_name,last_name,phone,email';
      const example =
        'Unit 101,John,Doe,+59899123456,john@example.com';
      const csv = `${headers}\n${example}`;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'onboarding-template.csv';
      a.click();
      URL.revokeObjectURL(url);
    },
    []
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragOver
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-muted-foreground/50'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />
      <Upload
        className={`w-8 h-8 mx-auto mb-3 ${
          isDragOver ? 'text-primary' : 'text-muted-foreground'
        }`}
      />
      <p className="text-sm font-medium mb-1">{t('dropzoneTitle')}</p>
      <p className="text-xs text-muted-foreground mb-3">
        {t('dropzoneSubtitle')}
      </p>
      <button
        type="button"
        onClick={handleDownloadTemplate}
        className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
      >
        <FileDown className="w-3.5 h-3.5" />
        {t('dropzoneTemplate')}
      </button>
    </div>
  );
}
