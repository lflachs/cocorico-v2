'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Package,
  Calendar,
  Euro,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { fr } from 'date-fns/locale';

type DeliveryStatus = 'PENDING' | 'PROCESSED' | 'DISPUTED';

type DeliveryCardProps = {
  bill: {
    id: string;
    filename: string;
    supplier: { name: string } | null;
    billDate: Date | null;
    totalAmount: number | null;
    status: DeliveryStatus;
    products: Array<{
      id: string;
      product: {
        name: string;
      };
      quantityExtracted: number;
    }>;
    createdAt: Date;
  };
};

/**
 * DeliveryCard - History view for completed receptions
 *
 * Shows key delivery info in a read-only card
 * Mobile-first design with expandable product list
 */
export function DeliveryCard({ bill }: DeliveryCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleViewDetails = () => {
    router.push(`/bills/${bill.id}`);
  };

  const getStatusBadge = () => {
    switch (bill.status) {
      case 'PROCESSED':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            ✓ Validé
          </Badge>
        );
      case 'DISPUTED':
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
            ⚠ Litige
          </Badge>
        );
      default:
        return null;
    }
  };

  const productCount = bill.products.length;
  const supplierName = bill.supplier?.name || 'Fournisseur inconnu';
  const deliveryDate = bill.billDate ? format(new Date(bill.billDate), 'dd/MM/yyyy', { locale: fr }) : '—';
  const totalAmount = bill.totalAmount ? `${bill.totalAmount.toFixed(2)} €` : '—';
  const createdDate = format(new Date(bill.createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr });

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg truncate">{supplierName}</h3>
              {getStatusBadge()}
            </div>
            <p className="text-xs text-muted-foreground">{createdDate}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Info Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Date:</span>
            <span className="font-medium">{deliveryDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <Euro className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Total:</span>
            <span className="font-medium">{totalAmount}</span>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Articles:</span>
            <span className="font-medium">{productCount} produit{productCount > 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Expandable Products List */}
        {productCount > 0 && (
          <div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              <span>{isExpanded ? 'Masquer' : 'Voir'} les produits</span>
            </button>

            {isExpanded && (
              <div className="mt-2 space-y-1 pl-6">
                {bill.products.slice(0, 5).map((item) => (
                  <div key={item.id} className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                    <span>{item.product.name}</span>
                    <span className="text-xs">({item.quantityExtracted} unités)</span>
                  </div>
                ))}
                {productCount > 5 && (
                  <div className="text-xs text-muted-foreground pl-3">
                    +{productCount - 5} autres produits
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={handleViewDetails}
          variant="outline"
          className="w-full"
          size="sm"
        >
          Voir les détails
        </Button>
      </CardContent>
    </Card>
  );
}
