import { db } from '@/lib/db/client';
import type { Product } from '@prisma/client';
import type { ProductInput, UpdateProductInput, CompositeProductInput } from '@/lib/validations/product.schema';

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

/**
 * Composite Product Service
 * Handles composite product creation and management
 */

export async function createCompositeProduct(data: CompositeProductInput) {
  return await db.product.create({
    data: {
      name: data.name,
      quantity: 0, // Initial quantity is 0
      unit: data.unit,
      unitPrice: data.unitPrice,
      category: data.category,
      trackable: data.trackable ?? false,
      parLevel: data.parLevel,
      isComposite: true,
      yieldQuantity: data.yieldQuantity,
      compositeIngredients: {
        create: data.ingredients.map((ingredient) => ({
          baseProductId: ingredient.baseProductId,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
        })),
      },
    },
    include: {
      compositeIngredients: {
        include: {
          baseProduct: true,
        },
      },
    },
  });
}

export async function updateCompositeProduct(id: string, data: CompositeProductInput) {
  // Delete existing ingredients and create new ones
  await db.compositeIngredient.deleteMany({
    where: { compositeProductId: id },
  });

  return await db.product.update({
    where: { id },
    data: {
      name: data.name,
      unit: data.unit,
      unitPrice: data.unitPrice,
      category: data.category,
      trackable: data.trackable,
      parLevel: data.parLevel,
      yieldQuantity: data.yieldQuantity,
      compositeIngredients: {
        create: data.ingredients.map((ingredient) => ({
          baseProductId: ingredient.baseProductId,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
        })),
      },
    },
    include: {
      compositeIngredients: {
        include: {
          baseProduct: true,
        },
      },
    },
  });
}

export async function deleteCompositeProduct(id: string): Promise<void> {
  // Check if composite product is used as an ingredient in other composites
  const usedInComposites = await db.compositeIngredient.count({
    where: { baseProductId: id },
  });

  if (usedInComposites > 0) {
    throw new Error('Cannot delete composite product that is used as an ingredient in other composite products');
  }

  // Ingredients will be deleted automatically due to cascade
  await db.product.delete({
    where: { id },
  });
}

/**
 * Bulk create products
 * Efficiently creates multiple products in a single transaction
 */
export async function bulkCreateProducts(products: ProductInput[]): Promise<{ count: number }> {
  const result = await db.product.createMany({
    data: products.map((product) => ({
      name: product.name,
      quantity: product.quantity,
      unit: product.unit,
      unitPrice: product.unitPrice,
      totalValue: product.totalValue,
      category: product.category,
      trackable: product.trackable ?? false,
      parLevel: product.parLevel,
    })),
    skipDuplicates: true, // Skip products with duplicate names
  });

  return result;
}
