'use client';

import { type ReactNode, useState } from 'react';
import { LanguageProvider } from '@/providers/LanguageProvider';
import { Toaster } from '@/components/ui/sonner';
import { MobileMenuToggle } from '@/components/layout/MobileMenuToggle';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileHeader } from '@/components/layout/MobileHeader';

/**
 * App Layout
 * Dark sidebar with mobile-responsive design matching POC
 */

function AppContent({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  return (
    <div className="bg-layout-background flex h-screen overflow-hidden">
      <MobileMenuToggle isOpen={isOpen} onToggle={toggleSidebar} />
      <Sidebar isOpen={isOpen} onNavigate={closeSidebar} />

      <div className="flex min-h-0 flex-1 flex-col lg:ml-0">
        <MobileHeader />

        <main className="flex-1 overflow-y-auto overscroll-contain p-8 px-4 pb-20">
          <div className="mx-auto min-h-full max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <AppContent>{children}</AppContent>
      <Toaster />
    </LanguageProvider>
  );
}
