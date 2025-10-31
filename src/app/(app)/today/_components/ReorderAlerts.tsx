'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, TrendingDown } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { ReorderAlert } from '@/lib/services/insights.service';

interface ReorderAlertsProps {
  alerts: ReorderAlert[];
}

/**
 * ReorderAlerts - Smart low stock warnings with context
 * Shows products that need reordering with urgency and dish usage context
 */
export function ReorderAlerts({ alerts }: ReorderAlertsProps) {
  const { t } = useLanguage();

  if (alerts.length === 0) {
    return null;
  }

  const urgentCount = alerts.filter((a) => a.urgency === 'urgent').length;

  return (
    <Card className="shadow-lg border-0 overflow-hidden">
      <CardHeader className="bg-gradient-to-br from-orange-50/80 via-orange-50/20 to-transparent dark:from-orange-950/10 dark:via-orange-950/5 dark:to-transparent">
        <CardTitle className="flex items-center gap-3 text-base sm:text-lg">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {t('today.reorder.title') || 'Needs Reordering'}
              </span>
              {urgentCount > 0 && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {urgentCount} {t('today.reorder.urgent') || 'URGENT'}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-normal mt-0.5">
              {alerts.length} {alerts.length === 1 ? 'item' : 'items'} running low
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-3">
        {alerts.map((alert) => {
          const percentage = (alert.currentQuantity / alert.parLevel) * 100;
          const isUrgent = alert.urgency === 'urgent';
          const isHigh = alert.urgency === 'high';

          return (
            <div
              key={alert.productId}
              className={`group p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                isUrgent
                  ? 'bg-gradient-to-br from-red-50 to-transparent border-red-200 dark:from-red-950/20 dark:border-red-900/30'
                  : isHigh
                  ? 'bg-gradient-to-br from-orange-50 to-transparent border-orange-200 dark:from-orange-950/20 dark:border-orange-900/30'
                  : 'bg-gradient-to-br from-gray-50 to-transparent border-gray-200 dark:from-gray-900/20 dark:border-gray-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-base text-foreground truncate mb-1">
                    {alert.productName}
                  </h4>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`font-medium ${isUrgent ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground'}`}>
                      {alert.currentQuantity.toFixed(1)} {alert.unit}
                    </span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-muted-foreground">
                      {alert.parLevel.toFixed(1)} {alert.unit} {t('today.reorder.needed') || 'needed'}
                    </span>
                  </div>
                </div>
                <TrendingDown className={`w-5 h-5 flex-shrink-0 ${
                  isUrgent ? 'text-red-600' : isHigh ? 'text-orange-600' : 'text-gray-500'
                }`} />
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full transition-all rounded-full ${
                    isUrgent
                      ? 'bg-gradient-to-r from-red-600 to-red-500'
                      : isHigh
                      ? 'bg-gradient-to-r from-orange-600 to-orange-500'
                      : 'bg-gradient-to-r from-gray-600 to-gray-500'
                  }`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>

              {alert.usedInDishCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  📋 {t('today.reorder.usedIn') || 'Used in'} {alert.usedInDishCount}{' '}
                  {alert.usedInDishCount === 1
                    ? t('today.reorder.dish') || 'dish'
                    : t('today.reorder.dishes') || 'dishes'}
                </p>
              )}
            </div>
          );
        })}

        <div className="pt-2">
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <Link href="/inventory">
              <ShoppingCart className="w-4 h-4 mr-2" />
              {t('today.reorder.viewInventory') || 'View Inventory'}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
