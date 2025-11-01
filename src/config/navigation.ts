import {
  Home,
  PackageCheck,
  ChefHat,
  TrendingUp,
  ShoppingCart,
  BarChart3,
  Database,
  Receipt,
  ClipboardCheck,
  Settings,
  Trash2,
  type LucideIcon,
} from 'lucide-react';

export interface NavigationItem {
  id: string;
  href: string;
  icon: LucideIcon;
  labelKey: string;
  description?: string;
}

export interface NavigationSection {
  id: string;
  labelKey: string;
  items: NavigationItem[];
}

// HOME - Quick access at the top
const homeItems: NavigationItem[] = [
  {
    id: 'home',
    href: '/today',
    icon: Home,
    labelKey: 'nav.home',
    description: 'Ton coup d\'œil du jour',
  },
];

// CHEF WORKFLOW - Daily operations, easy access, straightforward
const chefWorkflowItems: NavigationItem[] = [
  {
    id: 'reception',
    href: '/reception',
    icon: PackageCheck,
    labelKey: 'nav.reception',
    description: 'Scanner tes livraisons',
  },
  {
    id: 'prep',
    href: '/prep',
    icon: ChefHat,
    labelKey: 'nav.prep',
    description: 'Ce qu\'il faut produire',
  },
  {
    id: 'orders',
    href: '/orders',
    icon: ShoppingCart,
    labelKey: 'nav.orders',
    description: 'Commander le réassort',
  },
  {
    id: 'sales',
    href: '/sales',
    icon: Receipt,
    labelKey: 'nav.sales',
    description: 'Entrer ton ticket de caisse',
  },
];

// MANAGEMENT - Periodic tasks (every 15 days / monthly)
const managementItems: NavigationItem[] = [
  {
    id: 'inventory',
    href: '/inventory',
    icon: ClipboardCheck,
    labelKey: 'nav.inventory',
    description: 'Confirmer ton stock physique',
  },
  {
    id: 'menu',
    href: '/menu',
    icon: ChefHat,
    labelKey: 'nav.menu',
    description: 'Gérer tes recettes',
  },
  {
    id: 'dlc',
    href: '/dlc',
    icon: Trash2,
    labelKey: 'nav.dlc',
    description: 'Dates de péremption',
  },
];

// ANALYTICS & INSIGHTS - Performance tracking
const analyticsItems: NavigationItem[] = [
  {
    id: 'food-cost',
    href: '/food-cost',
    icon: TrendingUp,
    labelKey: 'nav.foodCost',
    description: 'Ton point rentabilité',
  },
  {
    id: 'insights',
    href: '/insights',
    icon: BarChart3,
    labelKey: 'nav.insights',
    description: 'Historique & tendances',
  },
];

// Grouped navigation sections
export const navigationSections: NavigationSection[] = [
  {
    id: 'home',
    labelKey: '', // No label for home section
    items: homeItems,
  },
  {
    id: 'workflow',
    labelKey: 'nav.section.workflow',
    items: chefWorkflowItems,
  },
  {
    id: 'management',
    labelKey: 'nav.section.management',
    items: managementItems,
  },
  {
    id: 'analytics',
    labelKey: 'nav.section.analytics',
    items: analyticsItems,
  },
];

// Flat list for compatibility (combines all sections)
const baseNavigationItems: NavigationItem[] = [
  ...homeItems,
  ...chefWorkflowItems,
  ...managementItems,
  ...analyticsItems,
];

// Legacy navigation (kept for backward compatibility)
export const legacyNavigationItems: NavigationItem[] = [
  {
    id: 'today',
    href: '/today',
    icon: Home,
    labelKey: 'nav.today',
  },
  {
    id: 'bills',
    href: '/bills',
    icon: PackageCheck,
    labelKey: 'nav.bills',
  },
  {
    id: 'menu',
    href: '/menu',
    icon: ChefHat,
    labelKey: 'nav.menu',
  },
  {
    id: 'dlc',
    href: '/dlc',
    icon: Home,
    labelKey: 'nav.dlc',
  },
  {
    id: 'inventory',
    href: '/inventory',
    icon: ShoppingCart,
    labelKey: 'nav.inventory',
  },
  {
    id: 'disputes',
    href: '/disputes',
    icon: Home,
    labelKey: 'nav.disputes',
  },
];

// Add dev tools link only in non-production environments
const devToolsItem: NavigationItem = {
  id: 'dev-tools',
  href: '/settings/dev-tools',
  icon: Database,
  labelKey: 'nav.devTools',
};

export const navigationItems: NavigationItem[] =
  process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_VERCEL_ENV === 'production'
    ? baseNavigationItems
    : [...baseNavigationItems, devToolsItem];
