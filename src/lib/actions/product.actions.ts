'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { productSchema } from '@/lib/validations/product.schema';
import { createProduct, updateProduct, deleteProduct, getAllProducts, bulkCreateProducts } from '@/lib/services/product.service';
import type { Product } from '@prisma/client';

/**
 * Product Server Actions
 * Handle form submissions and mutations from Client Components
 */

type ActionResult<T = Product> = {
  success: boolean;
  error?: string;
  data?: T;
};

export async function createProductAction(formData: FormData): Promise<ActionResult> {
  try {
    const category = formData.get('category');
    const unitPrice = formData.get('unitPrice');
    const parLevel = formData.get('parLevel');

    const rawData = {
      name: formData.get('name') as string,
      quantity: Number(formData.get('quantity')),
      unit: formData.get('unit') as 'KG' | 'L' | 'PC',
      unitPrice: unitPrice ? Number(unitPrice) : undefined,
      category: category ? (category as string) : undefined,
      trackable: formData.get('trackable') === 'true',
      parLevel: parLevel ? Number(parLevel) : undefined,
    };

    const validated = productSchema.parse(rawData);
    const product = await createProduct(validated);

    revalidatePath('/inventory');
    redirect(`/inventory/${product.id}`);
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to create product' };
  }
}

export async function deleteProductAction(productId: string): Promise<ActionResult> {
  try {
    await deleteProduct(productId);
    revalidatePath('/inventory');
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to delete product' };
  }
}

export async function getProductsAction(): Promise<ActionResult<Product[]>> {
  try {
    const products = await getAllProducts();
    return { success: true, data: products };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to fetch products' };
  }
}

/**
 * Create product without redirecting
 * Used when creating products as part of another flow (like adding dishes)
 */
export async function createProductWithoutRedirectAction(formData: FormData): Promise<ActionResult> {
  try {
    const category = formData.get('category');
    const unitPrice = formData.get('unitPrice');
    const parLevel = formData.get('parLevel');

    const rawData = {
      name: formData.get('name') as string,
      quantity: Number(formData.get('quantity')),
      unit: formData.get('unit') as 'KG' | 'L' | 'PC',
      unitPrice: unitPrice ? Number(unitPrice) : undefined,
      category: category ? (category as string) : undefined,
      trackable: formData.get('trackable') === 'true',
      parLevel: parLevel ? Number(parLevel) : undefined,
    };

    const validated = productSchema.parse(rawData);
    const product = await createProduct(validated);

    revalidatePath('/inventory');
    return { success: true, data: product };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to create product' };
  }
}

/**
 * Bulk import products from Excel/CSV
 * Used for bulk product imports from the import review page
 */
export async function bulkImportProductsAction(
  products: Array<{
    name: string;
    quantity: number;
    unit: 'KG' | 'L' | 'PC';
    unitPrice?: number;
    parLevel?: number;
    category?: string;
  }>
): Promise<ActionResult<{ count: number }>> {
  try {
    // Validate all products
    const validatedProducts = products.map((product) => {
      const totalValue = product.unitPrice ? product.quantity * product.unitPrice : undefined;

      return productSchema.parse({
        name: product.name,
        quantity: product.quantity,
        unit: product.unit,
        unitPrice: product.unitPrice,
        totalValue,
        category: product.category,
        trackable: false,
        parLevel: product.parLevel,
      });
    });

    // Bulk create
    const result = await bulkCreateProducts(validatedProducts);

    revalidatePath('/inventory');
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to import products' };
  }
}
