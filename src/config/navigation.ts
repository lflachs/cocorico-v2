import {
  Home,
  UtensilsCrossed,
  Package,
  AlertOctagon,
  Upload,
  Calendar,
  type LucideIcon,
} from 'lucide-react';

export interface NavigationItem {
  id: string;
  href: string;
  icon: LucideIcon;
  labelKey: string;
}

export const navigationItems: NavigationItem[] = [
  {
    id: 'today',
    href: '/today',
    icon: Home,
    labelKey: 'nav.today',
  },
  {
    id: 'menu',
    href: '/menu',
    icon: UtensilsCrossed,
    labelKey: 'nav.menu',
  },
  {
    id: 'inventory',
    href: '/inventory',
    icon: Package,
    labelKey: 'nav.inventory',
  },
  {
    id: 'dlc',
    href: '/dlc',
    icon: Calendar,
    labelKey: 'nav.dlc',
  },
  {
    id: 'bills',
    href: '/bills',
    icon: Upload,
    labelKey: 'nav.bills',
  },
  {
    id: 'disputes',
    href: '/disputes',
    icon: AlertOctagon,
    labelKey: 'nav.disputes',
  },
];
