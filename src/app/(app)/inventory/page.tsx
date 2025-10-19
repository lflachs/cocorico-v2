import { getProducts } from '@/lib/queries/product.queries';
import { InventoryView } from './_components/InventoryView';
import { Package } from 'lucide-react';
import { getTranslation } from '@/lib/i18n';
import { cookies } from 'next/headers';
import { PageHeader } from '@/components/PageHeader';
import { MissingPriceAlert } from '@/components/MissingPriceAlert';

/**
 * Inventory Page (Server Component)
 * Comprehensive inventory management with table view, search, and inline editing
 */

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const products = await getProducts();
  const cookieStore = await cookies();
  const language = (cookieStore.get('language')?.value as 'en' | 'fr') || 'en';
  const t = getTranslation(language);

  return (
    <div className="space-y-6">
      {/* Header with gradient background */}
      <PageHeader
        title={t('inventory.title')}
        subtitle={t('inventory.subtitle')}
        icon={Package}
      />

      <MissingPriceAlert />
      <InventoryView initialProducts={products} />
    </div>
  );
}
