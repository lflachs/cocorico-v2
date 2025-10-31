import { PageHeader } from '@/components/PageHeader';
import { getTimeBasedGreeting } from '@/lib/utils/greeting';
import { formatDateForLocale, getLocaleFromLanguage } from '@/lib/utils/date';
import { getServerTranslation } from '@/lib/utils/language';
import { getDailyInsights } from '@/lib/services/insights.service';
import { DailyBrief } from './_components/DailyBrief';
import { ReorderAlerts } from './_components/ReorderAlerts';
import { UseTodayCard } from './_components/UseTodayCard';
import { MenuStatusCard } from './_components/MenuStatusCard';
import { QuickSales } from './_components/QuickSales';

/**
 * Today Page - Smart dashboard for daily operations
 * Shows actionable insights and prioritized decisions
 * Fetches data server-side for optimal performance
 */
export default async function TodayPage() {
  const { language, t } = await getServerTranslation();

  const { key: greetingKey, icon: GreetingIcon } = getTimeBasedGreeting();

  const locale = getLocaleFromLanguage(language);
  const formattedDate = formatDateForLocale(new Date(), locale);

  const insights = await getDailyInsights(language);

  const isAllGood =
    insights.reorderAlerts.length === 0 &&
    insights.expiringProducts.length === 0 &&
    insights.menuStatus.allReady;

  const hasReorderAlerts = insights.reorderAlerts.length > 0;
  const hasExpiringProducts = insights.expiringProducts.length > 0;
  const hasMenu = insights.menuStatus.totalActive > 0;

  return (
    <div className="w-full space-y-4 overflow-hidden sm:space-y-6">
      <PageHeader
        title={<>{t(greetingKey)}, Nico!</>}
        subtitle={formattedDate}
        icon={GreetingIcon}
      />

      {/* Daily Brief - Hero insight */}
      <DailyBrief summary={insights.briefSummary} isAllGood={isAllGood} />

      {/* Smart Grid Layout - Only show cards with content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Priority 1: Reorder Alerts */}
        {hasReorderAlerts && <ReorderAlerts alerts={insights.reorderAlerts} />}

        {/* Priority 2: Waste Prevention */}
        {hasExpiringProducts && <UseTodayCard products={insights.expiringProducts} />}

        {/* Menu Readiness - Show if menu exists */}
        {hasMenu && <MenuStatusCard menuStatus={insights.menuStatus} />}
      </div>

      {/* When everything is good and there's nothing to show */}
      {isAllGood && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-lg mb-4">
            <span className="text-3xl">✨</span>
          </div>
          <p className="text-lg font-medium text-muted-foreground">
            {t('today.allClear') || 'All clear! Everything is running smoothly.'}
          </p>
        </div>
      )}
    </div>
  );
}
