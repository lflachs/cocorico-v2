/**
 * Formats a date for display based on the given locale
 * @param date - The date to format
 * @param locale - The locale to use for formatting (e.g., 'en-US', 'fr-FR')
 * @returns Formatted date string with weekday, month, day, and year
 */
export function formatDateForLocale(
  date: Date = new Date(),
  locale: string = 'en-US'
): string {
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Gets the locale string based on language code
 * @param language - Language code ('en' or 'fr')
 * @returns Locale string for date formatting
 */
export function getLocaleFromLanguage(language: 'en' | 'fr'): string {
  return language === 'fr' ? 'fr-FR' : 'en-US';
}
