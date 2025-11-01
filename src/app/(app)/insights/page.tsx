import { PageHeader } from '@/components/PageHeader';
import { getServerTranslation } from '@/lib/utils/language';
import { BarChart3, TrendingDown, Calendar, AlertTriangle, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getDLCInsights, getStockAdjustmentsInsights, getInventoryAccuracy } from '@/lib/queries/insights.queries';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Insights & History - Analytics Dashboard
 * "Vois ton impact sur le gaspillage"
 */
export const dynamic = 'force-dynamic';

export default async function InsightsPage() {
  const { t } = await getServerTranslation();

  // Fetch insights data
  const [dlcData, wasteData, accuracyData] = await Promise.all([
    getDLCInsights(30),
    getStockAdjustmentsInsights(30),
    getInventoryAccuracy(30),
  ]);

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      <PageHeader
        title={t('nav.insights')}
        subtitle="Vois ton impact sur le gaspillage"
        icon={BarChart3}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Waste Prevented by DLC Tracking */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gaspillage évité (30j)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {dlcData.summary.estimatedWastePrevented.toFixed(2)} €
                </div>
                <p className="text-xs text-muted-foreground">
                  Grâce au suivi DLC
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* DLC Tracking Count */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Suivi DLC (30j)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {dlcData.summary.totalDLCs}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dlcData.summary.active} actifs • {dlcData.summary.used} utilisés
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actual Waste from Adjustments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pertes constatées (30j)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {wasteData.summary.totalWasteValue.toFixed(2)} €
                </div>
                <p className="text-xs text-muted-foreground">
                  {wasteData.summary.wasteAdjustments} ajustement{wasteData.summary.wasteAdjustments > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Impact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Impact net
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  +{(dlcData.summary.estimatedWastePrevented - wasteData.summary.totalWasteValue).toFixed(2)} €
                </div>
                <p className="text-xs text-muted-foreground">
                  Économies - Pertes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top DLC Tracked Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            Top 10 Produits Suivis (30 derniers jours)
          </CardTitle>
          <CardDescription>
            Produits avec le meilleur suivi DLC - gaspillage prévenu
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dlcData.topTracked.length > 0 ? (
            <div className="space-y-3">
              {dlcData.topTracked.map((product, index) => (
                <div
                  key={product.productId}
                  className="flex items-center justify-between p-3 rounded-lg border bg-green-50/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{product.productName}</div>
                      <div className="text-xs text-muted-foreground">
                        {product.trackingCount} suivi{product.trackingCount > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      ~{(product.totalValue * 0.15).toFixed(2)} € économisé
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {product.totalQuantity.toFixed(1)} {product.unit} suivi
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun suivi DLC ces 30 derniers jours
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top Wasted Products */}
      {wasteData.topWasted.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Top 10 Produits Gaspillés (30 derniers jours)
            </CardTitle>
            <CardDescription>
              Produits avec les plus grandes pertes - à surveiller
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {wasteData.topWasted.map((product, index) => (
                <div
                  key={product.productId}
                  className="flex items-center justify-between p-3 rounded-lg border bg-red-50/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-700 font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{product.productName}</div>
                      <div className="text-xs text-muted-foreground">
                        {product.count} perte{product.count > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-red-600">
                      -{product.totalValue.toFixed(2)} €
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {product.totalQuantity.toFixed(1)} {product.unit}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Frequently Adjusted Products */}
      {accuracyData.frequentlyAdjusted.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Produits Nécessitant Attention
            </CardTitle>
            <CardDescription>
              Ajustements fréquents - vérifier le comptage ou les procédures
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {accuracyData.frequentlyAdjusted.map((product) => (
                <div
                  key={product.productId}
                  className="flex items-center justify-between p-3 rounded-lg border bg-orange-50/50"
                >
                  <div className="font-medium">{product.productName}</div>
                  <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                    {product.adjustmentCount} ajustements
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Adjustments */}
      <Card>
        <CardHeader>
          <CardTitle>Ajustements Récents</CardTitle>
          <CardDescription>
            20 derniers ajustements d'inventaire
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {wasteData.recentAdjustments.map((movement) => {
              const isLoss = movement.quantity < 0;
              const absQuantity = Math.abs(movement.quantity);
              const absValue = Math.abs(movement.totalValue || 0);

              return (
                <div
                  key={movement.id}
                  className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                    isLoss ? 'bg-red-50/50 border-red-100' : 'bg-blue-50/50 border-blue-100'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{movement.product.name}</div>
                    <div className="text-muted-foreground">
                      {format(new Date(movement.createdAt), 'PPp', { locale: fr })}
                    </div>
                  </div>
                  <div className="text-right ml-2">
                    <div className={`font-bold ${isLoss ? 'text-red-600' : 'text-blue-600'}`}>
                      {isLoss ? '-' : '+'}{absQuantity.toFixed(1)} {movement.product.unit}
                    </div>
                    {movement.totalValue && (
                      <div className="text-muted-foreground">
                        {isLoss ? '-' : '+'}{absValue.toFixed(2)} €
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
