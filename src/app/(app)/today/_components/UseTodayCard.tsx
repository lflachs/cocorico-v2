'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Timer, ChefHat, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { ExpiringProduct } from '@/lib/services/insights.service';

interface UseTodayCardProps {
  products: ExpiringProduct[];
}

/**
 * UseTodayCard - Expiring products with dish suggestions
 * Helps prevent waste by suggesting dishes that use expiring ingredients
 */
export function UseTodayCard({ products }: UseTodayCardProps) {
  const { t } = useLanguage();

  if (products.length === 0) {
    return null;
  }

  const totalValue = products.reduce((sum, p) => sum + p.estimatedValue, 0);
  const urgentCount = products.filter((p) => p.daysUntilExpiration <= 1).length;

  return (
    <Card className="shadow-lg border-0 overflow-hidden">
      <CardHeader className="bg-gradient-to-br from-amber-50/80 via-amber-50/20 to-transparent dark:from-amber-950/10 dark:via-amber-950/5 dark:to-transparent">
        <CardTitle className="flex items-center gap-3 text-base sm:text-lg">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md">
            <Timer className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {t('today.useToday.title') || 'Use Today'}
              </span>
              {urgentCount > 0 && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  {urgentCount} {urgentCount === 1 ? 'expires soon' : 'expire soon'}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-normal mt-0.5">
              {t('today.useToday.avoidWaste') || 'Avoid waste, save money'}
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-3">
        {products.map((product) => {
          const isUrgent = product.daysUntilExpiration <= 1;
          const daysLeft = product.daysUntilExpiration;

          return (
            <div
              key={product.productId}
              className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                isUrgent
                  ? 'bg-gradient-to-br from-red-50 to-transparent border-red-200 dark:from-red-950/20 dark:border-red-900/30'
                  : 'bg-gradient-to-br from-amber-50 to-transparent border-amber-200 dark:from-amber-950/20 dark:border-amber-900/30'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-base text-foreground truncate">
                      {product.productName}
                    </h4>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${
                      daysLeft === 0
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : daysLeft === 1
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {daysLeft === 0
                        ? t('today.useToday.today') || 'Today'
                        : daysLeft === 1
                        ? t('today.useToday.tomorrow') || 'Tomorrow'
                        : `${daysLeft} ${t('today.useToday.days') || 'days'}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{product.quantity} {product.unit}</span>
                    {product.estimatedValue > 0 && (
                      <>
                        <span>•</span>
                        <span className="font-medium text-foreground">€{product.estimatedValue.toFixed(2)}</span>
                      </>
                    )}
                  </div>
                </div>
                <AlertCircle className={`w-5 h-5 flex-shrink-0 ${
                  isUrgent ? 'text-red-600' : 'text-amber-600'
                }`} />
              </div>

              {product.usedInDishes.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-start gap-2">
                    <ChefHat className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {t('today.useToday.suggestion') || 'Try using in'}:
                      </span>{' '}
                      {product.usedInDishes.map((d) => d.name).join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {totalValue > 0 && (
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-green-50 to-transparent border-2 border-green-200 dark:from-green-950/20 dark:border-green-900/30">
            <p className="text-sm font-medium">
              <span className="text-green-700 dark:text-green-400">💰 {t('today.useToday.saveMoney') || 'Save'}:</span>{' '}
              <span className="text-foreground font-bold">€{totalValue.toFixed(2)}</span>{' '}
              <span className="text-muted-foreground text-xs">
                {t('today.useToday.byUsingToday') || 'by using these today'}
              </span>
            </p>
          </div>
        )}

        <div className="pt-2">
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <Link href="/dlc">
              <Timer className="w-4 h-4 mr-2" />
              {t('today.useToday.viewAllDLC') || 'View All DLC'}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
