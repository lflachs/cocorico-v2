'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, ChefHat, Loader2 } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import { toast } from 'sonner';

/**
 * Add Dish Dialog - Choose between creating new or selecting existing dish
 * Two-step process: 1) Choose action, 2) Select from list if "existing" chosen
 */

type Dish = {
  id: string;
  name: string;
  description?: string | null;
  sellingPrice?: number | null;
  recipeIngredients?: {
    id: string;
    quantityRequired: number;
    unit: string;
    product: {
      id: string;
      name: string;
      unitPrice?: number | null;
    };
  }[];
};

type AddDishDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: string;
  onDishAdded: () => void;
};

export function AddDishDialog({ open, onOpenChange, sectionId, onDishAdded }: AddDishDialogProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [step, setStep] = useState<'choice' | 'select'>('choice');
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [filteredDishes, setFilteredDishes] = useState<Dish[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  // Reset to choice step when dialog opens
  useEffect(() => {
    if (open) {
      setStep('choice');
      setSearchQuery('');
    }
  }, [open]);

  // Load dishes when user chooses to select existing
  const loadDishes = async () => {
    setLoading(true);
    try {
      const { getDishesAction } = await import('@/lib/actions/dish.actions');
      const result = await getDishesAction();
      if (result.success && result.data) {
        setDishes(result.data as Dish[]);
        setFilteredDishes(result.data as Dish[]);
      }
    } catch (error) {
      console.error('Error loading dishes:', error);
      toast.error('Failed to load dishes');
    } finally {
      setLoading(false);
    }
  };

  // Filter dishes based on search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredDishes(dishes);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredDishes(
        dishes.filter(
          (dish) =>
            dish.name.toLowerCase().includes(query) ||
            dish.description?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, dishes]);

  const handleCreateNew = () => {
    onOpenChange(false);
    router.push('/menu/create-dish');
  };

  const handleSelectExisting = () => {
    setStep('select');
    loadDishes();
  };

  const handleAddDish = async (dishId: string) => {
    setAdding(true);
    try {
      const { addDishToSectionAction } = await import('@/lib/actions/menu.actions');
      const result = await addDishToSectionAction(sectionId, dishId);

      if (result.success) {
        toast.success('Dish added to menu');
        onDishAdded();
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Failed to add dish');
      }
    } catch (error) {
      console.error('Error adding dish:', error);
      toast.error('Failed to add dish');
    } finally {
      setAdding(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        {step === 'choice' ? (
          <>
            <DialogHeader className="text-center">
              <DialogTitle className="text-2xl">{t('menu.section.addDish')}</DialogTitle>
              <DialogDescription className="text-center">
                Choose whether to create a new dish or add an existing one to this section
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 mb-4">
              {/* Create New Dish */}
              <Card
                className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group h-full"
                onClick={handleCreateNew}
              >
                <CardContent className="p-8 text-center space-y-4 h-full flex flex-col items-center justify-center">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl mb-2">{t('menu.createDish')}</h3>
                    <p className="text-sm text-muted-foreground">
                      Create a brand new dish with ingredients and pricing
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Add Existing Dish */}
              <Card
                className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group h-full"
                onClick={handleSelectExisting}
              >
                <CardContent className="p-8 text-center space-y-4 h-full flex flex-col items-center justify-center">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ChefHat className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl mb-2">{t('menu.selectExisting')}</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose from your existing dishes to add to this menu
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">{t('menu.selectExisting')}</DialogTitle>
              <DialogDescription>
                Search and select a dish to add to this section
              </DialogDescription>
            </DialogHeader>

            {/* Search */}
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 cursor-text"
              />
            </div>

            {/* Dishes List */}
            <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground mt-2">Loading dishes...</p>
                </div>
              ) : filteredDishes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? (
                    <>
                      <p>No dishes found matching "{searchQuery}"</p>
                      <Button
                        variant="link"
                        onClick={() => setSearchQuery('')}
                        className="mt-2 cursor-pointer"
                      >
                        Clear search
                      </Button>
                    </>
                  ) : (
                    <>
                      <p>No dishes available yet</p>
                      <Button
                        variant="link"
                        onClick={handleCreateNew}
                        className="mt-2 cursor-pointer"
                      >
                        Create your first dish
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                filteredDishes.map((dish) => {
                  const cost = calculateDishCost(dish);
                  const sellingPrice = dish.sellingPrice;
                  const margin = cost > 0 && sellingPrice
                    ? ((sellingPrice - cost) / sellingPrice) * 100
                    : null;

                  return (
                    <Card
                      key={dish.id}
                      className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
                      onClick={() => handleAddDish(dish.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold">{dish.name}</h4>
                            {dish.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {dish.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                              <span>
                                {dish.recipeIngredients?.length || 0} {t('menu.dish.ingredients')}
                              </span>
                              {cost > 0 && (
                                <span>
                                  {t('menu.dish.cost')}: €{cost.toFixed(2)}
                                </span>
                              )}
                              {sellingPrice && (
                                <span>
                                  Price: €{sellingPrice.toFixed(2)}
                                </span>
                              )}
                              {margin !== null && (
                                <span className={margin > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                  {margin.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>
                          <Plus className="w-5 h-5 text-primary shrink-0 ml-4" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Back Button */}
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setStep('choice')}
                disabled={adding}
                className="cursor-pointer"
              >
                Back to options
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
