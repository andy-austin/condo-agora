'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { House } from '@/lib/queries/house';

type HouseListProps = {
  houses: House[];
  // eslint-disable-next-line no-unused-vars
  onDelete?: (_id: string) => void;
  deleting?: string | null;
};

export default function HouseList({ houses, onDelete, deleting }: HouseListProps) {
  if (houses.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No properties yet. Create your first one to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {houses.map((house) => (
        <Card key={house.id} className="hover:border-primary/50 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <Link href={`/dashboard/properties/${house.id}`}>
                <CardTitle className="text-lg hover:underline cursor-pointer">
                  {house.name}
                </CardTitle>
              </Link>
              <Badge variant="secondary">
                {house.residents.length} {house.residents.length === 1 ? 'resident' : 'residents'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Link
                href={`/dashboard/properties/${house.id}`}
                className="text-sm text-primary hover:underline"
              >
                View details
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
                      ? 'Remove all residents before deleting'
                      : 'Delete property'
                  }
                >
                  {deleting === house.id ? 'Deleting...' : 'Delete'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
