'use client';

import { useEffect, useState } from 'react';
import { Mic, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { requestNotificationPermission } from '@/lib/notifications';

/**
 * Permission Manager
 * Requests microphone and notification permissions early for better UX
 */
export function PermissionManager() {
  const [showMicPrompt, setShowMicPrompt] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [requestingMic, setRequestingMic] = useState(false);
  const [requestingNotification, setRequestingNotification] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  async function checkPermissions() {
    // Check microphone permission
    if ('permissions' in navigator) {
      try {
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (micPermission.state === 'prompt') {
          // Only show if user hasn't been asked yet
          const dismissed = localStorage.getItem('micPermissionPromptDismissed');
          if (!dismissed) {
            setShowMicPrompt(true);
          }
        }
      } catch (error) {
        // permissions API not fully supported, that's ok
      }
    }

    // Check notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      const dismissed = localStorage.getItem('notificationPromptDismissed');
      if (!dismissed) {
        setShowNotificationPrompt(true);
      }
    }
  }

  async function handleRequestMicrophone() {
    setRequestingMic(true);
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately stop the stream - we just needed to get permission
      stream.getTracks().forEach(track => track.stop());
      setShowMicPrompt(false);
      localStorage.removeItem('micPermissionPromptDismissed');
    } catch (error) {
      console.error('Microphone permission denied:', error);
    } finally {
      setRequestingMic(false);
    }
  }

  async function handleRequestNotification() {
    setRequestingNotification(true);
    try {
      const permission = await requestNotificationPermission();
      if (permission === 'granted') {
        setShowNotificationPrompt(false);
        localStorage.removeItem('notificationPromptDismissed');
      }
    } finally {
      setRequestingNotification(false);
    }
  }

  function handleDismissMic() {
    setShowMicPrompt(false);
    localStorage.setItem('micPermissionPromptDismissed', new Date().toISOString());
  }

  function handleDismissNotification() {
    setShowNotificationPrompt(false);
    localStorage.setItem('notificationPromptDismissed', new Date().toISOString());
  }

  if (!showMicPrompt && !showNotificationPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 z-40 max-w-sm space-y-3">
      {/* Microphone Permission Prompt */}
      {showMicPrompt && (
        <Card className="border-blue-200 bg-blue-50 shadow-lg animate-in slide-in-from-bottom-4 duration-500">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 shrink-0">
                <Mic className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-blue-900 mb-1 text-sm">Enable Voice Commands</h3>
                <p className="text-xs text-blue-800 mb-3">
                  Allow microphone access to use the voice assistant and say "Cocorico" to activate it hands-free.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleRequestMicrophone}
                    disabled={requestingMic}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-xs"
                  >
                    <Mic className="h-3 w-3 mr-1" />
                    {requestingMic ? 'Requesting...' : 'Allow'}
                  </Button>
                  <Button
                    onClick={handleDismissMic}
                    size="sm"
                    variant="ghost"
                    className="text-blue-700 hover:bg-blue-100 text-xs"
                  >
                    Later
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification Permission Prompt */}
      {showNotificationPrompt && (
        <Card className="border-green-200 bg-green-50 shadow-lg animate-in slide-in-from-bottom-4 duration-500">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 shrink-0">
                <Bell className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-green-900 mb-1 text-sm">Get Expiry Alerts</h3>
                <p className="text-xs text-green-800 mb-3">
                  Receive notifications when products are about to expire.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleRequestNotification}
                    disabled={requestingNotification}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-xs"
                  >
                    <Bell className="h-3 w-3 mr-1" />
                    {requestingNotification ? 'Requesting...' : 'Allow'}
                  </Button>
                  <Button
                    onClick={handleDismissNotification}
                    size="sm"
                    variant="ghost"
                    className="text-green-700 hover:bg-green-100 text-xs"
                  >
                    Later
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
