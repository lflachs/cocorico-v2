'use client';

import { useState } from 'react';
import { Clock, Package, AlertCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, getAlertsCounts } from '@/lib/services/alerts.service';
import { AlertsList } from './AlertsList';
import { AlertType } from '@/lib/utils/alerts';

interface AlertsTabsClientProps {
  alerts: Alert[];
  translations: {
    title: string;
    all: string;
    expiring: string;
    stock: string;
    disputes: string;
    noAlertsInCategory: string;
  };
}

/**
 * Client component for tabs and filtering
 * Keeps the interactive tab state on the client while using SSR data
 * Updates title dynamically based on selected tab
 */
export function AlertsTabsClient({ alerts, translations }: AlertsTabsClientProps) {
  const [activeTab, setActiveTab] = useState<'all' | AlertType>('all');

  const counts = getAlertsCounts(alerts);
  const filteredAlerts = activeTab === 'all' ? alerts : alerts.filter((a) => a.type === activeTab);

  // Get the position index of the active tab for animation
  const tabIndex = { all: 0, expiring: 1, lowStock: 2, dispute: 3 }[activeTab];

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
      <TabsList className="relative z-10 mb-4 grid w-full grid-cols-4 p-1">
        <motion.div
          className="absolute inset-y-1.5 mx-1 rounded-md bg-background shadow-sm"
          initial={false}
          animate={{
            x: `calc(${tabIndex * 100}% + 4px)`,
            width: 'calc(25% - 8px)',
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
          }}
          style={{ left: 0 }}
        />
        <TabsTrigger value="all" className="relative z-10 flex cursor-pointer items-center gap-0.5 px-3 py-2 sm:gap-1">
          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
          <span
            className={`truncate text-xs sm:text-sm ${activeTab === 'all' ? 'inline' : 'hidden sm:inline'}`}
          >
            {translations.all}
          </span>
          {counts.all > 0 && (
            <Badge
              variant="secondary"
              className="ml-0.5 h-4 min-w-[16px] flex-shrink-0 px-1 text-[10px] sm:ml-1 sm:h-5 sm:min-w-[20px] sm:px-1.5 sm:text-xs"
            >
              {counts.all}
            </Badge>
          )}
        </TabsTrigger>

        <TabsTrigger value="expiring" className="relative z-10 flex cursor-pointer items-center gap-0.5 px-3 py-2 sm:gap-1">
          <Clock className="h-3 w-3 flex-shrink-0" />
          <span
            className={`truncate text-xs sm:text-sm ${activeTab === 'expiring' ? 'inline' : 'hidden sm:inline'}`}
          >
            {translations.expiring}
          </span>
          {counts.expiring > 0 && (
            <Badge
              variant="secondary"
              className="ml-0.5 h-4 min-w-[16px] flex-shrink-0 px-1 text-[10px] sm:ml-1 sm:h-5 sm:min-w-[20px] sm:px-1.5 sm:text-xs"
            >
              {counts.expiring}
            </Badge>
          )}
        </TabsTrigger>

        <TabsTrigger value="lowStock" className="relative z-10 flex cursor-pointer items-center gap-0.5 px-3 py-2 sm:gap-1">
          <Package className="h-3 w-3 flex-shrink-0" />
          <span
            className={`truncate text-xs sm:text-sm ${activeTab === 'lowStock' ? 'inline' : 'hidden sm:inline'}`}
          >
            {translations.stock}
          </span>
          {counts.lowStock > 0 && (
            <Badge
              variant="secondary"
              className="ml-0.5 h-4 min-w-[16px] flex-shrink-0 px-1 text-[10px] sm:ml-1 sm:h-5 sm:min-w-[20px] sm:px-1.5 sm:text-xs"
            >
              {counts.lowStock}
            </Badge>
          )}
        </TabsTrigger>

        <TabsTrigger value="dispute" className="relative z-10 flex cursor-pointer items-center gap-0.5 px-3 py-2 sm:gap-1">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span
            className={`truncate text-xs sm:text-sm ${activeTab === 'dispute' ? 'inline' : 'hidden sm:inline'}`}
          >
            {translations.disputes}
          </span>
          {counts.disputes > 0 && (
            <Badge
              variant="secondary"
              className="ml-0.5 h-4 min-w-[16px] flex-shrink-0 px-1 text-[10px] sm:ml-1 sm:h-5 sm:min-w-[20px] sm:px-1.5 sm:text-xs"
            >
              {counts.disputes}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <div className="scrollbar-thin relative flex h-[180px] items-center justify-center overflow-x-hidden overflow-y-auto">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ x: -80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <TabsContent value="all" className="mt-0">
              {activeTab === 'all' && (
                <AlertsList
                  alerts={filteredAlerts}
                  emptyMessage={translations.noAlertsInCategory}
                />
              )}
            </TabsContent>

            <TabsContent value="expiring" className="mt-0">
              {activeTab === 'expiring' && (
                <AlertsList
                  alerts={filteredAlerts}
                  emptyMessage={translations.noAlertsInCategory}
                />
              )}
            </TabsContent>

            <TabsContent value="lowStock" className="mt-0">
              {activeTab === 'lowStock' && (
                <AlertsList
                  alerts={filteredAlerts}
                  emptyMessage={translations.noAlertsInCategory}
                />
              )}
            </TabsContent>

            <TabsContent value="dispute" className="mt-0">
              {activeTab === 'dispute' && (
                <AlertsList
                  alerts={filteredAlerts}
                  emptyMessage={translations.noAlertsInCategory}
                />
              )}
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </div>
    </Tabs>
  );
}
