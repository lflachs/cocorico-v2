import { PageHeader } from '@/components/PageHeader';
import { getServerTranslation } from '@/lib/utils/language';
import { ShoppingCart } from 'lucide-react';
import { db } from '@/lib/db/client';
import { OrdersPageContent } from './_components/OrdersPageContent';

/**
 * Orders & Restock - Smart Ordering Suggestions
 * "Prépare les achats du lendemain"
 *
 * Shows products that need reordering based on par levels
 * Allows building orders grouped by supplier
 */
export default async function OrdersPage() {
  const { t } = await getServerTranslation();

  // Get suppliers
  const suppliers = await db.supplier.findMany({
    orderBy: { name: 'asc' },
  });

  // Get products below par level
  const lowStockProducts = await db.product.findMany({
    where: {
      trackable: true,
      parLevel: { not: null },
    },
    include: {
      billProducts: {
        include: {
          bill: {
            include: {
              supplier: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1, // Get most recent bill to find supplier and price
      },
    },
  });

  // Filter for products actually below par level and create suggestions
  const suggestions = lowStockProducts
    .filter((product) => product.parLevel && product.quantity < product.parLevel)
    .map((product) => {
      const suggestedQuantity = (product.parLevel || 0) - product.quantity;
      const lastBillProduct = product.billProducts[0];
      const supplier = lastBillProduct?.bill?.supplier;

      return {
        productId: product.id,
        productName: product.name,
        currentStock: product.quantity,
        parLevel: product.parLevel || 0,
        unit: product.unit,
        suggestedQuantity: Math.ceil(suggestedQuantity),
        supplierName: supplier?.name,
        supplierId: supplier?.id,
        lastPrice: product.unitPrice || undefined,
      };
    })
    .sort((a, b) => {
      // Sort by urgency (percentage of par level)
      const aPercentage = (a.currentStock / a.parLevel) * 100;
      const bPercentage = (b.currentStock / b.parLevel) * 100;
      return aPercentage - bPercentage;
    });

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      <PageHeader
        title={t('nav.orders')}
        subtitle="Suggestions intelligentes basées sur vos niveaux de stock"
        icon={ShoppingCart}
      />

      <OrdersPageContent suggestions={suggestions} suppliers={suppliers} />
    </div>
  );
}
