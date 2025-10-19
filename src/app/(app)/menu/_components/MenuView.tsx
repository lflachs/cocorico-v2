'use client';

import { useState } from 'react';
import { MenuList } from './MenuList';
import { MenuDetail } from './MenuDetail';
import { PreparedIngredientsList } from './PreparedIngredientsList';
import { DishesListView } from './DishesListView';
import { useLanguage } from '@/providers/LanguageProvider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/PageHeader';
import { MissingPriceAlert } from '@/components/MissingPriceAlert';
import { ChefHat, Beaker, UtensilsCrossed } from 'lucide-react';

/**
 * Menu View - Redesigned
 * Main component that manages different menu views with tabs
 */

export type View = 'list' | 'detail';

export function MenuView() {
  const { t } = useLanguage();
  const [view, setView] = useState<View>('list');
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('menus');

  const handleSelectMenu = (menuId: string) => {
    setSelectedMenuId(menuId);
    setView('detail');
  };

  const handleBackToList = () => {
    setSelectedMenuId(null);
    setView('list');
  };

  return (
    <div className="space-y-6">
      {/* Header with gradient background */}
      <PageHeader
        title={t('recipes.title')}
        subtitle={t('recipes.subtitle')}
        icon={ChefHat}
      />

      <MissingPriceAlert />

      {view === 'list' ? (
        <>
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-2xl grid-cols-3 shadow-md">
              <TabsTrigger value="menus" className="flex items-center gap-2 cursor-pointer">
                <ChefHat className="w-4 h-4" />
                {t('recipes.tabs.menuItems')}
              </TabsTrigger>
              <TabsTrigger value="dishes" className="flex items-center gap-2 cursor-pointer">
                <UtensilsCrossed className="w-4 h-4" />
                {t('recipes.tabs.dishes')}
              </TabsTrigger>
              <TabsTrigger value="prepared" className="flex items-center gap-2 cursor-pointer">
                <Beaker className="w-4 h-4" />
                {t('recipes.tabs.prepared')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="menus" className="mt-6">
              <MenuList onSelectMenu={handleSelectMenu} />
            </TabsContent>

            <TabsContent value="dishes" className="mt-6">
              <DishesListView />
            </TabsContent>

            <TabsContent value="prepared" className="mt-6">
              <PreparedIngredientsList />
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <MenuDetail menuId={selectedMenuId!} onBack={handleBackToList} />
      )}
    </div>
  );
}
