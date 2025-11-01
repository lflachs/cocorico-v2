'use client';

import { AlertTriangle, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface UrgentAlert {
  id: string;
  type: 'expiring' | 'stockout';
  productName: string;
  severity: 'high' | 'critical';
  message: string;
  actionLabel: string;
  actionHref: string;
}

interface UrgentAlertsProps {
  alerts: UrgentAlert[];
}

/**
 * Only show URGENT things that need immediate action
 * Keep it minimal - if nothing urgent, don't show
 */
export function UrgentAlerts({ alerts }: UrgentAlertsProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          À traiter
        </h2>
      </div>

      <div className="space-y-2">
        {alerts.slice(0, 3).map((alert) => (
          <div
            key={alert.id}
            className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {alert.severity === 'critical' && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-destructive/10 text-destructive rounded">
                      Urgent
                    </span>
                  )}
                  <span className="font-semibold text-sm">{alert.productName}</span>
                </div>
                <p className="text-sm text-muted-foreground">{alert.message}</p>
              </div>

              <Link href={alert.actionHref}>
                <Button size="sm" variant="outline" className="flex-shrink-0">
                  {alert.actionLabel}
                </Button>
              </Link>
            </div>
          </div>
        ))}

        {alerts.length > 3 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            + {alerts.length - 3} autre{alerts.length - 3 > 1 ? 's' : ''} alerte
            {alerts.length - 3 > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
