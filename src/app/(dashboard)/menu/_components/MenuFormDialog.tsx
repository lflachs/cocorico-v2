'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/providers/LanguageProvider';
import { toast } from 'sonner';

/**
 * Menu Form Dialog
 * Modal for creating/editing menus
 */

type Menu = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
};

type MenuFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menu?: Menu | null;
  onSuccess: () => void;
};

export function MenuFormDialog({ open, onOpenChange, menu, onSuccess }: MenuFormDialogProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
  });

  useEffect(() => {
    if (open) {
      if (menu) {
        setFormData({
          name: menu.name,
          description: menu.description || '',
          isActive: menu.isActive,
        });
      } else {
        setFormData({
          name: '',
          description: '',
          isActive: true,
        });
      }
    }
  }, [open, menu]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (menu) {
        // Update existing menu
        const { updateMenuAction } = await import('@/lib/actions/menu.actions');
        const result = await updateMenuAction(menu.id, {
          name: formData.name,
          description: formData.description || undefined,
          isActive: formData.isActive,
        });

        if (result.success) {
          toast.success(t('menu.update.success'));
          onSuccess();
          onOpenChange(false);
        } else {
          toast.error(result.error || t('menu.update.error'));
        }
      } else {
        // Create new menu (will auto-create 3 sections)
        const { createMenuAction } = await import('@/lib/actions/menu.actions');
        const result = await createMenuAction({
          name: formData.name,
          description: formData.description || undefined,
          isActive: formData.isActive,
        });

        if (result.success) {
          toast.success(t('menu.update.success'));
          onSuccess();
          onOpenChange(false);
        } else {
          toast.error(result.error || t('menu.update.error'));
        }
      }
    } catch (error) {
      console.error('Error saving menu:', error);
      toast.error(t('menu.update.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {menu ? t('menu.menuForm.title.edit') : t('menu.menuForm.title.create')}
          </DialogTitle>
          <DialogDescription>
            {menu ? `Editing: ${menu.name}` : 'Create a new menu with 3 default sections'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">{t('menu.menuForm.name')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('menu.menuForm.namePlaceholder')}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">{t('menu.menuForm.description')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('menu.menuForm.descriptionPlaceholder')}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label htmlFor="isActive">{t('menu.menuForm.isActive')}</Label>
            </div>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t('menu.menuForm.cancel')}
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? t('menu.menuForm.saving') : t('menu.menuForm.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
