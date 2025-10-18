'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

type AddProductDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddProductDialog({ open, onOpenChange }: AddProductDialogProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: 'KG',
    unitPrice: '',
    parLevel: '',
    trackable: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    if (!formData.quantity || parseFloat(formData.quantity) < 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          quantity: parseFloat(formData.quantity) || 0,
          unit: formData.unit,
          unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : null,
          parLevel: formData.parLevel ? parseFloat(formData.parLevel) : null,
          trackable: formData.trackable,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create product');
      }

      toast.success('Product added successfully');

      // Reset form
      setFormData({
        name: '',
        quantity: '',
        unit: 'KG',
        unitPrice: '',
        parLevel: '',
        trackable: true,
      });

      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Failed to add product. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Product Manually</DialogTitle>
          <DialogDescription>
            Enter product details to add to your inventory
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Name */}
          <div>
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Tomatoes"
              className="mt-2"
              required
            />
          </div>

          {/* Quantity and Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="0.00"
                className="mt-2"
                required
              />
            </div>
            <div>
              <Label htmlFor="unit">Unit *</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KG">KG</SelectItem>
                  <SelectItem value="L">L</SelectItem>
                  <SelectItem value="PC">PC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Unit Price */}
          <div>
            <Label htmlFor="unitPrice">Unit Price (€)</Label>
            <Input
              id="unitPrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.unitPrice}
              onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
              placeholder="Optional"
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">Price per unit (KG/L/PC)</p>
          </div>

          {/* Par Level */}
          <div>
            <Label htmlFor="parLevel">Par Level</Label>
            <Input
              id="parLevel"
              type="number"
              step="0.01"
              min="0"
              value={formData.parLevel}
              onChange={(e) => setFormData({ ...formData, parLevel: e.target.value })}
              placeholder="Optional"
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum stock level for alerts</p>
          </div>

          {/* Trackable */}
          <div className="flex items-center gap-2">
            <input
              id="trackable"
              type="checkbox"
              checked={formData.trackable}
              onChange={(e) => setFormData({ ...formData, trackable: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="trackable" className="font-normal cursor-pointer">
              Track inventory for this product
            </Label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Product'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
