/**
 * PWA Notification Utilities
 * Handles push notifications for expiring DLC items
 */

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default';

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

/**
 * Check if notifications are supported and permitted
 */
export function canSendNotifications(): boolean {
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    Notification.permission === 'granted'
  );
}

/**
 * Send a local notification
 */
export async function sendNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (!canSendNotifications()) {
    console.warn('Notifications not available or not permitted');
    return;
  }

  try {
    // Try to use service worker notification first (better for PWA)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/icons/icon-192x192.svg',
        badge: '/icons/icon-72x72.svg',
        vibrate: [200, 100, 200],
        ...options,
      });
    } else {
      // Fallback to regular notification
      new Notification(title, {
        icon: '/icons/icon-192x192.svg',
        ...options,
      });
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

/**
 * Send notification for expiring DLC items
 */
export async function notifyExpiringItems(items: {
  count: number;
  products: string[];
  daysUntilExpiry: number;
}): Promise<void> {
  const { count, products, daysUntilExpiry } = items;

  let title: string;
  let body: string;

  if (daysUntilExpiry === 0) {
    title = `⚠️ ${count} item${count > 1 ? 's' : ''} expiring today!`;
    body = products.slice(0, 3).join(', ');
  } else if (daysUntilExpiry === 1) {
    title = `🔔 ${count} item${count > 1 ? 's' : ''} expiring tomorrow`;
    body = products.slice(0, 3).join(', ');
  } else {
    title = `📅 ${count} item${count > 1 ? 's' : ''} expiring in ${daysUntilExpiry} days`;
    body = products.slice(0, 3).join(', ');
  }

  if (products.length > 3) {
    body += ` and ${products.length - 3} more...`;
  }

  await sendNotification(title, {
    body,
    tag: 'dlc-expiring',
    requireInteraction: daysUntilExpiry <= 1,
    data: {
      url: '/dlc',
      type: 'dlc-expiring',
      daysUntilExpiry,
    },
  });
}

// Singleton interval ID to prevent multiple intervals
let notificationIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Schedule daily notification check
 * Should be called on app initialization
 * Returns a cleanup function to stop the scheduler
 */
export function scheduleDailyNotificationCheck(): () => void {
  // If already scheduled, don't create another interval
  if (notificationIntervalId !== null) {
    console.log('Notification scheduler already running');
    return () => stopNotificationScheduler();
  }

  console.log('Starting notification scheduler');

  // Check immediately
  checkAndNotifyExpiringItems();

  // Then check every hour
  notificationIntervalId = setInterval(() => {
    checkAndNotifyExpiringItems();
  }, 60 * 60 * 1000); // 1 hour

  // Return cleanup function
  return () => stopNotificationScheduler();
}

/**
 * Stop the notification scheduler
 */
export function stopNotificationScheduler(): void {
  if (notificationIntervalId !== null) {
    console.log('Stopping notification scheduler');
    clearInterval(notificationIntervalId);
    notificationIntervalId = null;
  }
}

/**
 * Check for expiring items and send notifications
 */
async function checkAndNotifyExpiringItems(): Promise<void> {
  if (!canSendNotifications()) {
    return;
  }

  try {
    // Fetch expiring items (next 7 days)
    const response = await fetch('/api/dlc?filter=upcoming&days=7');
    const dlcs = await response.json();

    if (!Array.isArray(dlcs)) {
      return;
    }

    // Group by days until expiry
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const expiringToday: string[] = [];
    const expiringTomorrow: string[] = [];
    const expiringThisWeek: string[] = [];

    dlcs.forEach((dlc: any) => {
      if (dlc.status !== 'ACTIVE') return;

      const expDate = new Date(dlc.expirationDate);
      const expDateOnly = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
      const diffTime = expDateOnly.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const productName = dlc.product?.name || 'Unknown product';

      if (diffDays === 0) {
        expiringToday.push(productName);
      } else if (diffDays === 1) {
        expiringTomorrow.push(productName);
      } else if (diffDays <= 7 && diffDays > 1) {
        expiringThisWeek.push(productName);
      }
    });

    // Send notifications based on priority
    if (expiringToday.length > 0) {
      await notifyExpiringItems({
        count: expiringToday.length,
        products: expiringToday,
        daysUntilExpiry: 0,
      });
    } else if (expiringTomorrow.length > 0) {
      await notifyExpiringItems({
        count: expiringTomorrow.length,
        products: expiringTomorrow,
        daysUntilExpiry: 1,
      });
    } else if (expiringThisWeek.length > 0) {
      // Only notify once per day about weekly items
      const lastWeeklyNotification = localStorage.getItem('lastWeeklyDlcNotification');
      const lastNotificationDate = lastWeeklyNotification
        ? new Date(lastWeeklyNotification)
        : null;

      if (
        !lastNotificationDate ||
        lastNotificationDate.toDateString() !== today.toDateString()
      ) {
        await notifyExpiringItems({
          count: expiringThisWeek.length,
          products: expiringThisWeek,
          daysUntilExpiry: 7,
        });
        localStorage.setItem('lastWeeklyDlcNotification', today.toISOString());
      }
    }
  } catch (error) {
    console.error('Error checking expiring items:', error);
  }
}
