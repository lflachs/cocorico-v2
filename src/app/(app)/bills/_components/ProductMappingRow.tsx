'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Plus, X } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import { SUPPORTED_UNITS, UNIT_LABELS } from '@/lib/constants/units';

/**
 * Product Mapping Row
 * Single product with mapping selector and editable fields
 */

type ExtractedProduct = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  mappedProductId?: string;
};

type InventoryProduct = {
  id: string;
  name: string;
  unit: string;
};

type ProductMappingRowProps = {
  product: ExtractedProduct;
  onMapping: (mappedProductId: string | undefined) => void;
  onProductUpdate: (productId: string, updates: Partial<ExtractedProduct>) => void;
};

export function ProductMappingRow({ product, onMapping, onProductUpdate }: ProductMappingRowProps) {
  const { t } = useLanguage();
  const [inventoryProducts, setInventoryProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Local state for editable fields
  const [editedName, setEditedName] = useState(product.name);
  const [editedQuantity, setEditedQuantity] = useState(product.quantity);
  const [editedUnit, setEditedUnit] = useState(product.unit.toUpperCase());
  const [editedUnitPrice, setEditedUnitPrice] = useState(product.unitPrice);

  useEffect(() => {
    loadInventoryProducts();
  }, []);

  // Update total when quantity or unit price changes
  useEffect(() => {
    const newTotal = editedQuantity * editedUnitPrice;
    if (newTotal !== product.totalPrice) {
      onProductUpdate(product.id, {
        name: editedName,
        quantity: editedQuantity,
        unit: editedUnit,
        unitPrice: editedUnitPrice,
        totalPrice: newTotal,
      });
    }
  }, [editedQuantity, editedUnitPrice, editedName, editedUnit]);

  const loadInventoryProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products');

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      setInventoryProducts(data);
    } catch (error) {
      console.error('Error loading inventory products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (value: string) => {
    if (value === '__none__') {
      onMapping(undefined);
    } else {
      onMapping(value);
    }
  };

  const handleUnitChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setEditedUnit(upperValue);
  };

  const isMapped = !!product.mappedProductId;
  const hasValidUnit = SUPPORTED_UNITS.includes(editedUnit as any);

  const calculatedTotal = editedQuantity * editedUnitPrice;

  return (
    <div
      className={`p-4 rounded-lg border-2 transition-colors ${
        !hasValidUnit
          ? 'border-red-300 bg-red-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      <div className="space-y-4">
        {/* Header with status badges */}
        <div className="flex items-center gap-2">
          {isMapped && (
            <Badge variant="default" className="bg-blue-600">
              {t('bills.confirm.mappedToExisting')}
            </Badge>
          )}
          {!isMapped && (
            <Badge variant="outline" className="border-blue-500 text-blue-700">
              {t('bills.confirm.willCreateNew')}
            </Badge>
          )}
          {!hasValidUnit && (
            <Badge variant="destructive" className="bg-red-600">
              <AlertCircle className="w-3 h-3 mr-1" />
              {t('bills.confirm.invalidUnit')}
            </Badge>
          )}
        </div>

        {/* Editable Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700 block mb-1">
              {t('bills.confirm.productName')}
            </label>
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="bg-white"
              placeholder={t('bills.confirm.productName')}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              {t('bills.confirm.quantity')}
            </label>
            <Input
              type="number"
              step="0.01"
              value={editedQuantity}
              onChange={(e) => setEditedQuantity(parseFloat(e.target.value) || 0)}
              className="bg-white"
              placeholder="0"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              {t('bills.confirm.unit')}
            </label>
            <Select value={editedUnit} onValueChange={handleUnitChange}>
              <SelectTrigger className={`bg-white ${!hasValidUnit ? 'border-red-500' : ''}`}>
                <SelectValue placeholder={t('bills.confirm.unit')} />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_UNITS.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit} - {UNIT_LABELS[unit]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!hasValidUnit && (
              <p className="text-xs text-red-600 mt-1">{t('bills.confirm.unitMustBe')}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              {t('bills.confirm.unitPrice')} (€)
            </label>
            <Input
              type="number"
              step="0.01"
              value={editedUnitPrice}
              onChange={(e) => setEditedUnitPrice(parseFloat(e.target.value) || 0)}
              className="bg-white"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              {t('bills.confirm.totalPrice')} (€)
            </label>
            <Input
              type="number"
              value={calculatedTotal.toFixed(2)}
              readOnly
              className="bg-gray-100 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Mapping Selector (Optional) */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            {t('bills.confirm.mapToProduct')}
          </label>
          <div className="relative">
            <Select
              value={product.mappedProductId || '__none__'}
              onValueChange={handleMappingChange}
              disabled={loading}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder={t('bills.confirm.leaveEmpty')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Plus className="w-4 h-4" />
                    {t('bills.confirm.createAsNew')}
                  </div>
                </SelectItem>
                {inventoryProducts.map((invProduct) => (
                  <SelectItem key={invProduct.id} value={invProduct.id}>
                    {invProduct.name} ({invProduct.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {product.mappedProductId && (
              <button
                onClick={() => onMapping(undefined)}
                className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {t('bills.confirm.mapHint')}
          </p>
        </div>
      </div>
    </div>
  );
}
