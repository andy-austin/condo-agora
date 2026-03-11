'use client';

import {
  useReducer,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type DragEvent,
  type ChangeEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Papa from 'papaparse';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getApiClient } from '@/lib/api';
import {
  BULK_SETUP_ORGANIZATION,
  type BulkSetupInput,
  type BulkSetupResult,
} from '@/lib/queries/onboarding';
import { Button } from '@/components/ui/button';
import {
  Upload,
  FileSpreadsheet,
  Plus,
  Layers,
  ClipboardPaste,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  X,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RowStatus = 'pending' | 'completed' | 'error';

type OnboardingRow = {
  id: string;
  property: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: RowStatus;
  error?: string;
};

type FilterTab = 'all' | 'pending' | 'completed';
type InputMethod = 'import' | 'manual';

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

type RowAction =
  | { type: 'ADD_ROW'; row: OnboardingRow }
  | { type: 'ADD_ROWS'; rows: OnboardingRow[] }
  | { type: 'UPDATE_ROW'; id: string; field: keyof OnboardingRow; value: string }
  | { type: 'DELETE_ROW'; id: string }
  | { type: 'SET_ROW_STATUS'; id: string; status: RowStatus; error?: string }
  | { type: 'MARK_RESULTS'; results: { rowId: string; status: string; error?: string }[] }
  | { type: 'CLEAR_ALL' };

function computeRowStatus(row: OnboardingRow): RowStatus {
  if (row.status === 'error') return 'error';
  const phoneRegex = /^\+[1-9]\d{6,14}$/;
  return row.phone && phoneRegex.test(row.phone) ? 'completed' : 'pending';
}

function rowsReducer(state: OnboardingRow[], action: RowAction): OnboardingRow[] {
  switch (action.type) {
    case 'ADD_ROW':
      return [...state, { ...action.row, status: computeRowStatus(action.row) }];

    case 'ADD_ROWS':
      return [
        ...state,
        ...action.rows.map((r) => ({ ...r, status: computeRowStatus(r) })),
      ];

    case 'UPDATE_ROW':
      return state.map((r) => {
        if (r.id !== action.id) return r;
        const updated = { ...r, [action.field]: action.value, error: undefined };
        updated.status = computeRowStatus(updated);
        return updated;
      });

    case 'DELETE_ROW':
      return state.filter((r) => r.id !== action.id);

    case 'SET_ROW_STATUS':
      return state.map((r) =>
        r.id === action.id ? { ...r, status: action.status, error: action.error } : r
      );

    case 'MARK_RESULTS':
      return state.map((r) => {
        const result = action.results.find((res) => res.rowId === r.id);
        if (!result) return r;
        if (result.status === 'ERROR') {
          return { ...r, status: 'error' as RowStatus, error: result.error };
        }
        return r;
      });

    case 'CLEAR_ALL':
      return [];

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PHONE_REGEX = /^\+[1-9]\d{6,14}$/;
const MAX_ROWS = 200;

function makeRow(overrides: Partial<OnboardingRow> = {}): OnboardingRow {
  return {
    id: crypto.randomUUID(),
    property: '',
    firstName: '',
    lastName: '',
    phone: '',
    status: 'pending',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MethodCard({
  active,
  icon,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl border-2 p-5 text-left transition-all ${
        active
          ? 'border-indigo-500 bg-indigo-500/10'
          : 'border-border bg-card hover:border-indigo-500/40'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`rounded-lg p-2 ${
            active ? 'bg-indigo-500/20 text-indigo-400' : 'bg-muted text-muted-foreground'
          }`}
        >
          {icon}
        </div>
        <div>
          <p className="font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </button>
  );
}

function BulkAddModal({
  t,
  onAdd,
  onClose,
  currentCount,
}: {
  t: (key: string) => string;
  onAdd: (rows: OnboardingRow[]) => void;
  onClose: () => void;
  currentCount: number;
}) {
  const [prefix, setPrefix] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    const s = parseInt(start);
    const e = parseInt(end);
    if (isNaN(s) || isNaN(e) || s > e || !prefix.trim()) return;

    const count = e - s + 1;
    if (currentCount + count > MAX_ROWS) {
      setError(t('maxRowsError'));
      return;
    }

    const rows: OnboardingRow[] = [];
    for (let i = s; i <= e; i++) {
      rows.push(makeRow({ property: `${prefix.trim()} ${i}` }));
    }
    onAdd(rows);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t('bulkAdd')}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">{t('bulkPrefix')}</label>
            <input
              type="text"
              placeholder={t('bulkPrefixPlaceholder')}
              className="w-full rounded-lg border border-border bg-background p-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('bulkFrom')}</label>
              <input
                type="number"
                placeholder="101"
                className="w-full rounded-lg border border-border bg-background p-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('bulkTo')}</label>
              <input
                type="number"
                placeholder="120"
                className="w-full rounded-lg border border-border bg-background p-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <Button
            onClick={handleAdd}
            disabled={!prefix.trim() || !start || !end}
            className="w-full"
          >
            {t('bulkAddButton')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const router = useRouter();
  const t = useTranslations('onboarding');
  const { getAuthToken } = useAuthToken();

  // State
  const [orgName, setOrgName] = useState('');
  const [method, setMethod] = useState<InputMethod>('manual');
  const [rows, dispatch] = useReducer(rowsReducer, []);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const tableRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- beforeunload warning ----
  useEffect(() => {
    if (rows.length === 0 || submitted) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [rows.length, submitted]);

  // ---- Paste handler ----
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      // Only handle paste when the table area is focused or no specific input is focused
      const active = document.activeElement;
      const isInTable = tableRef.current?.contains(active as Node);
      const isInput = active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA';

      // If we're in a table input, don't intercept (let the normal paste work)
      if (isInput && isInTable) return;
      // If we're in some other input (org name, bulk modal), don't intercept
      if (isInput && !isInTable) return;

      const text = e.clipboardData?.getData('text');
      if (!text?.includes('\t') && !text?.includes('\n')) return;

      e.preventDefault();
      const lines = text.trim().split('\n');
      const newRows: OnboardingRow[] = [];

      for (const line of lines) {
        const cols = line.split('\t');
        if (cols.length === 0 || !cols[0]?.trim()) continue;
        if (rows.length + newRows.length >= MAX_ROWS) break;

        newRows.push(
          makeRow({
            property: cols[0]?.trim() ?? '',
            firstName: cols[1]?.trim() ?? '',
            lastName: cols[2]?.trim() ?? '',
            phone: cols[3]?.trim() ?? '',
          })
        );
      }

      if (newRows.length > 0) {
        dispatch({ type: 'ADD_ROWS', rows: newRows });
      }
    };

    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [rows.length]);

  // ---- CSV parsing ----
  const parseCSV = useCallback(
    (file: File) => {
      setGlobalError('');
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (result) => {
          const data = result.data as string[][];
          if (data.length < 2) {
            setGlobalError(t('csvError'));
            return;
          }

          // Skip header row (index 0), map by column position
          const newRows: OnboardingRow[] = [];
          for (let i = 1; i < data.length; i++) {
            const cols = data[i];
            if (!cols || cols.length === 0 || !cols[0]?.trim()) continue;
            if (rows.length + newRows.length >= MAX_ROWS) break;

            newRows.push(
              makeRow({
                property: cols[0]?.trim() ?? '',
                firstName: cols[1]?.trim() ?? '',
                lastName: cols[2]?.trim() ?? '',
                phone: cols[3]?.trim() ?? '',
              })
            );
          }

          if (newRows.length === 0) {
            setGlobalError(t('csvMissingProperty'));
            return;
          }

          dispatch({ type: 'ADD_ROWS', rows: newRows });
          // Switch to manual view to show the table
          setMethod('manual');
        },
        error: () => {
          setGlobalError(t('csvError'));
        },
      });
    },
    [rows.length, t]
  );

  // ---- Drag & Drop ----
  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer?.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      parseCSV(file);
    } else {
      setGlobalError(t('csvError'));
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseCSV(file);
    // Reset so re-selecting the same file triggers change
    e.target.value = '';
  };

  // ---- Row operations ----
  const addEmptyRow = () => {
    if (rows.length >= MAX_ROWS) {
      setGlobalError(t('maxRowsError'));
      return;
    }
    dispatch({ type: 'ADD_ROW', row: makeRow() });
  };

  const addBulkRows = (newRows: OnboardingRow[]) => {
    dispatch({ type: 'ADD_ROWS', rows: newRows });
  };

  // ---- Filtered rows ----
  const filteredRows =
    filter === 'all' ? rows : rows.filter((r) => r.status === filter);

  const completedCount = rows.filter((r) => r.status === 'completed').length;
  const pendingCount = rows.filter((r) => r.status === 'pending').length;
  const errorCount = rows.filter((r) => r.status === 'error').length;

  // ---- Validation ----
  const validateRows = (): boolean => {
    let valid = true;

    if (!orgName.trim()) {
      setGlobalError(t('orgNameRequired'));
      return false;
    }

    // Check that all rows have a property name
    for (const row of rows) {
      if (!row.property.trim()) {
        dispatch({
          type: 'SET_ROW_STATUS',
          id: row.id,
          status: 'error',
          error: t('propertyRequired'),
        });
        valid = false;
      }
      // Validate phone if provided
      if (row.phone && !PHONE_REGEX.test(row.phone)) {
        dispatch({
          type: 'SET_ROW_STATUS',
          id: row.id,
          status: 'error',
          error: t('invalidPhone'),
        });
        valid = false;
      }
    }

    // Check duplicate phones
    const seen = new Set<string>();
    for (const row of rows) {
      if (!row.phone) continue;
      if (seen.has(row.phone)) {
        dispatch({
          type: 'SET_ROW_STATUS',
          id: row.id,
          status: 'error',
          error: t('duplicatePhone'),
        });
        valid = false;
      }
      seen.add(row.phone);
    }

    return valid;
  };

  // ---- Submit ----
  const handleSubmit = async (retryOnly = false) => {
    setGlobalError('');

    const rowsToSubmit = retryOnly ? rows.filter((r) => r.status === 'error') : rows;

    if (!retryOnly && !validateRows()) return;
    if (rowsToSubmit.length === 0) return;

    setSubmitting(true);
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);

      const input: BulkSetupInput = {
        organizationName: orgName.trim(),
        rows: rowsToSubmit.map((r) => ({
          rowId: r.id,
          propertyName: r.property.trim(),
          ...(r.firstName ? { firstName: r.firstName.trim() } : {}),
          ...(r.lastName ? { lastName: r.lastName.trim() } : {}),
          ...(r.phone ? { phone: r.phone.trim() } : {}),
        })),
      };

      const data = await client.request<BulkSetupResult>(BULK_SETUP_ORGANIZATION, {
        input,
      });

      const result = data.bulkSetupOrganization;
      const hasErrors = result.rows.some((r) => r.status === 'ERROR');

      if (hasErrors) {
        dispatch({ type: 'MARK_RESULTS', results: result.rows });
        setGlobalError(
          `${result.rows.filter((r) => r.status === 'ERROR').length} rows failed.`
        );
      } else {
        setSubmitted(true);
        // Brief success message, then redirect
        setTimeout(() => {
          router.push(`/dashboard/${result.organization.slug}`);
        }, 1500);
      }
    } catch (err) {
      console.error('Bulk setup failed:', err);
      setGlobalError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Success screen ----
  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>
          <h2 className="mb-2 text-2xl font-bold">{t('success')}</h2>
          <p className="text-muted-foreground">{t('successSub')}</p>
        </div>
      </div>
    );
  }

  // ---- Main render ----
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <h1 className="mb-8 text-3xl font-bold">{t('title')}</h1>

        {/* Organization Name */}
        <div className="mb-6">
          <label
            htmlFor="org-name"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            {t('orgName')}
          </label>
          <input
            id="org-name"
            type="text"
            placeholder={t('orgNamePlaceholder')}
            className="w-full max-w-md rounded-lg border border-border bg-background p-3 text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={orgName}
            onChange={(e) => {
              setOrgName(e.target.value);
              if (globalError === t('orgNameRequired')) setGlobalError('');
            }}
            autoFocus
          />
        </div>

        {/* Method Toggle */}
        <div className="mb-6 flex gap-3">
          <MethodCard
            active={method === 'import'}
            icon={<Upload className="h-5 w-5" />}
            title={t('importMethod')}
            subtitle={t('importMethodSub')}
            onClick={() => setMethod('import')}
          />
          <MethodCard
            active={method === 'manual'}
            icon={<FileSpreadsheet className="h-5 w-5" />}
            title={t('manualMethod')}
            subtitle={t('manualMethodSub')}
            onClick={() => setMethod('manual')}
          />
        </div>

        {/* Import Zone */}
        {method === 'import' && (
          <div className="mb-6">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-border bg-card hover:border-indigo-500/40'
              }`}
            >
              <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-foreground">
                {t('dropzone')}{' '}
                <span className="text-indigo-400 underline">{t('dropzoneBrowse')}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t('dropzoneFormats')}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t('templateHelp')}</span>
              <a
                href="/templates/onboarding-template.csv"
                download
                className="inline-flex items-center gap-1 text-indigo-400 hover:underline"
              >
                <Download className="h-3.5 w-3.5" />
                {t('downloadTemplate')}
              </a>
            </div>
          </div>
        )}

        {/* Table Section */}
        {(method === 'manual' || rows.length > 0) && (
          <div
            ref={tableRef}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            {/* Table Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
              {/* Filter Tabs */}
              <div className="flex gap-1">
                {(['all', 'pending', 'completed'] as FilterTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      filter === tab
                        ? 'bg-indigo-500/20 text-indigo-400'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t(
                      tab === 'all'
                        ? 'filterAll'
                        : tab === 'pending'
                          ? 'filterPending'
                          : 'filterCompleted'
                    )}
                    {tab === 'all' && rows.length > 0 && (
                      <span className="ml-1.5 text-xs opacity-70">{rows.length}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addEmptyRow}
                  disabled={rows.length >= MAX_ROWS}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  {t('addRow')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkModal(true)}
                  disabled={rows.length >= MAX_ROWS}
                >
                  <Layers className="mr-1.5 h-4 w-4" />
                  {t('bulkAdd')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.readText().then((text) => {
                      // Simulate a paste event
                      const lines = text.trim().split('\n');
                      const newRows: OnboardingRow[] = [];
                      for (const line of lines) {
                        const cols = line.split('\t');
                        if (!cols[0]?.trim()) continue;
                        if (rows.length + newRows.length >= MAX_ROWS) break;
                        newRows.push(
                          makeRow({
                            property: cols[0]?.trim() ?? '',
                            firstName: cols[1]?.trim() ?? '',
                            lastName: cols[2]?.trim() ?? '',
                            phone: cols[3]?.trim() ?? '',
                          })
                        );
                      }
                      if (newRows.length > 0) {
                        dispatch({ type: 'ADD_ROWS', rows: newRows });
                      }
                    });
                  }}
                >
                  <ClipboardPaste className="mr-1.5 h-4 w-4" />
                  {t('paste')}
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="max-h-[28rem] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="w-12 px-4 py-3 text-center">#</th>
                    <th className="px-3 py-3">{t('colProperty')}</th>
                    <th className="px-3 py-3">{t('colFirstName')}</th>
                    <th className="px-3 py-3">{t('colLastName')}</th>
                    <th className="px-3 py-3">{t('colPhone')}</th>
                    <th className="w-20 px-3 py-3 text-center">Status</th>
                    <th className="w-12 px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-12 text-center text-muted-foreground"
                      >
                        {rows.length === 0
                          ? t('addRow') + '...'
                          : `No ${filter} rows`}
                      </td>
                    </tr>
                  )}
                  {filteredRows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`border-b border-border/50 transition-colors ${
                        row.status === 'error'
                          ? 'bg-red-500/5'
                          : 'hover:bg-muted/30'
                      }`}
                    >
                      <td className="px-4 py-2 text-center text-xs text-muted-foreground">
                        {rows.indexOf(row) + 1}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          className="w-full rounded border-0 bg-transparent px-1.5 py-1 text-sm focus:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          value={row.property}
                          onChange={(e) =>
                            dispatch({
                              type: 'UPDATE_ROW',
                              id: row.id,
                              field: 'property',
                              value: e.target.value,
                            })
                          }
                          placeholder="..."
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          className="w-full rounded border-0 bg-transparent px-1.5 py-1 text-sm focus:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          value={row.firstName}
                          onChange={(e) =>
                            dispatch({
                              type: 'UPDATE_ROW',
                              id: row.id,
                              field: 'firstName',
                              value: e.target.value,
                            })
                          }
                          placeholder="..."
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          className="w-full rounded border-0 bg-transparent px-1.5 py-1 text-sm focus:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          value={row.lastName}
                          onChange={(e) =>
                            dispatch({
                              type: 'UPDATE_ROW',
                              id: row.id,
                              field: 'lastName',
                              value: e.target.value,
                            })
                          }
                          placeholder="..."
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          className="w-full rounded border-0 bg-transparent px-1.5 py-1 text-sm focus:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          value={row.phone}
                          onChange={(e) =>
                            dispatch({
                              type: 'UPDATE_ROW',
                              id: row.id,
                              field: 'phone',
                              value: e.target.value,
                            })
                          }
                          placeholder="+58..."
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        {row.status === 'completed' && (
                          <span title={row.status}>
                            <CheckCircle2 className="mx-auto h-4 w-4 text-green-400" />
                          </span>
                        )}
                        {row.status === 'pending' && (
                          <span title={row.status}>
                            <Clock className="mx-auto h-4 w-4 text-yellow-400" />
                          </span>
                        )}
                        {row.status === 'error' && (
                          <span title={row.error ?? 'Error'}>
                            <AlertCircle className="mx-auto h-4 w-4 text-red-400" />
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => dispatch({ type: 'DELETE_ROW', id: row.id })}
                          className="text-muted-foreground hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sticky Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  {completedCount} {t('completed')}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-yellow-400" />
                  {pendingCount} {t('pending')}
                </span>
                {errorCount > 0 && (
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                    {errorCount} errors
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                {errorCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSubmit(true)}
                    disabled={submitting}
                  >
                    {t('retryFailed')}
                  </Button>
                )}
                <Button
                  onClick={() => handleSubmit(false)}
                  disabled={submitting || rows.length === 0}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('creating')}
                    </>
                  ) : (
                    t('createOrg')
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Global Error */}
        {globalError && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {globalError}
          </div>
        )}
      </div>

      {/* Bulk Add Modal */}
      {showBulkModal && (
        <BulkAddModal
          t={t}
          onAdd={addBulkRows}
          onClose={() => setShowBulkModal(false)}
          currentCount={rows.length}
        />
      )}
    </div>
  );
}
