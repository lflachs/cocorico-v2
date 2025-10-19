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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Check, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/providers/LanguageProvider';

/**
 * Composite Product Wizard
 * Creates composite products with ingredient autocomplete
 */

type Product = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
};

type Ingredient = {
  productId?: string; // undefined means creating new
  productName: string;
  quantity: number;
  unit: string;
};

type CompositeProductWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function CompositeProductWizard({ open, onOpenChange, onSuccess }: CompositeProductWizardProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [baseProducts, setBaseProducts] = useState<Product[]>([]);
  const [productName, setProductName] = useState('');
  const [yieldQuantity, setYieldQuantity] = useState('');
  const [unit, setUnit] = useState<'KG' | 'L' | 'PC'>('KG');
  const [category, setCategory] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // Current ingredient being added
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [ingredientQuantity, setIngredientQuantity] = useState('');
  const [ingredientUnit, setIngredientUnit] = useState('KG');

  useEffect(() => {
    if (open) {
      loadBaseProducts();
      resetForm();
    }
  }, [open]);

  const loadBaseProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const products = await response.json();
        // Filter to only show non-composite products
        setBaseProducts(products.filter((p: Product) => !p.isComposite));
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error(t('prepared.delete.error'));
    }
  };

  const resetForm = () => {
    setProductName('');
    setYieldQuantity('');
    setUnit('KG');
    setCategory('');
    setIngredients([]);
    setSearchQuery('');
    setSelectedProductId('');
    setIngredientQuantity('');
    setIngredientUnit('KG');
  };

  const handleAddIngredient = () => {
    if (!searchQuery || !ingredientQuantity) {
      toast.error(t('composite.validation.selectProduct'));
      return;
    }

    const selectedProduct = baseProducts.find(p => p.id === selectedProductId);

    setIngredients([
      ...ingredients,
      {
        productId: selectedProductId || undefined,
        productName: selectedProduct?.name || searchQuery,
        quantity: parseFloat(ingredientQuantity),
        unit: selectedProduct?.unit || ingredientUnit,
      },
    ]);

    // Reset ingredient form
    setSearchQuery('');
    setSelectedProductId('');
    setIngredientQuantity('');
    setIngredientUnit('KG');
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!productName || !yieldQuantity || ingredients.length === 0) {
      toast.error(t('composite.validation.fillFields'));
      return;
    }

    setLoading(true);
    try {
      // First, create any new products (ingredients)
      console.log('Creating ingredients...', ingredients);
      const ingredientData = await Promise.all(
        ingredients.map(async (ing) => {
          if (!ing.productId) {
            // Create new product
            console.log('Creating new product:', ing.productName);
            const formData = new FormData();
            formData.append('name', ing.productName);
            formData.append('quantity', '0'); // New ingredients start with 0 stock
            formData.append('unit', ing.unit);
            formData.append('trackable', 'true');

            const { createProductWithoutRedirectAction } = await import('@/lib/actions/product.actions');
            const result = await createProductWithoutRedirectAction(formData);

            if (result.success && result.data) {
              console.log('Product created successfully:', result.data.id);
              return {
                baseProductId: result.data.id,
                quantity: ing.quantity,
                unit: ing.unit,
              };
            }
            console.error('Failed to create product:', result.error);
            throw new Error(result.error || 'Failed to create product');
          }
          console.log('Using existing product:', ing.productId);
          return {
            baseProductId: ing.productId,
            quantity: ing.quantity,
            unit: ing.unit,
          };
        })
      );
      console.log('All ingredients processed:', ingredientData);

      // Create the composite product
      const response = await fetch('/api/composite-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: productName,
          yieldQuantity: parseFloat(yieldQuantity),
          unit,
          category: category || undefined,
          trackable: true,
          ingredients: ingredientData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('composite.error'));
      }

      const compositeProduct = await response.json();
      console.log('Composite product created:', compositeProduct);

      toast.success(t('composite.success'));
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating composite product:', error);
      const errorMessage = error instanceof Error ? error.message : t('composite.error');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = baseProducts.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isExistingProduct = filteredProducts.some(p =>
    p.name.toLowerCase() === searchQuery.toLowerCase()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('composite.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="productName">{t('composite.productName')} *</Label>
              <Input
                id="productName"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder={t('composite.productNamePlaceholder')}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="yieldQuantity">{t('composite.yieldQuantity')} *</Label>
                <Input
                  id="yieldQuantity"
                  type="number"
                  step="0.01"
                  value={yieldQuantity}
                  onChange={(e) => setYieldQuantity(e.target.value)}
                  placeholder="e.g., 1.5"
                />
                <p className="text-xs text-gray-500 mt-1">{t('composite.yieldQuantityHint')}</p>
              </div>

              <div>
                <Label htmlFor="unit">{t('composite.unit')} *</Label>
                <Select value={unit} onValueChange={(value: 'KG' | 'L' | 'PC') => setUnit(value)}>
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

            <div>
              <Label htmlFor="category">{t('composite.category')}</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={t('composite.categoryPlaceholder')}
              />
            </div>
          </div>

          {/* Ingredients */}
          <div className="space-y-4">
            <Label>{t('composite.recipeIngredients')} *</Label>

            {/* Add Ingredient Form */}
            <div className="border rounded-lg p-4 space-y-3">
              <div>
                <Label htmlFor="search">{t('composite.searchIngredient')}</Label>
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
                      setIngredientUnit(match.unit);
                    } else {
                      setSelectedProductId('');
                    }
                  }}
                  placeholder={t('composite.searchPlaceholder')}
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
                  <Label htmlFor="ingredientQuantity">{t('composite.quantity')}</Label>
                  <Input
                    id="ingredientQuantity"
                    type="number"
                    step="0.01"
                    value={ingredientQuantity}
                    onChange={(e) => setIngredientQuantity(e.target.value)}
                    placeholder={t('composite.quantityPlaceholder')}
                  />
                </div>
                <div>
                  <Label htmlFor="ingredientUnit">{t('composite.unit')}</Label>
                  <Select value={ingredientUnit} onValueChange={setIngredientUnit} disabled={!!selectedProductId}>
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
                disabled={!searchQuery || !ingredientQuantity}
              >
                {t('composite.addIngredient')}
              </Button>
            </div>

            {/* Ingredients List */}
            {ingredients.length === 0 ? (
              <p className="text-center py-4 text-gray-500">
                {t('composite.noIngredients')}
              </p>
            ) : (
              <div className="space-y-2">
                {ingredients.map((ing, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{ing.productName}</div>
                      <div className="text-sm text-gray-600">
                        {ing.quantity} {ing.unit}
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

          {/* Summary */}
          {ingredients.length > 0 && yieldQuantity && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-2">{t('composite.summary')}</h4>
              <p className="text-sm text-gray-700">
                {t('composite.summaryText')
                  .replace('{count}', ingredients.length.toString())
                  .replace('{yield}', yieldQuantity)
                  .replace('{unit}', unit)
                  .replace('{name}', productName || 'product')}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t('composite.cancel')}
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={loading || !productName || !yieldQuantity || ingredients.length === 0}
            >
              {loading ? t('composite.creating') : t('composite.create')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
