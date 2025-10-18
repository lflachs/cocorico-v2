/**
 * Supported measurement units
 */

export const SUPPORTED_UNITS = ['KG', 'G', 'L', 'ML', 'CL', 'PC', 'BUNCH', 'CLOVE'] as const;

export type SupportedUnit = (typeof SUPPORTED_UNITS)[number];

export const UNIT_LABELS: Record<SupportedUnit, string> = {
  // Weight
  KG: 'Kilograms',
  G: 'Grams',
  // Volume
  L: 'Liters',
  ML: 'Milliliters',
  CL: 'Centiliters',
  // Count
  PC: 'Pieces',
  BUNCH: 'Bunch',
  CLOVE: 'Clove',
};

export const UNIT_ABBREVIATIONS: Record<SupportedUnit, string> = {
  // Weight
  KG: 'kg',
  G: 'g',
  // Volume
  L: 'l',
  ML: 'ml',
  CL: 'cl',
  // Count
  PC: 'pc',
  BUNCH: 'bunch',
  CLOVE: 'clove',
};
