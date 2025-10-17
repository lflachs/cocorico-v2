import { z } from 'zod';

/**
 * Recipe Ingredient Schema
 * Validates ingredients for a dish recipe
 */
export const recipeIngredientSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantityRequired: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
});

export type RecipeIngredientInput = z.infer<typeof recipeIngredientSchema>;

/**
 * Recipe Ingredient with ID (for updates)
 */
export const recipeIngredientWithIdSchema = recipeIngredientSchema.extend({
  id: z.string().optional(),
});

export type RecipeIngredientWithId = z.infer<typeof recipeIngredientWithIdSchema>;

/**
 * Dish Create Schema
 * Validates dish creation data
 */
export const createDishSchema = z.object({
  name: z.string().min(1, 'Dish name is required').max(100, 'Name too long'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  recipeIngredients: z.array(recipeIngredientSchema).optional(),
});

export type CreateDishInput = z.infer<typeof createDishSchema>;

/**
 * Dish Update Schema
 * Validates dish update data
 */
export const updateDishSchema = z.object({
  name: z.string().min(1, 'Dish name is required').max(100, 'Name too long').optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  recipeIngredients: z.array(recipeIngredientWithIdSchema).optional(),
});

export type UpdateDishInput = z.infer<typeof updateDishSchema>;

/**
 * Dish Query Schema
 * Validates query parameters for listing dishes
 */
export const dishQuerySchema = z.object({
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  includeRecipe: z.boolean().default(false),
  includeSales: z.boolean().default(false),
});

export type DishQuery = z.infer<typeof dishQuerySchema>;
