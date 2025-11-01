'use client';

import { ExpiringTodayCard } from './ExpiringTodayCard';
import { TodaysMenuCard } from './TodaysMenuCard';
import { StockStatusCard } from './StockStatusCard';

type ExpiringProduct = {
  id: string;
  product: {
    name: string;
    unit: string;
  };
  quantity: number;
  expirationDate: Date;
  lotNumber: string | null;
};

type MenuItem = {
  id: string;
  name: string;
  section: string;
  isReady: boolean;
  missingIngredients?: string[];
};

type StockItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  parLevel: number | null;
  status: 'GOOD' | 'LOW' | 'CRITICAL';
};

type PrepPageContentProps = {
  expiringProducts: ExpiringProduct[];
  menuItems: MenuItem[];
  lowStockItems: StockItem[];
};

/**
 * PrepPageContent - Main content for Prep Mode
 *
 * Supports chef's preparation workflow:
 * 1. What MUST be used today (expiring)
 * 2. What's on menu (reference)
 * 3. Stock status (awareness)
 */
export function PrepPageContent({ expiringProducts, menuItems, lowStockItems }: PrepPageContentProps) {
  return (
    <div className="space-y-6">
      {/* Priority #1: Use expiring products first */}
      <ExpiringTodayCard products={expiringProducts} />

      {/* Reference: Today's menu */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodaysMenuCard items={menuItems} />
        <StockStatusCard items={lowStockItems} />
      </div>

      {/* Future enhancements:
       * - Voice logging: "J'ai utilisé 2 bacs de purée"
       * - Portion calculator: "110g merlan = X portions with Y kg stock"
       * - Prep checklist: Manual items chef wants to track
       */}
    </div>
  );
}
