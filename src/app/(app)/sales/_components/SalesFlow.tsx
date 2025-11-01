'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Loader2, Receipt, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { DishConfirmCard } from './DishConfirmCard';
import { SalesSummaryConfirm } from './SalesSummaryConfirm';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type FlowState = 'START' | 'PROCESSING' | 'REVIEW' | 'CONFIRM' | 'COMPLETE';

type ExtractedDish = {
  name: string;
  quantity: number;
  price?: number;
};

type SalesFlowProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * SalesFlow - Sequential card-based sales entry workflow (as modal)
 *
 * Flow: START → PROCESSING → REVIEW (card carousel) → CONFIRM → COMPLETE
 * Similar to ReceptionFlow but for POS receipts and dish sales
 */
export function SalesFlow({ open, onOpenChange }: SalesFlowProps) {
  const router = useRouter();
  const [state, setState] = useState<FlowState>('START');
  const [isUploading, setIsUploading] = useState(false);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [dishes, setDishes] = useState<ExtractedDish[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [confirmedDishes, setConfirmedDishes] = useState<Set<number>>(new Set());
  const [saleDate, setSaleDate] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<number>(0);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // START state handlers
  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Format invalide', {
        description: 'Formats acceptés: JPG, PNG, PDF',
      });
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Fichier trop volumineux', {
        description: 'Taille maximale: 10MB',
      });
      return;
    }

    // Reset state before processing new upload
    setDishes([]);
    setCurrentIndex(0);
    setConfirmedDishes(new Set());
    setReceiptId(null);
    setSaleDate('');
    setTotalAmount(0);

    setState('PROCESSING');
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('files', file);

      const response = await fetch('/api/sales/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      setReceiptId(result.receiptId);

      // Format date to YYYY-MM-DD for date input
      let formattedDate = '';
      if (result.date) {
        const dateObj = new Date(result.date);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toISOString().split('T')[0];
        }
      }
      // Default to today if no date extracted
      if (!formattedDate) {
        formattedDate = new Date().toISOString().split('T')[0];
      }
      setSaleDate(formattedDate);

      setTotalAmount(result.totalAmount || 0);

      // Debug: Log the response to see structure
      console.log('API Response:', result);
      console.log('Date (raw):', result.date);
      console.log('Date (formatted):', formattedDate);
      console.log('Total Amount:', result.totalAmount);
      console.log('Items:', result.items);

      // Use items from the process response (already extracted by OCR)
      const extractedDishes: ExtractedDish[] = result.items?.map((item: any) => {
        console.log('Processing item:', item);
        return {
          name: item.name || 'Plat inconnu',
          quantity: item.quantity || 1,
          price: item.totalPrice,
        };
      }) || [];

      if (extractedDishes.length === 0) {
        toast.error('Aucun plat extrait', {
          description: 'Veuillez vérifier le document et réessayer',
        });
        setState('START');
        return;
      }

      console.log('Final extractedDishes array:', extractedDishes);
      console.log('Number of dishes:', extractedDishes.length);

      setDishes(extractedDishes);
      setState('REVIEW');
      toast.success(`${extractedDishes.length} plat(s) détecté(s)`, {
        description: 'Vérifiez et confirmez chaque plat',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erreur lors du téléchargement', {
        description: 'Veuillez réessayer',
      });
      setState('START');
    } finally {
      setIsUploading(false);
    }
  };

  // REVIEW state handlers
  const handleConfirmDish = (dish: ExtractedDish) => {
    // Update dish data
    const updatedDishes = [...dishes];
    updatedDishes[currentIndex] = dish;
    setDishes(updatedDishes);

    // Mark as confirmed
    setConfirmedDishes(new Set([...confirmedDishes, currentIndex]));

    // Move to next or show final confirmation
    if (currentIndex < dishes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // All dishes reviewed - go to confirmation
      setState('CONFIRM');
    }
  };

  const handleRemoveDish = () => {
    const updatedDishes = dishes.filter((_, i) => i !== currentIndex);
    setDishes(updatedDishes);

    if (updatedDishes.length === 0) {
      toast.info('Aucun plat restant');
      setState('START');
      return;
    }

    if (currentIndex >= updatedDishes.length) {
      setCurrentIndex(updatedDishes.length - 1);
    }

    toast.success('Plat retiré');
  };

  const handleSkipDish = () => {
    if (currentIndex < dishes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      toast.info('Dernier plat', {
        description: 'Confirmez ou retirez-le',
      });
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < dishes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleFinalConfirm = async () => {
    if (!receiptId) return;

    setState('PROCESSING');

    try {
      // Submit to backend
      const response = await fetch(`/api/sales/${receiptId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleDate: saleDate,
          totalAmount: totalAmount,
          dishes: dishes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to confirm sales');
      }

      toast.success('✓ Ventes confirmées', {
        description: 'Stock mis à jour automatiquement',
      });

      // Reset and close
      setState('START');
      setDishes([]);
      setCurrentIndex(0);
      setConfirmedDishes(new Set());
      setReceiptId(null);
      setSaleDate('');
      setTotalAmount(0);

      router.refresh();
      onOpenChange(false);
    } catch (error) {
      console.error('Confirmation error:', error);
      toast.error('Erreur lors de la confirmation');
      setState('CONFIRM'); // Go back to confirm screen
    }
  };

  const handleClose = () => {
    if (state === 'REVIEW' && dishes.length > 0) {
      // Warn about unsaved progress
      if (confirm('Vous avez des plats non confirmés. Quitter quand même ?')) {
        // Reset all state
        setState('START');
        setDishes([]);
        setCurrentIndex(0);
        setConfirmedDishes(new Set());
        setReceiptId(null);
        setSaleDate('');
        setTotalAmount(0);
        onOpenChange(false);
      }
    } else {
      // Reset all state even if no dishes
      setState('START');
      setDishes([]);
      setCurrentIndex(0);
      setConfirmedDishes(new Set());
      setReceiptId(null);
      setSaleDate('');
      setTotalAmount(0);
      onOpenChange(false);
    }
  };

  // Render based on state
  const renderContent = () => {
    if (state === 'START') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 p-6">
          {/* Hidden inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,application/pdf"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />

          <div className="text-center space-y-3">
            <Receipt className="h-20 w-20 mx-auto text-primary" />
            <h2 className="text-3xl font-bold">Enregistrer des ventes</h2>
            <p className="text-muted-foreground">
              Scannez votre ticket de caisse pour commencer
            </p>
          </div>

          <div className="w-full max-w-md space-y-3">
            <Button
              onClick={handleCameraClick}
              size="lg"
              className="w-full h-20 text-lg font-semibold"
            >
              <Camera className="mr-3 h-6 w-6" />
              Scanner le ticket
            </Button>

            <Button
              onClick={handleFileClick}
              variant="outline"
              size="lg"
              className="w-full h-16 text-lg"
            >
              <Upload className="mr-3 h-5 w-5" />
              Télécharger un fichier
            </Button>
          </div>
        </div>
      );
    }

    if (state === 'PROCESSING') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Analyse en cours...</h2>
            <p className="text-muted-foreground">
              Extraction des plats du ticket
            </p>
          </div>
        </div>
      );
    }

    if (state === 'REVIEW' && dishes.length > 0) {
      const currentDish = dishes[currentIndex];

      return (
        <>
          <div className="h-[calc(100vh-12rem)] flex flex-col">
            {/* Navigation */}
            <div className="flex items-center justify-between p-4 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-5 w-5" />
                Précédent
              </Button>

              <span className="text-sm font-medium">
                {currentIndex + 1} / {dishes.length}
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleNext}
                disabled={currentIndex === dishes.length - 1}
              >
                Suivant
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Dish card */}
            <DishConfirmCard
              dish={currentDish}
              index={currentIndex}
              total={dishes.length}
              onConfirm={handleConfirmDish}
              onRemove={handleRemoveDish}
              onSkip={handleSkipDish}
            />
          </div>
        </>
      );
    }

    if (state === 'CONFIRM') {
      return (
        <SalesSummaryConfirm
          saleDate={saleDate}
          onSaleDateChange={setSaleDate}
          totalAmount={totalAmount}
          onTotalAmountChange={setTotalAmount}
          dishes={dishes}
          onConfirm={handleFinalConfirm}
          onBack={() => {
            setState('REVIEW');
            setCurrentIndex(dishes.length - 1); // Go back to last dish
          }}
        />
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-3xl w-full h-[90vh] p-0 gap-0 overflow-hidden [&>button]:hidden"
        onPointerDownOutside={(e) => {
          // Prevent closing when clicking outside during review
          if (state === 'REVIEW' && dishes.length > 0) {
            e.preventDefault();
          }
        }}
      >
        <VisuallyHidden>
          <DialogTitle>Enregistrer des ventes</DialogTitle>
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
        <div className="h-full overflow-auto">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
