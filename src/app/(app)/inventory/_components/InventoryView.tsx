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
  MapPin,
  AlertTriangle,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { type Product } from '@prisma/client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { useLanguage } from '@/providers/LanguageProvider';
import Link from 'next/link';
import { CreateButton } from '@/components/CreateButton';
import dynamic from 'next/dynamic';

// Dynamically import ProducerSearch to avoid SSR issues with Leaflet
const ProducerSearch = dynamic(
  () => import('@/components/producers/ProducerSearch').then((mod) => ({ default: mod.ProducerSearch })),
  { ssr: false, loading: () => <div className="p-8 text-center">Loading map...</div> }
);

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

  const [activeTab, setActiveTab] = useState('inventory');
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="inventory" className="gap-1 sm:gap-2">
            <Package className="w-4 h-4 shrink-0" />
            <span className="truncate">Stock</span>
          </TabsTrigger>
          <TabsTrigger value="producers" className="gap-1 sm:gap-2">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="truncate text-xs sm:text-sm">Trouver des producteurs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-6">
          {/* Stock Valuation Summary */}
          <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Euro className="h-5 w-5 text-green-600" />
              {t('inventory.value.title')}
            </CardTitle>
            <CardDescription>{t('inventory.value.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-green-100 bg-green-50 p-4 text-center">
                <div className="text-2xl font-bold text-green-600 sm:text-3xl break-words">
                  {calculateStockValueFromProducts().toFixed(2)} €
                </div>
                <p className="mt-1 text-sm font-medium text-green-700">
                  {t('inventory.value.total')}
                </p>
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-center">
                <div className="text-xl font-bold text-blue-600 sm:text-2xl">{productsWithValue.length}</div>
                <p className="mt-1 text-sm font-medium text-blue-700">
                  {t('inventory.value.valued')}
                </p>
              </div>
              <div className="rounded-lg border border-purple-100 bg-purple-50 p-4 text-center">
                <div className="text-xl font-bold text-purple-600 sm:text-2xl break-words">{avgValue.toFixed(2)} €</div>
                <p className="mt-1 text-sm font-medium text-purple-700">
                  {t('inventory.value.average')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Inventory Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-2 min-w-0">
                <Package className="h-5 w-5 shrink-0" />
                <span className="truncate">{t('inventory.title')}</span>
              </span>
              <div className="flex flex-wrap gap-2 shrink-0">
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
            <CardDescription>{t('inventory.description')}</CardDescription>
          </CardHeader>
          <CardContent>
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
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Button
                onClick={() => {
                  setStockFilter('all');
                  updateFilterURL('all');
                }}
                size="sm"
                variant={stockFilter === 'all' ? 'default' : 'outline'}
                className="cursor-pointer shrink-0"
              >
                <Filter className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm">All Items ({initialProducts.length})</span>
              </Button>
              <Button
                onClick={() => {
                  setStockFilter('low');
                  updateFilterURL('low');
                }}
                size="sm"
                variant={stockFilter === 'low' ? 'default' : 'outline'}
                className="cursor-pointer shrink-0"
              >
                <AlertTriangle className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm">Low Stock ({lowStockCount})</span>
              </Button>
              <Button
                onClick={() => {
                  setStockFilter('critical');
                  updateFilterURL('critical');
                }}
                size="sm"
                variant={stockFilter === 'critical' ? 'default' : 'outline'}
                className="cursor-pointer shrink-0"
              >
                <AlertTriangle className="h-4 w-4 mr-1 sm:mr-2 text-red-500" />
                <span className="text-xs sm:text-sm whitespace-nowrap">Critical Only ({criticalStockCount})</span>
              </Button>
              {stockFilter !== 'all' && (
                <span className="text-xs sm:text-sm text-gray-600">
                  Showing {filteredProducts.length} of {initialProducts.length} items
                </span>
              )}
            </div>

            {/* Products Table */}
            {filteredProducts.length > 0 ? (
              <div className="-mx-6 overflow-x-auto">
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

        <TabsContent value="producers">
          <ProducerSearch />
        </TabsContent>
      </Tabs>
    </>
  );
}
