'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import { type Product } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useLanguage } from '@/providers/LanguageProvider';
import { VoiceAssistant } from '@/components/voice/VoiceAssistant';

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
      ['Product', 'Quantity', 'Unit', 'Unit Price', 'Total Value', 'Par Level', 'Status'].join(
        ','
      ),
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

      <div className="space-y-6">
        {/* Stock Valuation Summary */}
        <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Euro className="w-5 h-5 text-green-600" />
            {t('inventory.value.title')}
          </CardTitle>
          <CardDescription>{t('inventory.value.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-100 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-600">
                {calculateStockValue().toFixed(2)} €
              </div>
              <p className="text-sm text-green-700 font-medium mt-1">
                {t('inventory.value.total')}
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{productsWithValue.length}</div>
              <p className="text-sm text-blue-700 font-medium mt-1">
                {t('inventory.value.valued')}
              </p>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{avgValue.toFixed(2)} €</div>
              <p className="text-sm text-purple-700 font-medium mt-1">
                {t('inventory.value.average')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <span className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {t('inventory.title')}
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={fetchProducts}
                variant="outline"
                size="sm"
                disabled={loading}
                className="flex-1 sm:flex-none"
              >
                <RefreshCw className={`w-4 h-4 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{t('inventory.refresh')}</span>
              </Button>
              <Button
                onClick={exportStock}
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
              >
                <Download className="w-4 h-4 sm:mr-2" />
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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
                    <th className="text-left py-3 px-2 font-medium">
                      {t('inventory.table.product')}
                    </th>
                    <th className="text-left py-3 px-2 font-medium">
                      {t('inventory.table.quantity')}
                    </th>
                    <th className="text-left py-3 px-2 font-medium">
                      {t('inventory.table.unit')}
                    </th>
                    <th className="text-left py-3 px-2 font-medium hidden xl:table-cell">
                      {t('inventory.table.parLevel')}
                    </th>
                    <th className="text-left py-3 px-2 font-medium hidden lg:table-cell">
                      {t('inventory.table.status')}
                    </th>
                    <th className="text-left py-3 px-2 font-medium hidden lg:table-cell">
                      {t('inventory.table.unitPrice')}
                    </th>
                    <th className="text-left py-3 px-2 font-medium hidden md:table-cell">
                      {t('inventory.table.totalValue')}
                    </th>
                    <th className="text-left py-3 px-2 font-medium">
                      {t('inventory.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-gray-50">
                      {/* Product Name */}
                      <td className="py-3 px-2 font-medium max-w-0 w-1/3">
                        {editingProduct === product.id ? (
                          <Input
                            value={editValues.name}
                            onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                            className="w-full text-xs"
                          />
                        ) : (
                          <div className="truncate pr-2" title={product.name}>
                            {product.name}
                          </div>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-2">
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
                      <td className="py-3 px-2">
                        <Badge variant="outline" className="text-xs">
                          {product.unit}
                        </Badge>
                      </td>

                      {/* Par Level */}
                      <td className="py-3 px-2 hidden xl:table-cell">
                        {product.trackable && product.parLevel ? (
                          <span className="font-mono">{product.parLevel.toFixed(1)}</span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-2 hidden lg:table-cell">
                        {getStatusBadge(getStockStatus(product))}
                      </td>

                      {/* Unit Price */}
                      <td className="py-3 px-2 hidden lg:table-cell">
                        {editingProduct === product.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editValues.unitPrice ?? ''}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                unitPrice: e.target.value === '' ? null : parseFloat(e.target.value),
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
                      <td className="py-3 px-2 hidden md:table-cell">
                        <span className="font-mono font-medium text-green-600">
                          {product.unitPrice
                            ? `${calculateTotalValue(product).toFixed(2)} €`
                            : '-'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-2">
                        {editingProduct === product.id ? (
                          <div className="flex gap-1">
                            <Button
                              onClick={() => saveEdit(product.id)}
                              size="sm"
                              className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"
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
            <div className="text-center py-8">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">
                {searchQuery ? t('inventory.noResults') : t('inventory.empty')}
              </p>
              {searchQuery && (
                <Button onClick={() => setSearchQuery('')} variant="outline" size="sm" className="mt-2">
                  {t('inventory.clearSearch')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </>
  );
}
