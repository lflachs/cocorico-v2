'use client';

import { ReactNode } from 'react';

interface SummaryCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  color?: 'default' | 'green' | 'blue' | 'yellow';
}

/**
 * Simple card for displaying key metrics
 * Clean and scannable for kitchen staff
 */
export function SummaryCard({ icon, label, value, subtitle, color = 'default' }: SummaryCardProps) {
  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'blue':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'yellow':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      default:
        return 'bg-background border-border text-foreground';
    }
  };

  return (
    <div className={`rounded-lg border p-4 ${getColorClasses()}`}>
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-background/50 p-2">
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-bold mt-1 truncate">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
