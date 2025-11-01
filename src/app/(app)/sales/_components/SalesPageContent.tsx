'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Receipt, History, UtensilsCrossed, TrendingUp } from 'lucide-react';
import { SalesFlow } from './SalesFlow';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type Sale = {
  id: string;
  dish: {
    name: string;
  };
  quantitySold: number;
  saleDate: Date;
  createdAt: Date;
};

type SalesPageContentProps = {
  recentSales: Sale[];
};

/**
 * SalesPageContent - Main content for Sales Entry page
 *
 * Two tabs: New Sale (receipt scanning) and History (past sales)
 */
export function SalesPageContent({ recentSales }: SalesPageContentProps) {
  const [activeTab, setActiveTab] = useState('entry');
  const [salesFlowOpen, setSalesFlowOpen] = useState(false);

  // Group sales by date
  const salesByDate = recentSales.reduce((acc, sale) => {
    const dateKey = format(new Date(sale.saleDate), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(sale);
    return acc;
  }, {} as Record<string, Sale[]>);

  const sortedDates = Object.keys(salesByDate).sort((a, b) => b.localeCompare(a));

  // Calculate daily totals
  const dailyStats = sortedDates.map((date) => {
    const sales = salesByDate[date];
    const totalDishes = sales.reduce((sum, s) => sum + s.quantitySold, 0);
    return {
      date,
      salesCount: sales.length,
      totalDishes,
    };
  });

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Receipt className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-900">{recentSales.length}</p>
              <p className="text-sm text-green-700">Ventes cette semaine</p>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <UtensilsCrossed className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-900">
                {recentSales.reduce((sum, s) => sum + s.quantitySold, 0)}
              </p>
              <p className="text-sm text-blue-700">Plats vendus</p>
            </div>
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold text-purple-900">
                {new Set(recentSales.map((s) => s.dish.name)).size}
              </p>
              <p className="text-sm text-purple-700">Plats différents</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="entry" className="gap-2">
            <Receipt className="w-4 h-4" />
            Nouvelle vente
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            Historique
          </TabsTrigger>
        </TabsList>

        {/* New Sale Entry Tab */}
        <TabsContent value="entry" className="space-y-6">
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <Receipt className="h-20 w-20 text-primary" />
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Enregistrer des ventes</h2>
              <p className="text-muted-foreground">
                Scannez un ticket de caisse pour démarrer
              </p>
            </div>
            <Button
              onClick={() => setSalesFlowOpen(true)}
              size="lg"
              className="h-16 px-8 text-lg font-semibold bg-green-600 hover:bg-green-700"
            >
              Scanner un ticket
            </Button>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-background rounded-md border text-left max-w-md">
              <h4 className="font-medium mb-3">Comment ça marche ?</h4>
              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  <div>
                    <p className="font-medium">Scanne ton ticket</p>
                    <p className="text-muted-foreground text-xs">
                      Photo du ticket de caisse ou saisie manuelle
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  <div>
                    <p className="font-medium">Extraction automatique</p>
                    <p className="text-muted-foreground text-xs">
                      Reconnaissance des plats vendus et quantités
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  <div>
                    <p className="font-medium">Stock mis à jour</p>
                    <p className="text-muted-foreground text-xs">
                      Déduction automatique basée sur tes recettes
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    4
                  </span>
                  <div>
                    <p className="font-medium">Food cost calculé</p>
                    <p className="text-muted-foreground text-xs">
                      Rentabilité mise à jour en temps réel
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sales Flow Modal */}
          <SalesFlow open={salesFlowOpen} onOpenChange={setSalesFlowOpen} />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          {recentSales.length === 0 ? (
            <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
              <Receipt className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">Aucune vente enregistrée</h3>
              <p className="text-sm text-muted-foreground">
                L'historique des ventes apparaîtra ici
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedDates.map((dateKey) => {
                const sales = salesByDate[dateKey];
                const stats = dailyStats.find((s) => s.date === dateKey);

                return (
                  <Card key={dateKey}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          {format(new Date(dateKey), 'EEEE d MMMM yyyy', { locale: fr })}
                        </CardTitle>
                        <Badge variant="outline">
                          {stats?.totalDishes} plat{stats && stats.totalDishes > 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {sales.map((sale) => (
                          <div
                            key={sale.id}
                            className="flex items-center justify-between p-2 rounded-md bg-muted/30"
                          >
                            <div className="flex items-center gap-2">
                              <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{sale.dish.name}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">×{sale.quantitySold}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
