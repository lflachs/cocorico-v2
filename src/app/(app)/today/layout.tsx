import { type ReactNode } from 'react';

/**
 * Today Page Layout
 * Uses parallel routes for modular dashboard sections
 */

type TodayLayoutProps = {
  children: ReactNode;
  stats: ReactNode;
  alerts: ReactNode;
  activities: ReactNode;
};

export default function TodayLayout({ children, stats, alerts, activities }: TodayLayoutProps) {
  return (
    <div className="space-y-4 sm:space-y-6 w-full overflow-hidden">
      {/* Main content - includes DailyBrief and primary cards */}
      {children}

      {/* Additional activities (Quick Sales) in flexible grid */}
      {/* This will adapt to fill available space */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {activities}
        {stats}
        {alerts}
      </div>
    </div>
  );
}
