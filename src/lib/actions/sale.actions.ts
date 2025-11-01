'use server';

import { revalidatePath, unstable_noStore as noStore } from 'next/cache';
import * as saleService from '@/lib/services/sale.service';
import {
  createSaleSchema,
  updateSaleSchema,
  type CreateSaleInput,
  type UpdateSaleInput,
  type SaleQuery,
  type SalesSummaryQuery,
  type TodaysSalesQuery,
} from '@/lib/validations/sale.schema';

/**
 * Get all sales
 */
export async function getSalesAction(query?: SaleQuery) {
  try {
    const sales = await saleService.getSales(query);
    return { success: true, data: sales };
  } catch (error) {
    console.error('Error fetching sales:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch sales',
    };
  }
}

/**
 * Get sale by ID
 */
export async function getSaleByIdAction(id: string) {
  try {
    const sale = await saleService.getSaleById(id);
    if (!sale) {
      return { success: false, error: 'Sale not found' };
    }
    return { success: true, data: sale };
  } catch (error) {
    console.error('Error fetching sale:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch sale',
    };
  }
}

/**
 * Create a new sale (records sale and depletes inventory)
 */
export async function createSaleAction(input: CreateSaleInput) {
  try {
    const validatedData = createSaleSchema.parse(input);
    const sale = await saleService.createSale(validatedData);
    revalidatePath('/today');
    revalidatePath('/inventory');
    return { success: true, data: sale };
  } catch (error) {
    console.error('Error creating sale:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create sale',
    };
  }
}

/**
 * Update a sale
 */
export async function updateSaleAction(id: string, input: UpdateSaleInput) {
  try {
    const validatedData = updateSaleSchema.parse(input);
    const sale = await saleService.updateSale(id, validatedData);
    revalidatePath('/today');
    revalidatePath('/inventory');
    return { success: true, data: sale };
  } catch (error) {
    console.error('Error updating sale:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update sale',
    };
  }
}

/**
 * Delete a sale (restores inventory)
 */
export async function deleteSaleAction(id: string) {
  try {
    await saleService.deleteSale(id);
    revalidatePath('/today');
    revalidatePath('/inventory');
    return { success: true };
  } catch (error) {
    console.error('Error deleting sale:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete sale',
    };
  }
}

/**
 * Get today's sales
 */
export async function getTodaysSalesAction(query?: TodaysSalesQuery) {
  noStore(); // Prevent caching for real-time sales data
  try {
    const sales = await saleService.getTodaysSales(query);
    return { success: true, data: sales };
  } catch (error) {
    console.error('Error fetching today\'s sales:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch today\'s sales',
    };
  }
}

/**
 * Get sales summary
 */
export async function getSalesSummaryAction(query: SalesSummaryQuery) {
  try {
    const summary = await saleService.getSalesSummary(query);
    return { success: true, data: summary };
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch sales summary',
    };
  }
}

/**
 * Get top selling dishes
 */
export async function getTopSellingDishesAction(
  startDate: Date,
  endDate: Date,
  limit: number = 10
) {
  try {
    const dishes = await saleService.getTopSellingDishes(startDate, endDate, limit);
    return { success: true, data: dishes };
  } catch (error) {
    console.error('Error fetching top selling dishes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch top selling dishes',
    };
  }
}

/**
 * Get today's sales summary
 * Note: noStore() prevents caching for real-time data
 */
export async function getTodaysSalesSummaryAction() {
  noStore(); // Prevent caching - we need fresh data after each sale
  try {
    const summary = await saleService.getTodaysSalesSummary();
    return { success: true, data: summary };
  } catch (error) {
    console.error('Error fetching today\'s sales summary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch today\'s sales summary',
    };
  }
}
