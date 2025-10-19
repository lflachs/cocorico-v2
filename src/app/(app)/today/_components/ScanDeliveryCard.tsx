'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Scan } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/providers/LanguageProvider';

/**
 * Scan Delivery Card
 * Large CTA button to navigate to bills/upload page
 */

export function ScanDeliveryCard() {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <Card
      className="bg-gradient-to-r from-blue-500 to-blue-600 border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer"
      onClick={() => router.push('/bills/upload')}
    >
      <CardContent className="pt-8 pb-8">
        <div className="w-full flex items-center justify-center gap-4">
          <Scan className="w-12 h-12 text-white" />
          <div className="text-left">
            <div className="text-2xl font-bold text-white">{t('today.scanDelivery')}</div>
            <div className="text-blue-100 text-sm">{t('today.scanDelivery.subtitle')}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
