import { Card, CardContent } from '@/components/ui/card';

/**
 * Loading skeleton for StatCard component
 * Provides visual feedback while dashboard stats are being fetched
 */
export function StatCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-muted rounded w-20"></div>
            <div className="h-8 bg-muted rounded w-12"></div>
          </div>
          <div className="h-11 w-11 sm:h-12 sm:w-12 bg-muted rounded-lg flex-shrink-0"></div>
        </div>
        <div className="mt-3 sm:mt-4 h-4 bg-muted rounded w-16"></div>
      </CardContent>
    </Card>
  );
}
