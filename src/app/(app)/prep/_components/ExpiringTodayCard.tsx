'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Flame } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

type ExpiringProduct = {
  id: string;
  product: {
    name: string;
    unit: string;
  };
  quantity: number;
  expirationDate: Date;
  lotNumber: string | null;
};

type ExpiringTodayCardProps = {
  products: ExpiringProduct[];
};

/**
 * ExpiringTodayCard - Shows products that MUST be used today
 *
 * Priority #1 for prep - prevents waste and saves money
 */
export function ExpiringTodayCard({ products }: ExpiringTodayCardProps) {
  if (products.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-green-700">
            <span className="text-2xl">✓</span>
            Aucun produit à expirer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Tous les produits sont frais. Rien d'urgent à utiliser aujourd'hui.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getUrgencyBadge = (expirationDate: Date) => {
    const daysLeft = differenceInDays(new Date(expirationDate), new Date());

    if (daysLeft <= 0) {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
          AUJOURD'HUI
        </Badge>
      );
    } else if (daysLeft === 1) {
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
          Demain
        </Badge>
      );
    } else if (daysLeft <= 3) {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
          {daysLeft} jours
        </Badge>
      );
    }
    return null;
  };

  // Separate by urgency
  const today = products.filter(p => differenceInDays(new Date(p.expirationDate), new Date()) <= 0);
  const tomorrow = products.filter(p => differenceInDays(new Date(p.expirationDate), new Date()) === 1);
  const soon = products.filter(p => {
    const days = differenceInDays(new Date(p.expirationDate), new Date());
    return days > 1 && days <= 3;
  });

  return (
    <Card className="border-orange-200 bg-orange-50/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flame className="h-5 w-5 text-orange-600" />
            À Utiliser Aujourd'hui
          </CardTitle>
          <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-base px-3 py-1">
            {products.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Today - URGENT */}
        {today.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Expire aujourd'hui ({today.length})
            </h4>
            <div className="space-y-2">
              {today.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-red-200 bg-red-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-red-900">{item.product.name}</span>
                        {getUrgencyBadge(item.expirationDate)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-red-700">
                        <span className="font-medium">
                          {item.quantity} {item.product.unit}
                        </span>
                        {item.lotNumber && (
                          <>
                            <span>•</span>
                            <span className="text-xs">Lot {item.lotNumber}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tomorrow - WARNING */}
        {tomorrow.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-orange-700 mb-2">
              Expire demain ({tomorrow.length})
            </h4>
            <div className="space-y-2">
              {tomorrow.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-orange-200 bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{item.product.name}</span>
                        {getUrgencyBadge(item.expirationDate)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{item.quantity} {item.product.unit}</span>
                        {item.lotNumber && (
                          <>
                            <span>•</span>
                            <span className="text-xs">Lot {item.lotNumber}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Soon (2-3 days) - INFO */}
        {soon.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-yellow-700 mb-2">
              À utiliser bientôt ({soon.length})
            </h4>
            <div className="space-y-2">
              {soon.map((item) => {
                const daysLeft = differenceInDays(new Date(item.expirationDate), new Date());
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-yellow-200 bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{item.product.name}</span>
                          {getUrgencyBadge(item.expirationDate)}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{item.quantity} {item.product.unit}</span>
                          <span>•</span>
                          <span className="text-xs">
                            Expire: {format(new Date(item.expirationDate), 'dd/MM/yyyy', { locale: fr })}
                          </span>
                          {item.lotNumber && (
                            <>
                              <span>•</span>
                              <span className="text-xs">Lot {item.lotNumber}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick tip */}
        <div className="pt-2 border-t border-orange-200">
          <p className="text-xs text-muted-foreground">
            💡 Utilisez ces produits en priorité pour éviter le gaspillage
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
