'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Mail, Phone, FileText, Trash2 } from 'lucide-react';

type OrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  estimatedPrice?: number;
};

type SupplierOrder = {
  supplierId?: string;
  supplierName: string;
  supplierEmail?: string;
  supplierPhone?: string;
  items: OrderItem[];
  totalEstimatedCost: number;
};

type OrdersBySupplierProps = {
  orders: SupplierOrder[];
  onRemoveItem: (supplierId: string | undefined, productId: string) => void;
  onSendOrder: (supplierId: string | undefined) => void;
  onExportOrder: (supplierId: string | undefined) => void;
};

/**
 * OrdersBySupplier - Groups order items by supplier
 *
 * Shows all items to order from each supplier
 * Allows sending orders via email or exporting
 */
export function OrdersBySupplier({
  orders,
  onRemoveItem,
  onSendOrder,
  onExportOrder,
}: OrdersBySupplierProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
        <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold mb-2">Aucun article dans la commande</h3>
        <p className="text-sm text-muted-foreground">
          Ajoutez des articles depuis les suggestions ci-dessus
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.supplierId || 'unknown'}>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {order.supplierName}
                </CardTitle>
                <div className="mt-2 space-y-1">
                  {order.supplierEmail && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {order.supplierEmail}
                    </div>
                  )}
                  {order.supplierPhone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {order.supplierPhone}
                    </div>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="shrink-0">
                {order.items.length} article{order.items.length > 1 ? 's' : ''}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Items List */}
            <div className="space-y-2">
              {order.items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} {item.unit}
                      {item.estimatedPrice && (
                        <span className="ml-2">• {(item.estimatedPrice * item.quantity).toFixed(2)} €</span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                    onClick={() => onRemoveItem(order.supplierId, item.productId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Total */}
            {order.totalEstimatedCost > 0 && (
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="font-semibold">Total estimé:</span>
                <span className="text-xl font-bold">{order.totalEstimatedCost.toFixed(2)} €</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => onSendOrder(order.supplierId)}
                className="flex-1"
                disabled={!order.supplierEmail}
              >
                <Mail className="mr-2 h-4 w-4" />
                Envoyer par email
              </Button>
              <Button
                onClick={() => onExportOrder(order.supplierId)}
                variant="outline"
                className="flex-1"
              >
                <FileText className="mr-2 h-4 w-4" />
                Exporter
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
