import { z } from 'zod';

/**
 * Product validation schemas
 * Used for creating and updating products
 */

export const productSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(255, 'Product name must be less than 255 characters'),
  quantity: z.number().nonnegative('Quantity cannot be negative'),
  unit: z.enum(['KG', 'G', 'L', 'ML', 'CL', 'PC', 'BUNCH', 'CLOVE'], {
    errorMap: () => ({ message: 'Unit must be KG, G, L, ML, CL, PC, BUNCH, or CLOVE' }),
  }),
  unitPrice: z.number().positive().optional(),
  totalValue: z.number().positive().optional(),
  category: z.string().max(50).optional(),
  trackable: z.boolean().default(false),
  parLevel: z.number().positive().optional(),
});

export const updateProductSchema = productSchema.partial();

export type ProductInput = z.infer<typeof productSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

/**
 * Composite product validation schemas
 * Used for creating products with recipe ingredients
 */

export const compositeIngredientSchema = z.object({
  baseProductId: z.string().min(1, 'Base product is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.enum(['KG', 'G', 'L', 'ML', 'CL', 'PC', 'BUNCH', 'CLOVE'], {
    errorMap: () => ({ message: 'Unit must be KG, G, L, ML, CL, PC, BUNCH, or CLOVE' }),
  }),
});

export const compositeProductSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(255, 'Product name must be less than 255 characters'),
  yieldQuantity: z.number().positive('Yield quantity must be positive'),
  unit: z.enum(['KG', 'G', 'L', 'ML', 'CL', 'PC', 'BUNCH', 'CLOVE'], {
    errorMap: () => ({ message: 'Unit must be KG, G, L, ML, CL, PC, BUNCH, or CLOVE' }),
  }),
  unitPrice: z.number().positive().optional(),
  category: z.string().max(50).optional(),
  trackable: z.boolean().default(false),
  parLevel: z.number().positive().optional(),
  ingredients: z
    .array(compositeIngredientSchema)
    .min(1, 'At least one ingredient is required'),
});

export type CompositeIngredientInput = z.infer<typeof compositeIngredientSchema>;
export type CompositeProductInput = z.infer<typeof compositeProductSchema>;
