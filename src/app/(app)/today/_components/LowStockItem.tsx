import { Badge } from '@/components/ui/badge';
import { type Product } from '@prisma/client';
import { getTranslation, type Language } from '@/lib/i18n';

/**
 * Low Stock Item
 * Single low stock product display
 */

type LowStockItemProps = {
  item: Product;
  language: Language;
};

export function LowStockItem({ item, language }: LowStockItemProps) {
  const t = getTranslation(language);
  const shortage = item.parLevel ? item.parLevel - item.quantity : 0;
  const isCritical = item.parLevel && item.quantity < item.parLevel * 0.5;

  return (
    <div
      className={`p-3 rounded-lg border-2 ${
        isCritical ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{item.name}</span>
            <Badge
              variant={isCritical ? 'destructive' : 'default'}
              className={isCritical ? '' : 'bg-orange-500 hover:bg-orange-600'}
            >
              {isCritical ? t('today.lowStock.critical') : t('today.lowStock.low')}
            </Badge>
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {t('today.lowStock.current')}: {item.quantity} {item.unit.toLowerCase()} | {t('today.lowStock.par')}: {item.parLevel}{' '}
            {item.unit.toLowerCase()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {t('today.lowStock.shortBy')}: {shortage.toFixed(1)} {item.unit.toLowerCase()}
          </div>
        </div>
      </div>
    </div>
  );
}
