'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp, Plus, Search } from 'lucide-react';
import { SaleRecordDialog } from '@/components/sales';
import { useLanguage } from '@/providers/LanguageProvider';

/**
 * Quick Sales - Redesigned with search
 * Record sales for dishes with search functionality
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredDishes = dishes.filter(dish =>
    dish.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show top 5 dishes sorted by sales when no search, or all filtered results when searching
  const displayDishes = searchQuery
    ? filteredDishes
    : filteredDishes
        .sort((a, b) => {
          const aSales = todaySales.find(s => s.dishId === a.id)?.totalSold || 0;
          const bSales = todaySales.find(s => s.dishId === b.id)?.totalSold || 0;
          return bSales - aSales;
        })
        .slice(0, 8);

  return (
    <>
      <Card className="shadow-lg border-0 w-full overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-blue-50/80 via-blue-50/20 to-transparent dark:from-blue-950/10 dark:via-blue-950/5 dark:to-transparent">
          <CardTitle className="flex items-center gap-3 text-base sm:text-lg">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold truncate">{t('today.quickSales.title')}</span>
              </div>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                {t('today.quickSales.subtitle') || 'Track your daily sales'}
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{t('today.quickSales.loading')}</div>
          ) : dishes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t('today.quickSales.empty')}</p>
              <p className="text-sm mt-2">{t('today.quickSales.emptyHint')}</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4 w-full overflow-hidden">
              {/* Search Bar */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder={t('menu.search') || 'Search dishes...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background w-full"
                />
              </div>

              {/* Dishes List */}
              {displayDishes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{t('menu.noResults') || 'No dishes found'}</p>
                </div>
              ) : (
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 w-full overflow-hidden">
                  {displayDishes.map((dish) => {
                    const todaySale = todaySales.find((s) => s.dishId === dish.id);
                    const soldToday = todaySale?.totalSold || 0;

                    return (
                      <div
                        key={dish.id}
                        className="p-2.5 sm:p-3 rounded-lg border border-border bg-card hover:shadow-md hover:border-primary/20 transition-all w-full min-w-0"
                      >
                        <div className="flex items-center justify-between gap-2 w-full">
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="font-medium text-sm sm:text-base text-foreground truncate">{dish.name}</div>
                            <div className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
                              {t('today.quickSales.soldToday')}: <span className="font-semibold text-foreground">{soldToday}</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => openSaleDialog(dish)}
                            className="bg-gradient-to-br from-success/90 to-success hover:from-success hover:to-success/90 text-success-foreground shadow-md hover:shadow-lg shrink-0 cursor-pointer h-8 w-8 sm:h-9 sm:w-9 p-0"
                          >
                            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
