'use client';

interface PurchaseBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
}

interface PurchaseBreakdownProps {
  items: PurchaseBreakdownItem[];
  total: number;
}

/**
 * Visual breakdown of purchases by category
 * Shows bars with percentages for easy scanning
 */
export function PurchaseBreakdown({ items, total }: PurchaseBreakdownProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/5 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Aucun achat enregistré pour cette période
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Scannez vos factures pour voir la répartition
        </p>
      </div>
    );
  }

  const getCategoryColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Achats par Catégorie</h3>
        <p className="text-lg font-bold">€{total.toFixed(0)}</p>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={item.category} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{item.category}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  €{item.amount.toFixed(0)}
                </span>
                <span className="font-semibold min-w-[3rem] text-right">
                  {item.percentage.toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full ${getCategoryColor(index)} transition-all duration-500`}
                style={{ width: `${Math.min(item.percentage, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
