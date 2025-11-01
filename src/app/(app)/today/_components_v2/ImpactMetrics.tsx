'use client';

import { TrendingDown, Clock, Trash2 } from 'lucide-react';

interface ImpactMetricsProps {
  moneySaved: number; // in euros
  timeSaved: number; // in minutes
  wastePrevented: number; // in kg
  period?: string; // e.g., "ce mois"
}

/**
 * Gamified impact metrics - shows the chef the real value they're creating
 * Big numbers, visual progress, motivational
 */
export function ImpactMetrics({ moneySaved, timeSaved, wastePrevented, period = 'ce mois' }: ImpactMetricsProps) {
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h${mins}min` : `${hours}h`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Money Saved */}
      <div className="rounded-lg border bg-card p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-muted">
            <TrendingDown className="h-5 w-5 text-foreground" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Économisé</span>
        </div>

        <div className="space-y-1">
          <div className="text-3xl font-bold tracking-tight">
            {moneySaved > 0 ? `€${moneySaved.toFixed(0)}` : '€0'}
          </div>
          <p className="text-xs text-muted-foreground">{period}</p>
        </div>

        {moneySaved > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              ~€{Math.round(moneySaved / 30)} par jour en moyenne
            </p>
          </div>
        )}
      </div>

      {/* Time Saved */}
      <div className="rounded-lg border bg-card p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-muted">
            <Clock className="h-5 w-5 text-foreground" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Temps gagné</span>
        </div>

        <div className="space-y-1">
          <div className="text-3xl font-bold tracking-tight">
            {timeSaved > 0 ? formatTime(timeSaved) : '0min'}
          </div>
          <p className="text-xs text-muted-foreground">{period}</p>
        </div>

        {timeSaved > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              vs saisie manuelle Excel
            </p>
          </div>
        )}
      </div>

      {/* Waste Prevented */}
      <div className="rounded-lg border bg-card p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-muted">
            <Trash2 className="h-5 w-5 text-foreground" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Gaspillage évité</span>
        </div>

        <div className="space-y-1">
          <div className="text-3xl font-bold tracking-tight">
            {wastePrevented > 0 ? `${wastePrevented.toFixed(1)}kg` : '0kg'}
          </div>
          <p className="text-xs text-muted-foreground">{period}</p>
        </div>

        {wastePrevented > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              ~{Math.round(wastePrevented * 0.9)} repas sauvés
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
