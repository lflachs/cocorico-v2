'use client';

import Link from 'next/link';
import { PackageCheck, Receipt, ChefHat, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Quick action buttons for common workflows
 * Large, easy to tap, clear purpose
 */
export function QuickActions() {
  const actions = [
    {
      href: '/reception',
      icon: PackageCheck,
      label: 'Scanner livraison',
      description: 'Nouvelle facture',
    },
    {
      href: '/sales',
      icon: Receipt,
      label: 'Entrer ventes',
      description: 'Ticket de caisse',
    },
    {
      href: '/prep',
      icon: ChefHat,
      label: 'Voir préparation',
      description: 'Ce qu\'il faut produire',
    },
    {
      href: '/orders',
      icon: ShoppingCart,
      label: 'Commander',
      description: 'Réassort',
    },
  ];

  return (
    <div>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Actions Rapides
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href}>
              <Button
                variant="outline"
                className="h-auto w-full flex flex-col items-center gap-3 p-5 hover:bg-accent transition-all group"
              >
                <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                  <Icon className="h-6 w-6 group-hover:text-primary transition-colors" />
                </div>
                <div className="text-center">
                  <div className="font-medium text-sm">{action.label}</div>
                  <div className="text-xs text-muted-foreground group-hover:text-foreground mt-1 transition-colors">{action.description}</div>
                </div>
              </Button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
