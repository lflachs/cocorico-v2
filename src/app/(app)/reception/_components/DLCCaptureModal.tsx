'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type DLCCaptureModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  onCapture: (data: { expirationDate: Date; lotNumber?: string; photo?: File }) => void;
};

/**
 * DLCCaptureModal - Quick DLC capture during reception
 *
 * Camera-first for speed, with manual entry fallback
 */
export function DLCCaptureModal({
  open,
  onOpenChange,
  productName,
  onCapture,
}: DLCCaptureModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [expirationDate, setExpirationDate] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<File | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handlePhotoCapture = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    setCapturedPhoto(file);
    setIsProcessing(true);

    try {
      // TODO: Call OCR API to extract expiration date from photo
      // For now, just show manual entry
      toast.info('Photo capturée', {
        description: 'Vérifiez la date extraite ci-dessous',
      });
    } catch (error) {
      toast.error('Erreur lors de l\'analyse de la photo');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = () => {
    if (!expirationDate) {
      toast.error('Veuillez saisir une date d\'expiration');
      return;
    }

    onCapture({
      expirationDate: new Date(expirationDate),
      lotNumber: lotNumber || undefined,
      photo: capturedPhoto || undefined,
    });

    // Reset form
    setExpirationDate('');
    setLotNumber('');
    setCapturedPhoto(null);
    onOpenChange(false);
  };

  const handleSkip = () => {
    // Reset and close
    setExpirationDate('');
    setLotNumber('');
    setCapturedPhoto(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Capturer DLC</DialogTitle>
          <p className="text-sm text-muted-foreground">{productName}</p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Hidden camera input */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handlePhotoCapture(e.target.files)}
          />

          {/* Camera button */}
          {!capturedPhoto && (
            <Button
              onClick={handleCameraClick}
              disabled={isProcessing}
              variant="outline"
              className="w-full h-20 text-lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-5 w-5" />
                  Prendre photo de l'étiquette
                </>
              )}
            </Button>
          )}

          {capturedPhoto && (
            <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md p-3">
              ✓ Photo capturée: {capturedPhoto.name}
            </div>
          )}

          {/* Manual entry */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="expiration-date">Date d'expiration *</Label>
              <Input
                id="expiration-date"
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="lot-number">Numéro de lot (optionnel)</Label>
              <Input
                id="lot-number"
                type="text"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="ex: LOT12345"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleSkip}>
            Passer
          </Button>
          <Button onClick={handleSave} disabled={!expirationDate}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
