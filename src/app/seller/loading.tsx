export default function SellerLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <div className="flex flex-col gap-2">
        <span className="h-3 w-24 animate-pulse rounded-full bg-[var(--color-canvas-mist)]" />
        <span className="h-7 w-48 animate-pulse rounded-full bg-[var(--color-canvas-mist)]" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="shop-card h-28 animate-pulse" />
        ))}
      </div>
      <div className="shop-card h-64 animate-pulse" />
    </div>
  );
}
