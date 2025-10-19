'use client';

import { SidebarHeader } from './SidebarHeader';
import { NavigationMenu } from './NavigationMenu';
import { SidebarFooter } from './SidebarFooter';

interface SidebarProps {
  isOpen: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ isOpen, onNavigate }: SidebarProps) {
  return (
    <div
      className={`bg-sidebar lg:border-sidebar-border fixed top-0 left-0 z-20 h-full w-full shadow-xl transition-transform duration-300 ease-in-out lg:relative lg:w-64 lg:translate-x-0 lg:border-r lg:shadow-lg ${isOpen ? 'translate-x-0' : '-translate-x-full'} `}
    >
      <div className="flex h-full flex-col pt-15">
        <SidebarHeader />
        <NavigationMenu onItemClick={onNavigate} />
        <SidebarFooter />
      </div>
    </div>
  );
}
