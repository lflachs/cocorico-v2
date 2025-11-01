'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Loader2, PackageCheck, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ProductConfirmCard } from './ProductConfirmCard';
import { DLCCaptureModal } from './DLCCaptureModal';
import { QuickDisputeModal } from './QuickDisputeModal';
import { BillSummaryConfirm } from './BillSummaryConfirm';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { generateDisputeMailto, generateDisputeEmailText } from '@/lib/utils/email-templates';

type FlowState = 'START' | 'UPLOAD' | 'PROCESSING' | 'REVIEW' | 'CONFIRM' | 'COMPLETE';

type ExtractedProduct = {
  name: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  totalPrice?: number;
};

type DLCData = {
  expirationDate: Date;
  lotNumber?: string;
  photo?: File;
};

type DisputeData = {
  type: 'MISSING' | 'DAMAGED' | 'WRONG_QUANTITY' | 'WRONG_PRODUCT' | 'QUALITY';
  description: string;
};

type ReceptionFlowProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * ReceptionFlow - Sequential card-based reception workflow (as modal)
 *
 * Flow: START → UPLOAD → PROCESSING → REVIEW (card carousel) → COMPLETE
 */
export function ReceptionFlow({ open, onOpenChange }: ReceptionFlowProps) {
  const router = useRouter();
  const [state, setState] = useState<FlowState>('START');
  const [isUploading, setIsUploading] = useState(false);
  const [billId, setBillId] = useState<string | null>(null);
  const [products, setProducts] = useState<ExtractedProduct[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [confirmedProducts, setConfirmedProducts] = useState<Set<number>>(new Set());
  const [dlcModalOpen, setDlcModalOpen] = useState(false);
  const [productDLCs, setProductDLCs] = useState<Map<number, DLCData>>(new Map());
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [productDisputes, setProductDisputes] = useState<Map<number, DisputeData>>(new Map());
  const [supplierName, setSupplierName] = useState<string>('');
  const [supplierEmail, setSupplierEmail] = useState<string>('');
  const [billDate, setBillDate] = useState<string>('');
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
    setProducts([]);
    setCurrentIndex(0);
    setConfirmedProducts(new Set());
    setProductDLCs(new Map());
    setProductDisputes(new Map());
    setBillId(null);
    setSupplierName('');
    setSupplierEmail('');
    setBillDate('');
    setTotalAmount(0);

    setState('PROCESSING');
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('files', file); // Note: 'files' not 'file' - matches existing API

      const response = await fetch('/api/bills/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      setBillId(result.billId);

      // Store bill metadata
      setSupplierName(result.supplier || '');
      setSupplierEmail(result.supplierEmail || '');

      // Format date to YYYY-MM-DD for date input
      let formattedDate = '';
      if (result.date) {
        const dateObj = new Date(result.date);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toISOString().split('T')[0];
        }
      }
      setBillDate(formattedDate);

      setTotalAmount(result.totalAmount || 0);

      // Debug: Log the response to see structure
      console.log('API Response:', result);
      console.log('Supplier:', result.supplier);
      console.log('Supplier Email:', result.supplierEmail);
      console.log('Date (raw):', result.date);
      console.log('Date (formatted):', formattedDate);
      console.log('Total Amount:', result.totalAmount);
      console.log('Items:', result.items);

      // Use items from the process response (already extracted by OCR)
      const extractedProducts: ExtractedProduct[] = result.items?.map((item: any) => {
        console.log('Processing item:', item);
        return {
          name: item.name || 'Produit inconnu',
          quantity: item.quantity || 0,
          unit: item.unit || 'PC',
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        };
      }) || [];

      if (extractedProducts.length === 0) {
        toast.error('Aucun produit extrait', {
          description: 'Veuillez vérifier le document et réessayer',
        });
        setState('START');
        return;
      }

      console.log('Final extractedProducts array:', extractedProducts);
      console.log('Number of products:', extractedProducts.length);

      setProducts(extractedProducts);
      setState('REVIEW');
      toast.success(`${extractedProducts.length} produit(s) détecté(s)`, {
        description: 'Glissez ou tapez Suivant pour confirmer',
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
  const handleConfirmProduct = (product: ExtractedProduct) => {
    // Update product data
    const updatedProducts = [...products];
    updatedProducts[currentIndex] = product;
    setProducts(updatedProducts);

    // Mark as confirmed
    setConfirmedProducts(new Set([...confirmedProducts, currentIndex]));

    // Move to next or show final confirmation
    if (currentIndex < products.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // All products reviewed - go to confirmation
      setState('CONFIRM');
    }
  };

  const handleCaptureDLC = () => {
    setDlcModalOpen(true);
  };

  const handleDLCSave = (dlc: DLCData) => {
    const newDLCs = new Map(productDLCs);
    newDLCs.set(currentIndex, dlc);
    setProductDLCs(newDLCs);
    toast.success('DLC enregistrée');
  };

  const handleDispute = () => {
    setDisputeModalOpen(true);
  };

  const handleDisputeSave = (dispute: DisputeData) => {
    const newDisputes = new Map(productDisputes);
    newDisputes.set(currentIndex, dispute);
    setProductDisputes(newDisputes);
    toast.success('Litige enregistré', {
      description: 'Sera créé lors de la confirmation',
    });
  };

  const handleRemoveProduct = () => {
    const updatedProducts = products.filter((_, i) => i !== currentIndex);
    setProducts(updatedProducts);

    if (updatedProducts.length === 0) {
      toast.info('Aucun produit restant');
      setState('START');
      return;
    }

    if (currentIndex >= updatedProducts.length) {
      setCurrentIndex(updatedProducts.length - 1);
    }

    toast.success('Produit retiré');
  };

  const handleSkipProduct = () => {
    if (currentIndex < products.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      toast.info('Dernier produit', {
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
    if (currentIndex < products.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSendDisputeEmail = () => {
    if (!supplierEmail) {
      toast.error('Email manquant', {
        description: 'Veuillez saisir l\'email du fournisseur',
      });
      return;
    }

    // Collect dispute details
    const disputeDetails = Array.from(productDisputes.entries()).map(([index, dispute]) => {
      const product = products[index];
      return {
        productName: product.name,
        type: dispute.type,
        description: dispute.description,
        quantity: product.quantity,
        unit: product.unit,
      };
    });

    // Generate mailto link
    const mailtoLink = generateDisputeMailto({
      supplierName,
      supplierEmail,
      billDate,
      disputes: disputeDetails,
      totalAmount,
    });

    // Open mailto
    window.location.href = mailtoLink;

    toast.success('Email de litige ouvert', {
      description: 'Votre client email va s\'ouvrir avec le message pré-rempli',
    });
  };

  const handleCopyDisputeEmail = async () => {
    if (!supplierEmail) {
      toast.error('Email manquant', {
        description: 'Veuillez saisir l\'email du fournisseur',
      });
      return;
    }

    // Collect dispute details
    const disputeDetails = Array.from(productDisputes.entries()).map(([index, dispute]) => {
      const product = products[index];
      return {
        productName: product.name,
        type: dispute.type,
        description: dispute.description,
        quantity: product.quantity,
        unit: product.unit,
      };
    });

    // Generate email text
    const { subject, body } = generateDisputeEmailText({
      supplierName,
      supplierEmail,
      billDate,
      disputes: disputeDetails,
      totalAmount,
    });

    const fullText = `Destinataire: ${supplierEmail}\nSujet: ${subject}\n\n${body}`;

    try {
      await navigator.clipboard.writeText(fullText);
      toast.success('Email copié', {
        description: 'Le texte a été copié dans le presse-papier',
      });
    } catch (error) {
      console.error('Clipboard error:', error);
      toast.error('Erreur lors de la copie', {
        description: 'Impossible d\'accéder au presse-papier',
      });
    }
  };

  const handleFinalConfirm = async () => {
    if (!billId) return;

    setState('PROCESSING');

    try {
      // Prepare product mappings with DLCs and disputes
      const productMappings = products.map((product, index) => {
        const dlc = productDLCs.get(index);
        const dispute = productDisputes.get(index);
        return {
          productName: product.name,
          quantity: product.quantity,
          unit: product.unit,
          unitPrice: product.unitPrice || 0,
          dlc: dlc ? {
            expirationDate: dlc.expirationDate.toISOString(),
            lotNumber: dlc.lotNumber,
          } : undefined,
          dispute: dispute ? {
            type: dispute.type,
            description: dispute.description,
          } : undefined,
        };
      });

      // Submit to backend
      const response = await fetch(`/api/bills/${billId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier: supplierName,
          billDate: billDate,
          totalAmount: totalAmount,
          products: productMappings,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to confirm bill');
      }

      const disputeCount = Array.from(productDisputes.keys()).length;
      toast.success('✓ Livraison confirmée', {
        description: disputeCount > 0
          ? `Stock mis à jour. ${disputeCount} litige(s) créé(s).`
          : 'Stock mis à jour automatiquement',
      });

      // Reset and close
      setState('START');
      setProducts([]);
      setCurrentIndex(0);
      setConfirmedProducts(new Set());
      setProductDLCs(new Map());
      setProductDisputes(new Map());
      setBillId(null);
      setSupplierName('');
      setSupplierEmail('');
      setBillDate('');
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
    if (state === 'REVIEW' && products.length > 0) {
      // Warn about unsaved progress
      if (confirm('Vous avez des produits non confirmés. Quitter quand même ?')) {
        // Reset all state
        setState('START');
        setProducts([]);
        setCurrentIndex(0);
        setConfirmedProducts(new Set());
        setProductDLCs(new Map());
        setProductDisputes(new Map());
        setBillId(null);
        setSupplierName('');
        setSupplierEmail('');
        setBillDate('');
        setTotalAmount(0);
        onOpenChange(false);
      }
    } else {
      // Reset all state even if no products
      setState('START');
      setProducts([]);
      setCurrentIndex(0);
      setConfirmedProducts(new Set());
      setProductDLCs(new Map());
      setProductDisputes(new Map());
      setBillId(null);
      setSupplierName('');
      setSupplierEmail('');
      setBillDate('');
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
          <PackageCheck className="h-20 w-20 mx-auto text-primary" />
          <h2 className="text-3xl font-bold">Démarrer une réception</h2>
          <p className="text-muted-foreground">
            Scannez le bon de livraison pour commencer
          </p>
        </div>

        <div className="w-full max-w-md space-y-3">
          <Button
            onClick={handleCameraClick}
            size="lg"
            className="w-full h-20 text-lg font-semibold"
          >
            <Camera className="mr-3 h-6 w-6" />
            Scanner BL
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
            Extraction des produits du document
          </p>
        </div>
      </div>
      );
    }

    if (state === 'REVIEW' && products.length > 0) {
      const currentProduct = products[currentIndex];

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
              {currentIndex + 1} / {products.length}
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              disabled={currentIndex === products.length - 1}
            >
              Suivant
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Product card */}
          <ProductConfirmCard
            product={currentProduct}
            index={currentIndex}
            total={products.length}
            onConfirm={handleConfirmProduct}
            onCaptureDLC={handleCaptureDLC}
            onDispute={handleDispute}
            onRemove={handleRemoveProduct}
            onSkip={handleSkipProduct}
          />
        </div>

        {/* DLC Modal */}
        <DLCCaptureModal
          open={dlcModalOpen}
          onOpenChange={setDlcModalOpen}
          productName={currentProduct.name}
          onCapture={handleDLCSave}
        />

        {/* Dispute Modal */}
        <QuickDisputeModal
          open={disputeModalOpen}
          onOpenChange={setDisputeModalOpen}
          productName={currentProduct.name}
          onSubmit={handleDisputeSave}
        />
        </>
      );
    }

    if (state === 'CONFIRM') {
      const productsWithDLC = Array.from(productDLCs.keys()).length;
      const productsWithDisputes = Array.from(productDisputes.keys()).length;

      return (
        <BillSummaryConfirm
          supplierName={supplierName}
          supplierEmail={supplierEmail}
          onSupplierChange={setSupplierName}
          onSupplierEmailChange={setSupplierEmail}
          billDate={billDate}
          onBillDateChange={setBillDate}
          totalAmount={totalAmount}
          onTotalAmountChange={setTotalAmount}
          products={products}
          productsWithDLC={productsWithDLC}
          productsWithDisputes={productsWithDisputes}
          disputes={productDisputes}
          onConfirm={handleFinalConfirm}
          onBack={() => {
            setState('REVIEW');
            setCurrentIndex(products.length - 1); // Go back to last product
          }}
          onSendDisputeEmail={productsWithDisputes > 0 ? handleSendDisputeEmail : undefined}
          onCopyDisputeEmail={productsWithDisputes > 0 ? handleCopyDisputeEmail : undefined}
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
          if (state === 'REVIEW' && products.length > 0) {
            e.preventDefault();
          }
        }}
      >
        <VisuallyHidden>
          <DialogTitle>Scanner une facture</DialogTitle>
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
