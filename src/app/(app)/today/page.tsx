import { PageHeader } from '@/components/PageHeader';
import { getTimeBasedGreeting } from '@/lib/utils/greeting';
import { formatDateForLocale, getLocaleFromLanguage } from '@/lib/utils/date';
import { getServerTranslation } from '@/lib/utils/language';
import { getCurrentMonthImpact, getUrgentAlerts } from '@/lib/services/impact.service';
import { ImpactChart } from './_components_v2/ImpactChart';
import { QuickActions } from './_components_v2/QuickActions';
import { UrgentAlerts } from './_components_v2/UrgentAlerts';
import { StreakBadge } from './_components_v2/StreakBadge';

/**
 * NEW Today Page - Simple, Gamified, Motivational
 *
 * Focus on what chefs care about:
 * - Money saved (through waste prevention)
 * - Time saved (through automation)
 * - Waste prevented (environmental + cost)
 *
 * + Quick actions to get work done fast
 * + Only urgent alerts (not information overload)
 */

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  const { language, t } = await getServerTranslation();

  const { key: greetingKey, icon: GreetingIcon } = getTimeBasedGreeting();
  const locale = getLocaleFromLanguage(language);
  const formattedDate = formatDateForLocale(new Date(), locale);

  // Get impact metrics and alerts
  const [impact, urgentAlerts] = await Promise.all([
    getCurrentMonthImpact(),
    getUrgentAlerts(),
  ]);

  return (
    <div className="w-full space-y-6 overflow-hidden">
      {/* Header with greeting - full width */}
      <PageHeader
        title={<>{t(greetingKey)}, Nico!</>}
        subtitle={formattedDate}
        icon={GreetingIcon}
      />

      {/* Hero: Impact Chart - Progress bars with goals */}
      <div className="rounded-lg border bg-card p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Ton impact ce mois</h2>
            <p className="text-sm text-muted-foreground">
              Continue comme ça pour atteindre tes objectifs
            </p>
          </div>
          <StreakBadge days={impact.streak} />
        </div>

        <ImpactChart
          moneySaved={impact.moneySaved}
          timeSaved={impact.timeSaved}
          wastePrevented={impact.wastePrevented}
          period="ce mois"
          billCount={impact.billCount}
          dlcCount={impact.dlcCount}
          moneyPotential={impact.moneyPotential}
          timePotential={impact.timePotential}
          wastePotential={impact.wastePotential}
        />
      </div>

      {/* Urgent Alerts - Only show if there's something critical */}
      {urgentAlerts.length > 0 && <UrgentAlerts alerts={urgentAlerts} />}

      {/* Quick Actions - Fast access to common tasks */}
      <QuickActions />

      {/* Motivational message when everything is good */}
      {urgentAlerts.length === 0 && (
        <div className="rounded-lg border bg-card p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
            <span className="text-2xl">✨</span>
          </div>
          <h3 className="text-base font-semibold mb-1">
            Tout roule, Chef !
          </h3>
          <p className="text-sm text-muted-foreground">
            Aucune alerte urgente
          </p>
        </div>
      )}
    </div>
  );
}
