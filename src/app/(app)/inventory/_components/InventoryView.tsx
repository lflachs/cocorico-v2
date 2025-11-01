'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RefreshCw,
  Download,
  Search,
  Trash2,
  Package,
  Edit,
  Check,
  X,
  Euro,
  Plus,
  AlertTriangle,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
} from 'lucide-react';
import { type Product } from '@prisma/client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { useLanguage } from '@/providers/LanguageProvider';
import Link from 'next/link';
import { CreateButton } from '@/components/CreateButton';
import { InventorySyncFlow } from './InventorySyncFlow';

/**
 * Comprehensive Inventory View Component
 * Features: Search, inline editing, stock status, export, responsive table
 */

type InventoryViewProps = {
  initialProducts: Product[];
  menuIngredients: Record<string, {
    productId: string;
    totalNeeded: number;
    currentStock: number;
    usedInDishes: string[];
  }>;
};

export function InventoryView({ initialProducts, menuIngredients }: InventoryViewProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState('sync');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'critical'>(
    (searchParams.get('filter') as 'all' | 'low' | 'critical') || 'all'
  );
  const [sortColumn, setSortColumn] = useState<'name' | 'quantity' | 'unit' | 'parLevel' | 'unitPrice' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    name: string;
    quantity: number;
    unitPrice: number | null;
    parLevel: number | null;
  }>({ name: '', quantity: 0, unitPrice: null, parLevel: null });
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [syncFlowOpen, setSyncFlowOpen] = useState(false);

  // Function to update URL with filter state
  const updateFilterURL = (filter: 'all' | 'low' | 'critical') => {
    const params = new URLSearchParams(searchParams.toString());
    if (filter === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', filter);
    }
    const newURL = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newURL, { scroll: false });
  };

  // Handle column sorting
  const handleSort = (column: 'name' | 'quantity' | 'unit' | 'parLevel' | 'unitPrice') => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Filter and sort products
  useEffect(() => {
    let filtered = initialProducts;

    // Apply search filter
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply stock status filter
    if (stockFilter !== 'all') {
      filtered = filtered.filter((product) => {
        const status = getStockStatus(product);
        if (stockFilter === 'critical') {
          return status === 'critical';
        } else if (stockFilter === 'low') {
          return status === 'low' || status === 'critical';
        }
        return true;
      });
    }

    // Apply sorting
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortColumn) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'quantity':
            aValue = a.quantity;
            bValue = b.quantity;
            break;
          case 'unit':
            aValue = a.unit;
            bValue = b.unit;
            break;
          case 'parLevel':
            aValue = a.parLevel ?? -1; // Null values go to end
            bValue = b.parLevel ?? -1;
            break;
          case 'unitPrice':
            aValue = a.unitPrice ?? -1;
            bValue = b.unitPrice ?? -1;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredProducts(filtered);
    // Clear selection when filters change
    setSelectedProducts(new Set());
  }, [searchQuery, stockFilter, sortColumn, sortDirection, initialProducts]);

  // Render sortable column header
  const SortableHeader = ({
    column,
    label,
    className = '',
  }: {
    column: 'name' | 'quantity' | 'unit' | 'parLevel' | 'unitPrice';
    label: string;
    className?: string;
  }) => {
    const isActive = sortColumn === column;
    return (
      <th
        className={`px-3 py-2.5 text-left font-medium cursor-pointer hover:bg-gray-100 transition-colors bg-gray-50 ${className}`}
        onClick={() => handleSort(column)}
      >
        <div className="flex items-center gap-1 whitespace-nowrap">
          {label}
          {isActive ? (
            sortDirection === 'asc' ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5" />
            )
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />
          )}
        </div>
      </th>
    );
  };

  const getStockStatus = (product: Product): 'good' | 'low' | 'critical' | null => {
    // Priority 1: Check if this ingredient is used in active menus
    const menuIngredient = menuIngredients[product.id];
    if (menuIngredient && menuIngredient.totalNeeded > 0) {
      const servingsAvailable = Math.floor(product.quantity / menuIngredient.totalNeeded);

      // Alert if less than 10 servings available
      if (servingsAvailable === 0) return 'critical';
      if (servingsAvailable <= 3) return 'critical';
      if (servingsAvailable < 10) return 'low';
      return null; // Enough servings available
    }

    // Priority 2: If par level is set, use it
    if (product.parLevel && product.parLevel > 0) {
      const percentOfPar = (product.quantity / product.parLevel) * 100;
      if (percentOfPar <= 25) return 'critical';
      if (percentOfPar <= 50) return 'low';
      return 'good';
    }

    // No status for products not in menus and without par level
    // This prevents false positives for items like "3.7 kg" being flagged as low
    return null;
  };

  const calculateTotalValue = (product: Product) => {
    return (product.unitPrice || 0) * product.quantity;
  };

  const startEditing = (product: Product) => {
    setEditingProduct(product.id);
    setEditValues({
      name: product.name,
      quantity: product.quantity,
      unitPrice: product.unitPrice,
      parLevel: product.parLevel,
    });
  };

  const cancelEditing = () => {
    setEditingProduct(null);
    setEditValues({ name: '', quantity: 0, unitPrice: null, parLevel: null });
  };

  const saveEdit = async (productId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editValues.name,
          quantity: editValues.quantity,
          unitPrice: editValues.unitPrice,
          parLevel: editValues.parLevel,
        }),
      });

      if (response.ok) {
        toast.success(t('inventory.update.success'));
        cancelEditing();
        router.refresh();
      } else {
        toast.error(t('inventory.update.error'));
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(t('inventory.update.error'));
    }
  };

  const deleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`${t('inventory.delete.confirm')} "${productName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t('inventory.delete.success'));
        router.refresh();
      } else {
        toast.error(t('inventory.delete.error'));
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error(t('inventory.delete.error'));
    }
  };

  const exportStock = () => {
    const csv = [
      ['Product', 'Quantity', 'Unit', 'Unit Price', 'Total Value', 'Par Level', 'Status'].join(','),
      ...initialProducts.map((p) => {
        const status = getStockStatus(p);
        return [
          `"${p.name}"`,
          p.quantity,
          p.unit,
          p.unitPrice || 0,
          calculateTotalValue(p).toFixed(2),
          p.parLevel || '',
          status || '',
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success(t('inventory.export.success'));
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map((p) => p.id)));
    }
  };

  const toggleSelectProduct = (productId: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  const bulkDeleteProducts = async () => {
    if (selectedProducts.size === 0) return;

    const confirmed = confirm(
      `${t('inventory.delete.confirm')} ${selectedProducts.size} product(s)?`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const deletePromises = Array.from(selectedProducts).map((productId) =>
        fetch(`/api/products/${productId}`, { method: 'DELETE' })
      );

      const results = await Promise.all(deletePromises);
      const successCount = results.filter((r) => r.ok).length;
      const failureCount = results.length - successCount;

      if (successCount > 0) {
        toast.success(`Successfully deleted ${successCount} product(s)`);
        router.refresh();
      }

      if (failureCount > 0) {
        toast.error(`Failed to delete ${failureCount} product(s)`);
      }

      setSelectedProducts(new Set());
    } catch (error) {
      console.error('Error deleting products:', error);
      toast.error('Failed to delete products');
    } finally {
      setIsDeleting(false);
    }
  };

  const calculateStockValueFromProducts = () => {
    return initialProducts.reduce((total, product) => {
      const value = (product.unitPrice || 0) * product.quantity;
      return total + value;
    }, 0);
  };

  // Calculate inventory confidence level based on how recently products were updated
  const calculateConfidenceLevel = () => {
    if (initialProducts.length === 0) return { level: 0, label: 'Aucune donnée', color: 'gray' };

    const now = Date.now();
    let totalScore = 0;

    initialProducts.forEach((product) => {
      const daysSinceUpdate = Math.floor((now - new Date(product.updatedAt).getTime()) / (1000 * 60 * 60 * 24));

      // Scoring system: more recent = higher score
      let score = 0;
      if (daysSinceUpdate === 0) score = 100; // Today
      else if (daysSinceUpdate === 1) score = 90; // Yesterday
      else if (daysSinceUpdate <= 3) score = 75; // Last 3 days
      else if (daysSinceUpdate <= 7) score = 50; // Last week
      else if (daysSinceUpdate <= 14) score = 30; // Last 2 weeks
      else if (daysSinceUpdate <= 30) score = 15; // Last month
      else score = 0; // Over a month

      totalScore += score;
    });

    const avgScore = totalScore / initialProducts.length;

    // Determine confidence level
    if (avgScore >= 80) {
      return { level: avgScore, label: 'Très élevée', color: 'green', emoji: '🟢' };
    } else if (avgScore >= 60) {
      return { level: avgScore, label: 'Élevée', color: 'blue', emoji: '🔵' };
    } else if (avgScore >= 40) {
      return { level: avgScore, label: 'Moyenne', color: 'yellow', emoji: '🟡' };
    } else if (avgScore >= 20) {
      return { level: avgScore, label: 'Faible', color: 'orange', emoji: '🟠' };
    } else {
      return { level: avgScore, label: 'Très faible', color: 'red', emoji: '🔴' };
    }
  };

  const confidence = calculateConfidenceLevel();

  const productsWithValue = initialProducts.filter((p) => p.unitPrice && p.unitPrice > 0);
  const avgValue =
    productsWithValue.length > 0 ? calculateStockValueFromProducts() / productsWithValue.length : 0;

  // Calculate stock filter counts
  const lowStockCount = initialProducts.filter(
    (p) => getStockStatus(p) === 'low' || getStockStatus(p) === 'critical'
  ).length;
  const criticalStockCount = initialProducts.filter((p) => getStockStatus(p) === 'critical').length;

  // Debug: Log stock status for all products on mount
  useEffect(() => {
    console.log('Total products:', initialProducts.length);
    console.log('Menu ingredients count:', Object.keys(menuIngredients).length);
    console.log('Low stock count:', lowStockCount);
    console.log('Critical stock count:', criticalStockCount);

    console.log('\n=== Sample Products (first 5) ===');
    initialProducts.slice(0, 5).forEach((p) => {
      const status = getStockStatus(p);
      const menuIngredient = menuIngredients[p.id];
      const servingsAvailable = menuIngredient
        ? Math.floor(p.quantity / menuIngredient.totalNeeded)
        : null;

      console.log(`
