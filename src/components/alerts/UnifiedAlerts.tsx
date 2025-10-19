import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAllAlerts } from '@/lib/services/alerts.service';
import { getServerTranslation } from '@/lib/utils/language';
import { AlertsTabsClient } from './AlertsTabsClient';

/**
 * Unified Alerts - Server Component
 * Displays all alerts (expiring products, low stock, disputes)
 * Fetches data server-side for optimal performance
 */
export async function UnifiedAlerts() {
  const { t } = await getServerTranslation();

  // Fetch alerts server-side
  const alerts = await getAllAlerts(t);

  // Empty state
  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader className="bg-gradient-to-br from-success/5 via-transparent to-transparent">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-success" />
            {t('today.alerts.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-foreground font-medium">
              {t('today.alerts.allClear')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('today.alerts.allClearHint')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Alerts with tabs
  return (
    <Card>
      <CardHeader className="bg-gradient-to-br from-warning/5 via-transparent to-transparent">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          {t('today.alerts.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AlertsTabsClient
          alerts={alerts}
          translations={{
            title: t('today.alerts.title'),
            all: t('today.alerts.all'),
            expiring: t('today.alerts.expiring'),
            stock: t('today.alerts.stock'),
            disputes: t('today.alerts.disputes'),
            noAlertsInCategory: t('today.alerts.noAlertsInCategory'),
          }}
        />
      </CardContent>
    </Card>
  );
}
