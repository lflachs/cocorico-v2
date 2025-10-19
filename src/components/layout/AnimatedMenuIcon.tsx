interface AnimatedMenuIconProps {
  isOpen: boolean;
}

export function AnimatedMenuIcon({ isOpen }: AnimatedMenuIconProps) {
  return (
    <div className="relative flex h-4 w-4 items-center justify-center">
      {/* Top bar */}
      <span
        className={`absolute h-0.5 w-full bg-current transition-all duration-300 ease-in-out ${
          isOpen ? 'rotate-45' : '-translate-y-1.5'
        }`}
      />
      {/* Middle bar */}
      <span
        className={`absolute h-0.5 w-full bg-current transition-all duration-300 ease-in-out ${
          isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}
      />
      {/* Bottom bar */}
      <span
        className={`absolute h-0.5 w-full bg-current transition-all duration-300 ease-in-out ${
          isOpen ? '-rotate-45' : 'translate-y-1.5'
        }`}
      />
    </div>
  );
}
