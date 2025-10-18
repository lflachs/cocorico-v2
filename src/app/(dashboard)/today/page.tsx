import { getTranslation } from '@/lib/i18n';
import { cookies } from 'next/headers';
import { UnifiedAlerts } from '@/components/alerts/UnifiedAlerts';
import { TodayDashboard } from './_components/TodayDashboard';
import { PageHeader } from '@/components/PageHeader';
import { Sun, Cloud, Moon } from 'lucide-react';

/**
 * Today Page - Main dashboard for daily operations
 */

export default async function TodayPage() {
  const cookieStore = await cookies();
  const language = (cookieStore.get('language')?.value as 'en' | 'fr') || 'en';
  const t = getTranslation(language);

  const today = new Date();
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';
  const formattedDate = today.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Get current hour for greeting
  const hour = today.getHours();
  let greetingKey: 'today.greeting.morning' | 'today.greeting.afternoon' | 'today.greeting.evening';
  let GreetingIcon = Sun;
  if (hour < 12) {
    greetingKey = 'today.greeting.morning';
    GreetingIcon = Sun;
  } else if (hour < 18) {
    greetingKey = 'today.greeting.afternoon';
    GreetingIcon = Cloud;
  } else {
    greetingKey = 'today.greeting.evening';
    GreetingIcon = Moon;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={<>{t(greetingKey)}, Nico!</>}
        subtitle={formattedDate}
        icon={GreetingIcon}
      />

      <UnifiedAlerts />
      <TodayDashboard />
    </div>
  );
}
