'use client';

import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface FoodCostCardProps {
  percentage: number;
  isGood: boolean;
  trend?: 'up' | 'down' | 'stable';
  previousPercent?: number;
}

/**
 * Large, visual card showing the main food cost percentage
 * Color-coded: Green (good), Yellow (ok), Red (bad)
 */
export function FoodCostCard({ percentage, isGood, trend, previousPercent }: FoodCostCardProps) {
  const getColor = () => {
    if (percentage === 0) return 'text-muted-foreground';
    if (percentage <= 30) return 'text-green-600';
    if (percentage <= 35) return 'text-green-500';
    if (percentage <= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBgColor = () => {
    if (percentage === 0) return 'bg-muted/10';
    if (percentage <= 30) return 'bg-green-50 border-green-200';
    if (percentage <= 35) return 'bg-green-50/50 border-green-100';
    if (percentage <= 40) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getTrendIcon = () => {
    if (!trend || !previousPercent) return null;

    const diff = percentage - previousPercent;
    const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
    const color = trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-green-500' : 'text-muted-foreground';

    return (
      <div className={`flex items-center gap-1 text-sm ${color}`}>
        <Icon className="h-4 w-4" />
        <span>{Math.abs(diff).toFixed(1)}%</span>
      </div>
    );
  };

  return (
    <div className={`rounded-xl border-2 p-6 ${getBgColor()}`}>
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Food Cost</p>

        <div className="flex items-end gap-3">
          <div className={`text-6xl font-bold tracking-tight ${getColor()}`}>
            {percentage > 0 ? percentage.toFixed(1) : '—'}
            <span className="text-3xl">%</span>
          </div>

          {getTrendIcon()}
        </div>

        <div className="flex items-center gap-2 text-sm">
          {percentage > 0 ? (
            isGood ? (
              <span className="inline-flex items-center gap-1 text-green-600">
                ✓ <span className="font-medium">Bon ratio</span>
              </span>
            ) : percentage <= 40 ? (
              <span className="inline-flex items-center gap-1 text-yellow-600">
                ⚠ <span className="font-medium">À surveiller</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-red-600">
                ⚠ <span className="font-medium">Ratio élevé</span>
              </span>
            )
          ) : (
            <span className="text-muted-foreground">Pas de données</span>
          )}

          {previousPercent !== undefined && previousPercent > 0 && (
            <span className="text-muted-foreground">
              vs {previousPercent.toFixed(1)}% précédent
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
