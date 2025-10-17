'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, RefreshCw, Pencil, Trash2, ChefHat } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import { toast } from 'sonner';
import { DishFormDialog } from './DishFormDialog';

/**
 * Dishes List
 * Main component for displaying and managing dishes
 */

type Dish = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  recipeIngredients: {
    id: string;
    productId: string;
    quantityRequired: number;
    unit: string;
    product: {
      id: string;
      name: string;
      unitPrice?: number | null;
    };
  }[];
};

export function DishesList() {
  const { t } = useLanguage();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [filteredDishes, setFilteredDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDishForm, setShowDishForm] = useState(false);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [dishToDelete, setDishToDelete] = useState<Dish | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadDishes = useCallback(async () => {
    setLoading(true);
    try {
      const { getDishesAction } = await import('@/lib/actions/dish.actions');
      const result = await getDishesAction();
      if (result.success && result.data) {
        setDishes(result.data);
      }
    } catch (error) {
      console.error('Error loading dishes:', error);
      toast.error(t('menu.update.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadDishes();
  }, [loadDishes]);

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

  const handleCreateDish = () => {
    setSelectedDish(null);
    setShowDishForm(true);
  };

  const handleEditDish = (dish: Dish) => {
    setSelectedDish(dish);
    setShowDishForm(true);
  };

  const handleDeleteDish = async () => {
    if (!dishToDelete) return;

    setDeleting(true);
    try {
      const { deleteDishAction } = await import('@/lib/actions/dish.actions');
      const result = await deleteDishAction(dishToDelete.id);

      if (result.success) {
        toast.success(t('menu.delete.success'));
        loadDishes();
        setDishToDelete(null);
      } else {
        toast.error(result.error || t('menu.delete.error'));
      }
    } catch (error) {
      console.error('Error deleting dish:', error);
      toast.error(t('menu.delete.error'));
    } finally {
      setDeleting(false);
    }
  };

  const calculateDishCost = (dish: Dish): number => {
    return dish.recipeIngredients.reduce((total, ingredient) => {
      const unitPrice = ingredient.product.unitPrice || 0;
      return total + ingredient.quantityRequired * unitPrice;
    }, 0);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-orange-500" />
                {t('menu.title')}
              </CardTitle>
              <CardDescription>{t('menu.subtitle')}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadDishes} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                {t('menu.refresh')}
              </Button>
              <Button size="sm" onClick={handleCreateDish}>
                <Plus className="w-4 h-4 mr-1" />
                {t('menu.addDish')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={t('menu.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Dishes Table */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">{t('today.quickSales.loading')}</div>
          ) : filteredDishes.length === 0 ? (
            <div className="text-center py-12">
              <ChefHat className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              {searchQuery ? (
                <>
                  <p className="text-gray-500 mb-2">{t('menu.noResults')}</p>
                  <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                    {t('menu.clearSearch')}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-gray-500 mb-2">{t('menu.empty')}</p>
                  <p className="text-sm text-gray-400 mb-4">{t('menu.emptyHint')}</p>
                  <Button onClick={handleCreateDish}>
                    <Plus className="w-4 h-4 mr-1" />
                    {t('menu.addDish')}
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('menu.table.dish')}</TableHead>
                    <TableHead>{t('menu.table.description')}</TableHead>
                    <TableHead>{t('menu.table.ingredients')}</TableHead>
                    <TableHead className="text-right">{t('menu.table.cost')}</TableHead>
                    <TableHead>{t('menu.table.status')}</TableHead>
                    <TableHead className="text-right">{t('menu.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDishes.map((dish) => {
                    const cost = calculateDishCost(dish);
                    return (
                      <TableRow key={dish.id}>
                        <TableCell className="font-medium">{dish.name}</TableCell>
                        <TableCell className="text-gray-600">
                          {dish.description || '-'}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500">
                            {dish.recipeIngredients.length} {dish.recipeIngredients.length === 1 ? 'ingredient' : 'ingredients'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {cost > 0 ? `€${cost.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={dish.isActive ? 'default' : 'secondary'}>
                            {dish.isActive ? t('menu.status.active') : t('menu.status.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditDish(dish)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDishToDelete(dish)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dish Form Dialog */}
      <DishFormDialog
        open={showDishForm}
        onOpenChange={setShowDishForm}
        dish={selectedDish}
        onSuccess={loadDishes}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!dishToDelete} onOpenChange={(open) => !open && setDishToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('menu.delete.confirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('menu.delete.confirm')} &quot;{dishToDelete?.name}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('menu.dishForm.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDish}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleting ? t('bills.delete.deleting') : t('bills.delete.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
