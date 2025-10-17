'use server';

import { revalidatePath } from 'next/cache';
import * as dishService from '@/lib/services/dish.service';
import {
  createDishSchema,
  updateDishSchema,
  type CreateDishInput,
  type UpdateDishInput,
  type DishQuery,
} from '@/lib/validations/dish.schema';

/**
 * Get all dishes
 */
export async function getDishesAction(query?: DishQuery) {
  try {
    const dishes = await dishService.getDishes(query);
    return { success: true, data: dishes };
  } catch (error) {
    console.error('Error fetching dishes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch dishes',
    };
  }
}

/**
 * Get dish by ID
 */
export async function getDishByIdAction(id: string) {
  try {
    const dish = await dishService.getDishById(id);
    if (!dish) {
      return { success: false, error: 'Dish not found' };
    }
    return { success: true, data: dish };
  } catch (error) {
    console.error('Error fetching dish:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch dish',
    };
  }
}

/**
 * Create a new dish
 */
export async function createDishAction(input: CreateDishInput) {
  try {
    const validatedData = createDishSchema.parse(input);
    const dish = await dishService.createDish(validatedData);
    revalidatePath('/menu');
    return { success: true, data: dish };
  } catch (error) {
    console.error('Error creating dish:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create dish',
    };
  }
}

/**
 * Update a dish
 */
export async function updateDishAction(id: string, input: UpdateDishInput) {
  try {
    const validatedData = updateDishSchema.parse(input);
    const dish = await dishService.updateDish(id, validatedData);
    revalidatePath('/menu');
    revalidatePath(`/menu/dishes/${id}`);
    return { success: true, data: dish };
  } catch (error) {
    console.error('Error updating dish:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update dish',
    };
  }
}

/**
 * Delete a dish
 */
export async function deleteDishAction(id: string) {
  try {
    await dishService.deleteDish(id);
    revalidatePath('/menu');
    return { success: true };
  } catch (error) {
    console.error('Error deleting dish:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete dish',
    };
  }
}

/**
 * Check if a dish can be made
 */
export async function canMakeDishAction(dishId: string) {
  try {
    const result = await dishService.canMakeDish(dishId);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error checking dish availability:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check availability',
    };
  }
}

/**
 * Calculate dish cost
 */
export async function calculateDishCostAction(dishId: string) {
  try {
    const cost = await dishService.calculateDishCost(dishId);
    return { success: true, data: cost };
  } catch (error) {
    console.error('Error calculating dish cost:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to calculate cost',
    };
  }
}
