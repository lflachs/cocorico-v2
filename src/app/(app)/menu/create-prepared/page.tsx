import { getTranslation } from '@/lib/i18n';
import { cookies } from 'next/headers';
import { PreparedIngredientCreateFlow } from '../_components/PreparedIngredientCreateFlow';

/**
 * Prepared Ingredient Creation Page - Full screen dedicated flow
 * Provides a user-friendly step-by-step process for creating prepared ingredients
 */

export default async function PreparedIngredientCreatePage() {
  const cookieStore = await cookies();
  const language = (cookieStore.get('language')?.value as 'en' | 'fr') || 'en';
  const t = getTranslation(language);

  return <PreparedIngredientCreateFlow />;
}
