import { cookies } from 'next/headers';
import { getTranslation, type TranslationKey } from '@/lib/i18n';

export type SupportedLanguage = 'en' | 'fr';

/**
 * Retrieves the user's preferred language from cookies
 * @returns The language code ('en' or 'fr'), defaults to 'en' if not set
 */
export async function getLanguageFromCookies(): Promise<SupportedLanguage> {
  const cookieStore = await cookies();
  const language = cookieStore.get('language')?.value as SupportedLanguage;
  return language || 'en';
}

/**
 * Helper function that combines language retrieval and translation setup
 * Use this in server components to avoid repetitive boilerplate
 * @returns Object containing the language code and translation function
 *
 * @example
 * ```tsx
 * const { language, t } = await getServerTranslation();
 * const greeting = t('today.greeting.morning');
 * ```
 */
export async function getServerTranslation() {
  const language = await getLanguageFromCookies();
  const t = getTranslation(language);

  return { language, t };
}
