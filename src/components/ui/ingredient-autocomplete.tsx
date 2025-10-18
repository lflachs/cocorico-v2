'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Check, Search } from 'lucide-react';
import { searchIngredientSuggestions, getCategoryDisplayName } from '@/lib/utils/ingredients';

type IngredientAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  existingProducts?: { id: string; name: string }[];
};

export function IngredientAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Tapez pour rechercher...',
  disabled = false,
  className = '',
  existingProducts = [],
}: IngredientAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get suggestions only when user is typing
  const suggestions = value.length > 0 ? searchIngredientSuggestions(value, 15) : [];

  // Filter out existing products
  const existingProductNames = new Set(existingProducts.map(p => p.name.toLowerCase()));
  const filteredSuggestions = suggestions.filter(
    s => !existingProductNames.has(s.name.toLowerCase())
  );

  // Also show matching existing products
  const matchingProducts = existingProducts.filter(p =>
    p.name.toLowerCase().includes(value.toLowerCase())
  );

  const hasResults = matchingProducts.length > 0 || filteredSuggestions.length > 0;
  const totalResults = matchingProducts.length + filteredSuggestions.length;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when suggestions change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [value]);

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    setIsOpen(newValue.length > 0);
  };

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
    onSelect?.(selectedValue);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || !hasResults) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % totalResults);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + totalResults) % totalResults);
        break;
      case 'Enter':
        e.preventDefault();
        const allItems = [...matchingProducts.map(p => p.name), ...filteredSuggestions.map(s => s.name)];
        if (allItems[highlightedIndex]) {
          handleSelect(allItems[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => value.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`pl-9 cursor-text ${className}`}
          autoComplete="off"
        />
      </div>

      {/* Dropdown */}
      {isOpen && value.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95">
          <div className="max-h-[300px] overflow-y-auto p-1">
            {!hasResults ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                Aucun résultat trouvé
              </div>
            ) : (
              <>
                {/* Existing Products */}
                {matchingProducts.length > 0 && (
                  <div className="mb-2">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      Vos produits
                    </div>
                    {matchingProducts.map((product, idx) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleSelect(product.name)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-sm cursor-pointer transition-colors ${
                          idx === highlightedIndex
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-accent/50'
                        }`}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                      >
                        <span className="font-medium">{product.name}</span>
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          Existant
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}

                {/* Suggestions */}
                {filteredSuggestions.length > 0 && (
                  <div>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      Suggestions
                    </div>
                    {filteredSuggestions.map((suggestion, idx) => {
                      const globalIndex = matchingProducts.length + idx;
                      return (
                        <button
                          key={`${suggestion.category}-${idx}`}
                          type="button"
                          onClick={() => handleSelect(suggestion.name)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-sm cursor-pointer transition-colors ${
                            globalIndex === highlightedIndex
                              ? 'bg-accent text-accent-foreground'
                              : 'hover:bg-accent/50'
                          }`}
                          onMouseEnter={() => setHighlightedIndex(globalIndex)}
                        >
                          <span>{suggestion.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {getCategoryDisplayName(suggestion.category)}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
