import { getTranslation } from '@/lib/i18n';
import { cookies } from 'next/headers';
import { MenuCreateFlow } from '../_components/MenuCreateFlow';

/**
 * Menu Creation Page - Full screen dedicated flow
 * Provides a user-friendly step-by-step process for creating menus
 */

export default async function MenuCreatePage() {
  const cookieStore = await cookies();
  const language = (cookieStore.get('language')?.value as 'en' | 'fr') || 'en';
  const t = getTranslation(language);

  return <MenuCreateFlow />;
}
