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
} from 'lucide-react';
import { type Product } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useLanguage } from '@/providers/LanguageProvider';
import { VoiceAssistant } from '@/components/voice/VoiceAssistant';
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
};

export function InventoryView({ initialProducts }: InventoryViewProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('inventory');
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    name: string;
    quantity: number;
    unitPrice: number | null;
  }>({ name: '', quantity: 0, unitPrice: null });

  // Filter products based on search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (product: Product): 'good' | 'low' | 'critical' | null => {
    if (!product.trackable || !product.parLevel) return null;

    const percentOfPar = (product.quantity / product.parLevel) * 100;

    if (percentOfPar <= 25) return 'critical';
    if (percentOfPar <= 50) return 'low';
    return 'good';
  };

  const getStatusBadge = (status: 'good' | 'low' | 'critical' | null) => {
    if (!status) return null;

    const styles = {
      good: 'bg-green-100 text-green-800 border-green-200',
      low: 'bg-orange-100 text-orange-800 border-orange-200',
      critical: 'bg-red-100 text-red-800 border-red-200',
    };

    const labels = {
      good: t('inventory.status.good'),
      low: t('inventory.status.low'),
      critical: t('inventory.status.critical'),
    };

    return (
      <Badge variant="outline" className={`text-xs ${styles[status]}`}>
        {labels[status]}
      </Badge>
    );
  };

  const calculateStockValue = () => {
    return products.reduce((total, product) => {
      const value = (product.unitPrice || 0) * product.quantity;
      return total + value;
    }, 0);
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
    });
  };

  const cancelEditing = () => {
    setEditingProduct(null);
    setEditValues({ name: '', quantity: 0, unitPrice: null });
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
        }),
      });

      if (response.ok) {
        await fetchProducts();
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
        await fetchProducts();
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
      ...products.map((p) => {
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

  const productsWithValue = products.filter((p) => p.unitPrice && p.unitPrice > 0);
  const avgValue =
    productsWithValue.length > 0 ? calculateStockValue() / productsWithValue.length : 0;

  return (
    <>
      {/* Voice Assistant */}
      <VoiceAssistant onInventoryUpdate={fetchProducts} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="inventory" className="gap-2">
            <Package className="w-4 h-4" />
            Stock
          </TabsTrigger>
          <TabsTrigger value="producers" className="gap-2">
            <MapPin className="w-4 h-4" />
            Trouver des producteurs
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
                <div className="text-3xl font-bold text-green-600">
                  {calculateStockValue().toFixed(2)} €
                </div>
                <p className="mt-1 text-sm font-medium text-green-700">
                  {t('inventory.value.total')}
                </p>
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{productsWithValue.length}</div>
                <p className="mt-1 text-sm font-medium text-blue-700">
                  {t('inventory.value.valued')}
                </p>
              </div>
              <div className="rounded-lg border border-purple-100 bg-purple-50 p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{avgValue.toFixed(2)} €</div>
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
            <CardTitle className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {t('inventory.title')}
              </span>
              <div className="flex flex-wrap gap-2">
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

            {/* Products Table */}
            {filteredProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-2 py-3 text-left font-medium">
                        {t('inventory.table.product')}
                      </th>
                      <th className="px-2 py-3 text-left font-medium">
                        {t('inventory.table.quantity')}
                      </th>
                      <th className="px-2 py-3 text-left font-medium">
                        {t('inventory.table.unit')}
                      </th>
                      <th className="hidden px-2 py-3 text-left font-medium xl:table-cell">
                        {t('inventory.table.parLevel')}
                      </th>
                      <th className="hidden px-2 py-3 text-left font-medium lg:table-cell">
                        {t('inventory.table.status')}
                      </th>
                      <th className="hidden px-2 py-3 text-left font-medium lg:table-cell">
                        {t('inventory.table.unitPrice')}
                      </th>
                      <th className="hidden px-2 py-3 text-left font-medium md:table-cell">
                        {t('inventory.table.totalValue')}
                      </th>
                      <th className="px-2 py-3 text-left font-medium">
                        {t('inventory.table.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="border-b hover:bg-gray-50">
                        {/* Product Name */}
                        <td className="w-1/3 max-w-0 px-2 py-3 font-medium">
                          {editingProduct === product.id ? (
                            <Input
                              value={editValues.name}
                              onChange={(e) =>
                                setEditValues({ ...editValues, name: e.target.value })
                              }
                              className="w-full text-xs"
                            />
                          ) : (
                            <div className="truncate pr-2" title={product.name}>
                              {product.name}
                            </div>
                          )}
                        </td>

                        {/* Quantity */}
                        <td className="px-2 py-3">
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
                              className="w-20 text-xs"
                            />
                          ) : (
                            <span className="font-mono">{product.quantity.toFixed(1)}</span>
                          )}
                        </td>

                        {/* Unit */}
                        <td className="px-2 py-3">
                          <Badge variant="outline" className="text-xs">
                            {product.unit}
                          </Badge>
                        </td>

                        {/* Par Level */}
                        <td className="hidden px-2 py-3 xl:table-cell">
                          {product.trackable && product.parLevel ? (
                            <span className="font-mono">{product.parLevel.toFixed(1)}</span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="hidden px-2 py-3 lg:table-cell">
                          {getStatusBadge(getStockStatus(product))}
                        </td>

                        {/* Unit Price */}
                        <td className="hidden px-2 py-3 lg:table-cell">
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
                              className="w-20 text-xs"
                              placeholder="€"
                            />
                          ) : (
                            <span className="font-mono">
                              {product.unitPrice ? `${product.unitPrice.toFixed(2)} €` : '-'}
                            </span>
                          )}
                        </td>

                        {/* Total Value */}
                        <td className="hidden px-2 py-3 md:table-cell">
                          <span className="font-mono font-medium text-green-600">
                            {product.unitPrice
                              ? `${calculateTotalValue(product).toFixed(2)} €`
                              : '-'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-2 py-3">
                          {editingProduct === product.id ? (
                            <div className="flex gap-1">
                              <Button
                                onClick={() => saveEdit(product.id)}
                                size="sm"
                                className="h-6 w-6 bg-green-600 p-0 hover:bg-green-700"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={cancelEditing}
                                size="sm"
                                variant="outline"
                                className="h-6 w-6 p-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <Button
                                onClick={() => startEditing(product)}
                                size="sm"
                                variant="outline"
                                className="h-6 w-6 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={() => deleteProduct(product.id, product.name)}
                                size="sm"
                                variant="outline"
                                className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
