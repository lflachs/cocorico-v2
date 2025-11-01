'use server';

import { getDailyInsights } from '@/lib/services/insights.service';
import { getAllProducts } from '@/lib/services/product.service';
import { getDishes } from '@/lib/services/dish.service';
import { db } from '@/lib/db/client';

/**
 * Cocorico Assistant Actions
 * Server actions for the voice assistant to fetch contextual data
 */

/**
 * Get initial context for the assistant
 * This is the minimal context sent at the start
 */
export async function getAssistantInitialContext(language: 'en' | 'fr' = 'fr') {
  const insights = await getDailyInsights(language);

  return {
    briefSummary: insights.briefSummary,
    stats: {
      totalReorderNeeded: insights.stats.totalReorderNeeded,
      urgentReorders: insights.stats.urgentReorders,
      expiringCount: insights.stats.expiringCount,
      expiringValue: insights.stats.expiringValue,
    },
    menuReady: insights.menuStatus.allReady,
    totalActiveDishes: insights.menuStatus.totalActive,
  };
}

/**
 * Get detailed product information
 * Called when user asks about specific products or inventory
 */
export async function getProductDetails(productNameOrId?: string) {
  if (productNameOrId) {
    // Search for specific product
    const product = await db.product.findFirst({
      where: {
        OR: [
          { id: productNameOrId },
          { name: { contains: productNameOrId, mode: 'insensitive' } },
        ],
      },
      include: {
        dlcs: {
          where: {
            expirationDate: {
              gte: new Date(),
            },
          },
          orderBy: {
            expirationDate: 'asc',
          },
        },
      },
    });

    if (!product) return { error: 'Product not found' };

    return {
      id: product.id,
      name: product.name,
      quantity: product.quantity,
      unit: product.unit,
      parLevel: product.parLevel,
      category: product.category,
      upcomingDlcs: product.dlcs.map((dlc) => ({
        expirationDate: dlc.expirationDate,
        quantity: dlc.quantity,
      })),
    };
  }

  // Return all trackable products
  const products = await getAllProducts();
  return products
    .filter((p) => p.trackable)
    .map((p) => ({
      id: p.id,
      name: p.name,
      quantity: p.quantity,
      unit: p.unit,
      parLevel: p.parLevel,
      belowPar: p.parLevel ? p.quantity < p.parLevel : false,
    }));
}

/**
 * Get dish information and recipes
 * Called when user asks about menu items or recipes
 */
export async function getDishDetails(dishNameOrId?: string) {
  if (dishNameOrId) {
    // Search for specific dish
    const dish = await db.dish.findFirst({
      where: {
        OR: [
          { id: dishNameOrId },
          { name: { contains: dishNameOrId, mode: 'insensitive' } },
        ],
      },
      include: {
        recipeIngredients: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!dish) return { error: 'Dish not found' };

    const canMake = dish.recipeIngredients.every(
      (ri) => ri.product.quantity >= ri.quantityRequired
    );

    const maxPortions = Math.min(
      ...dish.recipeIngredients.map((ri) =>
        Math.floor(ri.product.quantity / ri.quantityRequired)
      )
    );

    return {
      id: dish.id,
      name: dish.name,
      isActive: dish.isActive,
      canMake,
      maxPortions: maxPortions > 999 ? '999+' : maxPortions,
      ingredients: dish.recipeIngredients.map((ri) => ({
        name: ri.product.name,
        needed: ri.quantityRequired,
        available: ri.product.quantity,
        unit: ri.product.unit,
      })),
    };
  }

  // Return all active dishes
  const dishes = await getDishes({ isActive: true });
  return dishes.map((d) => ({
    id: d.id,
    name: d.name,
    isActive: d.isActive,
  }));
}

/**
 * Get sales data
 * Called when user asks about sales performance
 */
export async function getSalesData(period: 'today' | 'week' | 'month' = 'today') {
  const now = new Date();
  let startDate = new Date();

  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
  }

  const sales = await db.sale.findMany({
    where: {
      saleDate: {
        gte: startDate,
      },
    },
    include: {
      dish: true,
    },
  });

  const totalRevenue = sales.reduce((sum, sale) => sum + (sale.dish.sellingPrice * sale.quantitySold), 0);
  const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantitySold, 0);

  // Group by dish
  const dishSales = new Map<string, { name: string; quantity: number; revenue: number }>();
  sales.forEach((sale) => {
    const existing = dishSales.get(sale.dishId) || {
      name: sale.dish.name,
      quantity: 0,
      revenue: 0,
    };
    existing.quantity += sale.quantitySold;
    existing.revenue += sale.dish.sellingPrice * sale.quantitySold;
    dishSales.set(sale.dishId, existing);
  });

  const topDishes = Array.from(dishSales.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return {
    period,
    totalRevenue: Math.round(totalRevenue),
    totalQuantity,
    topDishes,
  };
}

/**
 * Get expiring products details
 * Called when user asks about DLCs or waste prevention
 */
export async function getExpiringProductsDetails(daysLimit: number = 7) {
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + daysLimit);

  const dlcs = await db.dLC.findMany({
    where: {
      expirationDate: {
        lte: maxDate,
        gte: new Date(),
      },
    },
    include: {
      product: {
        include: {
          recipeIngredients: {
            include: {
              dish: {
                where: {
                  isActive: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      expirationDate: 'asc',
    },
  });

  return dlcs.map((dlc) => {
    const daysUntil = Math.ceil(
      (dlc.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const usedInDishes = dlc.product.recipeIngredients.map((ri) => ri.dish.name);

    return {
      productName: dlc.product.name,
      quantity: dlc.quantity,
      unit: dlc.product.unit,
      expirationDate: dlc.expirationDate,
      daysUntilExpiration: daysUntil,
      estimatedValue: dlc.unitPrice ? dlc.unitPrice * dlc.quantity : 0,
      usedInDishes: [...new Set(usedInDishes)], // Remove duplicates
    };
  });
}
