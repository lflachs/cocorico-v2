import { UnifiedAlerts } from '@/components/alerts/UnifiedAlerts';
import { TodayDashboard } from './_components/TodayDashboard';
import { PageHeader } from '@/components/PageHeader';
import { MissingPriceAlert } from '@/components/MissingPriceAlert';
import { getTimeBasedGreeting } from '@/lib/utils/greeting';
import { formatDateForLocale, getLocaleFromLanguage } from '@/lib/utils/date';
import { getServerTranslation } from '@/lib/utils/language';
import { getDashboardStats } from '@/lib/services/dashboard.service';

/**
 * Today Page - Main dashboard for daily operations
 * Fetches data server-side for optimal performance
 */
export default async function TodayPage() {
  const { language, t } = await getServerTranslation();

  const { key: greetingKey, icon: GreetingIcon } = getTimeBasedGreeting();

  const locale = getLocaleFromLanguage(language);
  const formattedDate = formatDateForLocale(new Date(), locale);

  const stats = await getDashboardStats();

  return (
    <div className="w-full space-y-4 overflow-hidden sm:space-y-6">
      <PageHeader
        title={<>{t(greetingKey)}, Nico!</>}
        subtitle={formattedDate}
        icon={GreetingIcon}
      />

      <MissingPriceAlert />
      <UnifiedAlerts />
      <TodayDashboard stats={stats} />
    </div>
  );
}
