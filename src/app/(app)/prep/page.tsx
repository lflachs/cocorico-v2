import { PageHeader } from '@/components/PageHeader';
import { getServerTranslation } from '@/lib/utils/language';
import { ChefHat } from 'lucide-react';
import { db } from '@/lib/db/client';
import { PrepPageContent } from './_components/PrepPageContent';
import { addDays, startOfDay, endOfDay } from 'date-fns';

/**
 * Prep & Menu Mode - Daily Preparation Dashboard
 * "Ce qu'il faut produire aujourd'hui"
 *
 * Supports chef's preparation workflow:
 * - Shows expiring products (waste prevention)
 * - Displays today's menu (reference)
 * - Alerts on low stock (awareness)
 */

export const dynamic = 'force-dynamic';

export default async function PrepPage() {
  const { t } = await getServerTranslation();

  const today = startOfDay(new Date());
  const threeDaysFromNow = addDays(today, 3);

  // Fetch all data in parallel
  const [rawExpiringProducts, rawMenuItems, rawLowStockItems] = await Promise.all([
    // 1. Expiring products (next 3 days for better visibility)
    db.dLC.findMany({
      where: {
        expirationDate: {
          lte: endOfDay(threeDaysFromNow),
        },
        status: 'ACTIVE',
      },
      include: {
        product: true,
      },
      orderBy: {
        expirationDate: 'asc',
      },
    }),

    // 2. Active menu items (dishes from active menus)
    db.dish.findMany({
      where: {
        isActive: true,
      },
      include: {
        recipeIngredients: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    }),

    // 3. Low/critical stock items
    db.product.findMany({
      where: {
        parLevel: {
          not: null,
        },
      },
      orderBy: {
        name: 'asc',
      },
    }),
  ]);

  // Transform expiring products
  const expiringProducts = rawExpiringProducts.map((item) => ({
    id: item.id,
    product: {
      name: item.product.name,
      unit: item.product.unit,
    },
    quantity: item.quantity,
    expirationDate: item.expirationDate,
    lotNumber: item.lotNumber,
  }));

  // Transform menu items and check readiness
  const menuItems = rawMenuItems.map((dish) => {
    // Check if all ingredients are available (simplified - could be more sophisticated)
    const missingIngredients: string[] = [];
    let isReady = true;

    // For now, assume all dishes are ready (can enhance with actual stock checking)
    // This would require comparing recipe quantities with actual stock levels

    return {
      id: dish.id,
      name: dish.name,
      section: 'Plats', // Could be enhanced with menu sections
      isReady,
      missingIngredients: missingIngredients.length > 0 ? missingIngredients : undefined,
    };
  });

  // Transform stock items and calculate status
  const lowStockItems = rawLowStockItems
    .map((product) => {
      const parLevel = product.parLevel || 0;
      const quantity = product.quantity;

      let status: 'GOOD' | 'LOW' | 'CRITICAL';
      if (quantity <= 0) {
        status = 'CRITICAL';
      } else if (quantity <= parLevel * 0.5) {
        status = 'CRITICAL';
      } else if (quantity <= parLevel) {
        status = 'LOW';
      } else {
        status = 'GOOD';
      }

      return {
        id: product.id,
        name: product.name,
        quantity: product.quantity,
        unit: product.unit,
        parLevel: product.parLevel,
        status,
      };
    })
    .filter((item) => item.status !== 'GOOD'); // Only show LOW and CRITICAL

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      <PageHeader
        title={t('nav.prep')}
        subtitle="Ce qu'il faut produire aujourd'hui"
        icon={ChefHat}
      />

      <PrepPageContent
        expiringProducts={expiringProducts}
        menuItems={menuItems}
        lowStockItems={lowStockItems}
      />
    </div>
  );
}
