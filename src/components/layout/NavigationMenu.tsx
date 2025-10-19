'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { navigationItems, type NavigationItem } from '@/config/navigation';
import { useLanguage } from '@/providers/LanguageProvider';

interface NavigationMenuProps {
  onItemClick?: () => void;
}

export function NavigationMenu({ onItemClick }: NavigationMenuProps) {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav className="flex-1 p-6">
      <div className="space-y-3">
        {navigationItems.map((item: NavigationItem) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onItemClick}
              className="cursor-pointer"
            >
              <Button
                variant={isActive ? 'default' : 'ghost'}
                className={`h-12 w-full cursor-pointer justify-start gap-3 text-sidebar-foreground ${isActive ? 'bg-sidebar-primary hover:bg-sidebar-primary/90' : 'hover:bg-sidebar-accent'} `}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{t(item.labelKey) || item.labelKey}</span>
              </Button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
