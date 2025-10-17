import { z } from 'zod';

/**
 * Menu Dish Schema
 * Validates dishes within a menu section
 */
export const menuDishSchema = z.object({
  dishId: z.string().min(1, 'Dish is required'),
  displayOrder: z.number().int().min(0).default(0),
  notes: z.string().optional(),
});

export type MenuDishInput = z.infer<typeof menuDishSchema>;

/**
 * Menu Dish with ID (for updates)
 */
export const menuDishWithIdSchema = menuDishSchema.extend({
  id: z.string().optional(),
  menuSectionId: z.string().optional(),
});

export type MenuDishWithId = z.infer<typeof menuDishWithIdSchema>;

/**
 * Menu Section Schema
 * Validates sections within a menu
 */
export const menuSectionSchema = z.object({
  name: z.string().min(1, 'Section name is required').max(100, 'Name too long'),
  displayOrder: z.number().int().min(0),
  dishes: z.array(menuDishSchema).default([]),
});

export type MenuSectionInput = z.infer<typeof menuSectionSchema>;

/**
 * Menu Section with ID (for updates)
 */
export const menuSectionWithIdSchema = menuSectionSchema.extend({
  id: z.string().optional(),
  menuId: z.string().optional(),
  dishes: z.array(menuDishWithIdSchema).default([]),
});

export type MenuSectionWithId = z.infer<typeof menuSectionWithIdSchema>;

/**
 * Menu Create Schema
 * Validates menu creation data
 */
export const createMenuSchema = z.object({
  name: z.string().min(1, 'Menu name is required').max(100, 'Name too long'),
  description: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  isActive: z.boolean().default(true),
  sections: z.array(menuSectionSchema).optional(),
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

export type CreateMenuInput = z.infer<typeof createMenuSchema>;

/**
 * Menu Update Schema
 * Validates menu update data
 */
export const updateMenuSchema = z.object({
  name: z.string().min(1, 'Menu name is required').max(100, 'Name too long').optional(),
  description: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  isActive: z.boolean().optional(),
  sections: z.array(menuSectionWithIdSchema).optional(),
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

export type UpdateMenuInput = z.infer<typeof updateMenuSchema>;

/**
 * Menu Query Schema
 * Validates query parameters for listing menus
 */
export const menuQuerySchema = z.object({
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  includeSections: z.boolean().default(false),
  includeDishes: z.boolean().default(false),
  currentOnly: z.boolean().default(false), // Only menus active in current date range
});

export type MenuQuery = z.infer<typeof menuQuerySchema>;
