'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { requestNotificationPermission, scheduleDailyNotificationCheck } from '@/lib/notifications';

/**
 * Notification Permission Prompt
 * Shows a prompt to enable notifications for expiring items
 */
export function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // Check if we should show the prompt
    const shouldShow = checkShouldShowPrompt();
    setShowPrompt(shouldShow);

    // If already granted, start the notification scheduler
    if ('Notification' in window && Notification.permission === 'granted') {
      scheduleDailyNotificationCheck();
    }
  }, []);

  function checkShouldShowPrompt(): boolean {
    // Don't show if notifications aren't supported
    if (!('Notification' in window)) {
      return false;
    }

    // Don't show if already granted
    if (Notification.permission === 'granted') {
      return false;
    }

    // Don't show if explicitly denied
    if (Notification.permission === 'denied') {
      return false;
    }

    // Don't show if user dismissed it recently
    const dismissedAt = localStorage.getItem('notificationPromptDismissed');
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const daysSinceDismissed = Math.floor(
        (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        return false;
      }
    }

    return true;
  }

  async function handleEnableNotifications() {
    setIsRequesting(true);
    try {
      const permission = await requestNotificationPermission();
      if (permission === 'granted') {
        setShowPrompt(false);
        // Start the notification scheduler
        scheduleDailyNotificationCheck();
        localStorage.removeItem('notificationPromptDismissed');
      }
    } finally {
      setIsRequesting(false);
    }
  }

  function handleDismiss() {
    setShowPrompt(false);
    localStorage.setItem('notificationPromptDismissed', new Date().toISOString());
  }

  if (!showPrompt) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-blue-50 mb-6">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 shrink-0">
            <Bell className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-blue-900 mb-1">Stay notified about expiring items</h3>
            <p className="text-sm text-blue-800 mb-3">
              Get notifications when products are about to expire so you never waste food again.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleEnableNotifications}
                disabled={isRequesting}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Bell className="h-4 w-4 mr-2" />
                {isRequesting ? 'Requesting...' : 'Enable Notifications'}
              </Button>
              <Button
                onClick={handleDismiss}
                size="sm"
                variant="ghost"
                className="text-blue-700 hover:bg-blue-100"
              >
                Maybe Later
              </Button>
            </div>
          </div>
          <Button
            onClick={handleDismiss}
            size="sm"
            variant="ghost"
            className="shrink-0 h-8 w-8 p-0 text-blue-700 hover:bg-blue-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
