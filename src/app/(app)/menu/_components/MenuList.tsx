'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChefHat, Calendar, Trash2, DollarSign } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import { toast } from 'sonner';
import { CreateButton } from '@/components/CreateButton';
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

/**
 * Menu List
 * Displays all menus as cards
 */

type Menu = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
  fixedPrice?: number | null;
  pricingType: 'PRIX_FIXE' | 'CHOICE';
  minCourses?: number | null;
  maxCourses?: number | null;
};

type MenuListProps = {
  onSelectMenu: (menuId: string) => void;
};

export function MenuList({ onSelectMenu }: MenuListProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuToDelete, setMenuToDelete] = useState<Menu | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadMenus = useCallback(async () => {
    setLoading(true);
    try {
      const { getMenusAction } = await import('@/lib/actions/menu.actions');
      const result = await getMenusAction();
      if (result.success && result.data) {
        setMenus(result.data);
      }
    } catch (error) {
      console.error('Error loading menus:', error);
      toast.error(t('menu.update.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadMenus();
  }, [loadMenus]);

  const handleCreateMenu = () => {
    router.push('/menu/create');
  };

  const handleDeleteMenu = async () => {
    if (!menuToDelete) return;

    setDeleting(true);
    try {
      const { deleteMenuAction } = await import('@/lib/actions/menu.actions');
      const result = await deleteMenuAction(menuToDelete.id);

      if (result.success) {
        toast.success(t('menu.delete.success'));
        loadMenus();
        setMenuToDelete(null);
      } else {
        toast.error(result.error || t('menu.delete.error'));
      }
    } catch (error) {
      console.error('Error deleting menu:', error);
      toast.error(t('menu.delete.error'));
    } finally {
      setDeleting(false);
    }
  };

  const formatDateRange = (startDate?: Date | null, endDate?: Date | null) => {
    if (!startDate && !endDate) return 'Permanent';
    const start = startDate ? new Date(startDate).toLocaleDateString() : 'Open';
    const end = endDate ? new Date(endDate).toLocaleDateString() : 'Open';
    return `${start} - ${end}`;
  };

  const getPricingDisplay = (menu: Menu) => {
    if (!menu.fixedPrice) return null;

    const typeLabel = menu.pricingType === 'PRIX_FIXE'
      ? t('menu.pricing.type.prixfixe')
      : t('menu.pricing.type.choice');

    if (menu.pricingType === 'CHOICE' && menu.minCourses) {
      const courses = menu.minCourses === menu.maxCourses
        ? `${menu.minCourses} courses`
        : `${menu.minCourses}-${menu.maxCourses} courses`;
      return {
        price: `€${menu.fixedPrice.toFixed(2)}`,
        type: typeLabel,
        courses,
      };
    }

    return {
      price: `€${menu.fixedPrice.toFixed(2)}`,
      type: typeLabel,
    };
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-orange-500" />
                {t('menu.menuList.title')}
              </CardTitle>
              <CardDescription>{t('menu.subtitle')}</CardDescription>
            </div>
            <CreateButton onClick={handleCreateMenu}>
              {t('menu.createMenu')}
            </CreateButton>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : menus.length === 0 ? (
            <div className="text-center py-12">
              <ChefHat className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">{t('menu.menuList.empty')}</p>
              <p className="text-sm text-gray-400 mb-4">{t('menu.menuList.emptyHint')}</p>
              <CreateButton onClick={handleCreateMenu}>
                {t('menu.createMenu')}
              </CreateButton>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menus.map((menu) => {
                const pricingInfo = getPricingDisplay(menu);
                return (
                  <div
                    key={menu.id}
                    className="border rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => onSelectMenu(menu.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-lg">{menu.name}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuToDelete(menu);
                        }}
                        className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {menu.description && (
                      <p className="text-sm text-gray-600 mb-3">{menu.description}</p>
                    )}

                    {/* Pricing Info */}
                    {pricingInfo && (
                      <div className="mb-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-primary">{pricingInfo.price}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {pricingInfo.type}
                          {pricingInfo.courses && ` • ${pricingInfo.courses}`}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <Calendar className="w-4 h-4" />
                      {formatDateRange(menu.startDate, menu.endDate)}
                    </div>

                    <div>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          menu.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {menu.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!menuToDelete} onOpenChange={(open) => !open && setMenuToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('menu.delete.menu')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('menu.delete.menuConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMenu}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
