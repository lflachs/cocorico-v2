import { PageHeader } from '@/components/PageHeader';
import { getServerTranslation } from '@/lib/utils/language';
import { Receipt } from 'lucide-react';
import { db } from '@/lib/db/client';
import { SalesPageContent } from './_components/SalesPageContent';
import { subDays } from 'date-fns';

/**
 * Sales Entry - POS Ticket Sync
 * "Entre ton ticket de caisse — sync auto du stock"
 *
 * Scan receipts to automatically deduct stock based on recipes
 */

export const dynamic = 'force-dynamic';

export default async function SalesPage() {
  const { t } = await getServerTranslation();

  // Get recent sales (last 7 days)
  const sevenDaysAgo = subDays(new Date(), 7);

  const recentSales = await db.sale.findMany({
    where: {
      saleDate: {
        gte: sevenDaysAgo,
      },
    },
    include: {
      dish: true,
    },
    orderBy: {
      saleDate: 'desc',
    },
  });

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      <PageHeader
        title={t('nav.sales')}
        subtitle="Entre ton ticket de caisse — sync auto du stock"
        icon={Receipt}
      />

      <SalesPageContent recentSales={recentSales} />
    </div>
  );
}
