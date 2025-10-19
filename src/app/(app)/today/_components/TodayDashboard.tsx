'use client';

import { useLanguage } from '@/providers/LanguageProvider';
import { DashboardStats } from '@/lib/services/dashboard.service';
import { StatCard, StatCardSkeleton } from '@/components/dashboard';
import { Package, AlertTriangle, Clock, FileText } from 'lucide-react';

/**
 * Today Dashboard - Main dashboard with stats and quick actions
 * Displays key metrics in a responsive grid layout
 */

interface TodayDashboardProps {
  stats: DashboardStats;
  loading?: boolean;
}

export function TodayDashboard({ stats, loading = false }: TodayDashboardProps) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="grid w-full grid-cols-1 gap-3 overflow-hidden sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const viewLabel = t('common.view') || 'View';

  return (
    <div className="grid w-full grid-cols-1 gap-3 overflow-hidden sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
      <StatCard
        title={t('inventory.title')}
        value={stats.totalProducts}
        icon={Package}
        gradient="from-primary/90 to-primary"
        href="/inventory"
        viewLabel={viewLabel}
      />

      <StatCard
        title={t('today.lowStock.title')}
        value={stats.lowStockCount}
        icon={AlertTriangle}
        gradient={
          stats.lowStockCount > 0 ? 'from-warning/90 to-warning' : 'from-success/90 to-success'
        }
        href="/inventory"
        alert={stats.lowStockCount > 0}
        viewLabel={viewLabel}
      />

      <StatCard
        title={t('dlc.filter.expiringSoon')}
        value={stats.expiringCount}
        icon={Clock}
        gradient={
          stats.expiringCount > 0
            ? 'from-destructive/90 to-destructive'
            : 'from-success/90 to-success'
        }
        href="/dlc"
        alert={stats.expiringCount > 0}
        viewLabel={viewLabel}
      />

      <StatCard
        title={t('bills.title')}
        value={stats.recentBillsCount}
        icon={FileText}
        gradient="from-secondary/90 to-secondary"
        href="/bills"
        viewLabel={viewLabel}
      />
    </div>
  );
}
