import { getAllProducts } from './product.service';
import { getAllBills } from './bill.service';
import { getUpcomingDlcs } from './dlc.service';

/**
 * Dashboard Service - Server-side data fetching for dashboard stats
 * Uses direct database queries for optimal performance in Next.js Server Components
 */

export interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  expiringCount: number;
  recentBillsCount: number;
}

/**
 * Fetches dashboard statistics directly from the database
 * This function should be called from Server Components only
 *
 * Benefits of this approach:
 * - No HTTP overhead (Server Component → Database directly)
 * - Automatic request deduplication by Next.js
 * - Better performance and type safety
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Fetch all data in parallel from the database
    const [products, dlcs, bills] = await Promise.all([
      getAllProducts(),
      getUpcomingDlcs(7), // Next 7 days
      getAllBills(),
    ]);

    // Count low stock items (below par level)
    const lowStock = products.filter((p) => p.parLevel && p.quantity < p.parLevel).length;

    return {
      totalProducts: products.length,
      lowStockCount: lowStock,
      expiringCount: dlcs.length,
      recentBillsCount: bills.length,
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      totalProducts: 0,
      lowStockCount: 0,
      expiringCount: 0,
      recentBillsCount: 0,
    };
  }
}
