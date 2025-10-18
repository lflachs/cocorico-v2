'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PageHeader } from '@/components/PageHeader';
import { useLanguage } from '@/providers/LanguageProvider';
import { Beaker, ArrowLeft, CheckCircle2, AlertCircle, Plus, Trash2, Check, Info } from 'lucide-react';
import { toast } from 'sonner';
import { IngredientAutocomplete } from '@/components/ui/ingredient-autocomplete';

/**
 * Prepared Ingredient Create Flow - Full screen creation
 * Converts composite product creation from modal to dedicated route
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

type FormData = {
  name: string;
  yieldQuantity: string;
  unit: 'KG' | 'L' | 'PC';
  category: string;
};

type FormErrors = {
  name?: string;
  yieldQuantity?: string;
};

export function PreparedIngredientCreateFlow() {
  const router = useRouter();
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [baseProducts, setBaseProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    yieldQuantity: '',
    unit: 'KG',
    category: '',
  });
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Current ingredient being added
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [ingredientQuantity, setIngredientQuantity] = useState('');
  const [ingredientUnit, setIngredientUnit] = useState('KG');

  useEffect(() => {
    loadBaseProducts();
  }, []);

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

  const validateField = (name: keyof FormData, value: any): string | undefined => {
    if (name === 'name') {
      if (!value || value.trim().length === 0) {
        return t('composite.productName') + ' is required';
      }
      if (value.trim().length < 2) {
        return 'Name must be at least 2 characters';
      }
    }
    if (name === 'yieldQuantity') {
      if (!value || value.trim().length === 0) {
        return t('composite.yieldQuantity') + ' is required';
      }
      const qty = parseFloat(value);
      if (isNaN(qty) || qty <= 0) {
        return 'Yield quantity must be a positive number';
      }
    }
    return undefined;
  };

  const handleFieldChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (touched[field]) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleFieldBlur = (field: keyof FormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleAddIngredient = () => {
    if (!searchQuery || !ingredientQuantity) {
      toast.error(t('composite.validation.selectProduct'));
      return;
    }

    const qty = parseFloat(ingredientQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Quantity must be a positive number');
      return;
    }

    const selectedProduct = baseProducts.find(p => p.id === selectedProductId);

    setIngredients([
      ...ingredients,
      {
        productId: selectedProductId || undefined,
        productName: selectedProduct?.name || searchQuery,
        quantity: qty,
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

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    const nameError = validateField('name', formData.name);
    if (nameError) {
      newErrors.name = nameError;
      isValid = false;
    }

    const yieldError = validateField('yieldQuantity', formData.yieldQuantity);
    if (yieldError) {
      newErrors.yieldQuantity = yieldError;
      isValid = false;
    }

    setErrors(newErrors);
    setTouched({ name: true, yieldQuantity: true });
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors before continuing');
      return;
    }

    if (ingredients.length === 0) {
      toast.error('Please add at least one ingredient');
      return;
    }

    setSaving(true);
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
                baseProductId: result.data.id,
                quantity: ing.quantity,
                unit: ing.unit,
              };
            }
            throw new Error(result.error || 'Failed to create product');
          }
          return {
            baseProductId: ing.productId,
            quantity: ing.quantity,
            unit: ing.unit,
          };
        })
      );

      // Create the composite product
      const response = await fetch('/api/composite-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          yieldQuantity: parseFloat(formData.yieldQuantity),
          unit: formData.unit,
          category: formData.category || undefined,
          trackable: true,
          ingredients: ingredientData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('composite.error'));
      }

      toast.success(t('composite.success'));
      router.push('/menu');
    } catch (error) {
      console.error('Error creating composite product:', error);
      const errorMessage = error instanceof Error ? error.message : t('composite.error');
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/menu');
  };

  const isFormValid = !errors.name && !errors.yieldQuantity &&
                      formData.name.trim().length > 0 &&
                      formData.yieldQuantity.trim().length > 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <PageHeader
        title={t('composite.title')}
        subtitle={t('prepared.subtitle')}
        icon={Beaker}
      />

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic Info Card */}
          <Card>
            <CardContent className="p-8">
              <h3 className="text-lg font-semibold mb-6">{t('menu.dishWizard.basicInfo')}</h3>
              <div className="space-y-6">
                {/* Product Name */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="name" className="text-base font-semibold">
                      {t('composite.productName')} <span className="text-destructive">*</span>
                    </Label>
                    {touched.name && !errors.name && formData.name && (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    )}
                  </div>
                  <Input
                    id="name"
                    type="text"
                    placeholder={t('composite.productNamePlaceholder')}
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    onBlur={() => handleFieldBlur('name')}
                    className={`text-base cursor-text ${
                      errors.name && touched.name
                        ? 'border-destructive focus-visible:ring-destructive'
                        : touched.name && formData.name
                        ? 'border-success focus-visible:ring-success'
                        : ''
                    }`}
                    disabled={saving}
                  />
                  {errors.name && touched.name && (
                    <div className="flex items-start gap-2 text-sm text-destructive">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{errors.name}</span>
                    </div>
                  )}
                </div>

                {/* Yield Quantity and Unit */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="yieldQuantity" className="text-base font-semibold">
                        {t('composite.yieldQuantity')} <span className="text-destructive">*</span>
                      </Label>
                      {touched.yieldQuantity && !errors.yieldQuantity && formData.yieldQuantity && (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      )}
                    </div>
                    <Input
                      id="yieldQuantity"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 1.5"
                      value={formData.yieldQuantity}
                      onChange={(e) => handleFieldChange('yieldQuantity', e.target.value)}
                      onBlur={() => handleFieldBlur('yieldQuantity')}
                      className={`text-base cursor-text ${
                        errors.yieldQuantity && touched.yieldQuantity
                          ? 'border-destructive focus-visible:ring-destructive'
                          : touched.yieldQuantity && formData.yieldQuantity
                          ? 'border-success focus-visible:ring-success'
                          : ''
                      }`}
                      disabled={saving}
                    />
                    {errors.yieldQuantity && touched.yieldQuantity ? (
                      <div className="flex items-start gap-2 text-sm text-destructive">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{errors.yieldQuantity}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t('composite.yieldQuantityHint')}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="unit" className="text-base font-semibold">
                      {t('composite.unit')} <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.unit}
                      onValueChange={(value: 'KG' | 'L' | 'PC') => handleFieldChange('unit', value)}
                      disabled={saving}
                    >
                      <SelectTrigger className="text-base cursor-pointer">
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

                {/* Category */}
                <div className="space-y-3">
                  <Label htmlFor="category" className="text-base font-semibold">
                    {t('composite.category')} <span className="text-muted-foreground text-sm">({t('menu.create.optional')})</span>
                  </Label>
                  <Input
                    id="category"
                    placeholder={t('composite.categoryPlaceholder')}
                    value={formData.category}
                    onChange={(e) => handleFieldChange('category', e.target.value)}
                    className="text-base cursor-text"
                    disabled={saving}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ingredients Card */}
          <Card>
            <CardContent className="p-8">
              <h3 className="text-lg font-semibold mb-6">
                {t('composite.recipeIngredients')} <span className="text-destructive">*</span>
              </h3>

              {/* Add Ingredient Form */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30 mb-6">
                <div className="space-y-3">
                  <Label htmlFor="search" className="text-sm font-medium">
                    {t('composite.searchIngredient')}
                  </Label>
                  <IngredientAutocomplete
                    value={searchQuery}
                    onChange={(value) => {
                      setSearchQuery(value);
                      // Auto-select if exact match
                      const match = baseProducts.find(p =>
                        p.name.toLowerCase() === value.toLowerCase()
                      );
                      if (match) {
                        setSelectedProductId(match.id);
                        setIngredientUnit(match.unit);
                      } else {
                        setSelectedProductId('');
                      }
                    }}
                    placeholder="Tapez pour rechercher... (ex: Tomate, Oignon, Poulet)"
                    disabled={saving}
                    existingProducts={baseProducts}
                  />

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

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-3">
                    <Label htmlFor="ingredientQuantity" className="text-sm font-medium">
                      {t('composite.quantity')}
                    </Label>
                    <Input
                      id="ingredientQuantity"
                      type="number"
                      step="0.01"
                      placeholder={t('composite.quantityPlaceholder')}
                      value={ingredientQuantity}
                      onChange={(e) => setIngredientQuantity(e.target.value)}
                      className="cursor-text"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="ingredientUnit" className="text-sm font-medium">
                      {t('composite.unit')}
                    </Label>
                    <Select
                      value={ingredientUnit}
                      onValueChange={setIngredientUnit}
                      disabled={!!selectedProductId}
                    >
                      <SelectTrigger className="cursor-pointer">
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
                  onClick={handleAddIngredient}
                  variant="outline"
                  className="w-full cursor-pointer"
                  disabled={!searchQuery || !ingredientQuantity}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('composite.addIngredient')}
                </Button>
              </div>

              {/* Ingredients List */}
              {ingredients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{t('composite.noIngredients')}</p>
                  <p className="text-sm mt-1">Add at least one ingredient to continue</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ingredients.map((ing, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                      <div className="flex-1">
                        <div className="font-medium">{ing.productName}</div>
                        <div className="text-sm text-muted-foreground">
                          {ing.quantity} {ing.unit}
                          {!ing.productId && <span className="text-blue-600 ml-2">(New)</span>}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveIngredient(index)}
                        className="cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              {ingredients.length > 0 && formData.yieldQuantity && (
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-2">{t('composite.summary')}</h4>
                  <p className="text-sm text-gray-700">
                    {t('composite.summaryText')
                      .replace('{count}', ingredients.length.toString())
                      .replace('{yield}', formData.yieldQuantity)
                      .replace('{unit}', formData.unit)
                      .replace('{name}', formData.name || 'product')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-4 mt-8">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={saving}
            className="gap-2 cursor-pointer hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('composite.cancel')}
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    type="submit"
                    disabled={!isFormValid || ingredients.length === 0 || saving}
                    className="gap-2 cursor-pointer bg-gradient-to-br from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t('composite.creating')}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        {t('composite.create')}
                      </>
                    )}
                  </Button>
                </span>
              </TooltipTrigger>
              {(!isFormValid || ingredients.length === 0) && !saving && (
                <TooltipContent>
                  <p>
                    {!isFormValid
                      ? 'Please fill in all required fields'
                      : 'Please add at least one ingredient'}
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </form>
    </div>
  );
}
