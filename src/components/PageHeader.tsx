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
    <div
      className={`from-primary via-primary/95 to-secondary rounded-xl bg-gradient-to-br p-6 text-white shadow-lg md:p-8 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="mb-1 text-2xl font-bold sm:text-3xl md:mb-2 md:text-4xl">{title}</h1>
          {subtitle && (
            <p className="text-primary-foreground/90 max-w-3xl text-sm sm:text-base md:text-lg">
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <Icon className="h-8 w-8 shrink-0 text-white/20 sm:h-10 sm:w-10 md:h-12 md:w-12" />
        )}
      </div>
    </div>
  );
}
