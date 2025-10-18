'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PageHeader } from '@/components/PageHeader';
import { useLanguage } from '@/providers/LanguageProvider';
import { ChefHat, ArrowLeft, CheckCircle2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { IngredientAutocomplete } from '@/components/ui/ingredient-autocomplete';

/**
 * Dish Create Flow - Full screen, user-friendly dish creation
 * Step-by-step process with clear guidance and validation feedback
 */

type FormData = {
  name: string;
  description: string;
  sellingPrice: string;
  isActive: boolean;
};

type Ingredient = {
  productName: string;
  quantity: string;
  unit: string;
};

type FormErrors = {
  name?: string;
  sellingPrice?: string;
};

export function DishCreateFlow() {
  const router = useRouter();
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    sellingPrice: '',
    isActive: true,
  });
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [currentIngredient, setCurrentIngredient] = useState<Ingredient>({
    productName: '',
    quantity: '',
    unit: 'KG',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (name: keyof FormData, value: any): string | undefined => {
    if (name === 'name') {
      if (!value || value.trim().length === 0) {
        return t('menu.dishWizard.name') + ' is required';
      }
      if (value.trim().length < 2) {
        return 'Name must be at least 2 characters';
      }
    }
    if (name === 'sellingPrice' && value) {
      const price = parseFloat(value);
      if (isNaN(price) || price < 0) {
        return 'Price must be a valid positive number';
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
    if (!currentIngredient.productName || !currentIngredient.quantity) {
      toast.error('Please enter ingredient name and quantity');
      return;
    }

    const qty = parseFloat(currentIngredient.quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Quantity must be a positive number');
      return;
    }

    setIngredients([...ingredients, currentIngredient]);
    setCurrentIngredient({ productName: '', quantity: '', unit: 'KG' });
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

    const priceError = validateField('sellingPrice', formData.sellingPrice);
    if (priceError) {
      newErrors.sellingPrice = priceError;
      isValid = false;
    }

    setErrors(newErrors);
    setTouched({ name: true, sellingPrice: true });
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
      // Create ingredients/products and the dish
      const ingredientData = await Promise.all(
        ingredients.map(async (ing) => {
          // Create new product for this ingredient
          const formData = new FormData();
          formData.append('name', ing.productName);
          formData.append('quantity', '0');
          formData.append('unit', ing.unit);
          formData.append('trackable', 'true');

          const { createProductWithoutRedirectAction } = await import('@/lib/actions/product.actions');
          const result = await createProductWithoutRedirectAction(formData);

          if (result.success && result.data) {
            return {
              productId: result.data.id,
              quantityRequired: parseFloat(ing.quantity),
              unit: ing.unit,
            };
          }
          throw new Error(result.error || 'Failed to create ingredient');
        })
      );

      // Create the dish
      const { createDishAction } = await import('@/lib/actions/dish.actions');
      const dishResult = await createDishAction({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        sellingPrice: formData.sellingPrice ? parseFloat(formData.sellingPrice) : undefined,
        isActive: formData.isActive,
        recipeIngredients: ingredientData,
      });

      if (dishResult.success) {
        toast.success(t('menu.update.success'));
        router.push('/menu');
      } else {
        toast.error(dishResult.error || t('menu.update.error'));
      }
    } catch (error) {
      console.error('Error creating dish:', error);
      toast.error(error instanceof Error ? error.message : t('menu.update.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/menu');
  };

  const isFormValid = !errors.name && !errors.sellingPrice && formData.name.trim().length > 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <PageHeader
        title={t('menu.dishWizard.title')}
        subtitle={t('menu.create.subtitle').replace('menu', 'dish')}
        icon={ChefHat}
      />

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic Info Card */}
          <Card>
            <CardContent className="p-8">
              <h3 className="text-lg font-semibold mb-6">{t('menu.dishWizard.basicInfo')}</h3>
              <div className="space-y-6">
                {/* Dish Name */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="name" className="text-base font-semibold">
                      {t('menu.dishWizard.name')} <span className="text-destructive">*</span>
                    </Label>
                    {touched.name && !errors.name && formData.name && (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    )}
                  </div>
                  <Input
                    id="name"
                    type="text"
                    placeholder={t('menu.dishWizard.namePlaceholder')}
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

                {/* Description */}
                <div className="space-y-3">
                  <Label htmlFor="description" className="text-base font-semibold">
                    {t('menu.dishWizard.description')} <span className="text-muted-foreground text-sm">({t('menu.create.optional')})</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder={t('menu.dishWizard.descriptionPlaceholder')}
                    value={formData.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    rows={3}
                    className="text-base resize-none cursor-text"
                    disabled={saving}
                  />
                </div>

                {/* Selling Price */}
                <div className="space-y-3">
                  <Label htmlFor="sellingPrice" className="text-base font-semibold">
                    {t('menu.dishWizard.sellingPrice')} <span className="text-muted-foreground text-sm">({t('menu.create.optional')})</span>
                  </Label>
                  <Input
                    id="sellingPrice"
                    type="number"
                    step="0.01"
                    placeholder={t('menu.dishWizard.sellingPricePlaceholder')}
                    value={formData.sellingPrice}
                    onChange={(e) => handleFieldChange('sellingPrice', e.target.value)}
                    onBlur={() => handleFieldBlur('sellingPrice')}
                    className={`text-base cursor-text ${
                      errors.sellingPrice && touched.sellingPrice
                        ? 'border-destructive focus-visible:ring-destructive'
                        : ''
                    }`}
                    disabled={saving}
                  />
                  {errors.sellingPrice && touched.sellingPrice ? (
                    <div className="flex items-start gap-2 text-sm text-destructive">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{errors.sellingPrice}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t('menu.dishWizard.sellingPriceOptional')}
                    </p>
                  )}
                </div>

                {/* Active Status */}
                <div className="space-y-3">
                  <Label htmlFor="isActive" className="text-base font-semibold">
                    {t('menu.create.statusTitle')}
                  </Label>
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div className="space-y-0.5">
                      <div className="font-medium">Active</div>
                      <p className="text-sm text-muted-foreground">
                        Dish is available for sale
                      </p>
                    </div>
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => handleFieldChange('isActive', checked)}
                      disabled={saving}
                      className="cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ingredients Card */}
          <Card>
            <CardContent className="p-8">
              <h3 className="text-lg font-semibold mb-6">
                {t('menu.dishWizard.ingredients')} <span className="text-destructive">*</span>
              </h3>

              {/* Add Ingredient Form */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30 mb-6">
                <div className="space-y-3">
                  <Label htmlFor="ingredientName" className="text-sm font-medium">
                    Nom de l'ingrédient
                  </Label>
                  <IngredientAutocomplete
                    value={currentIngredient.productName}
                    onChange={(value) => setCurrentIngredient({ ...currentIngredient, productName: value })}
                    placeholder="Tapez pour rechercher... (ex: Tomate, Oignon, Poulet)"
                    disabled={saving}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-3">
                    <Label htmlFor="quantity" className="text-sm font-medium">
                      {t('menu.dishWizard.quantity')}
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 250"
                      value={currentIngredient.quantity}
                      onChange={(e) => setCurrentIngredient({ ...currentIngredient, quantity: e.target.value })}
                      className="cursor-text"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="unit" className="text-sm font-medium">
                      {t('menu.dishWizard.unit')}
                    </Label>
                    <Input
                      id="unit"
                      value={currentIngredient.unit}
                      onChange={(e) => setCurrentIngredient({ ...currentIngredient, unit: e.target.value.toUpperCase() })}
                      placeholder="KG"
                      className="cursor-text"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleAddIngredient}
                  variant="outline"
                  className="w-full cursor-pointer"
                  disabled={!currentIngredient.productName || !currentIngredient.quantity}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('menu.dishWizard.addIngredient')}
                </Button>
              </div>

              {/* Ingredients List */}
              {ingredients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{t('menu.dishWizard.noIngredients')}</p>
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
            {t('menu.menuForm.cancel')}
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
                        {t('menu.dishWizard.creating')}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        {t('menu.dishWizard.create')}
                      </>
                    )}
                  </Button>
                </span>
              </TooltipTrigger>
              {(!isFormValid || ingredients.length === 0) && !saving && (
                <TooltipContent>
                  <p>
                    {!isFormValid
                      ? t('menu.create.disabledTooltip').replace('menu', 'dish')
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
