'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PackageCheck, History } from 'lucide-react';
import { DeliveryCard } from './DeliveryCard';
import { ReceptionFlow } from './ReceptionFlow';

type Bill = {
  id: string;
  filename: string;
  supplier: { name: string } | null;
  billDate: Date | null;
  totalAmount: number | null;
  status: 'PENDING' | 'PROCESSED' | 'DISPUTED';
  products: Array<{
    id: string;
    product: {
      name: string;
    };
    quantityExtracted: number;
  }>;
  createdAt: Date;
};

type ReceptionPageContentProps = {
  initialBills: Bill[];
};

/**
 * ReceptionPageContent - Main content for Reception Mode
 *
 * Two tabs: New reception flow and completed receptions history
 * Mobile-first design optimized for receiving dock
 */
export function ReceptionPageContent({ initialBills }: ReceptionPageContentProps) {
  const [bills] = useState<Bill[]>(initialBills);
  const [activeTab, setActiveTab] = useState('reception');
  const [receptionFlowOpen, setReceptionFlowOpen] = useState(false);

  // Sort by date descending (most recent first)
  const sortedBills = [...bills].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
        <TabsTrigger value="reception" className="gap-2">
          <PackageCheck className="w-4 h-4" />
          Nouvelle réception
        </TabsTrigger>
        <TabsTrigger value="history" className="gap-2">
          <History className="w-4 h-4" />
          Historique
        </TabsTrigger>
      </TabsList>

      {/* NEW RECEPTION TAB - Sequential card flow */}
      <TabsContent value="reception" className="space-y-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <PackageCheck className="h-20 w-20 text-primary" />
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">Nouvelle réception</h2>
            <p className="text-muted-foreground">
              Scannez un bon de livraison pour démarrer
            </p>
          </div>
          <Button
            onClick={() => setReceptionFlowOpen(true)}
            size="lg"
            className="h-16 px-8 text-lg font-semibold"
          >
            Démarrer une réception
          </Button>
        </div>

        {/* Reception Flow Modal */}
        <ReceptionFlow
          open={receptionFlowOpen}
          onOpenChange={setReceptionFlowOpen}
        />
      </TabsContent>

      {/* HISTORY TAB - Completed receptions */}
      <TabsContent value="history" className="space-y-6">
        {bills.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
            <PackageCheck className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">Aucune réception</h3>
            <p className="text-sm text-muted-foreground">
              L'historique des réceptions apparaîtra ici
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-4">
              {bills.length} réception{bills.length > 1 ? 's' : ''} effectuée{bills.length > 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 gap-4">
              {sortedBills.map((bill) => (
                <DeliveryCard key={bill.id} bill={bill} />
              ))}
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
