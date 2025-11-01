'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Plus, Minus } from 'lucide-react';
import { useState } from 'react';

type OrderSuggestion = {
  productId: string;
  productName: string;
  currentStock: number;
  parLevel: number;
  unit: string;
  suggestedQuantity: number;
  supplierName?: string;
  lastPrice?: number;
};

type OrderSuggestionCardProps = {
  suggestion: OrderSuggestion;
  onAddToOrder: (productId: string, quantity: number) => void;
  isAdded: boolean;
};

/**
 * OrderSuggestionCard - Card showing a product that needs reordering
 *
 * Displays current stock, par level, and suggested order quantity
 * Allows user to adjust quantity before adding to order
 */
export function OrderSuggestionCard({
  suggestion,
  onAddToOrder,
  isAdded,
}: OrderSuggestionCardProps) {
  const [orderQuantity, setOrderQuantity] = useState(suggestion.suggestedQuantity);

  const stockPercentage = (suggestion.currentStock / suggestion.parLevel) * 100;
  const urgency =
    stockPercentage <= 25 ? 'critical' : stockPercentage <= 50 ? 'warning' : 'low';

  const getUrgencyBadge = () => {
    switch (urgency) {
      case 'critical':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
            <AlertCircle className="h-3 w-3 mr-1" />
            Critique
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
            Bas
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            À surveiller
          </Badge>
        );
    }
  };

  const handleQuantityChange = (delta: number) => {
    setOrderQuantity(Math.max(0, orderQuantity + delta));
  };

  const handleAddToOrder = () => {
    onAddToOrder(suggestion.productId, orderQuantity);
  };

  const estimatedCost = suggestion.lastPrice ? suggestion.lastPrice * orderQuantity : null;

  return (
    <Card className={`transition-all ${isAdded ? 'opacity-50 bg-green-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold truncate">
              {suggestion.productName}
            </CardTitle>
            {suggestion.supplierName && (
              <p className="text-xs text-muted-foreground mt-1">
                Fournisseur: {suggestion.supplierName}
              </p>
            )}
          </div>
          {getUrgencyBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stock Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Stock actuel</p>
            <p className="font-semibold">
              {suggestion.currentStock} {suggestion.unit}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Niveau de stock</p>
            <p className="font-semibold">
              {suggestion.parLevel} {suggestion.unit}
            </p>
          </div>
        </div>

        {/* Stock Progress Bar */}
        <div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                urgency === 'critical'
                  ? 'bg-red-600'
                  : urgency === 'warning'
                  ? 'bg-orange-600'
                  : 'bg-yellow-600'
              }`}
              style={{ width: `${Math.min(stockPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Order Quantity Adjustment */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Quantité à commander
          </label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 rounded-full p-0"
              onClick={() => handleQuantityChange(-1)}
              disabled={isAdded}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              value={orderQuantity}
              onChange={(e) => setOrderQuantity(Math.max(0, parseFloat(e.target.value) || 0))}
              className="text-center h-9 font-semibold"
              disabled={isAdded}
            />
            <span className="text-sm text-muted-foreground min-w-[30px]">
              {suggestion.unit}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 rounded-full p-0"
              onClick={() => handleQuantityChange(1)}
              disabled={isAdded}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {estimatedCost && (
            <p className="text-xs text-muted-foreground">
              Coût estimé: {estimatedCost.toFixed(2)} €
            </p>
          )}
        </div>

        {/* Add to Order Button */}
        {!isAdded ? (
          <Button onClick={handleAddToOrder} className="w-full" disabled={orderQuantity === 0}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter à la commande
          </Button>
        ) : (
          <div className="text-center text-sm text-green-700 font-medium py-2">
            ✓ Ajouté à la commande
          </div>
        )}
      </CardContent>
    </Card>
  );
}
