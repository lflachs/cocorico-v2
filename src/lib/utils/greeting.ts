import { Sun, Cloud, Moon, LucideIcon } from 'lucide-react';

export type GreetingKey =
  | 'today.greeting.morning'
  | 'today.greeting.afternoon'
  | 'today.greeting.evening';

export interface TimeBasedGreeting {
  key: GreetingKey;
  icon: LucideIcon;
}

/**
 * Returns the appropriate greeting and icon based on the current time
 * @param hour - The current hour (0-23), defaults to current time
 * @returns Object containing the greeting translation key and icon component
 */
export function getTimeBasedGreeting(hour?: number): TimeBasedGreeting {
  const currentHour = hour ?? new Date().getHours();

  if (currentHour < 12) {
    return {
      key: 'today.greeting.morning',
      icon: Sun,
    };
  }

  if (currentHour < 18) {
    return {
      key: 'today.greeting.afternoon',
      icon: Cloud,
    };
  }

  return {
    key: 'today.greeting.evening',
    icon: Moon,
  };
}
