'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Plus } from 'lucide-react';
import { SaleRecordDialog } from './SaleRecordDialog';
import { useLanguage } from '@/providers/LanguageProvider';

/**
 * Quick Sales
 * Record sales for top dishes (Client Component for interactivity)
 */

type Dish = {
  id: string;
  name: string;
  isActive: boolean;
};

type TodaySale = {
  dishId: string;
  dishName: string;
  totalSold: number;
};

export function QuickSales() {
  const { t } = useLanguage();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [todaySales, setTodaySales] = useState<TodaySale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Import actions dynamically to avoid server/client boundary issues
      const { getDishesAction } = await import('@/lib/actions/dish.actions');
      const { getTodaysSalesSummaryAction } = await import('@/lib/actions/sale.actions');

      // Fetch active dishes
      const dishesResult = await getDishesAction({ isActive: true });
      if (dishesResult.success && dishesResult.data) {
        setDishes(dishesResult.data);
      }

      // Fetch today's sales summary
      const salesResult = await getTodaysSalesSummaryAction();
      if (salesResult.success && salesResult.data) {
        const summary = salesResult.data.topDishes.map(dish => ({
          dishId: dish.dishId,
          dishName: dish.dishName,
          totalSold: dish.totalQuantity,
        }));
        setTodaySales(summary);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openSaleDialog = (dish: Dish) => {
    setSelectedDish(dish);
    setShowDialog(true);
  };

  const handleSaleRecorded = () => {
    setShowDialog(false);
    setSelectedDish(null);
    loadData(); // Reload to show updated counts
  };

  const getTopDishes = () => dishes.slice(0, 5);

  return (
    <>
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              {t('today.quickSales.title')}
            </CardTitle>
            <CardDescription>{t('today.quickSales.description')}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">{t('today.quickSales.loading')}</div>
          ) : dishes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>{t('today.quickSales.empty')}</p>
              <p className="text-sm mt-2">{t('today.quickSales.emptyHint')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {getTopDishes().map((dish) => {
                const todaySale = todaySales.find((s) => s.dishId === dish.id);
                const soldToday = todaySale?.totalSold || 0;

                return (
                  <div
                    key={dish.id}
                    className="p-3 rounded-lg border bg-white hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{dish.name}</div>
                        <div className="text-sm text-gray-600 mt-1">{t('today.quickSales.soldToday')}: {soldToday}</div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => openSaleDialog(dish)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        {t('today.quickSales.recordSale')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedDish && (
        <SaleRecordDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          dish={selectedDish}
          onSuccess={handleSaleRecorded}
        />
      )}
    </>
  );
}
