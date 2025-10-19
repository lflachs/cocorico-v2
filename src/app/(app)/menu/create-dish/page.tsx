import { getTranslation } from '@/lib/i18n';
import { cookies } from 'next/headers';
import { DishCreateFlow } from '../_components/DishCreateFlow';

/**
 * Dish Creation Page - Full screen dedicated flow
 * Provides a user-friendly step-by-step process for creating dishes
 */

export default async function DishCreatePage() {
  const cookieStore = await cookies();
  const language = (cookieStore.get('language')?.value as 'en' | 'fr') || 'en';
  const t = getTranslation(language);

  return <DishCreateFlow />;
}
