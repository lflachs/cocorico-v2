'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Check, Info } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import { toast } from 'sonner';
import { SUPPORTED_UNITS, UNIT_LABELS } from '@/lib/constants/units';

/**
 * Dish Edit Modal
 * Edit existing dishes and their ingredients
 */

type Product = {
  id: string;
  name: string;
  unit: string;
};

type RecipeIngredient = {
  id?: string; // existing ingredient has id
  productId?: string; // undefined means creating new
  productName: string;
  quantityRequired: number;
  unit: string;
};

type Dish = {
  id: string;
  name: string;
  description?: string | null;
  recipeIngredients?: {
    id: string;
    productId: string;
    quantityRequired: number;
    unit: string;
    product: {
      id: string;
      name: string;
      unit: string;
    };
  }[];
};

type DishEditModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dish: Dish;
  onSuccess: () => void;
};

export function DishEditModal({ open, onOpenChange, dish, onSuccess }: DishEditModalProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [dishName, setDishName] = useState('');
  const [dishDescription, setDishDescription] = useState('');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);

  // Current ingredient being added
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('KG');

  useEffect(() => {
    if (open) {
      loadProducts();
      // Load dish data
      setDishName(dish.name);
      setDishDescription(dish.description || '');
      setIngredients(
        dish.recipeIngredients?.map((ing) => ({
          id: ing.id,
          productId: ing.productId,
          productName: ing.product.name,
          quantityRequired: ing.quantityRequired,
          unit: ing.unit,
        })) || []
      );
    }
  }, [open, dish]);

  const loadProducts = async () => {
    try {
      const { getProductsAction } = await import('@/lib/actions/product.actions');
      const result = await getProductsAction();
      if (result.success && result.data) {
        setProducts(result.data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleAddIngredient = () => {
    if (!searchQuery || !quantity) return;

    const selectedProduct = products.find((p) => p.id === selectedProductId);

    setIngredients([
      ...ingredients,
      {
        productId: selectedProductId || undefined,
        productName: selectedProduct?.name || searchQuery,
        quantityRequired: parseFloat(quantity),
        unit: selectedProduct?.unit || unit,
      },
    ]);

    // Reset ingredient form
    setSearchQuery('');
    setSelectedProductId('');
    setQuantity('');
    setUnit('KG');
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleUpdateQuantity = (index: number, newQuantity: number) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], quantityRequired: newQuantity };
    setIngredients(updated);
  };

  const handleSubmit = async () => {
    if (!dishName || ingredients.length === 0) {
      toast.error('Please add dish name and at least one ingredient');
      return;
    }

    setLoading(true);
    try {
      // First, create any new products (ingredients)
      const ingredientData = await Promise.all(
        ingredients.map(async (ing) => {
          if (!ing.productId) {
            // Create new product
            const formData = new FormData();
            formData.append('name', ing.productName);
            formData.append('quantity', '0');
            formData.append('unit', ing.unit);
            formData.append('trackable', 'true');

            const { createProductAction } = await import('@/lib/actions/product.actions');
            const result = await createProductAction(formData);

            if (result.success && result.data) {
              return {
                productId: result.data.id,
                quantityRequired: ing.quantityRequired,
                unit: ing.unit,
              };
            }
            throw new Error('Failed to create product');
          }
          return {
            productId: ing.productId,
            quantityRequired: ing.quantityRequired,
            unit: ing.unit,
          };
        })
      );

      // Update the dish
      const { updateDishAction } = await import('@/lib/actions/dish.actions');
      const dishResult = await updateDishAction(dish.id, {
        name: dishName,
        description: dishDescription || undefined,
        recipeIngredients: ingredientData,
      });

      if (dishResult.success) {
        toast.success(t('menu.update.success'));
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(dishResult.error || t('menu.update.error'));
      }
    } catch (error) {
      console.error('Error updating dish:', error);
      toast.error(t('menu.update.error'));
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Dish: {dish.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="dishName">{t('menu.dishWizard.name')}</Label>
              <Input
                id="dishName"
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
                placeholder={t('menu.dishWizard.namePlaceholder')}
              />
            </div>

            <div>
              <Label htmlFor="dishDescription">{t('menu.dishWizard.description')}</Label>
              <Textarea
                id="dishDescription"
                value={dishDescription}
                onChange={(e) => setDishDescription(e.target.value)}
                placeholder={t('menu.dishWizard.descriptionPlaceholder')}
                rows={2}
              />
            </div>
          </div>

          {/* Ingredients */}
          <div className="space-y-4">
            <Label>{t('menu.dishWizard.ingredients')}</Label>

            {/* Existing Ingredients */}
            {ingredients.length > 0 && (
              <div className="space-y-2">
                {ingredients.map((ing, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{ing.productName}</div>
                      <div className="text-sm text-gray-600">
                        {ing.unit}
                        {!ing.productId && <span className="text-blue-600 ml-2">(New)</span>}
                      </div>
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        step="0.01"
                        value={ing.quantityRequired}
                        onChange={(e) =>
                          handleUpdateQuantity(index, parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveIngredient(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Ingredient Form */}
            <div className="border rounded-lg p-4 space-y-3">
              <div>
                <Label htmlFor="search">{t('menu.dishWizard.searchIngredient')}</Label>
                <Input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    const match = filteredProducts.find(
                      (p) => p.name.toLowerCase() === e.target.value.toLowerCase()
                    );
                    if (match) {
                      setSelectedProductId(match.id);
                      setUnit(match.unit);
                    } else {
                      setSelectedProductId('');
                    }
                  }}
                  placeholder="Type to search..."
                  list="products-list"
                />
                <datalist id="products-list">
                  {filteredProducts.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>

                {searchQuery && (
                  <div className="mt-2">
                    {selectedProductId ? (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <Check className="w-4 h-4" />
                        {t('menu.dishWizard.existingSelected')}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <Info className="w-4 h-4" />
                        {t('menu.dishWizard.willCreateNew')}: &quot;{searchQuery}&quot;
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="quantity">{t('menu.dishWizard.quantity')}</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="unit">{t('menu.dishWizard.unit')}</Label>
                  <Select value={unit} onValueChange={setUnit} disabled={!!selectedProductId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KG">KG</SelectItem>
                      <SelectItem value="L">L</SelectItem>
                      <SelectItem value="PC">PC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={handleAddIngredient}
                disabled={!searchQuery || !quantity}
              >
                {t('menu.dishWizard.addIngredient')}
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t('menu.dishWizard.cancel')}
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={loading || !dishName || ingredients.length === 0}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
