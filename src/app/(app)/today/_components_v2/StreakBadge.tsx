'use client';

import { Flame } from 'lucide-react';

interface StreakBadgeProps {
  days: number;
}

/**
 * Gamification: Show consecutive days of using the app
 * Motivates daily engagement
 */
export function StreakBadge({ days }: StreakBadgeProps) {
  if (days === 0) return null;

  const getMessage = () => {
    if (days === 1) return 'Premier jour';
    if (days < 7) return `${days} jours`;
    if (days < 30) return `${days} jours`;
    return `${days} jours`;
  };

  const getEmoji = () => {
    if (days === 1) return '✨';
    if (days < 7) return '📈';
    if (days < 30) return '🔥';
    return '🏆';
  };

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-card">
      <span className="text-lg">{getEmoji()}</span>
      <div className="flex items-baseline gap-1.5">
        <span className="font-semibold text-sm">{getMessage()}</span>
        <span className="text-xs text-muted-foreground">d'affilée</span>
      </div>
    </div>
  );
}
