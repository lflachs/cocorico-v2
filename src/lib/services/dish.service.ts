import { db } from '@/lib/db/client';
import {
  type CreateDishInput,
  type UpdateDishInput,
  type DishQuery,
} from '@/lib/validations/dish.schema';
import type { Dish, RecipeIngredient } from '@prisma/client';

/**
 * Dish with Recipe Ingredients
 */
export type DishWithRecipe = Dish & {
  recipeIngredients: (RecipeIngredient & {
    product: {
      id: string;
      name: string;
      unit: string;
      quantity: number;
      unitPrice: number | null;
    };
  })[];
};

/**
 * Get all dishes with optional filtering
 */
export async function getDishes(query: DishQuery = {}): Promise<DishWithRecipe[]> {
  const { isActive, search, includeRecipe, includeSales } = query;

  const dishes = await db.dish.findMany({
    where: {
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    include: {
      recipeIngredients: includeRecipe
        ? {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                  quantity: true,
                  unitPrice: true,
                },
              },
            },
          }
        : false,
      sales: includeSales,
    },
    orderBy: { name: 'asc' },
  });

  return dishes as DishWithRecipe[];
}

/**
 * Get dish by ID
 */
export async function getDishById(id: string): Promise<DishWithRecipe | null> {
  const dish = await db.dish.findUnique({
    where: { id },
    include: {
      recipeIngredients: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              unit: true,
              quantity: true,
              unitPrice: true,
            },
          },
        },
      },
    },
  });

  return dish as DishWithRecipe | null;
}

/**
 * Create a new dish
 */
export async function createDish(data: CreateDishInput): Promise<Dish> {
  const { recipeIngredients, ...dishData } = data;

  const dish = await db.dish.create({
    data: {
      ...dishData,
      recipeIngredients: recipeIngredients
        ? {
            create: recipeIngredients.map((ingredient) => ({
              productId: ingredient.productId,
              quantityRequired: ingredient.quantityRequired,
              unit: ingredient.unit,
            })),
          }
        : undefined,
    },
    include: {
      recipeIngredients: {
        include: {
          product: true,
        },
      },
    },
  });

  return dish;
}

/**
 * Update an existing dish
 */
export async function updateDish(id: string, data: UpdateDishInput): Promise<Dish> {
  const { recipeIngredients, ...dishData } = data;

  // If recipe ingredients are provided, replace all existing ones
  if (recipeIngredients) {
    // Delete existing recipe ingredients
    await db.recipeIngredient.deleteMany({
      where: { dishId: id },
    });

    // Create new recipe ingredients
    await db.recipeIngredient.createMany({
      data: recipeIngredients.map((ingredient) => ({
        dishId: id,
        productId: ingredient.productId,
        quantityRequired: ingredient.quantityRequired,
        unit: ingredient.unit,
      })),
    });
  }

  // Update the dish
  const dish = await db.dish.update({
    where: { id },
    data: dishData,
    include: {
      recipeIngredients: {
        include: {
          product: true,
        },
      },
    },
  });

  return dish;
}

/**
 * Delete a dish
 */
export async function deleteDish(id: string): Promise<void> {
  // Check if dish has sales
  const salesCount = await db.sale.count({
    where: { dishId: id },
  });

  if (salesCount > 0) {
    throw new Error('Cannot delete dish with sales history');
  }

  // Delete recipe ingredients first (cascade should handle this, but being explicit)
  await db.recipeIngredient.deleteMany({
    where: { dishId: id },
  });

  // Delete the dish
  await db.dish.delete({
    where: { id },
  });
}

/**
 * Check if a dish can be made based on current inventory
 */
export async function canMakeDish(dishId: string): Promise<{
  canMake: boolean;
  missingIngredients: string[];
}> {
  const dish = await getDishById(dishId);

  if (!dish) {
    throw new Error('Dish not found');
  }

  const missingIngredients: string[] = [];

  for (const ingredient of dish.recipeIngredients) {
    if (ingredient.product.quantity < ingredient.quantityRequired) {
      missingIngredients.push(ingredient.product.name);
    }
  }

  return {
    canMake: missingIngredients.length === 0,
    missingIngredients,
  };
}

/**
 * Calculate food cost for a dish
 */
export async function calculateDishCost(dishId: string): Promise<number> {
  const dish = await db.dish.findUnique({
    where: { id: dishId },
    include: {
      recipeIngredients: {
        include: {
          product: {
            select: {
              unitPrice: true,
            },
          },
        },
      },
    },
  });

  if (!dish) {
    throw new Error('Dish not found');
  }

  let totalCost = 0;

  for (const ingredient of dish.recipeIngredients) {
    if (ingredient.product.unitPrice) {
      totalCost += ingredient.product.unitPrice * ingredient.quantityRequired;
    }
  }

  return totalCost;
}
