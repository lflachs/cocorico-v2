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
import { Trash2, Check, Info, Beaker, Package } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import { toast } from 'sonner';
import { CompositeProductWizard } from '../../inventory/_components/CompositeProductWizard';
import { Badge } from '@/components/ui/badge';
import { SUPPORTED_UNITS, UNIT_LABELS } from '@/lib/constants/units';

/**
 * Dish Wizard
 * Creates dishes with ingredient autocomplete and inline creation
 */

type Product = {
  id: string;
  name: string;
  unit: string;
  unitPrice?: number | null;
  isComposite?: boolean;
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
  const [sellingPrice, setSellingPrice] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // Current ingredient being added
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('KG');

  // New ingredient creation
  const [showProductTypeChoice, setShowProductTypeChoice] = useState(false);
  const [showCompositeWizard, setShowCompositeWizard] = useState(false);
  const [pendingIngredientName, setPendingIngredientName] = useState('');
  const [pendingIngredientQuantity, setPendingIngredientQuantity] = useState('');
  const [pendingIngredientUnit, setPendingIngredientUnit] = useState('KG');

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
    setSellingPrice('');
    setIngredients([]);
    setSearchQuery('');
    setSelectedProductId('');
    setQuantity('');
    setUnit('KG');
  };

  const handleAddIngredient = () => {
    if (!searchQuery || !quantity) return;

    const selectedProduct = products.find(p => p.id === selectedProductId);

    // If product exists, add it directly
    if (selectedProduct) {
      setIngredients([
        ...ingredients,
        {
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          quantityRequired: parseFloat(quantity),
          unit: selectedProduct.unit,
        },
      ]);

      // Reset ingredient form
      setSearchQuery('');
      setSelectedProductId('');
      setQuantity('');
      setUnit('KG');
    } else {
      // Product doesn't exist - show choice dialog
      setPendingIngredientName(searchQuery);
      setPendingIngredientQuantity(quantity);
      setPendingIngredientUnit(unit);
      setShowProductTypeChoice(true);
    }
  };

  const handleCreateAsBase = () => {
    // Add as new base product (inline creation)
    setIngredients([
      ...ingredients,
      {
        productId: undefined,
        productName: pendingIngredientName,
        quantityRequired: parseFloat(pendingIngredientQuantity),
        unit: pendingIngredientUnit,
      },
    ]);

    // Reset
    setShowProductTypeChoice(false);
    setSearchQuery('');
    setSelectedProductId('');
    setQuantity('');
    setUnit('KG');
  };

  const handleCreateAsComposite = () => {
    setShowProductTypeChoice(false);
    setShowCompositeWizard(true);
  };

  const handleCompositeCreated = async () => {
    // Reload products to get the newly created composite
    const { getProductsAction } = await import('@/lib/actions/product.actions');
    const result = await getProductsAction();

    if (result.success && result.data) {
      setProducts(result.data);

      // Find the composite product we just created and add it
      const newComposite = result.data.find((p: Product) => p.name === pendingIngredientName && p.isComposite);
      if (newComposite) {
        setIngredients([
          ...ingredients,
          {
            productId: newComposite.id,
            productName: newComposite.name,
            quantityRequired: parseFloat(pendingIngredientQuantity),
            unit: newComposite.unit,
          },
        ]);
      }
    }

    // Reset
    setSearchQuery('');
    setSelectedProductId('');
    setQuantity('');
    setUnit('KG');
    setPendingIngredientName('');
    setPendingIngredientQuantity('');
    setPendingIngredientUnit('KG');
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

            const { createProductWithoutRedirectAction } = await import('@/lib/actions/product.actions');
            const result = await createProductWithoutRedirectAction(formData);

            if (result.success && result.data) {
              return {
                productId: result.data.id,
                quantityRequired: ing.quantityRequired,
                unit: ing.unit,
              };
            }
            throw new Error(result.error || 'Failed to create product');
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
        sellingPrice: sellingPrice ? parseFloat(sellingPrice) : undefined,
        isActive: true,
        recipeIngredients: ingredientData,
      });

      if (!dishResult.success || !dishResult.data) {
        toast.error(dishResult.error || 'Failed to create dish');
        return;
      }

      // Add dish to menu section
      const { addDishToSectionAction } = await import('@/lib/actions/menu.actions');
      const linkResult = await addDishToSectionAction(sectionId, dishResult.data.id);

      if (linkResult.success) {
        toast.success('Dish created successfully!');
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(linkResult.error || 'Failed to add dish to menu');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error creating dish';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
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

            <div>
              <Label htmlFor="sellingPrice">{t('menu.dishWizard.sellingPrice')}</Label>
              <Input
                id="sellingPrice"
                type="number"
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder={t('menu.dishWizard.sellingPricePlaceholder')}
              />
              <p className="text-xs text-gray-500 mt-1">{t('menu.dishWizard.sellingPriceOptional')}</p>
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
                      <>
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <Check className="w-4 h-4" />
                          {t('menu.dishWizard.existingSelected')}
                        </div>
                        {products.find(p => p.id === selectedProductId)?.isComposite && (
                          <Badge variant="outline" className="mt-1 text-xs bg-purple-50 text-purple-700 border-purple-200">
                            <Beaker className="w-3 h-3 mr-1" />
                            Composite
                          </Badge>
                        )}
                      </>
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
                      {SUPPORTED_UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u} - {UNIT_LABELS[u]}
                        </SelectItem>
                      ))}
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
                {ingredients.map((ing, index) => {
                  const product = products.find(p => p.id === ing.productId);
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{ing.productName}</div>
                          {product?.isComposite && (
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                              <Beaker className="w-3 h-3 mr-1" />
                              Composite
                            </Badge>
                          )}
                          {!ing.productId && <span className="text-blue-600 text-xs">(New)</span>}
                        </div>
                        <div className="text-sm text-gray-600">
                          {ing.quantityRequired} {ing.unit}
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
                  );
                })}
              </div>
            )}
          </div>

          {/* Cost & Margin Summary */}
          {ingredients.length > 0 && (() => {
            // Calculate estimated cost
            let totalCost = 0;
            let hasAllPrices = true;

            ingredients.forEach(ing => {
              const product = products.find(p => p.id === ing.productId);
              if (product?.unitPrice) {
                totalCost += ing.quantityRequired * product.unitPrice;
              } else if (ing.productId) {
                // Has productId but no price
                hasAllPrices = false;
              }
            });

            const selling = sellingPrice ? parseFloat(sellingPrice) : null;
            const margin = hasAllPrices && selling && totalCost > 0
              ? ((selling - totalCost) / selling) * 100
              : null;

            return (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm">{t('composite.summary')}</h4>
                {hasAllPrices ? (
                  <div className="space-y-1">
                    <div className="text-sm">
                      <span className="text-gray-700">{t('menu.dishWizard.estimatedCost')}:</span>{' '}
                      <span className="font-semibold">€{totalCost.toFixed(2)}</span>
                    </div>
                    {selling && (
                      <>
                        <div className="text-sm">
                          <span className="text-gray-700">{t('menu.dishWizard.sellingPrice')}:</span>{' '}
                          <span className="font-semibold">€{selling.toFixed(2)}</span>
                        </div>
                        {margin !== null && (
                          <div className="text-sm">
                            <span className="text-gray-700">{t('menu.dishWizard.margin')}:</span>{' '}
                            <span className={`font-semibold ${margin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {margin.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-amber-700">
                    ⚠️ {t('menu.dishWizard.cannotCalculateCost')}
                  </p>
                )}
              </div>
            );
          })()}

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

      {/* Product Type Choice Dialog */}
      <Dialog open={showProductTypeChoice} onOpenChange={setShowProductTypeChoice}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('dish.productChoice.title')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {t('dish.productChoice.message')
                .replace('{name}', pendingIngredientName)}
            </p>

            <div className="space-y-3">
              <Button
                onClick={handleCreateAsBase}
                variant="outline"
                className="w-full h-auto p-4 text-left"
              >
                <div className="flex items-start gap-3 w-full">
                  <Package className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-600" />
                  <div className="flex-1">
                    <div className="font-semibold">{t('dish.productChoice.base.title')}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {t('dish.productChoice.base.description')}
                    </div>
                  </div>
                </div>
              </Button>

              <Button
                onClick={handleCreateAsComposite}
                variant="outline"
                className="w-full h-auto p-4 text-left"
              >
                <div className="flex items-start gap-3 w-full">
                  <Beaker className="w-5 h-5 mt-0.5 flex-shrink-0 text-purple-600" />
                  <div className="flex-1">
                    <div className="font-semibold">{t('dish.productChoice.composite.title')}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {t('dish.productChoice.composite.description')}
                    </div>
                  </div>
                </div>
              </Button>
            </div>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setShowProductTypeChoice(false)}
            >
              {t('composite.cancel')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Composite Product Wizard */}
      <CompositeProductWizard
        open={showCompositeWizard}
        onOpenChange={setShowCompositeWizard}
        onSuccess={handleCompositeCreated}
      />
    </>
  );
}
