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

/**
 * Dish Wizard
 * Creates dishes with ingredient autocomplete and inline creation
 */

type Product = {
  id: string;
  name: string;
  unit: string;
};

type Ingredient = {
  productId?: string; // undefined means creating new
  productName: string;
  quantityRequired: number;
  unit: string;
};

type DishWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: string;
  onSuccess: () => void;
};

export function DishWizard({ open, onOpenChange, sectionId, onSuccess }: DishWizardProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [dishName, setDishName] = useState('');
  const [dishDescription, setDishDescription] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // Current ingredient being added
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('KG');

  useEffect(() => {
    if (open) {
      loadProducts();
      resetForm();
    }
  }, [open]);

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

  const resetForm = () => {
    setDishName('');
    setDishDescription('');
    setIngredients([]);
    setSearchQuery('');
    setSelectedProductId('');
    setQuantity('');
    setUnit('KG');
  };

  const handleAddIngredient = () => {
    if (!searchQuery || !quantity) return;

    const selectedProduct = products.find(p => p.id === selectedProductId);

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
            formData.append('quantity', '0'); // New ingredients start with 0 stock
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

      // Create the dish
      const { createDishAction } = await import('@/lib/actions/dish.actions');
      const dishResult = await createDishAction({
        name: dishName,
        description: dishDescription || undefined,
        isActive: true,
        recipeIngredients: ingredientData,
      });

      if (!dishResult.success || !dishResult.data) {
        throw new Error('Failed to create dish');
      }

      // Add dish to menu section
      const { addDishToSectionAction } = await import('@/lib/actions/menu.actions');
      const linkResult = await addDishToSectionAction(sectionId, dishResult.data.id);

      if (linkResult.success) {
        toast.success('Dish created successfully!');
        onSuccess();
      } else {
        toast.error(linkResult.error || 'Failed to add dish to menu');
      }
    } catch (error) {
      console.error('Error creating dish:', error);
      toast.error('Error creating dish');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isExistingProduct = filteredProducts.some(p =>
    p.name.toLowerCase() === searchQuery.toLowerCase()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('menu.dishWizard.title')}</DialogTitle>
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

            {/* Add Ingredient Form */}
            <div className="border rounded-lg p-4 space-y-3">
              <div>
                <Label htmlFor="search">{t('menu.dishWizard.searchIngredient')}</Label>
                <Input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    // Auto-select if exact match
                    const match = filteredProducts.find(p =>
                      p.name.toLowerCase() === e.target.value.toLowerCase()
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
                  {filteredProducts.map(p => (
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

            {/* Ingredients List */}
            {ingredients.length === 0 ? (
              <p className="text-center py-4 text-gray-500">
                {t('menu.dishWizard.noIngredients')}
              </p>
            ) : (
              <div className="space-y-2">
                {ingredients.map((ing, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{ing.productName}</div>
                      <div className="text-sm text-gray-600">
                        {ing.quantityRequired} {ing.unit}
                        {!ing.productId && <span className="text-blue-600 ml-2">(New)</span>}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveIngredient(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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
              {loading ? t('menu.dishWizard.creating') : t('menu.dishWizard.create')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
