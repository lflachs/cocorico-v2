'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Package,
  RefreshCw,
  Clock,
  Sparkles,
  Trophy,
  Star,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { type Product } from '@prisma/client';
import confetti from 'canvas-confetti';

type FlowState = 'START' | 'SYNCING' | 'COMPLETE';

type InventorySyncFlowProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  initialConfidence?: number;
};

/**
 * InventorySyncFlow - Card-based inventory synchronization
 *
 * Flow: START → SYNCING (card carousel) → COMPLETE
 * Products ordered by least recently updated first
 */
export function InventorySyncFlow({ open, onOpenChange, products, initialConfidence = 0 }: InventorySyncFlowProps) {
  const router = useRouter();
  const [state, setState] = useState<FlowState>('START');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sortedProducts, setSortedProducts] = useState<Product[]>([]);
  const [updatedQuantities, setUpdatedQuantities] = useState<Map<string, number>>(new Map());
  const [confirmedProducts, setConfirmedProducts] = useState<Set<string>>(new Set());
  const [stockChanges, setStockChanges] = useState<Map<string, { oldQty: number; newQty: number; product: Product }>>(new Map());

  // Calculate estimated time (30 seconds per product as rough estimate)
  const estimatedMinutes = Math.ceil((products.length * 30) / 60);

  // Confetti celebration function
  const celebrateWithConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: ReturnType<typeof setInterval> = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Fire from both sides
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  const handleStart = () => {
    // Sort products by updatedAt (oldest first) to prioritize items that need updating
    const sorted = [...products].sort((a, b) => {
      return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    });

    setSortedProducts(sorted);
    setState('SYNCING');
    setCurrentIndex(0);
  };

  const [editedQuantity, setEditedQuantity] = useState<number>(0);

  const currentProduct = sortedProducts[currentIndex];

  // Update edited quantity when current product changes
  useEffect(() => {
    if (currentProduct) {
      setEditedQuantity(currentProduct.quantity);
    }
  }, [currentProduct]);

  const handleConfirmProduct = async () => {
    if (!currentProduct) return;

    // If quantity changed, update it with tracking
    if (editedQuantity !== currentProduct.quantity) {
      try {
        const response = await fetch(`/api/products/${currentProduct.id}/sync-adjust`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newQuantity: editedQuantity,
          }),
        });

        if (!response.ok) {
          toast.error('Erreur lors de la mise à jour');
          return;
        }

        const result = await response.json();

        // Track the change
        const newChanges = new Map(stockChanges);
        newChanges.set(currentProduct.id, {
          oldQty: currentProduct.quantity,
          newQty: editedQuantity,
          product: currentProduct,
        });
        setStockChanges(newChanges);

        updatedQuantities.set(currentProduct.id, editedQuantity);

        // Log for analytics
        if (result.movement) {
          console.log('Stock movement recorded:', {
            product: currentProduct.name,
            change: result.difference.change,
            type: result.difference.type,
            movementId: result.movement.id,
          });
        }
      } catch (error) {
        console.error('Update error:', error);
        toast.error('Erreur lors de la mise à jour');
        return;
      }
    }

    // Mark as confirmed
    setConfirmedProducts(new Set([...confirmedProducts, currentProduct.id]));

    // Move to next or complete
    if (currentIndex < sortedProducts.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setEditedQuantity(sortedProducts[nextIndex].quantity);
    } else {
      // All products synced
      setState('COMPLETE');
      const updatedCount = updatedQuantities.size;

      // Trigger confetti celebration!
      celebrateWithConfetti();

      toast.success('Inventaire synchronisé', {
        description: updatedCount > 0
          ? `${updatedCount} produit(s) mis à jour`
          : 'Aucune modification',
      });

      // Refresh to show updated data, but don't auto-close
      router.refresh();
    }
  };

  const handleSkipProduct = () => {
    // Just move to next without updating
    setConfirmedProducts(new Set([...confirmedProducts, currentProduct.id]));

    if (currentIndex < sortedProducts.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setEditedQuantity(sortedProducts[nextIndex].quantity);
    } else {
      setState('COMPLETE');
      const updatedCount = updatedQuantities.size;

      // Trigger confetti celebration!
      celebrateWithConfetti();

      toast.success('Inventaire synchronisé', {
        description: updatedCount > 0
          ? `${updatedCount} produit(s) mis à jour`
          : 'Aucune modification',
      });

      // Refresh to show updated data, but don't auto-close
      router.refresh();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setEditedQuantity(
        updatedQuantities.get(sortedProducts[prevIndex].id) ?? sortedProducts[prevIndex].quantity
      );
    }
  };

  const handleNext = () => {
    if (currentIndex < sortedProducts.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setEditedQuantity(sortedProducts[nextIndex].quantity);
    }
  };

  const handleClose = () => {
    if (state === 'SYNCING' && confirmedProducts.size > 0) {
      if (confirm('Vous avez des produits en cours. Quitter quand même ?')) {
        resetFlow();
        onOpenChange(false);
      }
    } else {
      resetFlow();
      onOpenChange(false);
    }
  };

  const resetFlow = () => {
    setState('START');
    setCurrentIndex(0);
    setSortedProducts([]);
    setUpdatedQuantities(new Map());
    setConfirmedProducts(new Set());
    setStockChanges(new Map());
  };

  const renderContent = () => {
    // START state
    if (state === 'START') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 p-6">
          <div className="text-center space-y-3">
            <RefreshCw className="h-20 w-20 mx-auto text-primary" />
            <h2 className="text-3xl font-bold">Synchroniser l'inventaire</h2>
            <p className="text-muted-foreground max-w-md">
              Mettez à jour vos quantités en stock rapidement.
              Les produits non modifiés récemment sont priorisés.
            </p>
          </div>

          <div className="w-full max-w-md space-y-4">
            {/* Info cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-lg border bg-card text-center">
                <Package className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{products.length}</div>
                <div className="text-xs text-muted-foreground">produits</div>
              </div>
              <div className="p-4 rounded-lg border bg-card text-center">
                <Clock className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                <div className="text-2xl font-bold">~{estimatedMinutes}</div>
                <div className="text-xs text-muted-foreground">minutes</div>
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
              <div className="flex gap-2">
                <Sparkles className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <strong>Astuce:</strong> Vous n'êtes pas obligé de tout faire d'un coup.
                  Plus vous en faites, mieux c'est !
                </div>
              </div>
            </div>

            <Button
              onClick={handleStart}
              size="lg"
              className="w-full h-16 text-lg font-semibold"
            >
              <RefreshCw className="mr-3 h-6 w-6" />
              Commencer la synchronisation
            </Button>
          </div>
        </div>
      );
    }

    // SYNCING state - Card carousel
    if (state === 'SYNCING' && currentProduct) {
      const progress = ((confirmedProducts.size) / sortedProducts.length) * 100;
      const daysAgo = Math.floor(
        (Date.now() - new Date(currentProduct.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      return (
        <div className="flex flex-col h-full">
          {/* Progress bar */}
          <div className="p-4 border-b bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {confirmedProducts.size} / {sortedProducts.length}
              </span>
              <span className="text-xs text-muted-foreground">
                {Math.round(progress)}% complété
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Product card */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold mb-1">{currentProduct.name}</h3>
                  <div className="flex gap-2 items-center">
                    <Badge variant="outline">{currentProduct.unit}</Badge>
                    {currentProduct.category && (
                      <Badge variant="secondary">{currentProduct.category}</Badge>
                    )}
                  </div>
                </div>
                {daysAgo > 0 && (
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    <Clock className="h-3 w-3 mr-1" />
                    {daysAgo}j
                  </Badge>
                )}
              </div>

              {/* Quantity update section */}
              <div className="bg-card border rounded-lg p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Quantité actuelle
                  </label>
                  <div className="text-3xl font-mono font-bold text-muted-foreground">
                    {currentProduct.quantity.toFixed(1)} {currentProduct.unit}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <label className="text-sm font-medium mb-2 block">
                    Nouvelle quantité
                  </label>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Input
                        type="number"
                        step="0.1"
                        value={editedQuantity}
                        onChange={(e) => setEditedQuantity(parseFloat(e.target.value) || 0)}
                        className="text-3xl h-16 font-mono font-bold text-center"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleConfirmProduct();
                          }
                        }}
                      />
                    </div>
                    <div className="text-2xl font-medium text-muted-foreground pb-3">
                      {currentProduct.unit}
                    </div>
                  </div>
                </div>

                {editedQuantity !== currentProduct.quantity && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-sm text-blue-900">
                      <strong>Différence:</strong>{' '}
                      {editedQuantity > currentProduct.quantity ? '+' : ''}
                      {(editedQuantity - currentProduct.quantity).toFixed(1)} {currentProduct.unit}
                    </div>
                  </div>
                )}

                {currentProduct.parLevel && (
                  <div className="text-sm text-muted-foreground">
                    Niveau de stock idéal: {currentProduct.parLevel.toFixed(1)} {currentProduct.unit}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation footer */}
          <div className="border-t p-4 bg-muted/30">
            <div className="max-w-2xl mx-auto">
              <div className="flex gap-2 mb-3">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="flex-1"
                  size="lg"
                >
                  <ChevronLeft className="mr-2 h-5 w-5" />
                  Précédent
                </Button>
                <Button
                  onClick={handleConfirmProduct}
                  className="flex-1"
                  size="lg"
                >
                  <Check className="mr-2 h-5 w-5" />
                  Confirmer
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={handleSkipProduct}
                  className="flex-1"
                  size="sm"
                >
                  Passer sans modifier
                </Button>
                {currentIndex < sortedProducts.length - 1 && (
                  <Button
                    variant="ghost"
                    onClick={handleNext}
                    className="flex-1"
                    size="sm"
                  >
                    Suivant
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // COMPLETE state
    if (state === 'COMPLETE') {
      const updatedCount = updatedQuantities.size;
      const skippedCount = confirmedProducts.size - updatedCount;

      // Calculate insights from stock changes
      let totalLosses = 0;
      let totalAdditions = 0;
      let lossCount = 0;
      let additionCount = 0;
      let largestLoss: { product: Product; amount: number } | null = null;
      let largestAddition: { product: Product; amount: number } | null = null;

      stockChanges.forEach(({ oldQty, newQty, product }) => {
        const diff = newQty - oldQty;
        if (diff < 0) {
          totalLosses += Math.abs(diff);
          lossCount++;
          if (!largestLoss || Math.abs(diff) > largestLoss.amount) {
            largestLoss = { product, amount: Math.abs(diff) };
          }
        } else if (diff > 0) {
          totalAdditions += diff;
          additionCount++;
          if (!largestAddition || diff > largestAddition.amount) {
            largestAddition = { product, amount: diff };
          }
        }
      });

      // Calculate achievement level
      const completionRate = (confirmedProducts.size / sortedProducts.length) * 100;
      let achievementLevel = '';
      let achievementColor = '';
      let achievementIcon = Check;

      if (completionRate === 100) {
        achievementLevel = 'Parfait !';
        achievementColor = 'text-yellow-600 bg-yellow-100';
        achievementIcon = Trophy;
      } else if (completionRate >= 75) {
        achievementLevel = 'Excellent !';
        achievementColor = 'text-blue-600 bg-blue-100';
        achievementIcon = Star;
      } else if (completionRate >= 50) {
        achievementLevel = 'Bon travail !';
        achievementColor = 'text-green-600 bg-green-100';
        achievementIcon = Check;
      } else {
        achievementLevel = 'Bien commencé !';
        achievementColor = 'text-purple-600 bg-purple-100';
        achievementIcon = Check;
      }

      const AchievementIcon = achievementIcon;

      return (
        <div className="flex flex-col items-center min-h-full space-y-4 p-6 overflow-y-auto pb-20">
          <div className="text-center space-y-2 pt-8">
            <div className={`h-16 w-16 mx-auto rounded-full ${achievementColor} flex items-center justify-center animate-bounce`}>
              <AchievementIcon className="h-8 w-8" />
            </div>
            <div className={`inline-block px-3 py-1 rounded-full ${achievementColor} text-xs font-bold`}>
              {achievementLevel}
            </div>
            <h2 className="text-2xl font-bold">Synchronisation terminée !</h2>
            <p className="text-sm text-muted-foreground">
              Votre inventaire a été mis à jour
            </p>
          </div>

          <div className="w-full max-w-2xl space-y-3">
            {/* Summary Stats */}
            <div className="p-3 rounded-lg border bg-card">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{updatedCount}</div>
                  <div className="text-xs text-muted-foreground">mis à jour</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-400">{skippedCount}</div>
                  <div className="text-xs text-muted-foreground">inchangés</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{confirmedProducts.size}</div>
                  <div className="text-xs text-muted-foreground">vérifiés</div>
                </div>
              </div>
            </div>

            {/* Stock Changes - Compact */}
            {updatedCount > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Losses */}
                {lossCount > 0 && (
                  <div className="p-3 rounded-lg border border-red-200 bg-red-50">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center text-sm font-bold">
                        -{lossCount}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-red-900">Pertes</div>
                        <div className="text-xs text-red-700">{lossCount} produit{lossCount > 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    {largestLoss && (
                      <div className="mt-2 p-2 rounded bg-red-100 text-xs">
                        <div className="font-medium text-red-900">{largestLoss.product.name}</div>
                        <div className="text-red-700">-{largestLoss.amount.toFixed(1)} {largestLoss.product.unit}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Additions */}
                {additionCount > 0 && (
                  <div className="p-3 rounded-lg border border-green-200 bg-green-50">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">
                        +{additionCount}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-green-900">Ajouts</div>
                        <div className="text-xs text-green-700">{additionCount} produit{additionCount > 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    {largestAddition && (
                      <div className="mt-2 p-2 rounded bg-green-100 text-xs">
                        <div className="font-medium text-green-900">{largestAddition.product.name}</div>
                        <div className="text-green-700">+{largestAddition.amount.toFixed(1)} {largestAddition.product.unit}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Key Insights - Compact */}
            {updatedCount > 0 && (
              <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
                <h3 className="font-semibold text-sm text-blue-900 mb-2 flex items-center gap-1">
                  <Sparkles className="h-4 w-4" />
                  Résumé
                </h3>
                <div className="space-y-1.5 text-xs text-blue-900">
                  {(lossCount > 0 || additionCount > 0) && (
                    <p>
                      {lossCount > 0 && <><strong>{lossCount}</strong> perte{lossCount > 1 ? 's' : ''}</>}
                      {lossCount > 0 && additionCount > 0 && ', '}
                      {additionCount > 0 && <><strong>{additionCount}</strong> ajout{additionCount > 1 ? 's' : ''}</>}
                    </p>
                  )}
                  <p>
                    <strong>{confirmedProducts.size}/{sortedProducts.length}</strong> produits vérifiés ({Math.round((confirmedProducts.size / sortedProducts.length) * 100)}%)
                  </p>
                  {skippedCount === confirmedProducts.size && (
                    <p className="font-medium">✓ Toutes les quantités correctes !</p>
                  )}
                </div>
              </div>
            )}

            {updatedCount === 0 && skippedCount > 0 && (
              <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
                <p className="text-xs text-blue-900">
                  <strong>{skippedCount}</strong> produit{skippedCount > 1 ? 's vérifiés' : ' vérifié'}, toutes les quantités correctes ! 🎉
                </p>
              </div>
            )}

            {/* Confidence Improvement - Compact */}
            {confirmedProducts.size > 0 && (
              <div className="p-3 rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
                <h3 className="font-semibold text-sm text-purple-900 mb-2 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Impact confiance
                </h3>
                <div className="space-y-2">
                  {(() => {
                    const verifiedPercentage = (confirmedProducts.size / sortedProducts.length) * 100;
                    const estimatedNewConfidence = Math.min(
                      100,
                      initialConfidence + (verifiedPercentage * 0.3)
                    );
                    const improvement = estimatedNewConfidence - initialConfidence;

                    return (
                      <>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-purple-700">Avant</span>
                          <span className="font-bold text-purple-900">{Math.round(initialConfidence)}%</span>
                        </div>
                        <div className="h-1.5 bg-purple-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-600 transition-all"
                            style={{ width: `${initialConfidence}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-purple-700">Après</span>
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-purple-900">{Math.round(estimatedNewConfidence)}%</span>
                            <span className="text-xs font-semibold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
                              +{Math.round(improvement)}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-purple-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-600 transition-all"
                            style={{ width: `${estimatedNewConfidence}%` }}
                          />
                        </div>

                        <p className="text-xs text-purple-900 mt-2">
                          <strong>+{Math.round(improvement)} points</strong>
                          {estimatedNewConfidence >= 80 && ' 🎯'}
                          {estimatedNewConfidence >= 60 && estimatedNewConfidence < 80 && ' 📈'}
                          {estimatedNewConfidence < 60 && ' 💪'}
                        </p>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Close button */}
            <Button
              onClick={() => {
                resetFlow();
                onOpenChange(false);
              }}
              size="lg"
              className="w-full mt-4"
            >
              Fermer
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-3xl w-full h-[90vh] p-0 gap-0 overflow-hidden [&>button]:hidden"
        onPointerDownOutside={(e) => {
          if (state === 'SYNCING' && confirmedProducts.size > 0) {
            e.preventDefault();
          }
        }}
      >
        <VisuallyHidden>
          <DialogTitle>Synchroniser l'inventaire</DialogTitle>
        </VisuallyHidden>

        {/* Custom close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-50 rounded-full"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Content */}
        <div className="h-full overflow-y-auto">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
