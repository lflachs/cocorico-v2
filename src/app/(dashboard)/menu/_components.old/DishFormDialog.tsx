'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/providers/LanguageProvider';
import { toast } from 'sonner';
import { RecipeIngredientEditor, type RecipeIngredient } from './RecipeIngredientEditor';

/**
 * Dish Form Dialog
 * Modal for creating/editing dishes with recipe ingredients
 */

type Dish = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  recipeIngredients: {
    productId: string;
    quantityRequired: number;
    unit: string;
  }[];
};

type DishFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dish?: Dish | null;
  onSuccess: () => void;
};

export function DishFormDialog({ open, onOpenChange, dish, onSuccess }: DishFormDialogProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
    recipeIngredients: [] as RecipeIngredient[],
  });

  // Reset form when dialog opens/closes or dish changes
  useEffect(() => {
    if (open) {
      if (dish) {
        setFormData({
          name: dish.name,
          description: dish.description || '',
          isActive: dish.isActive,
          recipeIngredients: dish.recipeIngredients.map((ing) => ({
            productId: ing.productId,
            quantityRequired: ing.quantityRequired,
            unit: ing.unit,
          })),
        });
      } else {
        setFormData({
          name: '',
          description: '',
          isActive: true,
          recipeIngredients: [],
        });
      }
    }
  }, [open, dish]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (dish) {
        // Update existing dish
        const { updateDishAction } = await import('@/lib/actions/dish.actions');
        const result = await updateDishAction(dish.id, {
          name: formData.name,
          description: formData.description || undefined,
          isActive: formData.isActive,
          recipeIngredients: formData.recipeIngredients,
        });

        if (result.success) {
          toast.success(t('menu.update.success'));
          onSuccess();
          onOpenChange(false);
        } else {
          toast.error(result.error || t('menu.update.error'));
        }
      } else {
        // Create new dish
        const { createDishAction } = await import('@/lib/actions/dish.actions');
        const result = await createDishAction({
          name: formData.name,
          description: formData.description || undefined,
          isActive: formData.isActive,
          recipeIngredients: formData.recipeIngredients,
        });

        if (result.success) {
          toast.success(t('menu.update.success'));
          onSuccess();
          onOpenChange(false);
        } else {
          toast.error(result.error || t('menu.update.error'));
        }
      }
    } catch (error) {
      console.error('Error saving dish:', error);
      toast.error(t('menu.update.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {dish ? t('menu.dishForm.title.edit') : t('menu.dishForm.title.create')}
          </DialogTitle>
          <DialogDescription>
            {dish ? `${t('menu.dishForm.title.edit')}: ${dish.name}` : t('menu.dishForm.title.create')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Dish Name */}
            <div>
              <Label htmlFor="name">{t('menu.dishForm.name')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('menu.dishForm.namePlaceholder')}
                required
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">{t('menu.dishForm.description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('menu.dishForm.descriptionPlaceholder')}
                rows={3}
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="isActive">{t('menu.dishForm.isActive')}</Label>
                <p className="text-sm text-gray-500">{t('menu.dishForm.isActiveHint')}</p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            {/* Recipe Ingredients */}
            <RecipeIngredientEditor
              ingredients={formData.recipeIngredients}
              onChange={(ingredients) => setFormData({ ...formData, recipeIngredients: ingredients })}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t('menu.dishForm.cancel')}
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? t('menu.dishForm.saving') : t('menu.dishForm.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
