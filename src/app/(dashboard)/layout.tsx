'use client';

import { type ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Menu,
  X,
  Globe,
  Home,
  UtensilsCrossed,
  Package,
  AlertOctagon,
  Upload,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LanguageProvider, useLanguage } from '@/providers/LanguageProvider';
import { Toaster } from '@/components/ui/sonner';

/**
 * Dashboard Layout
 * Dark sidebar with mobile-responsive design matching POC
 */

function DashboardContent({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();

  const menuItems = [
    {
      id: 'today',
      href: '/today',
      icon: Home,
      label: t('nav.today'),
    },
    {
      id: 'menu',
      href: '/menu',
      icon: UtensilsCrossed,
      label: t('nav.menu'),
    },
    {
      id: 'inventory',
      href: '/inventory',
      icon: Package,
      label: t('nav.inventory'),
    },
    {
      id: 'dlc',
      href: '/dlc',
      icon: Calendar,
      label: t('nav.dlc') || 'DLC',
    },
    {
      id: 'bills',
      href: '/bills',
      icon: Upload,
      label: t('nav.bills'),
    },
    {
      id: 'disputes',
      href: '/disputes',
      icon: AlertOctagon,
      label: t('nav.disputes'),
    },
  ];

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'fr' : 'en');
  };

  const closeSidebar = () => setIsOpen(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile menu button */}
      <div className="fixed top-3 left-4 z-50 lg:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="border bg-white/80 shadow-sm backdrop-blur-sm"
        >
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile overlay - lighter overlay */}
      {isOpen && (
        <div
          className="bg-opacity-20 fixed inset-0 z-10 bg-black lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`bg-primary lg:border-primary/20 fixed top-0 left-0 z-20 h-full w-64 shadow-xl transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:border-r lg:shadow-lg ${isOpen ? 'translate-x-0' : '-translate-x-full'} `}
      >
        <div className="flex h-full flex-col pt-15">
          {/* Logo - Bigger and full width */}
          <div className="border-b border-white/10 p-6">
            <h2 className="text-center text-4xl font-extralight tracking-wide text-white">
              Cocorico
            </h2>
          </div>

          {/* Navigation Menu - More spacing */}
          <nav className="flex-1 p-6">
            <div className="space-y-3">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={closeSidebar}
                    className="cursor-pointer"
                  >
                    <Button
                      variant={isActive ? 'default' : 'ghost'}
                      className={`h-12 w-full cursor-pointer justify-start gap-3 text-white ${isActive ? 'bg-secondary hover:bg-secondary/90' : 'hover:bg-white/10'} `}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="space-y-4 border-t border-white/10 p-6">
            {/* Language Switcher */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              className="w-full cursor-pointer justify-start gap-3 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Globe className="h-4 w-4" />
              <span>{language === 'en' ? 'Français' : 'English'}</span>
            </Button>

            <div className="text-center text-xs text-white/60">© 2025 Cocorico</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1 flex-col lg:ml-0">
        {/* Mobile Header */}
        <div className="relative z-30 flex flex-shrink-0 items-center justify-center border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
          <div className="absolute left-4">{/* Space for hamburger */}</div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">Cocorico</h1>
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto overscroll-contain px-4 pb-20 lg:p-8">
          <div className="mx-auto min-h-full max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <DashboardContent>{children}</DashboardContent>
      <Toaster />
    </LanguageProvider>
  );
}
