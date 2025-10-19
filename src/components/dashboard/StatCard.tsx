import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

export interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  gradient: string;
  href: string;
  alert?: boolean;
  viewLabel?: string;
}

/**
 * Reusable stat card component for dashboard metrics
 * Features hover effects, gradient icons, and responsive design
 */
export function StatCard({
  title,
  value,
  icon: Icon,
  gradient,
  href,
  alert = false,
  viewLabel = 'View',
}: StatCardProps) {
  return (
    <Link href={href} className="group block w-full">
      <Card className="h-full transition-all hover:shadow-xl cursor-pointer border border-border hover:border-primary/20 bg-white shadow-md hover:-translate-y-0.5">
        <CardContent className="p-4 sm:p-6 h-full flex flex-col">
          <div className="flex items-center justify-between flex-1 gap-3">
            <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                {title}
              </p>
              <p
                className={cn(
                  'text-2xl sm:text-3xl font-bold',
                  alert ? 'text-warning' : 'text-foreground'
                )}
              >
                {value}
              </p>
            </div>
            <div
              className={cn(
                'bg-gradient-to-br p-2.5 sm:p-3 rounded-lg shadow-lg flex-shrink-0',
                gradient
              )}
            >
              <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex items-center text-xs sm:text-sm text-muted-foreground group-hover:text-primary transition-colors">
            <span>{viewLabel}</span>
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
