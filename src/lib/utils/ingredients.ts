import ingredientsData from '@/data/ingredients-fr.json';

export type IngredientCategory = keyof typeof ingredientsData;

export type IngredientSuggestion = {
  name: string;
  category: string;
};

/**
 * Get all French ingredient suggestions as a flat array
 */
export function getAllIngredientSuggestions(): IngredientSuggestion[] {
  const suggestions: IngredientSuggestion[] = [];

  for (const [category, ingredients] of Object.entries(ingredientsData)) {
    for (const ingredient of ingredients) {
      suggestions.push({
        name: ingredient,
        category,
      });
    }
  }

  return suggestions;
}

/**
 * Get ingredient suggestions by category
 */
export function getIngredientsByCategory(category: IngredientCategory): string[] {
  return ingredientsData[category] || [];
}

/**
 * Search ingredient suggestions by query
 * @param query - Search query
 * @param limit - Maximum number of results (default: 50)
 */
export function searchIngredientSuggestions(query: string, limit: number = 50): IngredientSuggestion[] {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  const allSuggestions = getAllIngredientSuggestions();

  // Filter and sort by relevance
  const matches = allSuggestions
    .filter((suggestion) =>
      suggestion.name.toLowerCase().includes(normalizedQuery)
    )
    .sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();

      // Exact match first
      if (aName === normalizedQuery) return -1;
      if (bName === normalizedQuery) return 1;

      // Starts with query next
      const aStarts = aName.startsWith(normalizedQuery);
      const bStarts = bName.startsWith(normalizedQuery);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      // Then alphabetically
      return aName.localeCompare(bName, 'fr');
    })
    .slice(0, limit);

  return matches;
}

/**
 * Get all ingredient categories
 */
export function getIngredientCategories(): IngredientCategory[] {
  return Object.keys(ingredientsData) as IngredientCategory[];
}

/**
 * Get category display name (formatted)
 */
export function getCategoryDisplayName(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
