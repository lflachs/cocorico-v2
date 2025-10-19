'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Beaker, RefreshCw, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/providers/LanguageProvider';
import { CreateButton } from '@/components/CreateButton';

/**
 * Prepared Ingredients List
 * Displays composite products (prepared ingredients) with their recipes
 */

type CompositeIngredient = {
  id: string;
  baseProductId: string;
  quantity: number;
  unit: string;
  baseProduct: {
    id: string;
    name: string;
    unit: string;
  };
};

type CompositeProduct = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  yieldQuantity: number | null;
  category: string | null;
  compositeIngredients: CompositeIngredient[];
  calculatedUnitPrice?: number;
};

export function PreparedIngredientsList() {
  const router = useRouter();
  const { t } = useLanguage();
  const [compositeProducts, setCompositeProducts] = useState<CompositeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const loadCompositeProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/composite-products');
      if (response.ok) {
        const data = await response.json();
        setCompositeProducts(data);
      } else {
        toast.error(t('prepared.delete.error'));
      }
    } catch (error) {
      console.error('Error loading composite products:', error);
      toast.error(t('prepared.delete.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompositeProducts();
  }, []);

  const handleDeleteCompositeProduct = async (id: string, name: string) => {
    if (!confirm(t('prepared.delete.confirm'))) {
      return;
    }

    try {
      const response = await fetch(`/api/composite-products/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t('prepared.delete.success'));
        loadCompositeProducts();
      } else {
        const error = await response.json();
        toast.error(error.error || t('prepared.delete.error'));
      }
    } catch (error) {
      console.error('Error deleting composite product:', error);
      toast.error(t('prepared.delete.error'));
    }
  };

  const toggleExpanded = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const handleCreatePrepared = () => {
    router.push('/menu/create-prepared');
  };

  return (
    <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Beaker className="w-5 h-5 text-purple-500" />
                {t('prepared.title')}
              </CardTitle>
              <CardDescription>
                {t('prepared.subtitle')}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadCompositeProducts}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <CreateButton onClick={handleCreatePrepared}>
                {t('prepared.create')}
              </CreateButton>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">{t('today.quickSales.loading')}</div>
          ) : compositeProducts.length === 0 ? (
            <div className="text-center py-12">
              <Beaker className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">{t('prepared.empty')}</p>
              <p className="text-sm text-gray-400 mb-4">
                {t('prepared.emptyHint')}
              </p>
              <CreateButton onClick={handleCreatePrepared}>
                {t('prepared.createFirst')}
              </CreateButton>
            </div>
          ) : (
            <div className="space-y-3">
              {compositeProducts.map((product) => {
                const isExpanded = expandedProducts.has(product.id);
                return (
                  <div key={product.id} className="border rounded-lg">
                    {/* Header */}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleExpanded(product.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{product.name}</h3>
                            {product.category && (
                              <Badge variant="outline" className="text-xs">
                                {product.category}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">{t('prepared.yield')}:</span> {product.yieldQuantity}{' '}
                            {product.unit}
                            {' • '}
                            <span className="font-medium">{t('prepared.stock')}:</span> {product.quantity}{' '}
                            {product.unit}
                            {' • '}
                            <span className="font-medium">{t('prepared.ingredients')}:</span>{' '}
                            {product.compositeIngredients.length}
                          </div>
                          {product.calculatedUnitPrice !== undefined && (
                            <div className="text-sm text-gray-700 mt-1">
                              <span className="font-medium">{t('prepared.calculatedPrice')}:</span>{' '}
                              {product.calculatedUnitPrice > 0 ? (
                                <span className="text-green-600 font-semibold">
                                  €{product.calculatedUnitPrice.toFixed(2)} / {product.unit}
                                </span>
                              ) : (
                                <span className="text-orange-500 text-xs">
                                  {t('prepared.missingIngredientPrices')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCompositeProduct(product.id, product.name)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Recipe Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t bg-gray-50">
                        <div className="mt-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">{t('prepared.recipe')}:</h4>
                          <div className="space-y-2">
                            {product.compositeIngredients.map((ingredient) => (
                              <div
                                key={ingredient.id}
                                className="flex items-center justify-between py-2 px-3 bg-white rounded border"
                              >
                                <span className="text-sm">{ingredient.baseProduct.name}</span>
                                <Badge variant="outline" className="text-xs font-mono">
                                  {ingredient.quantity} {ingredient.unit}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
  );
}
