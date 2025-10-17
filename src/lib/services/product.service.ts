import { db } from '@/lib/db/client';
import type { Product } from '@prisma/client';
import type { ProductInput, UpdateProductInput } from '@/lib/validations/product.schema';

/**
 * Product Service
 * Handles all product-related business logic
 */

export async function createProduct(data: ProductInput): Promise<Product> {
  return await db.product.create({
    data: {
      name: data.name,
      quantity: data.quantity,
      unit: data.unit,
      unitPrice: data.unitPrice,
      totalValue: data.totalValue,
      category: data.category,
      trackable: data.trackable ?? false,
      parLevel: data.parLevel,
    },
  });
}

export async function updateProduct(id: string, data: UpdateProductInput): Promise<Product> {
  return await db.product.update({
    where: { id },
    data,
  });
}

export async function getAllProducts(): Promise<Product[]> {
  return await db.product.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function deleteProduct(id: string): Promise<void> {
  // Check if product is used in recipes
  const recipeCount = await db.recipeIngredient.count({
    where: { productId: id },
  });

  if (recipeCount > 0) {
    throw new Error('Cannot delete product that is used in recipes');
  }

  await db.product.delete({
    where: { id },
  });
}

export async function searchProducts(query: string): Promise<Product[]> {
  return await db.product.findMany({
    where: {
      name: {
        contains: query,
        mode: 'insensitive',
      },
    },
    orderBy: { name: 'asc' },
    take: 20,
  });
}
