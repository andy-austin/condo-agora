'use client';

import { useMemo } from 'react';
import PhoneInput from 'react-phone-number-input';
import type { Country } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const FALLBACK_COUNTRY: Country = 'UY';

// Map browser locale/language to country code
const LOCALE_TO_COUNTRY: Record<string, Country> = {
  UY: 'UY', VE: 'VE', AR: 'AR', BR: 'BR', CL: 'CL',
  CO: 'CO', PE: 'PE', EC: 'EC', MX: 'MX', ES: 'ES',
  US: 'US', GB: 'GB', PY: 'PY', BO: 'BO', CR: 'CR',
  PA: 'PA', DO: 'DO', GT: 'GT', HN: 'HN', SV: 'SV',
  NI: 'NI', CU: 'CU', PR: 'PR',
};

function detectCountryFromBrowser(): Country {
  if (typeof navigator === 'undefined') return FALLBACK_COUNTRY;
  // navigator.language is like "es-UY", "en-US", "pt-BR"
  const lang = navigator.language || (navigator as any).userLanguage || '';
  const parts = lang.split('-');
  if (parts.length >= 2) {
    const region = parts[parts.length - 1].toUpperCase();
    if (LOCALE_TO_COUNTRY[region]) return LOCALE_TO_COUNTRY[region];
  }
  return FALLBACK_COUNTRY;
}

type PhoneInputFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
  defaultCountry?: Country;
  compact?: boolean;
};

export function PhoneInputField({
  value,
  onChange,
  onBlur,
  className = '',
  defaultCountry,
  compact = false,
}: PhoneInputFieldProps) {
  const resolvedCountry = useMemo(
    () => defaultCountry || detectCountryFromBrowser(),
    [defaultCountry]
  );
  return (
    <div
      className={`phone-input-wrapper ${compact ? 'phone-input-compact' : ''} ${className}`}
    >
      <PhoneInput
        international
        countryCallingCodeEditable={false}
        defaultCountry={resolvedCountry}
        value={value || undefined}
        onChange={(v) => onChange(v || '')}
        onBlur={onBlur}
      />
      <style jsx global>{`
        .phone-input-wrapper .PhoneInput {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .phone-input-wrapper .PhoneInputCountry {
          display: flex;
          align-items: center;
        }
        .phone-input-wrapper .PhoneInputCountryIcon {
          width: 24px;
          height: 18px;
          border-radius: 2px;
          overflow: hidden;
        }
        .phone-input-wrapper .PhoneInputCountryIcon--border {
          box-shadow: 0 0 0 1px hsl(var(--border));
        }
        .phone-input-wrapper .PhoneInputCountrySelect {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: 100%;
          z-index: 1;
          border: 0;
          opacity: 0;
          cursor: pointer;
        }
        .phone-input-wrapper .PhoneInputCountrySelectArrow {
          display: block;
          width: 6px;
          height: 6px;
          margin-left: 4px;
          border-style: solid;
          border-color: hsl(var(--muted-foreground));
          border-top-width: 0;
          border-bottom-width: 1px;
          border-left-width: 0;
          border-right-width: 1px;
          transform: rotate(45deg);
        }
        .phone-input-wrapper .PhoneInputInput {
          flex: 1;
          min-width: 0;
          background: transparent;
          border: none;
          outline: none;
          font-size: inherit;
          color: hsl(var(--foreground));
        }
        .phone-input-wrapper .PhoneInputInput::placeholder {
          color: hsl(var(--muted-foreground));
        }

        /* Full-size variant (user profile step) */
        .phone-input-wrapper:not(.phone-input-compact) .PhoneInput {
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
          padding: 0.75rem;
          background: hsl(var(--background));
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .phone-input-wrapper:not(.phone-input-compact) .PhoneInput:focus-within {
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 1px hsl(var(--primary));
        }

        /* Compact variant (properties table) */
        .phone-input-compact .PhoneInput {
          padding: 0.375rem 0.5rem;
        }
        .phone-input-compact .PhoneInputInput {
          font-size: 0.875rem;
        }
        .phone-input-compact .PhoneInputCountryIcon {
          width: 20px;
          height: 15px;
        }
      `}</style>
    </div>
  );
}
