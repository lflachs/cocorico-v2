'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';

/**
 * Alert component that shows when products have missing prices
 * This can affect cost calculations for dishes and menus
 */
export function MissingPriceAlert() {
  const { t } = useLanguage();
  const [productsWithoutPrice, setProductsWithoutPrice] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkMissingPrices() {
      try {
        const response = await fetch('/api/products/check-missing-prices');
        if (response.ok) {
          const data = await response.json();
          setProductsWithoutPrice(data.count || 0);
        }
      } catch (error) {
        console.error('Error checking missing prices:', error);
      } finally {
        setLoading(false);
      }
    }

    checkMissingPrices();
  }, []);

  if (loading || productsWithoutPrice === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="border-orange-200 bg-orange-50 text-orange-900">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-900 font-semibold">
        {t('alerts.missingPrices.title')}
      </AlertTitle>
      <AlertDescription className="text-orange-800">
        {productsWithoutPrice === 1
          ? t('alerts.missingPrices.descriptionSingular')
          : t('alerts.missingPrices.descriptionPlural').replace(
              '{count}',
              productsWithoutPrice.toString()
            )}
      </AlertDescription>
    </Alert>
  );
}
