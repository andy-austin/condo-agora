'use client';

import { useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { getApiClient } from '@/lib/api';
import {
  GET_DOCUMENTS,
  ATTACH_DOCUMENT,
  DELETE_DOCUMENT,
  MARK_QUOTE_SELECTED,
  type Document,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPES,
  formatFileSize,
} from '@/lib/queries/document';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Upload,
  Trash2,
  Download,
  CheckCircle2,
  Star,
  Loader2,
  X,
} from 'lucide-react';

interface DocumentSectionProps {
  proposalId: string;
  isAdmin: boolean;
  currentUserId: string;
}

export default function DocumentSection({
  proposalId,
  isAdmin,
  currentUserId,
}: DocumentSectionProps) {
  const t = useTranslations('dashboard.proposals');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('QUOTE');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
        if (!token) return;
    const client = getApiClient();
    try {
      const data = await client.request<{ documents: Document[] }>(
        GET_DOCUMENTS,
        { proposalId }
      );
      setDocuments(data.documents || []);
    } catch {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  useState(() => {
    fetchDocuments();
  });

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      // Upload to Vercel Blob
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || 'Upload failed');
      }
      const { url, fileName, fileSize, mimeType } = await uploadRes.json();

      // Store metadata in backend
            if (!token) return;
      const client = getApiClient();
      const data = await client.request<{ attachDocument: Document }>(
        ATTACH_DOCUMENT,
        {
          proposalId,
          type: selectedType,
          fileUrl: url,
          fileName,
          fileSize,
          mimeType,
        }
      );
      setDocuments((prev) => [data.attachDocument, ...prev]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
        if (!token) return;
    const client = getApiClient();
    try {
      await client.request(DELETE_DOCUMENT, { id: docId });
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch {
      setError('Failed to delete document');
    }
  };

  const handleMarkSelected = async (docId: string) => {
        if (!token) return;
    const client = getApiClient();
    try {
      const data = await client.request<{ markQuoteSelected: Document }>(
        MARK_QUOTE_SELECTED,
        { id: docId }
      );
      setDocuments((prev) =>
        prev.map((d) =>
          d.type === 'QUOTE'
            ? { ...d, selected: d.id === data.markQuoteSelected.id }
            : d
        )
      );
    } catch {
      setError('Failed to mark as selected');
    }
  };

  const grouped = DOCUMENT_TYPES.reduce<Record<string, Document[]>>(
    (acc, type) => {
      acc[type] = documents.filter((d) => d.type === type);
      return acc;
    },
    {}
  );

  const quotes = grouped['QUOTE'] || [];

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold">{t('documents')}</h3>
          {documents.length > 0 && (
            <Badge variant="secondary">{documents.length}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {DOCUMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <Upload className="w-3 h-3 mr-1" />
            )}
            {uploading ? t('uploading') : t('upload')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}>
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{t('noDocuments')}</p>
          <p className="text-xs mt-1">
            {t('noDocumentsHint')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {DOCUMENT_TYPES.filter((t) => (grouped[t] || []).length > 0).map(
            (type) => (
              <div key={type}>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {DOCUMENT_TYPE_LABELS[type]} ({(grouped[type] || []).length})
                </h4>
                <div className="space-y-2">
                  {(grouped[type] || []).map((doc) => (
                    <DocumentRow
                      key={doc.id}
                      doc={doc}
                      isAdmin={isAdmin}
                      currentUserId={currentUserId}
                      onDelete={handleDelete}
                      onMarkSelected={
                        type === 'QUOTE' ? handleMarkSelected : undefined
                      }
                      t={t}
                    />
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Quote comparison - show when 2+ quotes */}
      {quotes.length >= 2 && (
        <QuoteComparison quotes={quotes} isAdmin={isAdmin} onSelect={handleMarkSelected} t={t} />
      )}
    </div>
  );
}

function DocumentRow({
  doc,
  isAdmin,
  currentUserId,
  onDelete,
  onMarkSelected,
  t,
}: {
  doc: Document;
  isAdmin: boolean;
  currentUserId: string;
  onDelete: (id: string) => void;
  onMarkSelected?: (id: string) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const canDelete = isAdmin || doc.uploadedBy === currentUserId;

  return (
    <div
      className={`flex items-center gap-3 p-3 border rounded-lg text-sm ${
        doc.selected ? 'border-green-300 bg-green-50' : 'bg-white'
      }`}
    >
      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{doc.fileName}</span>
          {doc.selected && (
            <Badge className="bg-green-100 text-green-700 text-[10px]">
              {t('selected')}
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatFileSize(doc.fileSize)}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {isAdmin && onMarkSelected && !doc.selected && (
          <button
            onClick={() => onMarkSelected(doc.id)}
            className="p-1 rounded hover:bg-gray-100 text-muted-foreground"
            title={t('markAsSelected')}
          >
            <Star className="w-4 h-4" />
          </button>
        )}
        <a
          href={doc.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 rounded hover:bg-gray-100 text-muted-foreground"
          title={t('download')}
        >
          <Download className="w-4 h-4" />
        </a>
        {canDelete && (
          <button
            onClick={() => onDelete(doc.id)}
            className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600"
            title={t('deleteComment')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function QuoteComparison({
  quotes,
  isAdmin,
  onSelect,
  t,
}: {
  quotes: Document[];
  isAdmin: boolean;
  onSelect: (id: string) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  return (
    <div className="mt-4 border rounded-lg p-4 bg-blue-50/50 border-blue-200">
      <h4 className="text-sm font-semibold text-blue-800 mb-3">
        {t('quoteComparison', { count: quotes.length })}
      </h4>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(quotes.length, 3)}, 1fr)` }}>
        {quotes.map((quote) => (
          <div
            key={quote.id}
            className={`border rounded-lg p-3 bg-white text-sm ${
              quote.selected ? 'border-green-400 ring-1 ring-green-300' : ''
            }`}
          >
            <div className="font-medium truncate mb-1">{quote.fileName}</div>
            <div className="text-xs text-muted-foreground mb-2">
              {formatFileSize(quote.fileSize)}
            </div>
            <div className="flex items-center gap-2">
              <a
                href={quote.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                {t('view')}
              </a>
              {isAdmin && !quote.selected && (
                <button
                  onClick={() => onSelect(quote.id)}
                  className="text-xs text-green-700 hover:underline flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {t('select')}
                </button>
              )}
              {quote.selected && (
                <span className="text-xs text-green-700 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  {t('selected')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
