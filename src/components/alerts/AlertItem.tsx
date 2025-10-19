import Link from 'next/link';
import { Clock, Package, AlertCircle } from 'lucide-react';
import { Alert } from '@/lib/services/alerts.service';
import { AlertBadge } from './AlertBadge';
import { getUrgencyColorClasses, getUrgencyIconClasses } from '@/lib/utils/alerts';
import { cn } from '@/lib/utils/cn';

interface AlertItemProps {
  alert: Alert;
}

/**
 * Get the appropriate icon based on alert type
 */
function getAlertIcon(type: string) {
  switch (type) {
    case 'expiring':
      return Clock;
    case 'lowStock':
      return Package;
    case 'dispute':
      return AlertCircle;
    default:
      return AlertCircle;
  }
}

/**
 * Individual alert card that displays alert information
 * Features urgency-based styling and links to relevant pages
 */
export function AlertItem({ alert }: AlertItemProps) {
  const Icon = getAlertIcon(alert.type);

  return (
    <Link
      href={alert.href}
      className={cn(
        'flex items-center justify-between p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer',
        getUrgencyColorClasses(alert.urgency, alert.type)
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'p-2 rounded-lg',
            alert.urgency === 'high' ? 'bg-white' : 'bg-white/50'
          )}
        >
          <Icon
            className={cn('h-4 w-4', getUrgencyIconClasses(alert.urgency, alert.type))}
          />
        </div>
        <div>
          <p className="font-medium text-sm text-foreground">{alert.title}</p>
          <p className="text-xs text-muted-foreground">{alert.description}</p>
        </div>
      </div>
      {alert.badge && (
        <div className="flex items-center gap-2">
          <AlertBadge urgency={alert.urgency} label={alert.badge} />
        </div>
      )}
    </Link>
  );
}
