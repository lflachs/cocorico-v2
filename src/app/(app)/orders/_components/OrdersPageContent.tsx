'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Package, AlertCircle, MapPin } from 'lucide-react';
import { OrderSuggestionCard } from './OrderSuggestionCard';
import { OrdersBySupplier } from './OrdersBySupplier';
import { ProducteursTabContent } from './ProducteursTabContent';
import { toast } from 'sonner';
import type { Supplier } from '@prisma/client';

type OrderSuggestion = {
  productId: string;
  productName: string;
  currentStock: number;
  parLevel: number;
  unit: string;
  suggestedQuantity: number;
  supplierName?: string;
  supplierId?: string;
  lastPrice?: number;
};

type OrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  estimatedPrice?: number;
  supplierId?: string;
  supplierName?: string;
  supplierEmail?: string;
  supplierPhone?: string;
};

type OrdersPageContentProps = {
  suggestions: OrderSuggestion[];
  suppliers: Supplier[];
};

/**
 * OrdersPageContent - Main content for Orders & Restock page
 *
 * Three tabs: Suggestions (products to reorder), Current Order (cart), and Producteurs (suppliers & map)
 * Smart suggestions based on par levels and stock
 */
export function OrdersPageContent({ suggestions, suppliers }: OrdersPageContentProps) {
  const [activeTab, setActiveTab] = useState('suggestions');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const handleAddToOrder = (productId: string, quantity: number) => {
    const suggestion = suggestions.find((s) => s.productId === productId);
    if (!suggestion) return;

    const newItem: OrderItem = {
      productId: suggestion.productId,
      productName: suggestion.productName,
      quantity,
      unit: suggestion.unit,
      estimatedPrice: suggestion.lastPrice,
      supplierId: suggestion.supplierId,
      supplierName: suggestion.supplierName || 'Fournisseur inconnu',
      supplierEmail: undefined, // Would come from supplier data
      supplierPhone: undefined,
    };

    setOrderItems([...orderItems, newItem]);
    toast.success('Ajouté à la commande', {
      description: `${quantity} ${suggestion.unit} de ${suggestion.productName}`,
    });

    // Switch to order tab
    setActiveTab('order');
  };

  const handleRemoveItem = (supplierId: string | undefined, productId: string) => {
    setOrderItems(orderItems.filter((item) => item.productId !== productId));
    toast.info('Article retiré');
  };

  const handleSendOrder = async (supplierId: string | undefined) => {
    // TODO: Implement email sending
    toast.success('Commande envoyée', {
      description: 'Un email a été envoyé au fournisseur',
    });
  };

  const handleExportOrder = (supplierId: string | undefined) => {
    // TODO: Implement export (PDF/CSV)
    const supplierItems = orderItems.filter((item) => item.supplierId === supplierId);
    const supplierName = supplierItems[0]?.supplierName || 'Fournisseur';

    // Generate simple text format
    let exportText = `Commande - ${supplierName}\n\n`;
    supplierItems.forEach((item) => {
      exportText += `${item.productName}: ${item.quantity} ${item.unit}\n`;
    });

    // Download as text file
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commande-${supplierName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();

    toast.success('Commande exportée');
  };

  const handleClearAll = () => {
    if (confirm('Voulez-vous vraiment vider toute la commande ?')) {
      setOrderItems([]);
      toast.info('Commande vidée');
    }
  };

  // Group order items by supplier
  const ordersBySupplier = orderItems.reduce((acc, item) => {
    const key = item.supplierId || 'unknown';
    if (!acc[key]) {
      acc[key] = {
        supplierId: item.supplierId,
        supplierName: item.supplierName || 'Fournisseur inconnu',
        supplierEmail: item.supplierEmail,
        supplierPhone: item.supplierPhone,
        items: [],
        totalEstimatedCost: 0,
      };
    }

    acc[key].items.push({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unit: item.unit,
      estimatedPrice: item.estimatedPrice,
    });

    if (item.estimatedPrice) {
      acc[key].totalEstimatedCost += item.estimatedPrice * item.quantity;
    }

    return acc;
  }, {} as Record<string, any>);

  const supplierOrders = Object.values(ordersBySupplier);

  // Filter suggestions by urgency
  const criticalSuggestions = suggestions.filter(
    (s) => (s.currentStock / s.parLevel) * 100 <= 25
  );
  const warningSuggestions = suggestions.filter(
    (s) => (s.currentStock / s.parLevel) * 100 > 25 && (s.currentStock / s.parLevel) * 100 <= 50
  );
  const lowSuggestions = suggestions.filter((s) => (s.currentStock / s.parLevel) * 100 > 50);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-red-900">{criticalSuggestions.length}</p>
              <p className="text-sm text-red-700">Stock critique</p>
            </div>
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-2xl font-bold text-orange-900">{warningSuggestions.length}</p>
              <p className="text-sm text-orange-700">Stock bas</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-900">{orderItems.length}</p>
              <p className="text-sm text-green-700">Dans la commande</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
          <TabsTrigger value="suggestions" className="gap-2">
            <AlertCircle className="w-4 h-4" />
            Suggestions ({suggestions.length})
          </TabsTrigger>
          <TabsTrigger value="order" className="gap-2">
            <ShoppingCart className="w-4 h-4" />
            Ma commande ({orderItems.length})
          </TabsTrigger>
          <TabsTrigger value="producteurs" className="gap-2">
            <MapPin className="w-4 h-4" />
            Producteurs
          </TabsTrigger>
        </TabsList>

        {/* Suggestions Tab */}
        <TabsContent value="suggestions" className="space-y-6">
          {suggestions.length === 0 ? (
            <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">Aucune suggestion</h3>
              <p className="text-sm text-muted-foreground">
                Tous vos produits sont bien approvisionnés !
              </p>
            </div>
          ) : (
            <>
              {/* Critical Items */}
              {criticalSuggestions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-red-700 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Stock critique ({criticalSuggestions.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {criticalSuggestions.map((suggestion) => (
                      <OrderSuggestionCard
                        key={suggestion.productId}
                        suggestion={suggestion}
                        onAddToOrder={handleAddToOrder}
                        isAdded={orderItems.some((item) => item.productId === suggestion.productId)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Warning Items */}
              {warningSuggestions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-orange-700 flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Stock bas ({warningSuggestions.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {warningSuggestions.map((suggestion) => (
                      <OrderSuggestionCard
                        key={suggestion.productId}
                        suggestion={suggestion}
                        onAddToOrder={handleAddToOrder}
                        isAdded={orderItems.some((item) => item.productId === suggestion.productId)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Low Items */}
              {lowSuggestions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-yellow-700 flex items-center gap-2">
                    À surveiller ({lowSuggestions.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {lowSuggestions.map((suggestion) => (
                      <OrderSuggestionCard
                        key={suggestion.productId}
                        suggestion={suggestion}
                        onAddToOrder={handleAddToOrder}
                        isAdded={orderItems.some((item) => item.productId === suggestion.productId)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Order Tab */}
        <TabsContent value="order" className="space-y-6">
          {orderItems.length > 0 && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleClearAll} className="text-red-600">
                Vider la commande
              </Button>
            </div>
          )}

          <OrdersBySupplier
            orders={supplierOrders}
            onRemoveItem={handleRemoveItem}
            onSendOrder={handleSendOrder}
            onExportOrder={handleExportOrder}
          />
        </TabsContent>

        {/* Producteurs Tab - Only render when active for performance */}
        <TabsContent value="producteurs" className="space-y-6">
          {activeTab === 'producteurs' && <ProducteursTabContent suppliers={suppliers} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
