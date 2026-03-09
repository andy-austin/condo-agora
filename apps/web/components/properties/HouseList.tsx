'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/dashboard/states';
import { Building2, LayoutGrid, List, Users, Calendar } from 'lucide-react';
import type { House } from '@/lib/queries/house';

type HouseListProps = {
  houses: House[];
  // eslint-disable-next-line no-unused-vars
  onDelete?: (_id: string) => void;
  deleting?: string | null;
};

export default function HouseList({ houses, onDelete, deleting }: HouseListProps) {
  const t = useTranslations('dashboard');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  function getOccupancyStatus(house: House) {
    if (house.residents.length === 0) return { label: t('properties.vacant'), variant: 'outline' as const };
    return { label: t('properties.occupied'), variant: 'default' as const };
  }

  if (houses.length === 0) {
    return (
      <EmptyState
        icon="properties"
        title={t('properties.noProperties')}
        message={t('properties.noPropertiesMessage')}
      />
    );
  }

  return (
    <div>
      {/* View Toggle */}
      <div className="flex items-center justify-end gap-1 mb-4">
        <button
          onClick={() => setViewMode('grid')}
          className={`p-2 rounded-lg transition-colors ${
            viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
          }`}
          aria-label={t('properties.gridView')}
        >
          <LayoutGrid size={18} />
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={`p-2 rounded-lg transition-colors ${
            viewMode === 'table' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
          }`}
          aria-label={t('properties.tableView')}
        >
          <List size={18} />
        </button>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {houses.map((house) => {
            const status = getOccupancyStatus(house);
            return (
              <Card key={house.id} className="hover:border-primary/50 transition-colors group">
                {/* Color placeholder header */}
                <div className="h-2 bg-gradient-to-r from-primary/60 to-primary/20 rounded-t-xl" />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 size={18} className="text-primary" />
                      </div>
                      <Link href={`/dashboard/properties/${house.id}`}>
                        <CardTitle className="text-base hover:underline cursor-pointer group-hover:text-primary transition-colors">
                          {house.name}
                        </CardTitle>
                      </Link>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Users size={14} />
                      {house.residents.length} {house.residents.length === 1 ? t('common.resident') : t('common.residents')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {new Date(house.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Link
                      href={`/dashboard/properties/${house.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {t('common.viewDetails')}
                    </Link>
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onDelete(house.id)}
                        disabled={deleting === house.id || house.residents.length > 0}
                        title={
                          house.residents.length > 0
                            ? t('properties.removeResidentsFirst')
                            : t('properties.deleteProperty')
                        }
                      >
                        {deleting === house.id ? t('common.deleting') : t('common.delete')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('properties.property')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                  {t('properties.status')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('properties.residentsTab')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                  {t('properties.created')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('properties.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {houses.map((house) => {
                const status = getOccupancyStatus(house);
                return (
                  <tr key={house.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Building2 size={16} className="text-muted-foreground shrink-0" />
                        <Link
                          href={`/dashboard/properties/${house.id}`}
                          className="text-sm font-medium hover:text-primary transition-colors"
                        >
                          {house.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {house.residents.length}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                      {new Date(house.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/properties/${house.id}`}>{t('common.view')}</Link>
                        </Button>
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => onDelete(house.id)}
                            disabled={deleting === house.id || house.residents.length > 0}
                          >
                            {deleting === house.id ? '...' : t('common.delete')}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
