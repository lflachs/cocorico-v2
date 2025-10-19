import { Badge } from '@/components/ui/badge';
import { AlertUrgency } from '@/lib/utils/alerts';

interface AlertBadgeProps {
  urgency: AlertUrgency;
  label: string;
}

/**
 * Badge component that displays alert urgency with appropriate styling
 */
export function AlertBadge({ urgency, label }: AlertBadgeProps) {
  if (urgency === 'high') {
    return (
      <Badge variant="destructive" className="text-xs">
        {label}
      </Badge>
    );
  }

  if (urgency === 'medium') {
    return (
      <Badge className="bg-warning text-warning-foreground text-xs">
        {label}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="text-xs">
      {label}
    </Badge>
  );
}
