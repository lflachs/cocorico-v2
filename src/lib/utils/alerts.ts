/**
 * Alert Utilities
 * Helper functions for alert processing and date calculations
 */

export type AlertUrgency = 'high' | 'medium' | 'low';
export type AlertType = 'expiring' | 'lowStock' | 'dispute';

/**
 * Calculate days until expiration
 */
export function getDaysUntilExpiration(expirationDate: string | Date): number {
  const now = new Date();
  const expDate = new Date(expirationDate);
  const diffTime = expDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Calculate days since a date
 */
export function getDaysSince(dateString: string | Date): number {
  const now = new Date();
  const date = new Date(dateString);
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Determine urgency level for expiring items
 */
export function getExpirationUrgency(daysUntilExpiration: number): AlertUrgency {
  if (daysUntilExpiration <= 2) return 'high';
  if (daysUntilExpiration <= 5) return 'medium';
  return 'low';
}

/**
 * Determine urgency level for low stock items
 */
export function getLowStockUrgency(
  quantity: number,
  parLevel: number
): AlertUrgency {
  const shortage = parLevel - quantity;
  const percentShort = (shortage / parLevel) * 100;

  if (percentShort >= 80) return 'high';
  if (percentShort >= 50) return 'medium';
  return 'low';
}

/**
 * Determine urgency level for disputes
 */
export function getDisputeUrgency(daysSince: number): AlertUrgency {
  if (daysSince >= 7) return 'high';
  if (daysSince >= 3) return 'medium';
  return 'low';
}

/**
 * Get urgency-based color classes
 */
export function getUrgencyColorClasses(
  urgency: AlertUrgency,
  type: AlertType
): string {
  if (urgency === 'high') {
    return type === 'expiring'
      ? 'bg-destructive/5 border-destructive/20'
      : type === 'lowStock'
      ? 'bg-warning/10 border-warning/30'
      : 'bg-destructive/5 border-destructive/20';
  }
  if (urgency === 'medium') {
    return 'bg-warning/10 border-warning/30';
  }
  return 'bg-muted/50 border-border';
}

/**
 * Get urgency-based icon color classes
 */
export function getUrgencyIconClasses(
  urgency: AlertUrgency,
  type: AlertType
): string {
  if (type === 'expiring' && urgency === 'high') return 'text-destructive';
  if (type === 'lowStock') return 'text-warning';
  if (type === 'dispute' && urgency === 'high') return 'text-destructive';
  return 'text-primary';
}

/**
 * Sort alerts by urgency
 */
export function sortAlertsByUrgency<T extends { urgency: AlertUrgency }>(
  alerts: T[]
): T[] {
  const urgencyOrder = { high: 0, medium: 1, low: 2 };
  return [...alerts].sort(
    (a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
  );
}
