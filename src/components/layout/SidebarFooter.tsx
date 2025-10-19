'use client';

import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';

export function SidebarFooter() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'fr' : 'en');
  };

  return (
    <div className="space-y-4 border-t border-sidebar-border p-6">
      {/* Language Switcher */}
      <Button
        variant="outline"
        size="sm"
        onClick={toggleLanguage}
        className="w-full cursor-pointer justify-start gap-3 border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
      >
        <Globe className="h-4 w-4" />
        <span>{language === 'en' ? 'Français' : 'English'}</span>
      </Button>

      <div className="text-center text-xs text-sidebar-foreground/60">© 2025 Cocorico</div>
    </div>
  );
}
