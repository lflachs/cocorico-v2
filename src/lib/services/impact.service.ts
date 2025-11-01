import { db } from '@/lib/db/client';
import { startOfMonth, endOfMonth, subMonths, startOfDay } from 'date-fns';

/**
 * Impact Service - Calculate money/time/waste saved
 * Gamification metrics to motivate users
 */

export interface ImpactMetrics {
  moneySaved: number; // euros
  timeSaved: number; // minutes
  wastePrevented: number; // kg
  streak: number; // consecutive days of activity
  billCount: number; // for tooltip explanation
  dlcCount: number; // for tooltip explanation
  // Potential calculations based on actual data
  moneyPotential: number; // What they COULD save
  timePotential: number; // What they COULD save
  wastePotential: number; // What they COULD prevent
}

/**
 * Calculate money saved through waste prevention
 * Better logic: DLCs that exist = awareness = less waste
 * Estimate: 15% of tracked inventory value would have been wasted without tracking
 */
async function calculateMoneySaved(startDate: Date, endDate: Date): Promise<number> {
  // Get all DLCs created in this period (active tracking)
  const dlcsTracked = await db.dLC.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      product: true,
    },
  });

  // Calculate total value of tracked products
  let totalTrackedValue = 0;

  dlcsTracked.forEach(dlc => {
    const unitPrice = dlc.product.unitPrice || 0;
    const value = unitPrice * dlc.quantity;
    totalTrackedValue += value;
  });

  // Conservative estimate: tracking DLCs prevents 15% waste
  // (Industry average waste without tracking: 15-20%)
  const moneySaved = totalTrackedValue * 0.15;

  return moneySaved;
}

/**
 * Calculate time saved through automation
 * Realistic estimate of ALL manual work replaced by Cocorico
 */
