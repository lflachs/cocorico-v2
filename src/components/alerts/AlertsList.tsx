'use client';

import { motion } from 'framer-motion';
import { Alert } from '@/lib/services/alerts.service';
import { AlertItem } from './AlertItem';

interface AlertsListProps {
  alerts: Alert[];
  emptyMessage: string;
}

/**
 * List component that renders a collection of alerts
 * Shows empty state when no alerts are available
 */
export function AlertsList({ alerts, emptyMessage }: AlertsListProps) {
  if (alerts.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => (
        <motion.div
          key={alert.id}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.5,
            delay: index * 0.1,
            ease: [0.25, 0.1, 0.25, 1]
          }}
        >
          <AlertItem alert={alert} />
        </motion.div>
      ))}
    </div>
  );
}
