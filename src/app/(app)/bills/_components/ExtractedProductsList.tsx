'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';
import { ProductMappingRow } from './ProductMappingRow';
import { useLanguage } from '@/providers/LanguageProvider';

/**
 * Extracted Products List
 * Display extracted products with mapping controls
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

type ExtractedProductsListProps = {
  products: ExtractedProduct[];
  onProductMapping: (productId: string, mappedProductId: string | undefined) => void;
  onProductUpdate: (productId: string, updates: Partial<ExtractedProduct>) => void;
};

export function ExtractedProductsList({ products, onProductMapping, onProductUpdate }: ExtractedProductsListProps) {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          {t('bills.confirm.extractedProducts')}
        </CardTitle>
        <CardDescription>{t('bills.confirm.extractedProducts.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {products.map((product) => (
            <ProductMappingRow
              key={product.id}
              product={product}
              onMapping={(mappedId) => onProductMapping(product.id, mappedId)}
              onProductUpdate={onProductUpdate}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
