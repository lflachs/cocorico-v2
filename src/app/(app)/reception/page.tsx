import { PageHeader } from '@/components/PageHeader';
import { getServerTranslation } from '@/lib/utils/language';
import { PackageCheck } from 'lucide-react';
import { getAllBills } from '@/lib/services/bill.service';
import { ReceptionPageContent } from './_components/ReceptionPageContent';

/**
 * Reception Mode - Simplified Delivery Validation
 * "Check tes livraisons — sans perdre de temps"
 *
 * Goals:
 * - Scan BL (delivery note) → one-tap validation
 * - Updates stock automatically
 * - Flag disputes instantly
 * - Card-based mobile-first UI
 */

export const dynamic = 'force-dynamic';

export default async function ReceptionPage() {
  const { t } = await getServerTranslation();

  // Fetch bills
  const rawBills = await getAllBills();

  // Transform bills for client component
  const bills = rawBills.map((bill) => ({
    id: bill.id,
    filename: bill.filename,
    supplier: bill.supplier ? { name: bill.supplier.name } : null,
    billDate: bill.billDate,
    totalAmount: bill.totalAmount,
    status: bill.status,
    products: bill.products.map((bp) => ({
      id: bp.id,
      product: {
        name: bp.product.name,
      },
      quantityExtracted: bp.quantityExtracted,
    })),
    createdAt: bill.createdAt,
  }));

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      <PageHeader
        title={t('nav.reception')}
        subtitle="Check tes livraisons — sans perdre de temps"
        icon={PackageCheck}
      />

      <ReceptionPageContent initialBills={bills} />
    </div>
  );
}
