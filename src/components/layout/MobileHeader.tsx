export function MobileHeader() {
  return (
    <div className="relative z-30 flex flex-shrink-0 items-center justify-center border-b border-border bg-card px-4 py-3 lg:hidden">
      <div className="absolute left-4">{/* Space for hamburger */}</div>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold text-foreground">Cocorico</h1>
      </div>
    </div>
  );
}
