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
      {/* Main content */}
      {children}

      {/* Parallel route slots */}
      <div className="space-y-4 sm:space-y-6 w-full overflow-hidden">
        {stats}
        {alerts}
        {activities}
      </div>
    </div>
  );
}
