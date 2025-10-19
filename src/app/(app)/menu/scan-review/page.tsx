'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, Plus, X, Edit, Link2, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import { toast } from 'sonner';
import { IngredientEditor } from '../_components/IngredientEditor';

/**
 * Menu Scan Review Page
 * Full-screen review and editing of scanned menus before import
 */

type ScannedDish = {
  name: string;
  description: string | null;
  price: number | null;
  recipeIngredients?: Array<{
    productId: string;
    productName?: string;
    quantityRequired: number;
    unit: string;
    unitPrice?: number;
    suggested?: boolean;
    confidence?: number;
    exists?: boolean;
  }>;
};

type ScannedSection = {
  name: string;
  dishes: ScannedDish[];
};

type ScannedMenu = {
  menuName: string;
  menuDescription: string | null;
  pricingType: 'PRIX_FIXE' | 'CHOICE';
  fixedPrice: number | null;
  minCourses: number | null;
  maxCourses: number | null;
  sections: ScannedSection[];
};

type AlaCarteDish = {
  name: string;
  description: string | null;
  price: number;
  category: string | null;
};

type ExistingDish = {
  id: string;
  name: string;
  description?: string | null;
  sellingPrice?: number | null;
};

type DishMapping = {
  useExisting: boolean;
  existingDishId?: string;
};

