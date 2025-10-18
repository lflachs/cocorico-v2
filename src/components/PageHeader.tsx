import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

/**
 * PageHeader - Shared gradient header component for main pages
 * Maintains consistent styling across the application
 */

type PageHeaderProps = {
  title: string | ReactNode;
  subtitle?: string | ReactNode;
  icon?: LucideIcon;
  className?: string;
};

export function PageHeader({ title, subtitle, icon: Icon, className = '' }: PageHeaderProps) {
  return (
    <div className={`bg-gradient-to-br from-primary via-primary/95 to-secondary rounded-xl p-6 md:p-8 text-white shadow-xl ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 md:mb-2">
            {title}
          </h1>
          {subtitle && (
            <p className="text-primary-foreground/90 text-sm sm:text-base md:text-lg max-w-3xl">
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <Icon className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white/20 shrink-0" />
        )}
      </div>
    </div>
  );
}
