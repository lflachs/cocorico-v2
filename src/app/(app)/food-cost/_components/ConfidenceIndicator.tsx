'use client';

import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface ConfidenceIndicatorProps {
  score: number; // 0-100
  message: string;
}

/**
 * Shows data quality/confidence with visual indicator
 * Helps users understand if calculations are reliable
 */
export function ConfidenceIndicator({ score, message }: ConfidenceIndicatorProps) {
  const getIndicator = () => {
    if (score >= 80) {
      return {
        icon: CheckCircle2,
        color: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200',
        label: 'Fiable',
      };
    }
    if (score >= 50) {
      return {
        icon: Info,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 border-blue-200',
        label: 'Partiel',
      };
    }
    return {
      icon: AlertCircle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 border-yellow-200',
      label: 'Incomplet',
    };
  };

  const indicator = getIndicator();
  const Icon = indicator.icon;

  return (
    <div className={`rounded-lg border p-3 ${indicator.bgColor}`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${indicator.color} flex-shrink-0 mt-0.5`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold ${indicator.color} uppercase tracking-wide`}>
              {indicator.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {score}%
            </span>
          </div>

          <p className="text-sm text-muted-foreground">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
