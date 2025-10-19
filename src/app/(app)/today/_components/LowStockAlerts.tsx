import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { getLowStockProducts } from '@/lib/queries/product.queries';
import { LowStockItem } from './LowStockItem';
import { getTranslation } from '@/lib/i18n';
import { cookies } from 'next/headers';

/**
 * Low Stock Alerts
 * Shows products below par level (Server Component)
 */

export async function LowStockAlerts() {
  const lowStockItems = await getLowStockProducts();
  const cookieStore = await cookies();
  const language = (cookieStore.get('language')?.value as 'en' | 'fr') || 'en';
  const t = getTranslation(language);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              {t('today.lowStock.title')}
            </CardTitle>
            <CardDescription>{t('today.lowStock.description')}</CardDescription>
          </div>
          {lowStockItems.length > 0 && (
            <Badge variant="destructive">{lowStockItems.length}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {lowStockItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {t('today.lowStock.empty')}
          </div>
        ) : (
          <div className="space-y-3">
            {lowStockItems.map((item) => (
              <LowStockItem key={item.id} item={item} language={language} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
