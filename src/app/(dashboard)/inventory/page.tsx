import { getProducts } from '@/lib/queries/product.queries';
import { InventoryView } from './_components/InventoryView';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getTranslation } from '@/lib/i18n';
import { cookies } from 'next/headers';

/**
 * Inventory Page (Server Component)
 * Comprehensive inventory management with table view, search, and inline editing
 */

export default async function InventoryPage() {
  const products = await getProducts();
  const cookieStore = await cookies();
  const language = (cookieStore.get('language')?.value as 'en' | 'fr') || 'en';
  const t = getTranslation(language);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {t('nav.inventory')}
          </h1>
          <p className="mt-2 text-gray-600">{t('inventory.subtitle')}</p>
        </div>
        <Link href="/inventory/new">
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            {t('inventory.addProduct')}
          </Button>
        </Link>
      </div>

      <InventoryView initialProducts={products} />
    </div>
  );
}
