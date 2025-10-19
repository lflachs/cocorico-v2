import { Button } from '@/components/ui/button';
import { AnimatedMenuIcon } from './AnimatedMenuIcon';

interface MobileMenuToggleProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function MobileMenuToggle({ isOpen, onToggle }: MobileMenuToggleProps) {
  return (
    <div className="fixed left-4 top-3 z-50 lg:hidden">
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="border border-border bg-card/80 shadow-sm backdrop-blur-sm"
      >
        <AnimatedMenuIcon isOpen={isOpen} />
      </Button>
    </div>
  );
}
