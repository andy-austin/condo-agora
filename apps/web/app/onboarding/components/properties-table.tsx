'use client';

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { type PropertyRow } from '../lib/csv-parser';
import { validateE164Phone, validateEmail } from '../lib/validation';
import { PhoneInputField } from './phone-input';

type PropertiesTableProps = {
  rows: PropertyRow[];
  onChange: (rows: PropertyRow[]) => void;
};

export function PropertiesTable({ rows, onChange }: PropertiesTableProps) {
  const t = useTranslations('onboarding');
  const [invalidPhones, setInvalidPhones] = useState<Set<string>>(new Set());
  const [invalidEmails, setInvalidEmails] = useState<Set<string>>(new Set());

  const updateRow = useCallback(
    (id: string, field: keyof PropertyRow, value: string) => {
      onChange(
        rows.map((row) =>
          row.id === id ? { ...row, [field]: value } : row
        )
      );
    },
    [rows, onChange]
  );

  const deleteRow = useCallback(
    (id: string) => {
      onChange(rows.filter((row) => row.id !== id));
      setInvalidPhones((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setInvalidEmails((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [rows, onChange]
  );

  const handlePhoneBlur = useCallback((id: string, phone: string) => {
    setInvalidPhones((prev) => {
      const next = new Set(prev);
      if (phone.trim() && !validateE164Phone(phone)) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleEmailBlur = useCallback((id: string, email: string) => {
    setInvalidEmails((prev) => {
      const next = new Set(prev);
      if (email.trim() && !validateEmail(email)) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent, rowIndex: number, startCol: number) => {
      const text = e.clipboardData.getData('text/plain');
      if (!text.includes('\t') && !text.includes('\n')) return;

      e.preventDefault();

      const pastedRows = text
        .split('\n')
        .map((line) => line.split('\t'))
        .filter((cols) => cols.some((c) => c.trim()));

      const fields: (keyof PropertyRow)[] = [
        'propertyName',
        'firstName',
        'lastName',
        'phone',
        'email',
      ];

      const updatedRows = [...rows];
      for (let ri = 0; ri < pastedRows.length; ri++) {
        const targetRowIdx = rowIndex + ri;
        if (targetRowIdx >= updatedRows.length) {
          // Add new rows for pasted content beyond existing rows
          const newRow: PropertyRow = {
            id: `paste-${Date.now()}-${ri}`,
            propertyName: '',
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
          };
          updatedRows.push(newRow);
        }
        for (let ci = 0; ci < pastedRows[ri].length; ci++) {
          const fieldIdx = startCol + ci;
          if (fieldIdx < fields.length) {
            (updatedRows[targetRowIdx] as any)[fields[fieldIdx]] =
              pastedRows[ri][ci].trim();
          }
        }
      }

      onChange(updatedRows);
    },
    [rows, onChange]
  );

  const inputClass =
    'w-full px-2 py-1.5 text-sm border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-primary rounded';

  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto border border-border rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="px-2 py-2 text-left font-medium text-muted-foreground w-8">
              #
            </th>
            <th className="px-2 py-2 text-left font-medium text-muted-foreground">
              {t('colProperty')}
            </th>
            <th className="px-2 py-2 text-left font-medium text-muted-foreground">
              {t('colFirstName')}
            </th>
            <th className="px-2 py-2 text-left font-medium text-muted-foreground">
              {t('colLastName')}
            </th>
            <th className="px-2 py-2 text-left font-medium text-muted-foreground">
              {t('colPhone')}
            </th>
            <th className="px-2 py-2 text-left font-medium text-muted-foreground">
              {t('colEmail')}
            </th>
            <th className="px-2 py-2 w-8" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const hasNoContact = !row.phone?.trim() && !row.email?.trim();
            const isPhoneInvalid = invalidPhones.has(row.id);
            const isEmailInvalid = invalidEmails.has(row.id);

            return (
              <tr
                key={row.id}
                className={`border-b border-border last:border-0 ${
                  hasNoContact ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''
                }`}
              >
                <td className="px-2 py-1 text-muted-foreground text-xs">
                  {index + 1}
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    className={inputClass}
                    value={row.propertyName}
                    onChange={(e) =>
                      updateRow(row.id, 'propertyName', e.target.value)
                    }
                    onPaste={(e) => handlePaste(e, index, 0)}
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    className={inputClass}
                    value={row.firstName}
                    onChange={(e) =>
                      updateRow(row.id, 'firstName', e.target.value)
                    }
                    onPaste={(e) => handlePaste(e, index, 1)}
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    className={inputClass}
                    value={row.lastName}
                    onChange={(e) =>
                      updateRow(row.id, 'lastName', e.target.value)
                    }
                    onPaste={(e) => handlePaste(e, index, 2)}
                  />
                </td>
                <td className="px-1 py-1">
                  <PhoneInputField
                    compact
                    value={row.phone}
                    onChange={(value) => updateRow(row.id, 'phone', value)}
                    onBlur={() => handlePhoneBlur(row.id, row.phone)}
                    className={
                      isPhoneInvalid
                        ? 'ring-1 ring-red-500 rounded bg-red-50 dark:bg-red-950/20'
                        : ''
                    }
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="email"
                    className={`${inputClass} ${
                      isEmailInvalid
                        ? 'ring-1 ring-red-500 bg-red-50 dark:bg-red-950/20'
                        : ''
                    }`}
                    value={row.email}
                    onChange={(e) =>
                      updateRow(row.id, 'email', e.target.value)
                    }
                    onBlur={() => handleEmailBlur(row.id, row.email)}
                    onPaste={(e) => handlePaste(e, index, 4)}
                  />
                </td>
                <td className="px-1 py-1">
                  <button
                    type="button"
                    onClick={() => deleteRow(row.id)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Delete row"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
