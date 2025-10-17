import { db } from '@/lib/db/client';
import {
  type CreateSaleInput,
  type UpdateSaleInput,
  type SaleQuery,
  type SalesSummaryQuery,
  type TodaysSalesQuery,
} from '@/lib/validations/sale.schema';
import type { Sale, Dish, User } from '@prisma/client';

/**
 * Sale with Dish and User
 */
export type SaleWithDetails = Sale & {
  dish?: Dish;
  user?: User | null;
};

/**
 * Sales Summary by Dish
 */
export type SalesSummary = {
  dishId: string;
  dishName: string;
  totalQuantity: number;
  salesCount: number;
};

/**
 * Get all sales with optional filtering
 */
export async function getSales(query: SaleQuery = {}): Promise<SaleWithDetails[]> {
  const { dishId, userId, startDate, endDate, includeDish, includeUser } = query;

  const sales = await db.sale.findMany({
    where: {
      ...(dishId && { dishId }),
      ...(userId && { userId }),
      ...(startDate || endDate
        ? {
            saleDate: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate }),
            },
          }
        : {}),
    },
    include: {
      dish: includeDish,
      user: includeUser,
    },
    orderBy: { saleDate: 'desc' },
  });

  return sales as SaleWithDetails[];
}

/**
 * Get sale by ID
 */
export async function getSaleById(id: string): Promise<SaleWithDetails | null> {
  const sale = await db.sale.findUnique({
    where: { id },
    include: {
      dish: true,
      user: true,
    },
  });

  return sale as SaleWithDetails | null;
}

/**
 * Create a new sale and deplete inventory
 */
export async function createSale(data: CreateSaleInput): Promise<Sale> {
  const { dishId, quantitySold, saleDate, notes, userId } = data;

  // Get dish with recipe ingredients
  const dish = await db.dish.findUnique({
    where: { id: dishId },
    include: {
      recipeIngredients: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!dish) {
    throw new Error('Dish not found');
  }

  if (!dish.isActive) {
    throw new Error('Cannot record sale for inactive dish');
  }

  // Check if we have enough inventory for all ingredients
  const insufficientIngredients: string[] = [];
  for (const ingredient of dish.recipeIngredients) {
    const requiredQuantity = ingredient.quantityRequired * quantitySold;
    if (ingredient.product.quantity < requiredQuantity) {
      insufficientIngredients.push(
        `${ingredient.product.name} (need ${requiredQuantity} ${ingredient.unit}, have ${ingredient.product.quantity} ${ingredient.product.unit})`
      );
    }
  }

  if (insufficientIngredients.length > 0) {
    throw new Error(
      `Insufficient inventory for: ${insufficientIngredients.join(', ')}`
    );
  }

  // Use a transaction to ensure atomicity
  const sale = await db.$transaction(async (tx) => {
    // Deplete inventory for each ingredient
    for (const ingredient of dish.recipeIngredients) {
      const depletionAmount = ingredient.quantityRequired * quantitySold;

      await tx.product.update({
        where: { id: ingredient.productId },
        data: {
          quantity: {
            decrement: depletionAmount,
          },
        },
      });
    }

    // Create the sale record
    const createdSale = await tx.sale.create({
      data: {
        dishId,
        quantitySold,
        saleDate,
        notes,
        userId,
      },
      include: {
        dish: true,
        user: true,
      },
    });

    return createdSale;
  });

  return sale;
}

/**
 * Update an existing sale
 * Note: This is tricky as it requires reversing inventory changes
 */
export async function updateSale(id: string, data: UpdateSaleInput): Promise<Sale> {
  const existingSale = await db.sale.findUnique({
    where: { id },
    include: {
      dish: {
        include: {
          recipeIngredients: true,
        },
      },
    },
  });

  if (!existingSale) {
    throw new Error('Sale not found');
  }

  // If quantity changed, we need to adjust inventory
  if (data.quantitySold && data.quantitySold !== existingSale.quantitySold) {
    const quantityDiff = data.quantitySold - existingSale.quantitySold;

    // Use transaction to update inventory
    await db.$transaction(async (tx) => {
      for (const ingredient of existingSale.dish.recipeIngredients) {
        const adjustmentAmount = ingredient.quantityRequired * quantityDiff;

        await tx.product.update({
          where: { id: ingredient.productId },
          data: {
            quantity: {
              decrement: adjustmentAmount,
            },
          },
        });
      }
    });
  }

  // Update the sale
  const sale = await db.sale.update({
    where: { id },
    data,
    include: {
      dish: true,
      user: true,
    },
  });

  return sale;
}

/**
 * Delete a sale and restore inventory
 */
export async function deleteSale(id: string): Promise<void> {
  const sale = await db.sale.findUnique({
    where: { id },
    include: {
      dish: {
        include: {
          recipeIngredients: true,
        },
      },
    },
  });

  if (!sale) {
    throw new Error('Sale not found');
  }

  // Use transaction to restore inventory and delete sale
  await db.$transaction(async (tx) => {
    // Restore inventory for each ingredient
    for (const ingredient of sale.dish.recipeIngredients) {
      const restorationAmount = ingredient.quantityRequired * sale.quantitySold;

      await tx.product.update({
        where: { id: ingredient.productId },
        data: {
          quantity: {
            increment: restorationAmount,
          },
        },
      });
    }

    // Delete the sale
    await tx.sale.delete({
      where: { id },
    });
  });
}

/**
 * Get today's sales
 */
export async function getTodaysSales(query: TodaysSalesQuery = {}): Promise<SaleWithDetails[]> {
  const { includeDish = true, topCount = 5 } = query;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const sales = await db.sale.findMany({
    where: {
      saleDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      dish: includeDish,
    },
    orderBy: { saleDate: 'desc' },
    take: topCount,
  });

  return sales as SaleWithDetails[];
}

/**
 * Get sales summary grouped by dish
 */
export async function getSalesSummary(query: SalesSummaryQuery): Promise<SalesSummary[]> {
  const { startDate, endDate } = query;

  const sales = await db.sale.groupBy({
    by: ['dishId'],
    where: {
      saleDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    _sum: {
      quantitySold: true,
    },
    _count: {
      id: true,
    },
  });

  // Fetch dish names
  const summaries = await Promise.all(
    sales.map(async (sale) => {
      const dish = await db.dish.findUnique({
        where: { id: sale.dishId },
        select: { name: true },
      });

      return {
        dishId: sale.dishId,
        dishName: dish?.name || 'Unknown',
        totalQuantity: sale._sum.quantitySold || 0,
        salesCount: sale._count.id,
      };
    })
  );

  return summaries.sort((a, b) => b.totalQuantity - a.totalQuantity);
}

/**
 * Get top selling dishes for a date range
 */
export async function getTopSellingDishes(
  startDate: Date,
  endDate: Date,
  limit: number = 10
): Promise<SalesSummary[]> {
  const summary = await getSalesSummary({ startDate, endDate, groupBy: 'dish' });
  return summary.slice(0, limit);
}

/**
 * Get total sales for today
 */
export async function getTodaysSalesSummary(): Promise<{
  totalSales: number;
  totalQuantity: number;
  topDishes: SalesSummary[];
}> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const summary = await getSalesSummary({
    startDate: startOfDay,
    endDate: endOfDay,
    groupBy: 'dish',
  });

  const totalSales = summary.reduce((acc, s) => acc + s.salesCount, 0);
  const totalQuantity = summary.reduce((acc, s) => acc + s.totalQuantity, 0);

  return {
    totalSales,
    totalQuantity,
    topDishes: summary.slice(0, 5),
  };
}
