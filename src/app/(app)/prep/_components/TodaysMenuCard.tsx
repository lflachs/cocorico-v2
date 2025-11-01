'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UtensilsCrossed, CheckCircle2, AlertTriangle } from 'lucide-react';

type MenuItem = {
  id: string;
  name: string;
  section: string;
  isReady: boolean;
  missingIngredients?: string[];
};

type TodaysMenuCardProps = {
  items: MenuItem[];
};

/**
 * TodaysMenuCard - Reference of what's on menu today
 *
 * Simple list, not detailed recipes (chef knows them by heart)
 * Shows if any ingredients are missing
 */
export function TodaysMenuCard({ items }: TodaysMenuCardProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UtensilsCrossed className="h-5 w-5" />
            Menu du Jour
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucun menu actif pour aujourd'hui.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by section
  const sections = items.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const readyCount = items.filter(i => i.isReady).length;
  const totalCount = items.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UtensilsCrossed className="h-5 w-5" />
            Menu du Jour
          </CardTitle>
          <Badge variant="outline" className={
            readyCount === totalCount
              ? "bg-green-50 text-green-700 border-green-300"
              : "bg-yellow-50 text-yellow-700 border-yellow-300"
          }>
            {readyCount}/{totalCount} prêt{readyCount > 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(sections).map(([sectionName, sectionItems]) => (
          <div key={sectionName}>
            <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              {sectionName}
            </h4>
            <div className="space-y-2">
              {sectionItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border ${
                    item.isReady
                      ? 'bg-white border-gray-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {item.isReady ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
                        )}
                        <span className="font-medium">{item.name}</span>
                      </div>
                      {!item.isReady && item.missingIngredients && item.missingIngredients.length > 0 && (
                        <div className="mt-1 ml-6">
                          <p className="text-xs text-yellow-700">
                            Manque: {item.missingIngredients.join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Quick tip */}
        {readyCount < totalCount && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              💡 {totalCount - readyCount} plat{totalCount - readyCount > 1 ? 's' : ''} nécessite{totalCount - readyCount > 1 ? 'nt' : ''} des ingrédients manquants
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
