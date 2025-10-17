'use client';

import { useState, useEffect } from 'react';
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
import { Trash2, Plus } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';

/**
 * Recipe Ingredient Editor
 * Allows editing of recipe ingredients with product selection
 */

export type RecipeIngredient = {
  productId: string;
  quantityRequired: number;
  unit: string;
};

type Product = {
  id: string;
  name: string;
  unit: string;
};

type RecipeIngredientEditorProps = {
  ingredients: RecipeIngredient[];
  onChange: (ingredients: RecipeIngredient[]) => void;
};

export function RecipeIngredientEditor({ ingredients, onChange }: RecipeIngredientEditorProps) {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { getProductsAction } = await import('@/lib/actions/product.actions');
      const result = await getProductsAction();
      if (result.success && result.data) {
        setProducts(result.data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const addIngredient = () => {
    onChange([
      ...ingredients,
      {
        productId: '',
        quantityRequired: 0,
        unit: 'KG',
      },
    ]);
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: string | number) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeIngredient = (index: number) => {
    onChange(ingredients.filter((_, i) => i !== index));
  };

  if (loading) {
    return <div className="text-gray-500">{t('today.quickSales.loading')}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>{t('menu.dishForm.recipe')}</Label>
        <Button type="button" size="sm" variant="outline" onClick={addIngredient}>
          <Plus className="w-4 h-4 mr-1" />
          {t('menu.dishForm.addIngredient')}
        </Button>
      </div>

      {ingredients.length === 0 ? (
        <div className="text-center py-6 text-gray-500 border border-dashed rounded-lg">
          {t('menu.dishForm.noIngredients')}
        </div>
      ) : (
        <div className="space-y-3">
          {ingredients.map((ingredient, index) => (
            <div key={index} className="flex gap-2 items-end p-3 border rounded-lg bg-gray-50">
              <div className="flex-1">
                <Label className="text-xs">{t('menu.ingredient.product')}</Label>
                <Select
                  value={ingredient.productId}
                  onValueChange={(value) => {
                    updateIngredient(index, 'productId', value);
                    // Auto-populate unit from product
                    const product = products.find((p) => p.id === value);
                    if (product) {
                      updateIngredient(index, 'unit', product.unit);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('menu.ingredient.selectProduct')} />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-24">
                <Label className="text-xs">{t('menu.ingredient.quantity')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={ingredient.quantityRequired}
                  onChange={(e) =>
                    updateIngredient(index, 'quantityRequired', parseFloat(e.target.value) || 0)
                  }
                />
              </div>

              <div className="w-20">
                <Label className="text-xs">{t('menu.ingredient.unit')}</Label>
                <Input value={ingredient.unit} disabled className="bg-gray-100" />
              </div>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => removeIngredient(index)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
