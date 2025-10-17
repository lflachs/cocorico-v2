'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Trash2, Pencil } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import { toast } from 'sonner';
import { DishWizard } from './DishWizard';
import { DishEditModal } from './DishEditModal';

/**
 * Menu Detail
 * Shows menu sections with dishes
 */

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
      unitPrice?: number | null;
    };
  }[];
};

type MenuDish = {
  id: string;
  dish: Dish;
};

type MenuSection = {
  id: string;
  name: string;
  displayOrder: number;
  dishes: MenuDish[];
};

type Menu = {
  id: string;
  name: string;
  description?: string | null;
  sections: MenuSection[];
};

type MenuDetailProps = {
  menuId: string;
  onBack: () => void;
};

export function MenuDetail({ menuId, onBack }: MenuDetailProps) {
  const { t } = useLanguage();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDishWizard, setShowDishWizard] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);

  const loadMenu = useCallback(async () => {
    setLoading(true);
    try {
      const { getMenuByIdAction } = await import('@/lib/actions/menu.actions');
      const result = await getMenuByIdAction(menuId);
      if (result.success && result.data) {
        setMenu(result.data as Menu);
      }
    } catch (error) {
      console.error('Error loading menu:', error);
      toast.error(t('menu.update.error'));
    } finally {
      setLoading(false);
    }
  }, [menuId, t]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const handleAddDish = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setShowDishWizard(true);
  };

  const handleEditDish = (dish: Dish) => {
    setSelectedDish(dish);
    setShowEditModal(true);
  };

  const handleRemoveDish = async (menuDishId: string) => {
    try {
      const { removeDishFromSectionAction } = await import('@/lib/actions/menu.actions');
      const result = await removeDishFromSectionAction(menuDishId);

      if (result.success) {
        toast.success(t('menu.delete.success'));
        loadMenu();
      } else {
        toast.error(result.error || t('menu.delete.error'));
      }
    } catch (error) {
      console.error('Error removing dish:', error);
      toast.error(t('menu.delete.error'));
    }
  };

  const calculateDishCost = (dish: Dish): number => {
    if (!dish.recipeIngredients || dish.recipeIngredients.length === 0) {
      return 0;
    }
    return dish.recipeIngredients.reduce((total, ing) => {
      const unitPrice = ing.product?.unitPrice || 0;
      return total + ing.quantityRequired * unitPrice;
    }, 0);
  };

  if (loading || !menu) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="w-fit mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t('menu.backToMenus')}
          </Button>
          <CardTitle>{menu.name}</CardTitle>
          {menu.description && (
            <CardDescription>{menu.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {menu.sections.map((section) => (
            <div key={section.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{section.name}</h3>
                <Button
                  size="sm"
                  onClick={() => handleAddDish(section.id)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {t('menu.section.addDish')}
                </Button>
              </div>

              {section.dishes.length === 0 ? (
                <p className="text-center py-6 text-gray-500">
                  {t('menu.section.noDishes')}
                </p>
              ) : (
                <div className="space-y-2">
                  {section.dishes.map((menuDish) => {
                    const cost = calculateDishCost(menuDish.dish);
                    return (
                      <div
                        key={menuDish.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{menuDish.dish.name}</div>
                          {menuDish.dish.description && (
                            <div className="text-sm text-gray-600">
                              {menuDish.dish.description}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            {menuDish.dish.recipeIngredients?.length || 0} {t('menu.dish.ingredients')}
                            {cost > 0 && ` • €${cost.toFixed(2)}`}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditDish(menuDish.dish)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveDish(menuDish.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {selectedSectionId && (
        <DishWizard
          open={showDishWizard}
          onOpenChange={setShowDishWizard}
          sectionId={selectedSectionId}
          onSuccess={() => {
            loadMenu();
            setShowDishWizard(false);
          }}
        />
      )}

      {selectedDish && (
        <DishEditModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          dish={selectedDish}
          onSuccess={() => {
            loadMenu();
            setShowEditModal(false);
          }}
        />
      )}
    </>
  );
}
