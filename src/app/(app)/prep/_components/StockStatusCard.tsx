'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type StockItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  parLevel: number | null;
  status: 'GOOD' | 'LOW' | 'CRITICAL';
};

type StockStatusCardProps = {
  items: StockItem[];
};

/**
 * StockStatusCard - Quick overview of critical stock items
 *
 * Shows only LOW and CRITICAL items
 * Full details available in Inventory page
 */
export function StockStatusCard({ items }: StockStatusCardProps) {
  const criticalItems = items.filter(i => i.status === 'CRITICAL');
  const lowItems = items.filter(i => i.status === 'LOW');

  if (criticalItems.length === 0 && lowItems.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-green-700">
            <Package className="h-5 w-5" />
            Stock - Tout va bien
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Tous les ingrédients clés sont bien approvisionnés.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" />
            Stock - Alertes
          </CardTitle>
          <Link href="/inventory">
            <Button variant="ghost" size="sm">
              Voir tout
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Critical items */}
        {criticalItems.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Critique ({criticalItems.length})
            </h4>
            <div className="space-y-2">
              {criticalItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-red-200 bg-red-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-red-900">{item.name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                          {item.quantity} {item.unit}
                        </Badge>
                        {item.parLevel && (
                          <span className="text-xs text-red-700">
                            Seuil: {item.parLevel} {item.unit}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Low items */}
        {lowItems.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-yellow-700 mb-2">
              Stock bas ({lowItems.length})
            </h4>
            <div className="space-y-2">
              {lowItems.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-yellow-200 bg-yellow-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{item.name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                          {item.quantity} {item.unit}
                        </Badge>
                        {item.parLevel && (
                          <span className="text-xs text-yellow-700">
                            Seuil: {item.parLevel} {item.unit}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {lowItems.length > 3 && (
                <Link href="/inventory">
                  <Button variant="outline" size="sm" className="w-full">
                    +{lowItems.length - 3} autres articles
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