Product: ${p.name}
  - Quantity: ${p.quantity}
  - Par Level: ${p.parLevel || 'none'}
  - In Menu: ${menuIngredient ? 'YES' : 'NO'}
  ${menuIngredient ? `- Servings Available: ${servingsAvailable}` : ''}
  - Status: ${status || 'none'}
      `);
    });
  }, [initialProducts, menuIngredients]);

  return (
    <>
      <InventorySyncFlow
        open={syncFlowOpen}
        onOpenChange={setSyncFlowOpen}
        products={initialProducts}
        initialConfidence={confidence.level}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full overflow-hidden">
        <TabsList className="grid w-full sm:max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="sync" className="gap-1 sm:gap-2 min-w-0">
            <RefreshCw className="w-4 h-4 shrink-0" />
            <span className="truncate text-xs sm:text-sm">Sync</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-1 sm:gap-2 min-w-0">
            <Package className="w-4 h-4 shrink-0" />
            <span className="truncate text-xs sm:text-sm">Stock</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sync" className="space-y-4 overflow-hidden">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <RefreshCw className="h-5 w-5 text-primary" />
                Synchronisation rapide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Confidence Indicator - Compact */}
              <div className={`p-3 rounded-lg border ${
                confidence.color === 'green' ? 'border-green-200 bg-green-50' :
                confidence.color === 'blue' ? 'border-blue-200 bg-blue-50' :
                confidence.color === 'yellow' ? 'border-yellow-200 bg-yellow-50' :
                confidence.color === 'orange' ? 'border-orange-200 bg-orange-50' :
                'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{confidence.emoji}</span>
                      <div>
                        <h3 className={`font-semibold text-sm ${
                          confidence.color === 'green' ? 'text-green-900' :
                          confidence.color === 'blue' ? 'text-blue-900' :
                          confidence.color === 'yellow' ? 'text-yellow-900' :
                          confidence.color === 'orange' ? 'text-orange-900' :
                          'text-red-900'
                        }`}>
                          Confiance: {confidence.label}
                        </h3>
                        <p className={`text-xs ${
                          confidence.color === 'green' ? 'text-green-700' :
                          confidence.color === 'blue' ? 'text-blue-700' :
                          confidence.color === 'yellow' ? 'text-yellow-700' :
                          confidence.color === 'orange' ? 'text-orange-700' :
                          'text-red-700'
                        }`}>
                          {Math.round(confidence.level)}% de fiabilité
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compact Progress bar */}
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      confidence.color === 'green' ? 'bg-green-600' :
                      confidence.color === 'blue' ? 'bg-blue-600' :
                      confidence.color === 'yellow' ? 'bg-yellow-600' :
                      confidence.color === 'orange' ? 'bg-orange-600' :
                      'bg-red-600'
                    }`}
                    style={{ width: `${confidence.level}%` }}
                  />
                </div>

                {confidence.level < 60 && (
                  <p className={`text-xs mt-2 font-medium ${
                    confidence.color === 'orange' ? 'text-orange-900' :
                    'text-red-900'
                  }`}>
                    ⚠️ Synchronisez pour améliorer la fiabilité
                  </p>
                )}
              </div>

              {/* Compact stats grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-lg border bg-card text-center">
                  <div className="text-xl font-bold">{initialProducts.length}</div>
                  <div className="text-xs text-muted-foreground">produits</div>
                </div>
                <div className="p-3 rounded-lg border bg-card text-center">
                  <div className="text-xl font-bold text-orange-600">{lowStockCount}</div>
                  <div className="text-xs text-muted-foreground">stocks bas</div>
                </div>
                <div className="p-3 rounded-lg border bg-card text-center">
                  <div className="text-xl font-bold text-red-600">{criticalStockCount}</div>
                  <div className="text-xs text-muted-foreground">critiques</div>
                </div>
              </div>

              {/* Compact How it works */}
              <div className="p-3 rounded-lg border bg-muted/30">
                <h3 className="font-semibold text-sm mb-2">Comment ça marche ?</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2 items-start">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                    <p className="text-xs">Parcourez les produits (les plus anciens en premier)</p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                    <p className="text-xs">Confirmez ou ajustez chaque quantité</p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                    <p className="text-xs">Arrêtez quand vous voulez - plus vous faites, mieux c'est !</p>
                  </div>
                </div>
              </div>

              {/* Compact time estimate */}
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-blue-50 border-blue-200">
                <Clock className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900">
                    ~{Math.ceil((initialProducts.length * 30) / 60)} min
                  </p>
                  <p className="text-xs text-blue-700">
                    ~30 sec/produit
                  </p>
                </div>
              </div>

              {/* Start button */}
              <Button
                onClick={() => setSyncFlowOpen(true)}
                size="lg"
                className="w-full h-14 text-base font-semibold"
              >
                <RefreshCw className="mr-2 h-5 w-5" />
                Commencer la synchronisation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6 overflow-hidden">
          {/* Stock Valuation Summary */}
          <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg min-w-0">
              <Euro className="h-5 w-5 text-green-600 shrink-0" />
              <span className="truncate">{t('inventory.value.title')}</span>
            </CardTitle>
            <CardDescription className="truncate">{t('inventory.value.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-green-100 bg-green-50 p-4 text-center overflow-hidden">
                <div className="text-2xl font-bold text-green-600 sm:text-3xl truncate">
                  {calculateStockValueFromProducts().toFixed(2)} €
                </div>
                <p className="mt-1 text-sm font-medium text-green-700 truncate">
                  {t('inventory.value.total')}
                </p>
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-center overflow-hidden">
                <div className="text-xl font-bold text-blue-600 sm:text-2xl truncate">{productsWithValue.length}</div>
                <p className="mt-1 text-sm font-medium text-blue-700 truncate">
                  {t('inventory.value.valued')}
                </p>
              </div>
              <div className="rounded-lg border border-purple-100 bg-purple-50 p-4 text-center overflow-hidden">
                <div className="text-xl font-bold text-purple-600 sm:text-2xl truncate">{avgValue.toFixed(2)} €</div>
                <p className="mt-1 text-sm font-medium text-purple-700 truncate">
                  {t('inventory.value.average')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Inventory Table */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between overflow-hidden">
              <span className="flex items-center gap-2 min-w-0">
                <Package className="h-5 w-5 shrink-0" />
                <span className="truncate">{t('inventory.title')}</span>
              </span>
              <div className="flex flex-wrap gap-2 shrink-0 min-w-0">
                {selectedProducts.size > 0 && (
                  <Button
                    onClick={bulkDeleteProducts}
                    disabled={isDeleting}
                    variant="destructive"
                    size="sm"
                    className="cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">
                      {isDeleting
                        ? 'Deleting...'
                        : `Delete ${selectedProducts.size} item${selectedProducts.size > 1 ? 's' : ''}`}
                    </span>
                    <span className="sm:hidden">{selectedProducts.size}</span>
                  </Button>
                )}
                <Link href="/inventory/new">
                  <CreateButton>{t('inventory.addProduct')}</CreateButton>
                </Link>
                <Button
                  onClick={exportStock}
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                >
                  <Download className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t('inventory.export')}</span>
                </Button>
              </div>
            </CardTitle>
            <CardDescription className="truncate">{t('inventory.description')}</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-hidden">
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <Input
                  placeholder={t('inventory.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Stock Filters */}
            <div className="mb-4 space-y-2 overflow-hidden">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => {
                    setStockFilter('all');
                    updateFilterURL('all');
                  }}
                  size="sm"
                  variant={stockFilter === 'all' ? 'default' : 'outline'}
                  className="cursor-pointer flex-1 min-w-0 sm:flex-none sm:min-w-[90px]"
                >
                  <Filter className="h-4 w-4 mr-1 shrink-0" />
                  <span className="text-xs truncate">All ({initialProducts.length})</span>
                </Button>
                <Button
                  onClick={() => {
                    setStockFilter('low');
                    updateFilterURL('low');
                  }}
                  size="sm"
                  variant={stockFilter === 'low' ? 'default' : 'outline'}
                  className="cursor-pointer flex-1 min-w-0 sm:flex-none sm:min-w-[90px]"
                >
                  <AlertTriangle className="h-4 w-4 mr-1 shrink-0" />
                  <span className="text-xs truncate">Low ({lowStockCount})</span>
                </Button>
                <Button
                  onClick={() => {
                    setStockFilter('critical');
                    updateFilterURL('critical');
                  }}
                  size="sm"
                  variant={stockFilter === 'critical' ? 'default' : 'outline'}
                  className="cursor-pointer flex-1 min-w-0 sm:flex-none sm:min-w-[90px]"
                >
                  <AlertTriangle className="h-4 w-4 mr-1 shrink-0 text-red-500" />
                  <span className="text-xs truncate">Critical ({criticalStockCount})</span>
                </Button>
              </div>
              {stockFilter !== 'all' && (
                <div className="text-xs text-gray-600">
                  Showing {filteredProducts.length} of {initialProducts.length} items
                </div>
              )}
            </div>

            {/* Products Table - Desktop */}
            {filteredProducts.length > 0 ? (
              <>
                {/* Mobile Card View */}
                <div className="block lg:hidden space-y-4 overflow-hidden">
                  {filteredProducts.map((product) => {
                    const stockStatus = getStockStatus(product);
                    const cardClass =
                      stockStatus === 'critical'
                        ? 'border-l-4 border-l-red-500 bg-red-50/30'
                        : stockStatus === 'low'
                        ? 'border-l-4 border-l-orange-500 bg-orange-50/30'
                        : '';

                    return (
                      <Card key={product.id} className={`${cardClass} overflow-hidden`} style={{ width: '100%', maxWidth: '100%' }}>
                        <CardContent className="p-4" style={{ width: '100%', maxWidth: '100%' }}>
                          {/* Header with checkbox and name */}
                          <div className="mb-2" style={{ display: 'grid', gridTemplateColumns: '16px 1fr', gap: '8px', width: '100%' }}>
                            <input
                              type="checkbox"
                              checked={selectedProducts.has(product.id)}
                              onChange={() => toggleSelectProduct(product.id)}
                              className="h-4 w-4 mt-0.5 cursor-pointer rounded border-gray-300"
                              style={{ width: '16px', flexShrink: 0 }}
                            />
                            <div style={{ overflow: 'hidden', minWidth: 0 }}>
                              {editingProduct === product.id ? (
                                <Input
                                  value={editValues.name}
                                  onChange={(e) =>
                                    setEditValues({ ...editValues, name: e.target.value })
                                  }
                                  className="w-full h-8 text-sm font-semibold"
                                />
                              ) : (
                                <h3 className="font-semibold text-base" style={{
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  width: '100%',
                                  display: 'block'
                                }}>{product.name}</h3>
                              )}
                            </div>
                          </div>

                          {/* Product Details Grid */}
                          <div className="grid grid-cols-2 gap-3 mb-3 w-full max-w-full overflow-hidden">
                            {/* Quantity */}
                            <div className="min-w-0 overflow-hidden">
                              <p className="text-xs text-gray-500 mb-1 truncate">{t('inventory.table.quantity')}</p>
                              {editingProduct === product.id ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editValues.quantity}
                                  onChange={(e) =>
                                    setEditValues({
                                      ...editValues,
                                      quantity: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full h-8 text-sm"
                                />
                              ) : (
                                <p className="font-mono font-medium text-sm truncate">{product.quantity.toFixed(1)}</p>
                              )}
                            </div>

                            {/* Unit */}
                            <div className="min-w-0 overflow-hidden">
                              <p className="text-xs text-gray-500 mb-1 truncate">{t('inventory.table.unit')}</p>
                              <Badge variant="outline" className="text-xs px-2 py-0.5 max-w-full truncate block">{product.unit}</Badge>
                            </div>

                            {/* Unit Price */}
                            <div className="min-w-0 overflow-hidden">
                              <p className="text-xs text-gray-500 mb-1 truncate">{t('inventory.table.unitPrice')}</p>
                              {editingProduct === product.id ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editValues.unitPrice ?? ''}
                                  onChange={(e) =>
                                    setEditValues({
                                      ...editValues,
                                      unitPrice:
                                        e.target.value === '' ? null : parseFloat(e.target.value),
                                    })
                                  }
                                  className="w-full h-8 text-sm"
                                  placeholder="€"
                                />
                              ) : (
                                <p className="font-mono text-sm truncate">
                                  {product.unitPrice ? `${product.unitPrice.toFixed(2)} €` : '-'}
                                </p>
                              )}
                            </div>

                            {/* Total Value */}
                            <div className="min-w-0 overflow-hidden">
                              <p className="text-xs text-gray-500 mb-1 truncate">{t('inventory.table.totalValue')}</p>
                              <p className="font-mono font-medium text-green-600 text-sm truncate">
                                {product.unitPrice ? `${calculateTotalValue(product).toFixed(2)} €` : '-'}
                              </p>
                            </div>

                            {/* Par Level */}
                            <div className="col-span-2 min-w-0 overflow-hidden">
                              <p className="text-xs text-gray-500 mb-1 truncate">{t('inventory.table.parLevel')}</p>
                              {editingProduct === product.id ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editValues.parLevel ?? ''}
                                  onChange={(e) =>
                                    setEditValues({
                                      ...editValues,
                                      parLevel:
                                        e.target.value === '' ? null : parseFloat(e.target.value),
                                    })
                                  }
                                  className="w-full h-8 text-sm"
                                  placeholder="0.0"
                                />
                              ) : (
                                <p className="font-mono text-sm truncate">
                                  {product.parLevel ? product.parLevel.toFixed(1) : (
                                    <span className="text-xs text-gray-400">-</span>
                                  )}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-2 border-t w-full max-w-full overflow-hidden">
                            {editingProduct === product.id ? (
                              <>
                                <Button
                                  onClick={() => saveEdit(product.id)}
                                  size="sm"
                                  className="flex-1 min-w-0 bg-green-600 hover:bg-green-700 h-9 text-sm px-3"
                                >
                                  <Check className="h-4 w-4 mr-1 shrink-0" />
                                  <span className="truncate">Save</span>
                                </Button>
                                <Button
                                  onClick={cancelEditing}
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 min-w-0 h-9 text-sm px-3"
                                >
                                  <X className="h-4 w-4 mr-1 shrink-0" />
                                  <span className="truncate">Cancel</span>
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  onClick={() => startEditing(product)}
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 min-w-0 h-9 text-sm px-3"
                                >
                                  <Edit className="h-4 w-4 mr-1 shrink-0" />
                                  <span className="truncate">Edit</span>
                                </Button>
                                <Button
                                  onClick={() => deleteProduct(product.id, product.name)}
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 min-w-0 text-red-600 hover:bg-red-50 h-9 text-sm px-3"
                                >
                                  <Trash2 className="h-4 w-4 mr-1 shrink-0" />
                                  <span className="truncate">Delete</span>
                                </Button>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block -mx-6 overflow-x-auto">
                  <div className="inline-block min-w-full px-6">
                    <div className="max-h-[600px] overflow-y-auto border-y">
                      <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b bg-gray-50">
                      <th className="pl-6 pr-2 py-2.5 text-left font-medium min-w-[50px] bg-gray-50">
                        <input
                          type="checkbox"
                          checked={
                            filteredProducts.length > 0 &&
                            selectedProducts.size === filteredProducts.length
                          }
                          onChange={toggleSelectAll}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300"
                        />
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium cursor-pointer hover:bg-gray-100 transition-colors bg-gray-50 min-w-[200px]" onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          {t('inventory.table.product')}
                          {sortColumn === 'name' ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />
                          )}
                        </div>
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium cursor-pointer hover:bg-gray-100 transition-colors bg-gray-50 min-w-[100px]" onClick={() => handleSort('quantity')}>
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          {t('inventory.table.quantity')}
                          {sortColumn === 'quantity' ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />
                          )}
                        </div>
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium cursor-pointer hover:bg-gray-100 transition-colors bg-gray-50 min-w-[80px]" onClick={() => handleSort('unit')}>
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          {t('inventory.table.unit')}
                          {sortColumn === 'unit' ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />
                          )}
                        </div>
                      </th>
                      <SortableHeader
                        column="parLevel"
                        label={t('inventory.table.parLevel')}
                        className="hidden xl:table-cell"
                      />
                      <SortableHeader
                        column="unitPrice"
                        label={t('inventory.table.unitPrice')}
                        className="hidden lg:table-cell"
                      />
                      <th className="hidden px-3 py-2.5 text-left font-medium md:table-cell bg-gray-50 min-w-[120px]">
                        {t('inventory.table.totalValue')}
                      </th>
                      <th className="pl-3 pr-6 py-2.5 text-left font-medium bg-gray-50 min-w-[100px]">
                        {t('inventory.table.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => {
                      const stockStatus = getStockStatus(product);
                      const rowClass =
                        stockStatus === 'critical'
                          ? 'border-b hover:bg-red-50 bg-red-50/30 border-l-4 border-l-red-500'
                          : stockStatus === 'low'
                          ? 'border-b hover:bg-orange-50 bg-orange-50/30 border-l-4 border-l-orange-500'
                          : 'border-b hover:bg-gray-50';

                      return (
                      <tr key={product.id} className={rowClass}>
                        {/* Checkbox */}
                        <td className="pl-6 pr-2 py-2.5">
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product.id)}
                            onChange={() => toggleSelectProduct(product.id)}
                            className="h-4 w-4 cursor-pointer rounded border-gray-300"
                          />
                        </td>
                        {/* Product Name */}
                        <td className="max-w-[200px] px-3 py-2.5 font-medium">
                          {editingProduct === product.id ? (
                            <Input
                              value={editValues.name}
                              onChange={(e) =>
                                setEditValues({ ...editValues, name: e.target.value })
                              }
                              className="w-full h-8 text-sm"
                            />
                          ) : (
                            <div className="truncate" title={product.name}>
                              {product.name}
                            </div>
                          )}
                        </td>

                        {/* Quantity */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {editingProduct === product.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editValues.quantity}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues,
                                  quantity: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-20 h-8 text-sm"
                            />
                          ) : (
                            <span className="font-mono">{product.quantity.toFixed(1)}</span>
                          )}
                        </td>

                        {/* Unit */}
                        <td className="px-3 py-2.5">
                          <Badge variant="outline" className="text-xs">
                            {product.unit}
                          </Badge>
                        </td>

                        {/* Par Level */}
                        <td className="hidden px-3 py-2.5 xl:table-cell whitespace-nowrap">
                          {editingProduct === product.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editValues.parLevel ?? ''}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues,
                                  parLevel:
                                    e.target.value === '' ? null : parseFloat(e.target.value),
                                })
                              }
                              className="w-20 h-8 text-sm"
                              placeholder="0.0"
                            />
                          ) : (
                            <span className="font-mono">
                              {product.parLevel ? product.parLevel.toFixed(1) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </span>
                          )}
                        </td>

                        {/* Unit Price */}
                        <td className="hidden px-3 py-2.5 lg:table-cell whitespace-nowrap">
                          {editingProduct === product.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editValues.unitPrice ?? ''}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues,
                                  unitPrice:
                                    e.target.value === '' ? null : parseFloat(e.target.value),
                                })
                              }
                              className="w-20 h-8 text-sm"
                              placeholder="€"
                            />
                          ) : (
                            <span className="font-mono">
                              {product.unitPrice ? `${product.unitPrice.toFixed(2)} €` : '-'}
                            </span>
                          )}
                        </td>

                        {/* Total Value */}
                        <td className="hidden px-3 py-2.5 md:table-cell whitespace-nowrap">
                          <span className="font-mono font-medium text-green-600">
                            {product.unitPrice
                              ? `${calculateTotalValue(product).toFixed(2)} €`
                              : '-'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="pl-3 pr-6 py-2.5">
                          {editingProduct === product.id ? (
                            <div className="flex gap-1">
                              <Button
                                onClick={() => saveEdit(product.id)}
                                size="sm"
                                className="h-7 w-7 bg-green-600 p-0 hover:bg-green-700"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                onClick={cancelEditing}
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <Button
                                onClick={() => startEditing(product)}
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                onClick={() => deleteProduct(product.id, product.name)}
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
                  </div>
                </div>
              </div>
              </>
            ) : (
              <div className="py-8 text-center">
                <Package className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <p className="text-gray-500">
                  {searchQuery ? t('inventory.noResults') : t('inventory.empty')}
                </p>
                {searchQuery && (
                  <Button
                    onClick={() => setSearchQuery('')}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    {t('inventory.clearSearch')}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
