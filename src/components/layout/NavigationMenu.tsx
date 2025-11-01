'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { navigationSections, type NavigationItem } from '@/config/navigation';
import { useLanguage } from '@/providers/LanguageProvider';

interface NavigationMenuProps {
  onItemClick?: () => void;
}

export function NavigationMenu({ onItemClick }: NavigationMenuProps) {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav className="flex-1 p-6 overflow-y-auto">
      <div className="space-y-6">
        {navigationSections.map((section) => (
          <div key={section.id} className="space-y-2">
            {/* Section Header - only show if labelKey is not empty */}
            {section.labelKey && (
              <div className="px-3 mb-3">
                <h3 className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                  {t(section.labelKey)}
                </h3>
              </div>
            )}

            {/* Section Items */}
            <div className="space-y-1">
              {section.items.map((item: NavigationItem) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={onItemClick}
                    className="cursor-pointer block"
                  >
                    <Button
                      variant={isActive ? 'default' : 'ghost'}
                      className={`h-11 w-full cursor-pointer justify-start gap-3 text-sidebar-foreground ${
                        isActive
                          ? 'bg-sidebar-primary hover:bg-sidebar-primary/90'
                          : 'hover:bg-sidebar-accent'
                      } `}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{t(item.labelKey) || item.labelKey}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}
