'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ExtractedProductsList } from '../../_components/ExtractedProductsList';
import { useLanguage } from '@/providers/LanguageProvider';
import { toast } from 'sonner';
import { SUPPORTED_UNITS } from '@/lib/constants/units';

/**
 * Bill Confirmation Page
 * Review and map extracted products from OCR
 */

type ExtractedProduct = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  mappedProductId?: string;
};

type Bill = {
  id: string;
  supplierName: string;
  date: string;
  totalAmount: number;
  extractedProducts: ExtractedProduct[];
};

export default function BillConfirmPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const billId = params.id as string;

  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    loadBill();
  }, [billId]);

  const loadBill = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/bills/${billId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch bill');
      }

      const data = await response.json();
      setBill(data);
    } catch (error) {
      console.error('Error loading bill:', error);
      toast.error(t('bills.confirm.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleProductMapping = (productId: string, mappedProductId: string | undefined) => {
    if (!bill) return;

    setBill({
      ...bill,
      extractedProducts: bill.extractedProducts.map((p) =>
        p.id === productId ? { ...p, mappedProductId } : p
      ),
    });
  };

  const handleProductUpdate = (productId: string, updates: Partial<ExtractedProduct>) => {
    if (!bill) return;

    setBill({
      ...bill,
      extractedProducts: bill.extractedProducts.map((p) =>
        p.id === productId ? { ...p, ...updates } : p
      ),
    });
  };

  const handleConfirm = async () => {
    if (!bill) return;

    // Validate units
    const invalidUnits = bill.extractedProducts.filter(
      (p) => !SUPPORTED_UNITS.includes(p.unit.toUpperCase() as any)
    );
    if (invalidUnits.length > 0) {
      toast.error('Some products have invalid units. Please correct them before confirming.');
      return;
    }

    setConfirming(true);
    try {
      // Transform the data to match the API format
      // If a product is mapped, use the mapped ID
      // If not mapped, send the product info to create a new one
      const productMappings = bill.extractedProducts.map((p) => ({
        productId: p.mappedProductId,
        productName: p.name,
        quantity: p.quantity,
        unit: p.unit,
        unitPrice: p.unitPrice,
      }));

      const response = await fetch(`/api/bills/${billId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ products: productMappings }),
      });

      if (!response.ok) {
        throw new Error('Failed to confirm bill');
      }

      toast.success(t('bills.confirm.success'));
      router.push('/bills');
    } catch (error) {
      console.error('Error confirming bill:', error);
      toast.error(t('bills.confirm.error'));
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('bills.confirm.notFound')}</p>
        <Link href="/bills">
          <Button className="mt-4">
            {t('common.back')}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Link href="/bills">
          <Button variant="ghost" className="mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          {t('bills.confirm.title')}
        </h1>
        <p className="mt-2 text-gray-600">{t('bills.confirm.description')}</p>
      </div>

      {/* Bill Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t('bills.confirm.billSummary')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">{t('bills.confirm.supplier')}</p>
              <p className="font-semibold">{bill.supplierName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('bills.confirm.date')}</p>
              <p className="font-semibold">
                {new Date(bill.date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('bills.confirm.total')}</p>
              <p className="font-semibold text-lg">{bill.totalAmount.toFixed(2)} €</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('bills.confirm.items')}</p>
              <p className="font-semibold">{bill.extractedProducts.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Extracted Products */}
      <ExtractedProductsList
        products={bill.extractedProducts}
        onProductMapping={handleProductMapping}
        onProductUpdate={handleProductUpdate}
      />

      {/* Confirm Button */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <Button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {confirming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('bills.confirm.confirming')}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {t('bills.confirm.confirmButton')}
              </>
            )}
          </Button>
          <p className="text-xs text-center text-gray-600 mt-3">
            {t('bills.confirm.confirmHint')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