export default function MenuScanReviewPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [menus, setMenus] = useState<ScannedMenu[]>([]);
  const [alacarte, setAlacarte] = useState<AlaCarteDish[]>([]);
  const [selectedMenus, setSelectedMenus] = useState<Set<number>>(new Set());
  const [selectedAlacarte, setSelectedAlacarte] = useState<Set<number>>(new Set());
  const [editingDishPath, setEditingDishPath] = useState<{ menuIdx: number; sectionIdx: number; dishIdx: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [showIngredientEditor, setShowIngredientEditor] = useState(false);
  const [existingDishes, setExistingDishes] = useState<ExistingDish[]>([]);
  const [dishMappings, setDishMappings] = useState<Map<string, DishMapping>>(new Map());

  useEffect(() => {
    // Load existing dishes
    const loadExistingDishes = async () => {
      try {
        const { getDishesAction } = await import('@/lib/actions/dish.actions');
        const result = await getDishesAction({
          isActive: true,
          includeRecipe: false,
          includeSales: false,
        });
        if (result.success && result.data) {
          setExistingDishes(result.data);
        }
      } catch (error) {
        console.error('Error loading existing dishes:', error);
      }
    };

    loadExistingDishes();

    // Get scanned data from sessionStorage (passed from MenuScanDialog)
    const scannedDataStr = sessionStorage.getItem('scannedMenuData');
    if (scannedDataStr) {
      try {
        const scannedData = JSON.parse(scannedDataStr);
        setMenus(scannedData.menus || []);
        setAlacarte(scannedData.alacarte || []);
        // Select all menus by default
        setSelectedMenus(new Set(scannedData.menus.map((_: any, idx: number) => idx)));
      } catch (error) {
        console.error('Error parsing scanned data:', error);
        toast.error('Failed to load scanned data');
        router.push('/menu');
      }
    } else {
      toast.error('No scanned data found');
      router.push('/menu');
    }
  }, [router]);

  // Auto-detect dish matches when existing dishes or menus change
  useEffect(() => {
    if (existingDishes.length === 0 || menus.length === 0) return;

    const newMappings = new Map<string, DishMapping>();

    menus.forEach((menu, menuIdx) => {
      menu.sections.forEach((section, sectionIdx) => {
        section.dishes.forEach((dish, dishIdx) => {
          const key = `${menuIdx}-${sectionIdx}-${dishIdx}`;
          const matchedDish = existingDishes.find(
            (d) => d.name.toLowerCase().trim() === dish.name.toLowerCase().trim()
          );

          if (matchedDish) {
            newMappings.set(key, {
              useExisting: true,
              existingDishId: matchedDish.id,
            });
          }
        });
      });
    });

    setDishMappings(newMappings);
  }, [existingDishes, menus]);

  const toggleMenuSelection = (index: number) => {
    const newSelection = new Set(selectedMenus);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedMenus(newSelection);
  };

  const toggleAlacarteSelection = (index: number) => {
    const newSelection = new Set(selectedAlacarte);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedAlacarte(newSelection);
  };

  const updateMenuField = (menuIdx: number, field: keyof ScannedMenu, value: any) => {
    const updated = [...menus];
    updated[menuIdx] = { ...updated[menuIdx], [field]: value };
    setMenus(updated);
  };

  const updateDishField = (menuIdx: number, sectionIdx: number, dishIdx: number, field: keyof ScannedDish, value: any) => {
    const updated = [...menus];
    updated[menuIdx].sections[sectionIdx].dishes[dishIdx] = {
      ...updated[menuIdx].sections[sectionIdx].dishes[dishIdx],
      [field]: value,
    };
    setMenus(updated);
  };

  const handleSaveIngredients = (ingredients: Array<{ productId?: string; productName: string; quantityRequired: number; unit: string; unitPrice?: number }>) => {
    if (!editingDishPath) return;

    const { menuIdx, sectionIdx, dishIdx } = editingDishPath;
    const updated = [...menus];
    updated[menuIdx].sections[sectionIdx].dishes[dishIdx] = {
      ...updated[menuIdx].sections[sectionIdx].dishes[dishIdx],
      recipeIngredients: ingredients.map(ing => ({
        productId: ing.productId || '',
        productName: ing.productName,
        quantityRequired: ing.quantityRequired,
        unit: ing.unit,
        unitPrice: ing.unitPrice,
      })),
    };
    setMenus(updated);
    setEditingDishPath(null);
  };

  const getMatchedDish = (menuIdx: number, sectionIdx: number, dishIdx: number): ExistingDish | null => {
    const key = `${menuIdx}-${sectionIdx}-${dishIdx}`;
    const mapping = dishMappings.get(key);
    if (!mapping?.existingDishId) return null;
    return existingDishes.find(d => d.id === mapping.existingDishId) || null;
  };

  const toggleDishMapping = (menuIdx: number, sectionIdx: number, dishIdx: number) => {
    const key = `${menuIdx}-${sectionIdx}-${dishIdx}`;
    const currentMapping = dishMappings.get(key);

    if (!currentMapping) return; // No match exists

    const newMappings = new Map(dishMappings);
    newMappings.set(key, {
      ...currentMapping,
      useExisting: !currentMapping.useExisting,
    });
    setDishMappings(newMappings);
  };

  const handleImport = async () => {
    if (selectedMenus.size === 0 && selectedAlacarte.size === 0) {
      toast.error('Please select at least one menu or dish to import');
      return;
    }

    setSaving(true);
    try {
      const { importScannedMenuAction } = await import('@/lib/actions/menu.actions');
      const { createDishAction } = await import('@/lib/actions/dish.actions');

      // Import selected menus
      for (const menuIdx of Array.from(selectedMenus)) {
        const menu = menus[menuIdx];

        // Create mapping for this specific menu (adjust keys to start from 0)
        const menuSpecificMappings = new Map<string, { useExisting: boolean; existingDishId?: string }>();

        menu.sections.forEach((section, sectionIdx) => {
          section.dishes.forEach((dish, dishIdx) => {
            const originalKey = `${menuIdx}-${sectionIdx}-${dishIdx}`;
            const newKey = `0-${sectionIdx}-${dishIdx}`; // menuIdx is always 0 in the action
            const mapping = dishMappings.get(originalKey);
            if (mapping) {
              menuSpecificMappings.set(newKey, mapping);
            }
          });
        });

        const result = await importScannedMenuAction(menu, menuSpecificMappings);
        if (!result.success) {
          throw new Error(result.error || 'Failed to import menu');
        }
      }

      // Import selected à la carte dishes
      if (selectedAlacarte.size > 0) {
        const alacarteDishes = Array.from(selectedAlacarte).map(idx => alacarte[idx]);

        for (const dish of alacarteDishes) {
          const result = await createDishAction({
            name: dish.name,
            description: dish.description || undefined,
            sellingPrice: dish.price,
            isActive: true,
          });

          if (!result.success) {
            throw new Error(result.error || `Failed to create dish: ${dish.name}`);
          }
        }
      }

      const totalImported = selectedMenus.size + selectedAlacarte.size;
      toast.success(`Successfully imported ${totalImported} item(s)!`);

      // Clear sessionStorage
      sessionStorage.removeItem('scannedMenuData');

      router.push('/menu');
    } catch (error) {
      console.error('Error importing:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import');
    } finally {
      setSaving(false);
    }
  };

  if (menus.length === 0 && alacarte.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Loading scanned data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => router.push('/menu')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.back')}
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Review Scanned Menus</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Review and edit before importing • {selectedMenus.size} menu(s) and {selectedAlacarte.size} dish(es) selected
                </p>
              </div>
            </div>
            <Button onClick={handleImport} disabled={saving || (selectedMenus.size === 0 && selectedAlacarte.size === 0)} size="lg">
              <Check className="w-4 h-4 mr-2" />
              {saving ? 'Importing...' : `Import (${selectedMenus.size + selectedAlacarte.size})`}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Menus */}
        {menus.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Menus ({menus.length})</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {menus.map((menu, menuIdx) => (
                <Card
                  key={menuIdx}
                  className={`${
                    selectedMenus.has(menuIdx) ? 'border-primary' : 'border-border'
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedMenus.has(menuIdx)}
                        onChange={() => toggleMenuSelection(menuIdx)}
                        className="mt-1 h-5 w-5 cursor-pointer"
                      />
                      <div className="flex-1 space-y-3">
                        <div>
                          <Label>Menu Name</Label>
                          <Input
                            value={menu.menuName}
                            onChange={(e) => updateMenuField(menuIdx, 'menuName', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        {menu.menuDescription && (
                          <div>
                            <Label>Description</Label>
                            <Textarea
                              value={menu.menuDescription}
                              onChange={(e) => updateMenuField(menuIdx, 'menuDescription', e.target.value)}
                              className="mt-1"
                              rows={2}
                            />
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Price (€)</Label>
                            <Input
                              type="number"
                              value={menu.fixedPrice || ''}
                              onChange={(e) => updateMenuField(menuIdx, 'fixedPrice', parseFloat(e.target.value) || null)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label>Type</Label>
                            <Input
                              value={menu.pricingType === 'PRIX_FIXE' ? 'Prix Fixe' : 'Choice'}
                              disabled
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="font-medium text-sm">
                        Sections & Dishes ({menu.sections.reduce((acc, s) => acc + s.dishes.length, 0)} total)
                      </div>
                      {menu.sections.map((section, sectionIdx) => (
                        <div key={sectionIdx} className="border-l-2 border-primary/30 pl-3 space-y-2">
                          <div className="font-medium text-sm">{section.name}</div>
                          {section.dishes.map((dish, dishIdx) => {
                            const matchedDish = getMatchedDish(menuIdx, sectionIdx, dishIdx);
                            const mapping = dishMappings.get(`${menuIdx}-${sectionIdx}-${dishIdx}`);
                            const useExisting = mapping?.useExisting ?? false;

                            return (
                              <div key={dishIdx} className="p-2 rounded bg-muted/50 text-sm space-y-2">
                                <div>
                                  <div className="font-medium">{dish.name}</div>
                                  {dish.description && (
                                    <div className="text-xs text-muted-foreground">{dish.description}</div>
                                  )}
                                  {dish.price && <div className="text-xs font-semibold">€{dish.price}</div>}
                                </div>

                                {/* Match Status */}
                                {matchedDish && (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {useExisting ? (
                                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                        <Link2 className="w-3 h-3 mr-1" />
                                        Using existing dish
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                        Will create new
                                      </Badge>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 text-xs px-2"
                                      onClick={() => toggleDishMapping(menuIdx, sectionIdx, dishIdx)}
                                    >
                                      Switch to {useExisting ? 'new' : 'existing'}
                                    </Button>
                                  </div>
                                )}

                                {/* Show suggested ingredients if any */}
                                {!useExisting && dish.recipeIngredients && dish.recipeIngredients.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                      <span>AI Suggested ({dish.recipeIngredients.length}):</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {dish.recipeIngredients.map((ing, ingIdx) => (
                                        <div
                                          key={ingIdx}
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                                            ing.exists
                                              ? 'bg-green-100 text-green-800 border border-green-200'
                                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                                          }`}
                                        >
                                          <span>{ing.productName || ing.productId}</span>
                                          <span className="text-[10px] opacity-70">
                                            {ing.quantityRequired} {ing.unit}
                                          </span>
                                          {ing.exists && (
                                            <span className="text-[10px] opacity-70" title="In inventory">✓</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {!useExisting && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs mt-1"
                                    onClick={() => {
                                      setEditingDishPath({ menuIdx, sectionIdx, dishIdx });
                                      setShowIngredientEditor(true);
                                    }}
                                  >
                                    <Edit className="w-3 h-3 mr-1" />
                                    {dish.recipeIngredients && dish.recipeIngredients.length > 0
                                      ? `Review Ingredients (${dish.recipeIngredients.length})`
                                      : 'Add Ingredients'}
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* À La Carte */}
        {alacarte.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">À La Carte Dishes ({alacarte.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alacarte.map((dish, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border cursor-pointer ${
                    selectedAlacarte.has(idx) ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => toggleAlacarteSelection(idx)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedAlacarte.has(idx)}
                      onChange={() => toggleAlacarteSelection(idx)}
                      className="mt-0.5 h-4 w-4 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{dish.name}</div>
                      {dish.description && (
                        <div className="text-xs text-muted-foreground mt-1">{dish.description}</div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm font-semibold text-primary">€{dish.price}</span>
                        {dish.category && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{dish.category}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ingredient Editor Dialog */}
      {editingDishPath && (
        <IngredientEditor
          open={showIngredientEditor}
          onOpenChange={(open) => {
            setShowIngredientEditor(open);
            if (!open) {
              setEditingDishPath(null);
            }
          }}
          dishName={menus[editingDishPath.menuIdx]?.sections[editingDishPath.sectionIdx]?.dishes[editingDishPath.dishIdx]?.name || ''}
          initialIngredients={
            menus[editingDishPath.menuIdx]?.sections[editingDishPath.sectionIdx]?.dishes[editingDishPath.dishIdx]?.recipeIngredients?.map(ing => ({
              productId: ing.productId,
              productName: ing.productName || '',
              quantityRequired: ing.quantityRequired,
              unit: ing.unit,
              unitPrice: ing.unitPrice,
            })) || []
          }
          onSave={handleSaveIngredients}
        />
      )}
    </div>
  );
}
