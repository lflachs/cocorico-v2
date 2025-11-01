'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Check, Camera, Trash2, Minus, Plus, AlertTriangle } from 'lucide-react';

type ExtractedProduct = {
  name: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  totalPrice?: number;
};

type ProductConfirmCardProps = {
  product: ExtractedProduct;
  index: number;
  total: number;
  onConfirm: (product: ExtractedProduct) => void;
  onCaptureDLC: () => void;
  onDispute: () => void;
  onRemove: () => void;
  onSkip: () => void;
};

/**
 * ProductConfirmCard - Full-screen card for confirming one product
 *
 * Big buttons, easy editing, optional DLC capture
 * Designed for touch interaction at receiving dock
 */
export function ProductConfirmCard({
  product,
  index,
  total,
  onConfirm,
  onCaptureDLC,
  onDispute,
  onRemove,
  onSkip,
}: ProductConfirmCardProps) {
  const [editedProduct, setEditedProduct] = useState(product);

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(0, editedProduct.quantity + delta);
    const newTotalPrice = editedProduct.unitPrice
      ? editedProduct.unitPrice * newQuantity
      : editedProduct.totalPrice;

    setEditedProduct({
      ...editedProduct,
      quantity: newQuantity,
      totalPrice: newTotalPrice,
    });
  };

  const handleConfirm = () => {
    onConfirm(editedProduct);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Progress indicator */}
      <div className="p-4 bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Produit {index + 1} sur {total}
          </span>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
            {Math.round(((index + 1) / total) * 100)}%
          </Badge>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Card content */}
      <Card className="flex-1 m-4 border-2 shadow-lg">
        <CardHeader className="pb-4">
          <div className="space-y-3">
            {/* Product name - editable */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Produit
              </label>
              <Input
                value={editedProduct.name}
                onChange={(e) => setEditedProduct({ ...editedProduct, name: e.target.value })}
                className="text-2xl font-bold h-14 mt-1"
                placeholder="Nom du produit"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Quantity with big +/- buttons */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Quantité
            </label>
            <div className="flex items-center gap-3 mt-2">
              <Button
                variant="outline"
                size="lg"
                className="h-16 w-16 rounded-full"
                onClick={() => handleQuantityChange(-1)}
              >
                <Minus className="h-6 w-6" />
              </Button>
              <div className="flex-1 text-center">
                <div className="text-4xl font-bold">{editedProduct.quantity}</div>
                <div className="text-sm text-muted-foreground">{editedProduct.unit}</div>
              </div>
              <Button
                variant="outline"
                size="lg"
                className="h-16 w-16 rounded-full"
                onClick={() => handleQuantityChange(1)}
              >
                <Plus className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Prices */}
          {editedProduct.unitPrice && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Prix unitaire
                </label>
                <div className="text-xl font-semibold mt-1">
                  {editedProduct.unitPrice.toFixed(2)} €
                </div>
              </div>
              {editedProduct.totalPrice && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Prix total
                  </label>
                  <div className="text-xl font-semibold mt-1">
                    {editedProduct.totalPrice.toFixed(2)} €
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-6">
          {/* Main confirm button */}
          <Button
            onClick={handleConfirm}
            size="lg"
            className="w-full h-16 text-lg font-semibold"
          >
            <Check className="mr-2 h-6 w-6" />
            Confirmer
          </Button>

          {/* Important secondary actions - DLC and Dispute */}
          <div className="grid grid-cols-2 gap-3 w-full">
            <Button
              onClick={onCaptureDLC}
              variant="outline"
              size="lg"
              className="h-16 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-300 font-semibold"
            >
              <Camera className="mr-2 h-5 w-5" />
              Ajouter DLC
            </Button>
            <Button
              onClick={onDispute}
              variant="outline"
              size="lg"
              className="h-16 text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-300 font-semibold"
            >
              <AlertTriangle className="mr-2 h-5 w-5" />
              Signaler Litige
            </Button>
          </div>

          {/* Tertiary actions */}
          <div className="flex gap-2 w-full">
            <Button
              onClick={onSkip}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              Passer
            </Button>
            <Button
              onClick={onRemove}
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Retirer
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