async function calculateTimeSaved(startDate: Date, endDate: Date): Promise<number> {
  const [billCount, dlcCount, saleCount, productCount] = await Promise.all([
    // Count processed bills (scanned invoices)
    db.bill.count({
      where: {
        status: 'PROCESSED',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),

    // Count DLC entries
    db.dLC.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),

    // Count sales entries
    db.sale.count({
      where: {
        saleDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),

    // Count products tracked
    db.product.count({
      where: {
        trackable: true,
      },
    }),
  ]);

  // REALISTIC time saved estimates (vs traditional Excel/notebook method):

  // 1. Bill processing: 15 min per bill
  //    - Manual: Open Excel, type products, quantities, prices, calculate totals, update stock
  //    - Cocorico: Scan → done
  const billTime = billCount * 15;

  // 2. DLC tracking: 5 min per entry
  //    - Manual: Write in notebook, check expiry dates, cross-reference with stock, set reminders
  //    - Cocorico: Quick entry with auto-alerts
  const dlcTime = dlcCount * 5;

  // 3. Sales tracking: 10 min per sale entry
  //    - Manual: Type each dish sold, calculate totals, update Excel, adjust stock manually
  //    - Cocorico: Quick entry, auto stock deduction
  const salesTime = saleCount * 10;

  // 4. Daily stock reconciliation: 20 min/day
  //    - Manual: Count inventory, update Excel, cross-check with purchases/sales
  //    - Cocorico: Real-time updates
  const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const hasActivity = billCount > 0 || dlcCount > 0 || saleCount > 0;
  const reconciliationTime = hasActivity ? daysInPeriod * 20 : 0;

  // 5. Food cost calculation: 2h per month
  //    - Manual: Export data, calculate in Excel, create reports
  //    - Cocorico: Automatic dashboard
  const foodCostTime = 120; // 2 hours per month

  const totalTimeSaved = billTime + dlcTime + salesTime + reconciliationTime + foodCostTime;

  return totalTimeSaved;
}

/**
 * Calculate waste prevented
 * Better logic: Any DLC tracked = awareness = less waste
 * Estimate: 10% of tracked weight would have been wasted
 */
async function calculateWastePrevented(startDate: Date, endDate: Date): Promise<number> {
  // Get all DLCs created in this period
  const dlcsTracked = await db.dLC.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  let totalTrackedWeight = 0;

  dlcsTracked.forEach(dlc => {
    // Convert all quantities to kg for consistency
    let quantityInKg = dlc.quantity;

    // Convert units to kg if needed
    if (dlc.unit === 'G') {
      quantityInKg = dlc.quantity / 1000;
    } else if (dlc.unit === 'L' || dlc.unit === 'ML' || dlc.unit === 'CL') {
      // For liquids, approximate 1L = 1kg
      if (dlc.unit === 'ML') quantityInKg = dlc.quantity / 1000;
      else if (dlc.unit === 'CL') quantityInKg = dlc.quantity / 100;
      // L is already ~= kg
    } else if (dlc.unit === 'PC') {
      // Estimate pieces: average 0.2kg per piece
      quantityInKg = dlc.quantity * 0.2;
    }

    totalTrackedWeight += quantityInKg;
  });

  // Conservative estimate: tracking prevents 10% waste
  const wastePrevented = totalTrackedWeight * 0.10;

  return wastePrevented;
}

/**
 * Calculate activity streak (consecutive days)
 * Based on any recorded activity (bills, DLCs, sales)
 */
async function calculateStreak(): Promise<number> {
  const today = startOfDay(new Date());
  let streak = 0;
  let currentDate = today;

  // Check each day backwards until we find a gap
  while (true) {
    const dayStart = startOfDay(currentDate);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // Check if there was any activity this day
    const [billCount, dlcCount, saleCount] = await Promise.all([
      db.bill.count({
        where: {
          createdAt: { gte: dayStart, lt: dayEnd },
        },
      }),
      db.dLC.count({
        where: {
          createdAt: { gte: dayStart, lt: dayEnd },
        },
      }),
      db.sale.count({
        where: {
          saleDate: { gte: dayStart, lt: dayEnd },
        },
      }),
    ]);

    const hasActivity = billCount > 0 || dlcCount > 0 || saleCount > 0;

    if (!hasActivity) {
      // No activity found, streak ends
      break;
    }

    streak++;

    // Limit to checking last 90 days to avoid infinite loop
    if (streak >= 90) break;

    // Move to previous day
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
}

/**
 * Calculate money potential based on untracked inventory
 * Potential = value of trackable products that DON'T have DLC entries × 15%
 */
async function calculateMoneyPotential(startDate: Date, endDate: Date): Promise<number> {
  // Get all trackable products with their total value
  const trackableProducts = await db.product.findMany({
    where: {
      trackable: true,
      totalValue: { not: null },
    },
    select: {
      id: true,
      totalValue: true,
    },
  });

  // Get products that already have DLCs this month
  const productsWithDLCs = await db.dLC.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      productId: true,
      product: {
        select: {
          totalValue: true,
        },
      },
    },
    distinct: ['productId'],
  });

  // Calculate tracked value
  let trackedValue = 0;
  productsWithDLCs.forEach(dlc => {
    trackedValue += dlc.product.totalValue || 0;
  });

  // Calculate total trackable value
  let totalTrackableValue = 0;
  trackableProducts.forEach(p => {
    totalTrackableValue += p.totalValue || 0;
  });

  // Untracked value is the potential
  const untrackedValue = Math.max(totalTrackableValue - trackedValue, 0);

  // Potential savings: 15% of untracked inventory value
  const potential = untrackedValue * 0.15;

  // Return at least 200€ as baseline potential
  return Math.max(potential, 200);
}

/**
 * Calculate time potential based on unused features
 * What they COULD save if they used all features consistently
 */
async function calculateTimePotential(startDate: Date, endDate: Date): Promise<number> {
  const [billCount, dlcCount, saleCount, dishCount] = await Promise.all([
    db.bill.count({ where: { status: 'PROCESSED', createdAt: { gte: startDate, lte: endDate } } }),
    db.dLC.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
    db.sale.count({ where: { saleDate: { gte: startDate, lte: endDate } } }),
    db.dish.count({ where: { isActive: true } }),
  ]);

  const daysInMonth = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Potential if they:
  // - Scanned 1 bill per day (15min each)
  // - Tracked 5 DLCs per week (5min each)
  // - Entered sales daily (10min per day)
  // - Used food cost dashboard (save 2h/month admin)

  const potentialBillTime = Math.min(daysInMonth, 30) * 15; // 1 bill/day
  const potentialDLCTime = 4 * 5 * 5; // 5 DLCs/week × 4 weeks
  const potentialSalesTime = daysInMonth * 10; // Daily sales entry
  const potentialAdminTime = 120; // 2h/month saved

  const totalPotential = potentialBillTime + potentialDLCTime + potentialSalesTime + potentialAdminTime;

  // Return at least 2h as baseline
  return Math.max(totalPotential, 120);
}

/**
 * Calculate waste potential based on untracked products
 * What they COULD prevent if they tracked all perishables
 */
async function calculateWastePotential(startDate: Date, endDate: Date): Promise<number> {
  // Get total quantity of trackable products (these are perishables)
  const trackableProducts = await db.product.findMany({
    where: {
      trackable: true,
    },
    select: {
      quantity: true,
      unit: true,
    },
  });

  // Convert all to kg
  let totalTrackableWeight = 0;
  trackableProducts.forEach(p => {
    let quantityInKg = p.quantity;

    if (p.unit === 'G') {
      quantityInKg = p.quantity / 1000;
    } else if (p.unit === 'ML') {
      quantityInKg = p.quantity / 1000;
    } else if (p.unit === 'CL') {
      quantityInKg = p.quantity / 100;
    } else if (p.unit === 'PC') {
      quantityInKg = p.quantity * 0.2; // Estimate 0.2kg per piece
    }

    totalTrackableWeight += quantityInKg;
  });

  // Potential: 10% of total trackable inventory could be saved from waste
  const potential = totalTrackableWeight * 0.10;

  // Return at least 10kg as baseline
  return Math.max(potential, 10);
}

/**
 * Get impact metrics for current month
 */
export async function getCurrentMonthImpact(): Promise<ImpactMetrics> {
  const now = new Date();
  const startDate = startOfMonth(now);
  const endDate = endOfMonth(now);

  // Get counts for tooltips
  const [billCount, dlcCount] = await Promise.all([
    db.bill.count({
      where: {
        status: 'PROCESSED',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),
    db.dLC.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),
  ]);

  const [moneySaved, timeSaved, wastePrevented, streak, moneyPotential, timePotential, wastePotential] = await Promise.all([
    calculateMoneySaved(startDate, endDate),
    calculateTimeSaved(startDate, endDate),
    calculateWastePrevented(startDate, endDate),
    calculateStreak(),
    calculateMoneyPotential(startDate, endDate),
    calculateTimePotential(startDate, endDate),
    calculateWastePotential(startDate, endDate),
  ]);

  return {
    moneySaved,
    timeSaved,
    wastePrevented,
    streak,
    billCount,
    dlcCount,
    moneyPotential,
    timePotential,
    wastePotential,
  };
}

/**
 * Get urgent alerts that need immediate action
 */
export async function getUrgentAlerts() {
  const now = new Date();
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  // Get products expiring in the next 3 days
  const expiringProducts = await db.dLC.findMany({
    where: {
      expirationDate: {
        lte: threeDaysFromNow,
      },
      status: 'ACTIVE',
    },
    include: {
      product: true,
    },
    orderBy: {
      expirationDate: 'asc',
    },
    take: 5,
  });

  // Get critical stock items (quantity = 0 or very low)
  const criticalStock = await db.product.findMany({
    where: {
      trackable: true,
      parLevel: { not: null },
      quantity: { lte: 0 },
    },
    take: 5,
  });

  const alerts = [];

  // Add expiring product alerts
  expiringProducts.forEach(dlc => {
    const daysUntil = Math.ceil(
      (dlc.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    let message = '';
    let severity: 'critical' | 'high' | 'warning' = 'warning';

    if (daysUntil <= 0) {
      message = "Expire aujourd'hui ! À utiliser rapidement";
      severity = 'critical';
    } else if (daysUntil === 1) {
      message = 'Expire demain - à utiliser en priorité';
      severity = 'high';
    } else if (daysUntil <= 3) {
      message = `Expire dans ${daysUntil} jours - à utiliser bientôt`;
      severity = 'warning';
    }

    alerts.push({
      id: `exp-${dlc.id}`,
      type: 'expiring' as const,
      productName: dlc.product.name,
      severity,
      message,
      actionLabel: 'Voir',
      actionHref: '/dlc',
    });
  });

  // Add stock alerts
  criticalStock.forEach(product => {
    alerts.push({
      id: `stock-${product.id}`,
      type: 'stockout' as const,
      productName: product.name,
      severity: 'critical' as const,
      message: 'Stock vide - commander en urgence',
      actionLabel: 'Commander',
      actionHref: '/orders',
    });
  });

  return alerts;
}
