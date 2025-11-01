'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Check, Minus, Plus, Trash2, UtensilsCrossed } from 'lucide-react';

type ExtractedDish = {
  name: string;
  quantity: number;
  price?: number;
};

type DishConfirmCardProps = {
  dish: ExtractedDish;
  index: number;
  total: number;
  onConfirm: (dish: ExtractedDish) => void;
  onRemove: () => void;
  onSkip: () => void;
};

/**
 * DishConfirmCard - Full-screen card for confirming one dish from receipt
 *
 * Big buttons, easy editing, shows dish info
 * Designed for touch interaction similar to reception flow
 */
export function DishConfirmCard({
  dish,
  index,
  total,
  onConfirm,
  onRemove,
  onSkip,
}: DishConfirmCardProps) {
  const [editedDish, setEditedDish] = useState(dish);

  // Update editedDish when dish prop changes (navigating between dishes)
  useEffect(() => {
    setEditedDish(dish);
  }, [dish]);

  const handleQuantityChange = (delta: number) => {
    setEditedDish({
      ...editedDish,
      quantity: Math.max(1, editedDish.quantity + delta),
    });
  };

  const handleConfirm = () => {
    onConfirm(editedDish);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Progress indicator */}
      <div className="p-4 bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Plat {index + 1} sur {total}
          </span>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            {Math.round(((index + 1) / total) * 100)}%
          </Badge>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Card content */}
      <Card className="flex-1 m-4 border-2 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 mb-3">
            <UtensilsCrossed className="h-8 w-8 text-primary" />
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Plat vendu
            </span>
          </div>
          <div className="space-y-3">
            {/* Dish name - editable */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Nom du plat
              </label>
              <Input
                value={editedDish.name}
                onChange={(e) => setEditedDish({ ...editedDish, name: e.target.value })}
                className="text-2xl font-bold h-14 mt-1"
                placeholder="Nom du plat"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Quantity with big +/- buttons */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Quantité vendue
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
                <div className="text-4xl font-bold">{editedDish.quantity}</div>
                <div className="text-sm text-muted-foreground">vendu{editedDish.quantity > 1 ? 's' : ''}</div>
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

          {/* Price if available */}
          {editedDish.price != null && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Prix total
              </label>
              <div className="text-xl font-semibold mt-1">
                {typeof editedDish.price === 'number'
                  ? editedDish.price.toFixed(2)
                  : parseFloat(String(editedDish.price)).toFixed(2)} €
              </div>
            </div>
          )}

          {/* Info message */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-xs text-blue-900">
              <strong>💡 Info:</strong> Le stock sera automatiquement déduit selon la recette de ce plat.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-6">
          {/* Main confirm button */}
          <Button
            onClick={handleConfirm}
            size="lg"
            className="w-full h-16 text-lg font-semibold bg-green-600 hover:bg-green-700"
          >
            <Check className="mr-2 h-6 w-6" />
            Confirmer
          </Button>

          {/* Secondary actions */}
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
