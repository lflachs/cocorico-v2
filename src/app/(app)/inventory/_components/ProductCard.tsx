import { type Product } from '@prisma/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

/**
 * ProductCard Component (Server Component)
 * Displays a single product's summary using shadcn/ui
 */

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const isLowStock = product.trackable && product.parLevel && product.quantity < product.parLevel;

  return (
    <Link href={`/inventory/${product.id}`} className="block transition-all hover:scale-[1.02]">
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
              {isLowStock && <Badge variant="destructive">Low Stock</Badge>}
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Quantity:</span>
                <span className="font-medium text-gray-900">
                  {product.quantity} {product.unit.toLowerCase()}
                </span>
              </div>

              {product.unitPrice && (
                <div className="flex justify-between text-gray-600">
                  <span>Unit Price:</span>
                  <span className="font-medium text-gray-900">€{product.unitPrice.toFixed(2)}</span>
                </div>
              )}

              {product.category && (
                <div className="flex justify-between text-gray-600">
                  <span>Category:</span>
                  <Badge variant="secondary" className="capitalize">
                    {product.category}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
