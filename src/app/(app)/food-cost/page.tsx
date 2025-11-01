import { PageHeader } from '@/components/PageHeader';
import { getServerTranslation } from '@/lib/utils/language';
import { TrendingUp, Euro, ShoppingCart, ChefHat } from 'lucide-react';
import { getCurrentPeriodFoodCost, getDataConfidence } from '@/lib/services/food-cost.service';
import { FoodCostCard } from './_components/FoodCostCard';
import { PurchaseBreakdown } from './_components/PurchaseBreakdown';
import { SummaryCard } from './_components/SummaryCard';
import { ConfidenceIndicator } from './_components/ConfidenceIndicator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Food Cost Pulse - Rentability Dashboard
 * "Ton point rentabilité — sans Excel"
 *
 * Simple and visual for kitchen staff to understand profitability
 */

export const dynamic = 'force-dynamic';

export default async function FoodCostPage() {
  const { t } = await getServerTranslation();

  // Get current period food cost data
  const currentPeriod = await getCurrentPeriodFoodCost();
  const confidence = await getDataConfidence(currentPeriod);

  const periodLabel = `${format(currentPeriod.startDate, 'd MMM', { locale: fr })} - ${format(currentPeriod.endDate, 'd MMM', { locale: fr })}`;

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      <PageHeader
        title={t('nav.foodCost')}
        subtitle="Ton point rentabilité — sans Excel"
        icon={TrendingUp}
      />

      {/* Period Label */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Période actuelle</p>
        <p className="text-lg font-semibold">{periodLabel}</p>
      </div>

      {/* Main Food Cost Card */}
      <FoodCostCard
        percentage={currentPeriod.foodCostPercent}
        isGood={currentPeriod.isGood}
        trend={currentPeriod.trend}
        previousPercent={currentPeriod.previousPeriodPercent}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          icon={<Euro className="h-5 w-5" />}
          label="Chiffre d'Affaires"
          value={currentPeriod.salesRevenue > 0 ? `€${currentPeriod.salesRevenue.toFixed(0)}` : '—'}
          subtitle={currentPeriod.dishCount > 0 ? `${currentPeriod.dishCount} plats vendus` : 'Aucune vente enregistrée'}
          color={currentPeriod.salesRevenue > 0 ? 'green' : 'default'}
        />

        <SummaryCard
          icon={<ShoppingCart className="h-5 w-5" />}
          label="Achats"
          value={currentPeriod.totalPurchases > 0 ? `€${currentPeriod.totalPurchases.toFixed(0)}` : '—'}
          subtitle={currentPeriod.purchasesByCategory.length > 0 ? `${currentPeriod.purchasesByCategory.length} catégories` : 'Aucun achat scanné'}
          color={currentPeriod.totalPurchases > 0 ? 'blue' : 'default'}
        />

        <SummaryCard
          icon={<ChefHat className="h-5 w-5" />}
          label="Marge Brute"
          value={
            currentPeriod.salesRevenue > 0 && currentPeriod.totalPurchases > 0
              ? `€${(currentPeriod.salesRevenue - currentPeriod.totalPurchases).toFixed(0)}`
              : '—'
          }
          subtitle={
            currentPeriod.salesRevenue > 0 && currentPeriod.totalPurchases > 0
              ? `${(100 - currentPeriod.foodCostPercent).toFixed(0)}% de marge`
              : 'Calculé automatiquement'
          }
          color="default"
        />
      </div>

      {/* Purchase Breakdown */}
      <div className="rounded-lg border bg-card p-6">
        <PurchaseBreakdown
          items={currentPeriod.purchasesByCategory}
          total={currentPeriod.totalPurchases}
        />
      </div>

      {/* Data Confidence */}
      <ConfidenceIndicator score={confidence.score} message={confidence.message} />

      {/* Help Text */}
      <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/5 p-4">
        <p className="text-xs text-muted-foreground">
          <strong>💡 Comment améliorer votre food cost :</strong>
        </p>
        <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
          <li>Scannez toutes vos factures pour suivre les achats</li>
          <li>Enregistrez vos ventes quotidiennes dans l'onglet Accueil</li>
          <li>Visez un food cost entre 28-35% pour une bonne rentabilité</li>
          <li>Surveillez les catégories qui pèsent le plus dans vos achats</li>
        </ul>
      </div>
    </div>
  );
}
