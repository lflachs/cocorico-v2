'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, UtensilsCrossed } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { DailyInsights } from '@/lib/services/insights.service';

interface MenuStatusCardProps {
  menuStatus: DailyInsights['menuStatus'];
}

/**
 * MenuStatusCard - Service readiness check
 * Shows if all active dishes can be made with current inventory
 */
export function MenuStatusCard({ menuStatus }: MenuStatusCardProps) {
  const { t } = useLanguage();

  // Don't show if no menu configured
  if (menuStatus.totalActive === 0) {
    return null;
  }

  const isAllReady = menuStatus.allReady;
  const blockedCount = menuStatus.totalActive - menuStatus.readyCount;

  return (
    <Card className="shadow-lg border-0 overflow-hidden">
      <CardHeader className={`bg-gradient-to-br ${
        isAllReady
          ? 'from-green-50/80 via-green-50/20 to-transparent dark:from-green-950/10 dark:via-green-950/5 dark:to-transparent'
          : 'from-yellow-50/80 via-yellow-50/20 to-transparent dark:from-yellow-950/10 dark:via-yellow-950/5 dark:to-transparent'
      }`}>
        <CardTitle className="flex items-center gap-3 text-base sm:text-lg">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
            isAllReady
              ? 'bg-gradient-to-br from-green-500 to-green-600'
              : 'bg-gradient-to-br from-yellow-500 to-yellow-600'
          }`}>
            {isAllReady ? (
              <CheckCircle2 className="w-5 h-5 text-white" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {isAllReady
                  ? t('today.menu.readyForService') || 'Ready for Service'
                  : t('today.menu.title') || 'Menu Status'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-normal mt-0.5">
              {isAllReady
                ? `${menuStatus.totalActive} ${menuStatus.totalActive === 1 ? 'dish' : 'dishes'} ready to go`
                : `${blockedCount} ${blockedCount === 1 ? 'dish needs' : 'dishes need'} attention`}
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {isAllReady ? (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-transparent border-2 border-green-200 dark:from-green-950/20 dark:border-green-900/30">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                ✅ {t('today.menu.allReady') || "You're all set! All menu items can be prepared with current stock."}
              </p>
            </div>

            {/* Show dish capacities */}
            {menuStatus.dishCapacities && menuStatus.dishCapacities.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('today.menu.capacity') || 'Dish capacity'}:
                </p>
                <div className="grid gap-2">
                  {menuStatus.dishCapacities.slice(0, 5).map((dish) => (
                    <div
                      key={dish.dishId}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {dish.dishName}
                        </p>
                        {dish.limitingIngredient && dish.maxPortions < 100 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t('today.menu.limitedBy') || 'Limited by'}: {dish.limitingIngredient.toLowerCase()}
                          </p>
                        )}
                      </div>
                      <div className="ml-3 text-right shrink-0">
                        <p className={`text-lg font-bold ${
                          dish.maxPortions < 10
                            ? 'text-orange-600 dark:text-orange-400'
                            : dish.maxPortions < 30
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {dish.maxPortions > 999 ? '999+' : dish.maxPortions}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('today.menu.portions') || 'portions'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {menuStatus.items.map((item) => (
              <div
                key={item.dishId}
                className="p-4 rounded-xl border-2 bg-gradient-to-br from-yellow-50 to-transparent border-yellow-200 dark:from-yellow-950/20 dark:border-yellow-900/30"
              >
                <h5 className="font-semibold text-base text-foreground mb-2">{item.dishName}</h5>
                <div className="space-y-1.5">
                  {item.missingIngredients.map((ingredient, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">•</span>
                      <span className="font-medium text-foreground">{ingredient.name}:</span>
                      <span className="text-muted-foreground">
                        {t('today.menu.need') || 'need'} {ingredient.needed} {ingredient.unit}
                        {' '}({t('today.menu.have') || 'have'} {ingredient.available.toFixed(1)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-2">
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <Link href="/menu">
              <UtensilsCrossed className="w-4 h-4 mr-2" />
              {t('today.menu.viewMenu') || 'View Menu'}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
