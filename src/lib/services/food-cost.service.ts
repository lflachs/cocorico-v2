import { db } from '@/lib/db/client';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';

/**
 * Food Cost Service - Calculate profitability metrics
 *
 * Food Cost Formula:
 * (Beginning Inventory + Purchases - Ending Inventory) / Sales Revenue × 100
 *
 * Simplified for restaurants without regular inventory counts:
 * Total Purchases / Sales Revenue × 100
 */

export interface PurchaseBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface FoodCostPeriod {
  periodLabel: string;
  startDate: Date;
  endDate: Date;

  // Revenue
  salesRevenue: number;
  dishCount: number;

  // Purchases
  totalPurchases: number;
  purchasesByCategory: PurchaseBreakdown[];

  // Food Cost %
  foodCostPercent: number;

  // Trend
  isGood: boolean; // < 35% is good for most restaurants
  trend?: 'up' | 'down' | 'stable';
  previousPeriodPercent?: number;
}

/**
 * Get purchases for a date range
 */
async function getPurchasesForPeriod(startDate: Date, endDate: Date) {
  const bills = await db.bill.findMany({
    where: {
      status: 'PROCESSED',
      OR: [
        {
          billDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        {
          billDate: null,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      ],
    },
    include: {
      products: {
        include: {
          product: true,
        },
      },
    },
  });

  let totalPurchases = 0;
  const categoryTotals = new Map<string, number>();

  bills.forEach(bill => {
    bill.products.forEach(bp => {
      const amount = bp.totalValueExtracted || (bp.unitPriceExtracted || 0) * bp.quantityExtracted;
      totalPurchases += amount;

      const category = bp.product.category || 'Autres';
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + amount);
    });
  });

  const purchasesByCategory: PurchaseBreakdown[] = Array.from(categoryTotals.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalPurchases > 0 ? (amount / totalPurchases) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    totalPurchases,
    purchasesByCategory,
  };
}

/**
 * Get sales revenue for a date range
 */
async function getSalesForPeriod(startDate: Date, endDate: Date) {
  const sales = await db.sale.findMany({
    where: {
      saleDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      dish: true,
    },
  });

  let salesRevenue = 0;
  let dishCount = 0;

  sales.forEach(sale => {
    const price = sale.dish.sellingPrice || 0;
    salesRevenue += price * sale.quantitySold;
    dishCount += sale.quantitySold;
  });

  return {
    salesRevenue,
    dishCount,
  };
}

/**
 * Calculate food cost for a specific period
 */
async function calculateFoodCostForPeriod(
  startDate: Date,
  endDate: Date,
  periodLabel: string,
  previousPeriodPercent?: number
): Promise<FoodCostPeriod> {
  const [purchases, sales] = await Promise.all([
    getPurchasesForPeriod(startDate, endDate),
    getSalesForPeriod(startDate, endDate),
  ]);

  const foodCostPercent = sales.salesRevenue > 0
    ? (purchases.totalPurchases / sales.salesRevenue) * 100
    : 0;

  // Determine if this is good (industry standard: 28-35%)
  const isGood = foodCostPercent <= 35;

  // Calculate trend
  let trend: 'up' | 'down' | 'stable' | undefined;
  if (previousPeriodPercent !== undefined) {
    const diff = foodCostPercent - previousPeriodPercent;
    if (Math.abs(diff) < 2) trend = 'stable';
    else if (diff > 0) trend = 'up';
    else trend = 'down';
  }

  return {
    periodLabel,
    startDate,
    endDate,
    salesRevenue: sales.salesRevenue,
    dishCount: sales.dishCount,
    totalPurchases: purchases.totalPurchases,
    purchasesByCategory: purchases.purchasesByCategory,
    foodCostPercent,
    isGood,
    trend,
    previousPeriodPercent,
  };
}

/**
 * Get current period (last 15 days) food cost
 */
export async function getCurrentPeriodFoodCost(): Promise<FoodCostPeriod> {
  const endDate = endOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, 14)); // Last 15 days

  // Get previous period for comparison
  const prevEndDate = endOfDay(subDays(startDate, 1));
  const prevStartDate = startOfDay(subDays(prevEndDate, 14));

  const prevPeriod = await calculateFoodCostForPeriod(
    prevStartDate,
    prevEndDate,
    'Previous Period'
  );

  return calculateFoodCostForPeriod(
    startDate,
    endDate,
    '15 derniers jours',
    prevPeriod.foodCostPercent
  );
}

/**
 * Get monthly food cost comparison (current vs last month)
 */
export async function getMonthlyFoodCostComparison(): Promise<{
  currentMonth: FoodCostPeriod;
  lastMonth: FoodCostPeriod;
}> {
  const now = new Date();

  // Current month
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  // Last month
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const lastMonth = await calculateFoodCostForPeriod(
    lastMonthStart,
    lastMonthEnd,
    'Mois dernier'
  );

  const currentMonth = await calculateFoodCostForPeriod(
    currentMonthStart,
    currentMonthEnd,
    'Ce mois',
    lastMonth.foodCostPercent
  );

  return {
    currentMonth,
    lastMonth,
  };
}

/**
 * Get top spending categories
 */
export async function getTopSpendingCategories(days: number = 30): Promise<PurchaseBreakdown[]> {
  const endDate = endOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, days - 1));

  const { purchasesByCategory } = await getPurchasesForPeriod(startDate, endDate);
  return purchasesByCategory.slice(0, 5); // Top 5 categories
}

/**
 * Get confidence score based on data quality
 * - Do we have sales data?
 * - Do we have purchase data?
 * - How complete is the data?
 */
export async function getDataConfidence(period: FoodCostPeriod): Promise<{
  score: number; // 0-100
  message: string;
}> {
  const hasSales = period.salesRevenue > 0;
  const hasPurchases = period.totalPurchases > 0;
  const hasCategories = period.purchasesByCategory.length > 0;

  if (!hasSales && !hasPurchases) {
    return {
      score: 0,
      message: 'Aucune donnée disponible pour cette période',
    };
  }

  if (!hasSales) {
    return {
      score: 30,
      message: 'Ventes manquantes - enregistrez vos ventes pour un calcul précis',
    };
  }

  if (!hasPurchases) {
    return {
      score: 40,
      message: 'Achats manquants - scannez vos factures pour un calcul précis',
    };
  }

  // Both sales and purchases exist
  let score = 70;

  // Bonus for categorized purchases
  if (hasCategories && period.purchasesByCategory.length >= 3) {
    score += 15;
  }

  // Bonus for reasonable food cost %
  if (period.foodCostPercent > 0 && period.foodCostPercent < 60) {
    score += 15;
  }

  return {
    score,
    message: score >= 80 ? 'Données complètes et fiables' : 'Données partielles - continuez à scanner vos factures',
  };
}
