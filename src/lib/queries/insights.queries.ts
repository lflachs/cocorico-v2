import { db } from '@/lib/db/client';

/**
 * Insights Queries
 * Analytics focused on waste prevention and money saved
 */

/**
 * Get DLC tracking insights - waste prevented by tracking expiration dates
 */
export async function getDLCInsights(days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get all DLCs created in this period
  const dlcs = await db.dLC.findMany({
    where: {
      createdAt: {
        gte: startDate,
      },
    },
    include: {
      product: true,
    },
  });

  // Calculate value of tracked products (waste prevented)
  const totalValue = dlcs.reduce((sum, dlc) => {
    const value = (dlc.product.unitPrice || 0) * dlc.quantity;
    return sum + value;
  }, 0);

  // Conservative estimate: tracking prevents 15% waste
  const wastePrevented = totalValue * 0.15;

  // Count by status
  const active = dlcs.filter(d => d.status === 'ACTIVE').length;
  const used = dlcs.filter(d => d.status === 'USED').length;
  const expired = dlcs.filter(d => d.status === 'EXPIRED').length;

  // Top tracked products
  const productTracking = new Map<string, {
    productId: string;
    productName: string;
    unit: string;
    trackingCount: number;
    totalQuantity: number;
    totalValue: number;
  }>();

  dlcs.forEach(dlc => {
    const value = (dlc.product.unitPrice || 0) * dlc.quantity;
    const existing = productTracking.get(dlc.productId);
    if (existing) {
      existing.trackingCount += 1;
      existing.totalQuantity += dlc.quantity;
      existing.totalValue += value;
    } else {
      productTracking.set(dlc.productId, {
        productId: dlc.productId,
        productName: dlc.product.name,
        unit: dlc.product.unit,
        trackingCount: 1,
        totalQuantity: dlc.quantity,
        totalValue: value,
      });
    }
  });

  const topTracked = Array.from(productTracking.values())
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 10);

  return {
    summary: {
      totalDLCs: dlcs.length,
      active,
      used,
      expired,
      totalValueTracked: totalValue,
      estimatedWastePrevented: wastePrevented,
    },
    topTracked,
  };
}

/**
 * Get stock adjustments insights - discrepancies between tracked and physical
 */
export async function getStockAdjustmentsInsights(days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get all manual adjustments (inventory sync)
  const movements = await db.stockMovement.findMany({
    where: {
      source: 'MANUAL',
      movementType: 'ADJUSTMENT',
      createdAt: {
        gte: startDate,
      },
    },
    include: {
      product: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Only count negative adjustments as waste (stock was less than expected)
  const wasteAdjustments = movements.filter(m => m.quantity < 0);

  // Calculate total waste value
  const totalWasteValue = Math.abs(
    wasteAdjustments.reduce((sum, m) => sum + (m.totalValue || 0), 0)
  );

  // Group waste by product
  const wasteByProduct = new Map<string, {
    productId: string;
    productName: string;
    unit: string;
    totalQuantity: number;
    totalValue: number;
    count: number;
  }>();

  wasteAdjustments.forEach(m => {
    const existing = wasteByProduct.get(m.productId);
    const absQuantity = Math.abs(m.quantity);
    const absValue = Math.abs(m.totalValue || 0);

    if (existing) {
      existing.totalQuantity += absQuantity;
      existing.totalValue += absValue;
      existing.count += 1;
    } else {
      wasteByProduct.set(m.productId, {
        productId: m.productId,
        productName: m.product.name,
        unit: m.product.unit,
        totalQuantity: absQuantity,
        totalValue: absValue,
        count: 1,
      });
    }
  });

  const topWasted = Array.from(wasteByProduct.values())
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 10);

  return {
    summary: {
      totalAdjustments: movements.length,
      wasteAdjustments: wasteAdjustments.length,
      totalWasteValue,
    },
    topWasted,
    recentAdjustments: movements.slice(0, 20),
  };
}

/**
 * Get inventory accuracy metrics
 */
export async function getInventoryAccuracy(days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get all manual adjustments
  const adjustments = await db.stockMovement.findMany({
    where: {
      source: 'MANUAL',
      movementType: 'ADJUSTMENT',
      createdAt: {
        gte: startDate,
      },
    },
    include: {
      product: true,
    },
  });

  const totalProducts = await db.product.count();
  const productsAdjusted = new Set(adjustments.map(a => a.productId)).size;
  const adjustmentsCount = adjustments.length;

  // Products with frequent adjustments (might indicate counting issues)
  const adjustmentsByProduct = new Map<string, number>();
  adjustments.forEach(a => {
    adjustmentsByProduct.set(
      a.productId,
      (adjustmentsByProduct.get(a.productId) || 0) + 1
    );
  });

  const frequentlyAdjusted = Array.from(adjustmentsByProduct.entries())
    .filter(([_, count]) => count >= 3)
    .map(([productId, count]) => {
      const product = adjustments.find(a => a.productId === productId)?.product;
      return {
        productId,
        productName: product?.name || 'Unknown',
        adjustmentCount: count,
      };
    })
    .sort((a, b) => b.adjustmentCount - a.adjustmentCount);

  return {
    totalProducts,
    productsAdjusted,
    adjustmentsCount,
    accuracyRate: totalProducts > 0
      ? ((totalProducts - productsAdjusted) / totalProducts) * 100
      : 100,
    avgAdjustmentsPerProduct: productsAdjusted > 0
      ? adjustmentsCount / productsAdjusted
      : 0,
    frequentlyAdjusted,
  };
}

/**
 * Get waste trends over time (daily)
 */
export async function getWasteTrends(days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const movements = await db.stockMovement.findMany({
    where: {
      source: 'MANUAL',
      movementType: 'ADJUSTMENT',
      createdAt: {
        gte: startDate,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Group by date
  const trendsByDate = new Map<string, {
    date: string;
    lossCount: number;
    lossValue: number;
    gainCount: number;
    gainValue: number;
  }>();

  movements.forEach(m => {
    const dateKey = m.createdAt.toISOString().split('T')[0];
    const isLoss = m.description?.includes('decreased');

    const existing = trendsByDate.get(dateKey);
    if (existing) {
      if (isLoss) {
        existing.lossCount += 1;
        existing.lossValue += m.totalValue || 0;
      } else {
        existing.gainCount += 1;
        existing.gainValue += m.totalValue || 0;
      }
    } else {
      trendsByDate.set(dateKey, {
        date: dateKey,
        lossCount: isLoss ? 1 : 0,
        lossValue: isLoss ? (m.totalValue || 0) : 0,
        gainCount: isLoss ? 0 : 1,
        gainValue: isLoss ? 0 : (m.totalValue || 0),
      });
    }
  });

  return Array.from(trendsByDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}
