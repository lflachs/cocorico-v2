'use client';

import { useState } from 'react';
import { MenuList } from './MenuList';
import { MenuDetail } from './MenuDetail';
import { useLanguage } from '@/providers/LanguageProvider';

/**
 * Menu View
 * Main component that manages different menu views
 */

export type View = 'list' | 'detail';

export function MenuView() {
  const { t } = useLanguage();
  const [view, setView] = useState<View>('list');
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);

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
      {view === 'list' && (
        <MenuList onSelectMenu={handleSelectMenu} />
      )}

      {view === 'detail' && selectedMenuId && (
        <MenuDetail menuId={selectedMenuId} onBack={handleBackToList} />
      )}
    </div>
  );
}
