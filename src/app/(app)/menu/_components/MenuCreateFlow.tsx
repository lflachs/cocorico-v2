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
import { ChefHat, ArrowLeft, CheckCircle2, AlertCircle, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Menu Create Flow - Full screen, user-friendly menu creation
 * Step-by-step process with clear guidance and validation feedback
 */

type FormData = {
  name: string;
  description: string;
  isActive: boolean;
  pricingType: 'PRIX_FIXE' | 'CHOICE';
  fixedPrice?: number;
  numberOfCourses?: number;
};

type FormErrors = {
  name?: string;
  description?: string;
  fixedPrice?: string;
  numberOfCourses?: string;
};

export function MenuCreateFlow() {
  const router = useRouter();
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    isActive: true,
    pricingType: 'PRIX_FIXE',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (name: keyof FormData, value: any): string | undefined => {
    if (name === 'name') {
      if (!value || value.trim().length === 0) {
        return t('menu.menuForm.name') + ' is required';
      }
      if (value.trim().length < 2) {
        return 'Name must be at least 2 characters';
      }
      if (value.trim().length > 100) {
        return 'Name must be less than 100 characters';
      }
    }
    if (name === 'fixedPrice') {
      if (!value || value <= 0) {
        return 'Price must be greater than 0';
      }
    }
    if (name === 'numberOfCourses' && formData.pricingType === 'CHOICE') {
      if (!value || value <= 0) {
        return 'Number of courses must be at least 1';
      }
    }
    return undefined;
  };

  const handleFieldChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Validate on change if field was already touched
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

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // Validate name
    const nameError = validateField('name', formData.name);
    if (nameError) {
      newErrors.name = nameError;
      isValid = false;
    }

    // Validate pricing fields - always validate fixed price
    const priceError = validateField('fixedPrice', formData.fixedPrice);
    if (priceError) {
      newErrors.fixedPrice = priceError;
      isValid = false;
    }

    if (formData.pricingType === 'CHOICE') {
      const coursesError = validateField('numberOfCourses', formData.numberOfCourses);
      if (coursesError) {
        newErrors.numberOfCourses = coursesError;
        isValid = false;
      }
    }

    setErrors(newErrors);
    setTouched({ name: true, description: true, fixedPrice: true, numberOfCourses: true });
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors before continuing');
      return;
    }

    setSaving(true);
    try {
      const { createMenuAction } = await import('@/lib/actions/menu.actions');

      const result = await createMenuAction({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        isActive: formData.isActive,
        pricingType: formData.pricingType,
        fixedPrice: formData.fixedPrice,
        minCourses: formData.numberOfCourses,
        maxCourses: formData.numberOfCourses,
      });

      if (result.success) {
        toast.success(t('menu.update.success'));
        router.push('/menu');
      } else {
        toast.error(result.error || t('menu.update.error'));
      }
    } catch (error) {
      console.error('Error creating menu:', error);
      toast.error(t('menu.update.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/menu');
  };

  const isFormValid = !errors.name && formData.name.trim().length > 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <PageHeader
        title={t('menu.menuForm.title.create')}
        subtitle={t('menu.create.subtitle')}
        icon={ChefHat}
      />

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-8">
            <div className="space-y-8">
              {/* Menu Name */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="name" className="text-base font-semibold">
                    {t('menu.menuForm.name')} <span className="text-destructive">*</span>
                  </Label>
                  {touched.name && !errors.name && formData.name && (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  )}
                </div>
                <Input
                  id="name"
                  type="text"
                  placeholder={t('menu.menuForm.namePlaceholder')}
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
                {errors.name && touched.name ? (
                  <div className="flex items-start gap-2 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{errors.name}</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('menu.create.nameHint')}
                  </p>
                )}
              </div>

              {/* Menu Description */}
              <div className="space-y-3">
                <Label htmlFor="description" className="text-base font-semibold">
                  {t('menu.menuForm.description')} <span className="text-muted-foreground text-sm">({t('menu.create.optional')})</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder={t('menu.menuForm.descriptionPlaceholder')}
                  value={formData.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  onBlur={() => handleFieldBlur('description')}
                  rows={4}
                  className="text-base resize-none cursor-text"
                  disabled={saving}
                />
                <p className="text-sm text-muted-foreground">
                  {t('menu.create.descriptionHint')}
                </p>
              </div>

              {/* Pricing Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{t('menu.pricing.title')}</h3>
                    <p className="text-sm text-muted-foreground">{t('menu.pricing.subtitle')}</p>
                  </div>
                </div>

                {/* Pricing Type - Modern Card Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    {t('menu.pricing.type')} <span className="text-destructive">*</span>
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Prix Fixe Option */}
                    <button
                      type="button"
                      onClick={() => handleFieldChange('pricingType', 'PRIX_FIXE')}
                      disabled={saving}
                      className={`relative p-6 border-2 rounded-xl text-left transition-all cursor-pointer ${
                        formData.pricingType === 'PRIX_FIXE'
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                      }`}
                    >
                      {formData.pricingType === 'PRIX_FIXE' && (
                        <div className="absolute top-4 right-4">
                          <CheckCircle2 className="w-6 h-6 text-primary" />
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="font-semibold text-lg">{t('menu.pricing.type.prixfixe')}</div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {t('menu.pricing.type.prixfixe.description')}
                        </p>
                      </div>
                    </button>

                    {/* Choice Option */}
                    <button
                      type="button"
                      onClick={() => handleFieldChange('pricingType', 'CHOICE')}
                      disabled={saving}
                      className={`relative p-6 border-2 rounded-xl text-left transition-all cursor-pointer ${
                        formData.pricingType === 'CHOICE'
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                      }`}
                    >
                      {formData.pricingType === 'CHOICE' && (
                        <div className="absolute top-4 right-4">
                          <CheckCircle2 className="w-6 h-6 text-primary" />
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="font-semibold text-lg">{t('menu.pricing.type.choice')}</div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {t('menu.pricing.type.choice.description')}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Pricing Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Fixed Price */}
                  <div className="space-y-3">
                    <Label htmlFor="fixedPrice" className="text-base font-semibold">
                      {t('menu.pricing.menuPrice')} (€) <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">€</span>
                      <Input
                        id="fixedPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="45.00"
                        value={formData.fixedPrice || ''}
                        onChange={(e) => handleFieldChange('fixedPrice', parseFloat(e.target.value) || undefined)}
                        onBlur={() => handleFieldBlur('fixedPrice')}
                        className={`text-base cursor-text pl-8 ${
                          errors.fixedPrice && touched.fixedPrice
                            ? 'border-destructive'
                            : ''
                        }`}
                        disabled={saving}
                      />
                    </div>
                    {errors.fixedPrice && touched.fixedPrice && (
                      <div className="flex items-start gap-2 text-sm text-destructive">
                        <AlertCircle className="w-4 h-4 mt-0.5" />
                        <span>{errors.fixedPrice}</span>
                      </div>
                    )}
                  </div>

                  {/* Number of Courses (for CHOICE only) */}
                  {formData.pricingType === 'CHOICE' && (
                    <div className="space-y-3">
                      <Label htmlFor="numberOfCourses" className="text-base font-semibold">
                        {t('menu.pricing.numberOfCourses')} <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="numberOfCourses"
                        type="number"
                        min="1"
                        placeholder="2"
                        value={formData.numberOfCourses || ''}
                        onChange={(e) => handleFieldChange('numberOfCourses', parseInt(e.target.value) || undefined)}
                        onBlur={() => handleFieldBlur('numberOfCourses')}
                        className={`text-base cursor-text ${
                          errors.numberOfCourses && touched.numberOfCourses
                            ? 'border-destructive'
                            : ''
                        }`}
                        disabled={saving}
                      />
                      {errors.numberOfCourses && touched.numberOfCourses && (
                        <div className="flex items-start gap-2 text-sm text-destructive">
                          <AlertCircle className="w-4 h-4 mt-0.5" />
                          <span>{errors.numberOfCourses}</span>
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {t('menu.pricing.numberOfCourses.hint')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Status */}
              <div className="space-y-3">
                <Label htmlFor="isActive" className="text-base font-semibold">
                  {t('menu.create.statusTitle')}
                </Label>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                  <div className="space-y-0.5">
                    <div className="font-medium">{t('menu.menuForm.isActive')}</div>
                    <p className="text-sm text-muted-foreground">
                      {t('menu.create.statusHint')}
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
                    disabled={!isFormValid || saving}
                    className="gap-2 cursor-pointer bg-gradient-to-br from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t('menu.menuForm.saving')}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        {t('menu.menuForm.save')}
                      </>
                    )}
                  </Button>
                </span>
              </TooltipTrigger>
              {!isFormValid && !saving && (
                <TooltipContent>
                  <p>{t('menu.create.disabledTooltip')}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </form>
    </div>
  );
}
