'use server';

import { revalidatePath } from 'next/cache';
import * as menuService from '@/lib/services/menu.service';
import {
  createMenuSchema,
  updateMenuSchema,
  type CreateMenuInput,
  type UpdateMenuInput,
  type MenuQuery,
} from '@/lib/validations/menu.schema';

/**
 * Get all menus
 */
export async function getMenusAction(query?: MenuQuery) {
  try {
    const menus = await menuService.getMenus(query);
    return { success: true, data: menus };
  } catch (error) {
    console.error('Error fetching menus:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch menus',
    };
  }
}

/**
 * Get menu by ID
 */
export async function getMenuByIdAction(id: string) {
  try {
    const menu = await menuService.getMenuById(id);
    if (!menu) {
      return { success: false, error: 'Menu not found' };
    }
    return { success: true, data: menu };
  } catch (error) {
    console.error('Error fetching menu:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch menu',
    };
  }
}

/**
 * Create a new menu
 */
export async function createMenuAction(input: CreateMenuInput) {
  try {
    const validatedData = createMenuSchema.parse(input);
    const menu = await menuService.createMenu(validatedData);
    revalidatePath('/menu');
    return { success: true, data: menu };
  } catch (error) {
    console.error('Error creating menu:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create menu',
    };
  }
}

/**
 * Update a menu
 */
export async function updateMenuAction(id: string, input: UpdateMenuInput) {
  try {
    const validatedData = updateMenuSchema.parse(input);
    const menu = await menuService.updateMenu(id, validatedData);
    revalidatePath('/menu');
    revalidatePath(`/menu/${id}`);
    return { success: true, data: menu };
  } catch (error) {
    console.error('Error updating menu:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update menu',
    };
  }
}

/**
 * Delete a menu
 */
export async function deleteMenuAction(id: string) {
  try {
    await menuService.deleteMenu(id);
    revalidatePath('/menu');
    return { success: true };
  } catch (error) {
    console.error('Error deleting menu:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete menu',
    };
  }
}

/**
 * Add a dish to a menu section
 */
export async function addDishToSectionAction(
  menuSectionId: string,
  dishId: string,
  displayOrder?: number,
  notes?: string
) {
  try {
    const menuDish = await menuService.addDishToSection(
      menuSectionId,
      dishId,
      displayOrder,
      notes
    );
    revalidatePath('/menu');
    return { success: true, data: menuDish };
  } catch (error) {
    console.error('Error adding dish to section:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add dish',
    };
  }
}

/**
 * Remove a dish from a menu section
 */
export async function removeDishFromSectionAction(menuDishId: string) {
  try {
    await menuService.removeDishFromSection(menuDishId);
    revalidatePath('/menu');
    return { success: true };
  } catch (error) {
    console.error('Error removing dish from section:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove dish',
    };
  }
}

/**
 * Reorder dishes in a section
 */
export async function reorderDishesAction(
  menuSectionId: string,
  dishOrders: { id: string; displayOrder: number }[]
) {
  try {
    await menuService.reorderDishes(menuSectionId, dishOrders);
    revalidatePath('/menu');
    return { success: true };
  } catch (error) {
    console.error('Error reordering dishes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reorder dishes',
    };
  }
}

/**
 * Get active menus for today
 */
export async function getActiveMenusAction() {
  try {
    const menus = await menuService.getActiveMenusForDate(new Date());
    return { success: true, data: menus };
  } catch (error) {
    console.error('Error fetching active menus:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch active menus',
    };
  }
}
