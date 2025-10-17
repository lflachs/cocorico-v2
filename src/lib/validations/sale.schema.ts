import { z } from 'zod';

/**
 * Sale Create Schema
 * Validates sale recording data
 */
export const createSaleSchema = z.object({
  dishId: z.string().min(1, 'Dish is required'),
  quantitySold: z.number().int().positive('Quantity must be at least 1'),
  saleDate: z.date().default(() => new Date()),
  notes: z.string().optional(),
  userId: z.string().optional(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;

/**
 * Sale Update Schema
 * Validates sale update data
 */
export const updateSaleSchema = z.object({
  dishId: z.string().min(1, 'Dish is required').optional(),
  quantitySold: z.number().int().positive('Quantity must be at least 1').optional(),
  saleDate: z.date().optional(),
  notes: z.string().optional(),
  userId: z.string().optional(),
});

export type UpdateSaleInput = z.infer<typeof updateSaleSchema>;

/**
 * Sale Query Schema
 * Validates query parameters for listing sales
 */
export const saleQuerySchema = z.object({
  dishId: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  includeDish: z.boolean().default(false),
  includeUser: z.boolean().default(false),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.endDate >= data.startDate;
    }
    return true;
  },
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
);

export type SaleQuery = z.infer<typeof saleQuerySchema>;

/**
 * Sales Summary Query Schema
 * Validates parameters for sales aggregation
 */
export const salesSummarySchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  groupBy: z.enum(['day', 'week', 'month', 'dish']).default('day'),
}).refine(
  (data) => data.endDate >= data.startDate,
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
);

export type SalesSummaryQuery = z.infer<typeof salesSummarySchema>;

/**
 * Today's Sales Query Schema
 * Simplified schema for today's sales
 */
export const todaysSalesSchema = z.object({
  includeDish: z.boolean().default(true),
  topCount: z.number().int().positive().max(20).default(5),
});

export type TodaysSalesQuery = z.infer<typeof todaysSalesSchema>;
