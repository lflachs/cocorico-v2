'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ChevronLeft, UtensilsCrossed } from 'lucide-react';

type Dish = {
  name: string;
  quantity: number;
  price?: number;
};

type SalesSummaryConfirmProps = {
  saleDate: string;
  onSaleDateChange: (value: string) => void;
  totalAmount: number;
  onTotalAmountChange: (value: number) => void;
  dishes: Dish[];
  onConfirm: () => void;
  onBack: () => void;
};

/**
 * SalesSummaryConfirm - Final confirmation before updating stock
 *
 * Shows summary and allows editing date/total
 */
export function SalesSummaryConfirm({
  saleDate,
  onSaleDateChange,
  totalAmount,
  onTotalAmountChange,
  dishes,
  onConfirm,
  onBack,
}: SalesSummaryConfirmProps) {
  const totalDishes = dishes.reduce((sum, dish) => sum + dish.quantity, 0);
  const calculatedTotal = dishes.reduce((sum, dish) => {
    const price = typeof dish.price === 'number'
      ? dish.price
      : dish.price != null
        ? parseFloat(String(dish.price))
        : 0;
    return sum + (isNaN(price) ? 0 : price);
  }, 0);

  // Track if we've already auto-filled the total
  const hasAutoFilled = useRef(false);

  // Auto-fill total amount with calculated total from dishes on mount
  useEffect(() => {
    if (calculatedTotal > 0 && !hasAutoFilled.current) {
      onTotalAmountChange(calculatedTotal);
      hasAutoFilled.current = true;
    }
  }, [calculatedTotal, onTotalAmountChange]);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <CheckCircle2 className="h-16 w-16 mx-auto text-green-600" />
        <h2 className="text-2xl font-bold">Confirmation des ventes</h2>
        <p className="text-sm text-muted-foreground">
          Vérifiez les informations avant de mettre à jour le stock
        </p>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informations de la vente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date */}
          <div>
            <Label htmlFor="sale-date">Date de vente</Label>
            <Input
              id="sale-date"
              type="date"
              value={saleDate}
              onChange={(e) => onSaleDateChange(e.target.value)}
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
            {calculatedTotal > 0 && calculatedTotal !== totalAmount && (
              <p className="text-xs text-muted-foreground mt-1">
                Calculé depuis les plats: {calculatedTotal.toFixed(2)} €
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dishes Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Plats vendus</span>
            <Badge variant="outline" className="text-base">
              {totalDishes} plat{totalDishes > 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {dishes.map((dish, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-md bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{dish.name}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  ×{dish.quantity}
                  {dish.price != null && (
                    <span className="ml-2">
                      • {typeof dish.price === 'number'
                        ? dish.price.toFixed(2)
                        : parseFloat(String(dish.price)).toFixed(2)} €
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t">
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-sm text-green-900">
                <strong>✓ Le stock sera déduit automatiquement</strong>
                <br />
                <span className="text-xs">
                  Les ingrédients de chaque recette seront retirés du stock
                </span>
              </p>
            </div>
          </div>
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
          className="flex-1 bg-green-600 hover:bg-green-700"
          size="lg"
        >
          <CheckCircle2 className="mr-2 h-5 w-5" />
          Confirmer les ventes
        </Button>
      </div>
    </div>
  );
}
