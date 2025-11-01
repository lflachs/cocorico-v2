'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Check } from 'lucide-react';

type DisputeType = 'MISSING' | 'DAMAGED' | 'WRONG_QUANTITY' | 'WRONG_PRODUCT' | 'QUALITY';

type DisputeData = {
  type: DisputeType;
  description: string;
};

type QuickDisputeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  onSubmit: (dispute: DisputeData) => void;
};

/**
 * QuickDisputeModal - Fast dispute creation during reception
 *
 * Simple form to flag product issues immediately
 */
export function QuickDisputeModal({
  open,
  onOpenChange,
  productName,
  onSubmit,
}: QuickDisputeModalProps) {
  const [disputeType, setDisputeType] = useState<DisputeType>('MISSING');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    onSubmit({
      type: disputeType,
      description,
    });

    // Reset form
    setDisputeType('MISSING');
    setDescription('');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setDisputeType('MISSING');
    setDescription('');
    onOpenChange(false);
  };

  const disputeOptions = [
    { value: 'MISSING' as DisputeType, label: 'Produit manquant', description: 'Non reçu' },
    { value: 'DAMAGED' as DisputeType, label: 'Produit endommagé', description: 'Abîmé ou cassé' },
    { value: 'WRONG_QUANTITY' as DisputeType, label: 'Mauvaise quantité', description: 'Quantité incorrecte' },
    { value: 'WRONG_PRODUCT' as DisputeType, label: 'Mauvais produit', description: 'Produit différent' },
    { value: 'QUALITY' as DisputeType, label: 'Problème qualité', description: 'Qualité insuffisante' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Signaler un litige
          </DialogTitle>
          <p className="text-sm text-muted-foreground font-semibold">{productName}</p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Dispute Type */}
          <div>
            <Label>Type de problème *</Label>
            <div className="mt-2 grid grid-cols-1 gap-2">
              {disputeOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={disputeType === option.value ? 'default' : 'outline'}
                  className="h-auto py-3 px-4 justify-start text-left"
                  onClick={() => setDisputeType(option.value)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="mt-0.5">
                      {disputeType === option.value && (
                        <Check className="h-4 w-4" />
                      )}
                      {disputeType !== option.value && (
                        <div className="h-4 w-4 rounded-full border-2" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs opacity-70">{option.description}</div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Détails (optionnel)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ajoutez des détails sur le problème..."
              rows={3}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} className="bg-orange-600 hover:bg-orange-700">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Signaler le litige
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
