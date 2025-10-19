import { getAllProducts } from './product.service';
import { getUpcomingDlcs } from './dlc.service';
import {
  AlertUrgency,
  AlertType,
  getDaysUntilExpiration,
  getDaysSince,
  getExpirationUrgency,
  getLowStockUrgency,
  getDisputeUrgency,
  sortAlertsByUrgency,
} from '@/lib/utils/alerts';

/**
 * Alert Service - Server-side data fetching and processing for alerts
 */

export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  urgency: AlertUrgency;
  href: string;
  badge?: string;
}

/**
 * Fetches and processes all alerts from the database
 * This function runs on the server and should be called from Server Components
 */
export async function getAllAlerts(t: (key: any) => string): Promise<Alert[]> {
  try {
    const [products, dlcs] = await Promise.all([
      getAllProducts(),
      getUpcomingDlcs(7),
      // TODO: Add getOpenDisputes() when dispute service is created
    ]);

    const alerts: Alert[] = [];

    // Process expiring products
    dlcs.forEach((dlc) => {
      const days = getDaysUntilExpiration(dlc.expirationDate);
      const urgency = getExpirationUrgency(days);

      let badge = '';
      if (days <= 0) {
        badge = t('dlc.status.expired');
      } else if (days === 1) {
        badge = t('dlc.status.tomorrow');
      } else {
        badge = `${days} ${t('dlc.status.days')}`;
      }

      alerts.push({
        id: `dlc-${dlc.id}`,
        type: 'expiring',
        title: dlc.product.name,
        description: `${dlc.quantity} ${dlc.unit}`,
        urgency,
        href: '/dlc',
        badge,
      });
    });

    // Process low stock items
    products.forEach((product) => {
      if (product.parLevel && product.quantity < product.parLevel) {
        const urgency = getLowStockUrgency(product.quantity, product.parLevel);

        alerts.push({
          id: `stock-${product.id}`,
          type: 'lowStock',
          title: product.name,
          description: `${product.quantity} / ${product.parLevel} ${product.unit}`,
          urgency,
          href: '/inventory',
          badge: t('inventory.status.low'),
        });
      }
    });

    // TODO: Process disputes when service is available
    // const disputes = await getOpenDisputes();
    // disputes.forEach((dispute) => { ... });

    // Sort by urgency
    return sortAlertsByUrgency(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return [];
  }
}

/**
 * Get alerts count by type
 */
export function getAlertsCounts(alerts: Alert[]) {
  return {
    all: alerts.length,
    expiring: alerts.filter((a) => a.type === 'expiring').length,
    lowStock: alerts.filter((a) => a.type === 'lowStock').length,
    disputes: alerts.filter((a) => a.type === 'dispute').length,
  };
}
