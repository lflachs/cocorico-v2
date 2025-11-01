'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ChevronLeft, Package, Mail, Copy } from 'lucide-react';

type Product = {
  name: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  totalPrice?: number;
};

type DisputeData = {
  type: 'MISSING' | 'DAMAGED' | 'WRONG_QUANTITY' | 'WRONG_PRODUCT' | 'QUALITY';
  description: string;
};

type BillSummaryConfirmProps = {
  supplierName: string;
  supplierEmail?: string;
  onSupplierChange: (value: string) => void;
  onSupplierEmailChange?: (value: string) => void;
  billDate: string;
  onBillDateChange: (value: string) => void;
  totalAmount: number;
  onTotalAmountChange: (value: number) => void;
  products: Product[];
  productsWithDLC: number;
  productsWithDisputes?: number;
  disputes?: Map<number, DisputeData>;
  onConfirm: () => void;
  onBack: () => void;
  onSendDisputeEmail?: () => void;
  onCopyDisputeEmail?: () => void;
};

/**
 * BillSummaryConfirm - Final confirmation before updating stock
 *
 * Shows summary and allows editing supplier/date/total
 */
export function BillSummaryConfirm({
  supplierName,
  supplierEmail,
  onSupplierChange,
  onSupplierEmailChange,
  billDate,
  onBillDateChange,
  totalAmount,
  onTotalAmountChange,
  products,
  productsWithDLC,
  productsWithDisputes = 0,
  disputes,
  onConfirm,
  onBack,
  onSendDisputeEmail,
  onCopyDisputeEmail,
}: BillSummaryConfirmProps) {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <CheckCircle2 className="h-16 w-16 mx-auto text-green-600" />
        <h2 className="text-2xl font-bold">Confirmation de la livraison</h2>
        <p className="text-sm text-muted-foreground">
          Vérifiez les informations avant de valider
        </p>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informations de la facture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Supplier */}
          <div>
            <Label htmlFor="supplier">Fournisseur *</Label>
            <Input
              id="supplier"
              value={supplierName}
              onChange={(e) => onSupplierChange(e.target.value)}
              placeholder="Nom du fournisseur"
              className="mt-1"
            />
          </div>

          {/* Supplier Email - only show if disputes exist */}
          {productsWithDisputes > 0 && onSupplierEmailChange && (
            <div>
              <Label htmlFor="supplier-email">Email du fournisseur</Label>
              <Input
                id="supplier-email"
                type="email"
                value={supplierEmail || ''}
                onChange={(e) => onSupplierEmailChange(e.target.value)}
                placeholder="email@fournisseur.fr"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Nécessaire pour envoyer l'email de litige
              </p>
            </div>
          )}

          {/* Date */}
          <div>
            <Label htmlFor="bill-date">Date de livraison</Label>
            <Input
              id="bill-date"
              type="date"
              value={billDate}
              onChange={(e) => onBillDateChange(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Total Amount */}
          <div>
            <Label htmlFor="total-amount">Montant total (€)</Label>
            <Input
              id="total-amount"
              type="number"
              step="0.01"
              value={totalAmount || ''}
              onChange={(e) => onTotalAmountChange(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Products Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Produits confirmés</span>
            <Badge variant="outline" className="text-base">
              {products.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {products.map((product, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-md bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{product.name}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {product.quantity} {product.unit}
                  {product.totalPrice && (
                    <span className="ml-2">• {product.totalPrice.toFixed(2)} €</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {(productsWithDLC > 0 || productsWithDisputes > 0) && (
            <div className="mt-3 pt-3 border-t space-y-3">
              {productsWithDLC > 0 && (
                <p className="text-sm text-green-600">
                  ✓ {productsWithDLC} produit{productsWithDLC > 1 ? 's' : ''} avec DLC enregistrée
                </p>
              )}
              {productsWithDisputes > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-orange-600">
                    ⚠ {productsWithDisputes} litige{productsWithDisputes > 1 ? 's' : ''} à traiter
                  </p>
                  {supplierEmail && (onSendDisputeEmail || onCopyDisputeEmail) && (
                    <div className="grid grid-cols-2 gap-2">
                      {onSendDisputeEmail && (
                        <Button
                          onClick={onSendDisputeEmail}
                          variant="outline"
                          size="sm"
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-300"
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Ouvrir email
                        </Button>
                      )}
                      {onCopyDisputeEmail && (
                        <Button
                          onClick={onCopyDisputeEmail}
                          variant="outline"
                          size="sm"
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-300"
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copier texte
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1"
          size="lg"
        >
          <ChevronLeft className="mr-2 h-5 w-5" />
          Retour
        </Button>
        <Button
          onClick={onConfirm}
          disabled={!supplierName}
          className="flex-1"
          size="lg"
        >
          <CheckCircle2 className="mr-2 h-5 w-5" />
          Confirmer la livraison
        </Button>
      </div>

      {!supplierName && (
        <p className="text-sm text-center text-muted-foreground">
          Le nom du fournisseur est requis
        </p>
      )}
    </div>
  );
}
