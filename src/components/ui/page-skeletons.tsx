import { cn } from "@/lib/utils";
import { LoadingRegion, Skeleton, SkeletonTable } from "@/components/ui/skeleton";

function PageHeaderSkeleton({
  action = false,
  description = true,
}: {
  action?: boolean | number;
  description?: boolean;
}) {
  const actionCount = action === true ? 1 : action === false ? 0 : action;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 flex-1">
        <Skeleton className="h-8 w-52 rounded-[10px] sm:h-9 sm:w-64" />
        {description && (
          <>
            <Skeleton className="mt-3 h-3 w-full max-w-xl" />
            <Skeleton className="mt-2 h-3 w-2/3 max-w-md" />
          </>
        )}
      </div>
      {actionCount > 0 && (
        <div className="flex shrink-0 gap-2">
          {Array.from({ length: actionCount }).map((_, index) => (
            <Skeleton
              key={index}
              className={cn(
                "h-10 rounded-full",
                index === 0 ? "w-28" : "w-32",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProductCardSkeleton({ variant = "grid" }: { variant?: "grid" | "list" }) {
  if (variant === "list") {
    return (
      <div className="shop-card flex items-stretch gap-3 p-2.5">
        <Skeleton className="aspect-square w-28 shrink-0 rounded-[20px] sm:w-36" />
        <div className="flex min-w-0 flex-1 flex-col justify-center py-1 pr-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-4 w-4/5 rounded-[8px]" />
          <div className="mt-2 flex items-center gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-2 h-3 w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="shop-card flex flex-col p-2.5">
      <Skeleton className="aspect-square w-full rounded-[20px]" />
      <div className="px-1.5 pb-1 pt-2.5">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="mt-2 h-4 w-4/5 rounded-[8px]" />
        <Skeleton className="mt-2 h-4 w-1/3" />
        <Skeleton className="mt-2 h-3 w-2/3" />
      </div>
    </div>
  );
}

function FilterChipsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Skeleton className="h-3 w-16 self-center" />
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn("h-7 rounded-full", index === 0 ? "w-16" : "w-24")}
        />
      ))}
    </div>
  );
}

export function MarketplaceBrowseSkeleton() {
  return (
    <LoadingRegion
      label="Loading marketplace listings"
      className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8"
    >
      <div className="lg:flex lg:gap-8">
        <aside className="hidden lg:block lg:w-56 lg:shrink-0">
          <div className="sticky top-24 flex flex-col gap-2">
            <Skeleton className="mb-1 h-3 w-20" />
            {Array.from({ length: 12 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full rounded-[14px]" />
            ))}
            <Skeleton className="mb-1 mt-4 h-3 w-24" />
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full rounded-[14px]" />
            ))}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-5 flex gap-2 overflow-hidden lg:hidden">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-28 shrink-0 rounded-full" />
            ))}
          </div>

          <header className="mb-5">
            <Skeleton className="h-8 w-64 rounded-[10px] sm:h-9 sm:w-80" />
            <Skeleton className="mt-2.5 h-3 w-full max-w-2xl" />
            <Skeleton className="mt-2 h-3 w-28" />
          </header>

          <div className="shop-card mb-5 flex flex-col gap-4 p-4">
            <FilterChipsSkeleton count={7} />
            <FilterChipsSkeleton count={5} />
            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-faint-border)] pt-4">
              <Skeleton className="h-8 w-28 rounded-full" />
              <Skeleton className="h-8 w-32 rounded-full" />
              <Skeleton className="ml-auto h-9 w-20 rounded-full" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 24 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-9 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    </LoadingRegion>
  );
}

export function ListingDetailSkeleton() {
  return (
    <LoadingRegion
      label="Loading listing"
      className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6"
    >
      <Skeleton className="h-3 w-36" />

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-5">
          <div className="shop-card p-2.5">
            <Skeleton className="aspect-[4/3] w-full rounded-[20px]" />
          </div>

          <div className="shop-card p-5 sm:p-6">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-2 h-8 w-4/5 rounded-[10px]" />
            <div className="mt-4 flex items-center gap-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-3 w-56" />
            <div className="mt-6 flex flex-col gap-2">
              <Skeleton className="h-4 w-28 rounded-[8px]" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="shop-card p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-2 h-4 w-32 rounded-[8px]" />
              </div>
            </div>
            <Skeleton className="mt-6 h-11 w-full rounded-full" />
          </div>

          <div className="shop-card p-5">
            <Skeleton className="h-4 w-32 rounded-[8px]" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-3/4" />
            <Skeleton className="mt-4 h-11 w-full rounded-full" />
          </div>
        </div>
      </div>
    </LoadingRegion>
  );
}

export function FormPageSkeleton({
  label = "Loading page",
  sections = 4,
  fieldsPerSection = 4,
  maxWidth = "max-w-2xl",
  withHeader = true,
}: {
  label?: string;
  sections?: number;
  fieldsPerSection?: number;
  maxWidth?: string;
  withHeader?: boolean;
}) {
  return (
    <LoadingRegion label={label} className="flex flex-col gap-6">
      {withHeader && <PageHeaderSkeleton />}

      <div className={cn("mx-auto flex w-full flex-col gap-5", maxWidth)}>
        {Array.from({ length: sections }).map((_, section) => (
          <div key={section} className="shop-card p-5 sm:p-7">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-5 w-44 rounded-[8px]" />
            <Skeleton className="mt-2 h-3 w-full max-w-md" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {Array.from({ length: fieldsPerSection }).map((_, field) => (
                <div
                  key={field}
                  className={cn(
                    "flex flex-col gap-1.5",
                    field === 0 && fieldsPerSection > 2 && "sm:col-span-2",
                  )}
                >
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-[52px] w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function SellPageSkeleton() {
  return (
    <LoadingRegion
      label="Loading listing form"
      className="min-h-screen bg-[var(--shop-canvas)] text-[var(--color-ink-black)]"
    >
      <header className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-5 sm:px-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </header>

      <div className="mx-auto max-w-2xl px-4 pb-16 pt-2 sm:px-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-4/5 rounded-[10px] sm:h-9" />
          <Skeleton className="mt-3 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-2/3" />
        </div>
        <div className="flex flex-col gap-5">
          {Array.from({ length: 5 }).map((_, section) => (
            <div key={section} className="shop-card p-5 sm:p-7">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-5 w-44 rounded-[8px]" />
              <Skeleton className="mt-2 h-3 w-full max-w-md" />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-[52px] w-full rounded-full" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-[52px] w-full rounded-full" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-[52px] w-full rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

export function ProfilePageSkeleton() {
  return (
    <LoadingRegion label="Loading profile" className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeaderSkeleton />

      <div className="shop-card p-5 sm:p-7">
        <Skeleton className="h-5 w-48 rounded-[8px]" />
        <Skeleton className="mt-2 h-3 w-full max-w-lg" />
        <div className="mt-5 flex items-center gap-4">
          <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-36 rounded-full" />
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-[52px] w-full rounded-full" />
            </div>
          ))}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-28 w-full rounded-[20px]" />
          </div>
        </div>
        <Skeleton className="mt-6 h-11 w-32 rounded-full" />
      </div>

      <div className="shop-card p-5 sm:p-6">
        <Skeleton className="h-4 w-40 rounded-[8px]" />
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

export function InboxSkeleton({
  label = "Loading messages",
  contained = true,
  back = true,
}: {
  label?: string;
  contained?: boolean;
  back?: boolean;
}) {
  return (
    <LoadingRegion
      label={label}
      className={cn("flex flex-col gap-6", contained && "mx-auto w-full max-w-3xl px-4 py-8 sm:px-6")}
    >
      {back && <Skeleton className="h-3 w-36" />}
      <PageHeaderSkeleton action />

      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="shop-card flex items-start gap-3 p-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <Skeleton className="h-4 w-32 rounded-[8px]" />
                <Skeleton className="h-3 w-14" />
              </div>
              <Skeleton className="mt-1.5 h-3 w-44" />
              <div className="mt-2 flex items-center justify-between gap-3">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-5 w-6 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function ConversationSkeleton({
  contained = true,
  label = "Loading conversation",
}: {
  contained?: boolean;
  label?: string;
}) {
  return (
    <LoadingRegion
      label={label}
      className={cn(contained && "mx-auto w-full max-w-4xl px-4 py-6 sm:px-6")}
    >
      <div className="flex flex-col gap-4">
        <Skeleton className="h-3 w-24" />

        <div className="shop-card flex items-center gap-3 p-4">
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-36 rounded-[8px]" />
            <Skeleton className="mt-2 h-3 w-56" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="shop-card flex min-h-[55vh] max-h-[70vh] flex-col p-4 sm:p-5">
            <div className="flex flex-1 flex-col gap-3 py-2">
              <Skeleton className="h-12 w-3/5 rounded-[20px]" />
              <Skeleton className="ml-auto h-16 w-2/3 rounded-[20px]" />
              <Skeleton className="h-10 w-1/2 rounded-[20px]" />
              <Skeleton className="ml-auto h-20 w-3/5 rounded-[20px]" />
              <Skeleton className="h-12 w-2/5 rounded-[20px]" />
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-[var(--color-faint-border)] pt-4">
              <Skeleton className="h-12 flex-1 rounded-full" />
              <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="shop-card p-5">
              <Skeleton className="h-4 w-28 rounded-[8px]" />
              <Skeleton className="mt-3 h-16 w-full rounded-[16px]" />
              <Skeleton className="mt-3 h-3 w-3/4" />
            </div>
            <div className="shop-card p-5">
              <Skeleton className="h-4 w-20 rounded-[8px]" />
              <Skeleton className="mt-2 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-2/3" />
              <Skeleton className="mt-4 h-11 w-full rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </LoadingRegion>
  );
}

export function NotificationsSkeleton() {
  return (
    <LoadingRegion
      label="Loading notifications"
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6"
    >
      <div className="flex items-center gap-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-24" />
      </div>
      <PageHeaderSkeleton />
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-36 rounded-full" />
      </div>
      <div className="flex flex-col gap-1">
        {Array.from({ length: 3 }).map((_, index) => (
          <NotificationRowSkeleton key={index} />
        ))}
        <Skeleton className="mx-1 mt-3 h-3 w-16" />
        {Array.from({ length: 3 }).map((_, index) => (
          <NotificationRowSkeleton key={`read-${index}`} />
        ))}
      </div>
    </LoadingRegion>
  );
}

function NotificationRowSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-[20px] bg-[var(--color-canvas-mist)] p-3.5">
      <Skeleton className="mt-0.5 h-9 w-9 shrink-0 rounded-full bg-[var(--color-pure-white)]" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 w-1/2 rounded-[8px] bg-[var(--color-pure-white)]" />
        <Skeleton className="mt-2 h-3 w-4/5" />
        <Skeleton className="mt-2 h-3 w-32" />
      </div>
    </div>
  );
}

export function SellerDashboardSkeleton() {
  return (
    <LoadingRegion label="Loading seller overview" className="flex flex-col gap-8">
      <PageHeaderSkeleton action />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="shop-card flex flex-col gap-3 p-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-14 rounded-[8px]" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="shop-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-32 rounded-[8px]" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-[20px] bg-[var(--color-canvas-mist)] p-3"
              >
                <Skeleton className="h-14 w-14 shrink-0 rounded-[14px] bg-[var(--color-pure-white)]" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-3/4 rounded-[8px] bg-[var(--color-pure-white)]" />
                  <Skeleton className="mt-2 h-3 w-1/2 bg-[var(--color-pure-white)]" />
                </div>
                <Skeleton className="h-6 w-20 shrink-0 rounded-full bg-[var(--color-pure-white)]" />
              </div>
            ))}
          </div>
        </div>

        <div className="shop-card p-5 sm:p-6">
          <Skeleton className="h-4 w-36 rounded-[8px]" />
          <div className="mt-4 flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-[20px] bg-[var(--color-canvas-mist)] p-3"
              >
                <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-[var(--color-pure-white)]" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-2/3 rounded-[8px] bg-[var(--color-pure-white)]" />
                  <Skeleton className="mt-2 h-3 w-4/5 bg-[var(--color-pure-white)]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-72" />
        <Skeleton className="h-3 w-24" />
      </div>
    </LoadingRegion>
  );
}

export function SellerListingsSkeleton() {
  return (
    <LoadingRegion label="Loading your listings" className="flex flex-col gap-6">
      <PageHeaderSkeleton />

      <div className="shop-card flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-11 flex-1 rounded-full" />
          <Skeleton className="h-11 w-24 shrink-0 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-11 w-full rounded-full" />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 20 }).map((_, index) => (
          <div key={index} className="shop-card p-3 sm:p-4">
            <div className="flex items-start gap-3 sm:items-center">
              <Skeleton className="h-16 w-16 shrink-0 rounded-[16px] sm:h-20 sm:w-20" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="mt-2 h-4 w-3/5 rounded-[8px]" />
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="hidden h-3 w-28 sm:block" />
                </div>
              </div>
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-9 w-44 rounded-full" />
      </div>
    </LoadingRegion>
  );
}

export function SellerSalesSkeleton() {
  return (
    <LoadingRegion label="Loading sales" className="flex flex-col gap-6">
      <PageHeaderSkeleton />

      <div className="shop-card flex items-center justify-between gap-4 p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div>
            <Skeleton className="h-5 w-36 rounded-[8px]" />
            <Skeleton className="mt-2 h-3 w-56" />
          </div>
        </div>
        <Skeleton className="h-3 w-12" />
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-24 rounded-full" />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="shop-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <Skeleton className="h-4 w-56 rounded-[8px]" />
              <Skeleton className="mt-2 h-3 w-64" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function SaleDetailSkeleton() {
  return (
    <LoadingRegion label="Loading sale" className="flex flex-col gap-6">
      <Skeleton className="h-3 w-24" />
      <PageHeaderSkeleton action />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex flex-col gap-5">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="shop-card p-5 sm:p-7">
              <Skeleton className="h-5 w-36 rounded-[8px]" />
              <Skeleton className="mt-2 h-3 w-full max-w-sm" />
              <div className="mt-5 flex flex-col">
                {Array.from({ length: 3 }).map((_, row) => (
                  <div
                    key={row}
                    className="flex items-start justify-between gap-4 border-b border-[var(--color-faint-border)] py-3 last:border-b-0"
                  >
                    <Skeleton className="h-4 w-24 rounded-[8px]" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-5">
          <div className="shop-card p-5 sm:p-7">
            <Skeleton className="h-5 w-36 rounded-[8px]" />
            <div className="mt-5 flex flex-col gap-3">
              <Skeleton className="h-11 w-full rounded-full" />
              <Skeleton className="h-11 w-full rounded-full" />
            </div>
          </div>
          <div className="shop-card p-5">
            <Skeleton className="h-4 w-24 rounded-[8px]" />
            <Skeleton className="mt-2 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-3/4" />
          </div>
        </div>
      </div>
    </LoadingRegion>
  );
}

export function SettingsIndexSkeleton() {
  return (
    <LoadingRegion label="Loading settings" className="flex flex-col gap-6">
      <PageHeaderSkeleton />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="shop-card flex items-start gap-4 p-5">
            <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-32 rounded-[8px]" />
              <Skeleton className="mt-2 h-3 w-full" />
              <Skeleton className="mt-1.5 h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function SettingsPageSkeleton({
  label = "Loading settings",
  cards = 3,
  rows = 3,
  note = false,
}: {
  label?: string;
  cards?: number;
  rows?: number;
  note?: boolean;
}) {
  return (
    <LoadingRegion label={label} className="flex flex-col gap-5">
      <PageHeaderSkeleton />

      {Array.from({ length: cards }).map((_, card) => (
        <div key={card} className="shop-card p-5 sm:p-7">
          <Skeleton className="h-5 w-44 rounded-[8px]" />
          <Skeleton className="mt-2 h-3 w-full max-w-xl" />
          <div className="mt-5 flex flex-col">
            {Array.from({ length: rows }).map((_, row) => (
              <div
                key={row}
                className="flex flex-col gap-2 border-b border-[var(--color-faint-border)] py-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <Skeleton className="h-4 w-36 rounded-[8px]" />
                  <Skeleton className="mt-2 h-3 w-64" />
                </div>
                <Skeleton className="h-4 w-28 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ))}

      {note && (
        <div className="flex flex-col gap-2 px-1">
          <Skeleton className="h-3 w-full max-w-xl" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      )}
    </LoadingRegion>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <LoadingRegion label="Loading admin dashboard" className="flex flex-col gap-6">
      <PageHeaderSkeleton />

      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, card) => (
          <div key={card} className="shop-card p-5 sm:p-7">
            <Skeleton className="h-5 w-40 rounded-[8px]" />
            <Skeleton className="mt-2 h-3 w-full max-w-sm" />
            <div className="mt-5 flex flex-col gap-4">
              {Array.from({ length: card === 0 ? 3 : 5 }).map((_, row) => (
                <div key={row} className="min-w-0">
                  <Skeleton className="h-4 w-36 rounded-[8px]" />
                  <Skeleton className="mt-2 h-3 w-full" />
                  <Skeleton className="mt-2 h-3 w-2/3" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function AdminTableSkeleton({
  label = "Loading admin data",
  rows = 20,
  columns = 4,
  filters = true,
  stats = 4,
  action = true,
  pagination = true,
}: {
  label?: string;
  rows?: number;
  columns?: number;
  filters?: boolean;
  stats?: number;
  action?: boolean;
  pagination?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton action={action} />

      {filters && (
        <div className="shop-card flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-11 w-full rounded-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-11 w-40 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-11 w-20 rounded-full" />
            <Skeleton className="h-11 w-20 rounded-full" />
          </div>
        </div>
      )}

      {stats > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: stats }).map((_, index) => (
            <Skeleton key={index} className="h-7 w-24 rounded-full" />
          ))}
        </div>
      )}

      <SkeletonTable rows={rows} columns={columns} label={label} />

      {pagination && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-9 w-44 rounded-full" />
        </div>
      )}
    </div>
  );
}

export function AdminCategoriesSkeleton() {
  return (
    <LoadingRegion label="Loading categories" className="flex flex-col gap-6">
      <PageHeaderSkeleton action={2} />

      <div className="flex flex-wrap items-center gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-7 w-24 rounded-full" />
        ))}
      </div>

      <div className="shop-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-faint-border)] px-4 py-3 sm:px-5">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="hidden h-3 w-56 sm:block" />
        </div>
        <div className="divide-y divide-[var(--color-faint-border)]">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5"
            >
              <div
                className="min-w-0 flex-1"
                style={{ marginLeft: `${index % 3 === 0 ? 0 : 20}px` }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-4 w-32 rounded-[8px]" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="mt-2 h-3 w-24" />
                <Skeleton className="mt-2 h-3 w-1/2" />
                <Skeleton className="mt-2 h-3 w-20" />
              </div>
              <Skeleton className="h-9 w-28 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

export function AdminFormSkeleton({
  label = "Loading form",
  withSideCards = false,
}: {
  label?: string;
  withSideCards?: boolean;
}) {
  return (
    <LoadingRegion label={label} className="flex flex-col gap-6">
      <PageHeaderSkeleton action />

      <div
        className={cn(
          "grid gap-6",
          withSideCards && "lg:grid-cols-[minmax(0,1fr)_320px]",
        )}
      >
        <div className="shop-card p-5 sm:p-7">
          <Skeleton className="h-5 w-40 rounded-[8px]" />
          <Skeleton className="mt-2 h-3 w-full max-w-md" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className={cn(
                  "flex flex-col gap-1.5",
                  index === 0 && "sm:col-span-2",
                )}
              >
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-[52px] w-full rounded-full" />
              </div>
            ))}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-28 w-full rounded-[20px]" />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2">
            <Skeleton className="h-11 w-32 rounded-full" />
            <Skeleton className="h-11 w-24 rounded-full" />
          </div>
        </div>

        {withSideCards && (
          <div className="flex flex-col gap-5">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="shop-card p-5 sm:p-7">
                <Skeleton className="h-5 w-40 rounded-[8px]" />
                <Skeleton className="mt-2 h-3 w-full" />
                <Skeleton className="mt-4 h-4 w-3/4" />
                <Skeleton className="mt-4 h-11 w-full rounded-full" />
              </div>
            ))}
          </div>
        )}
      </div>
    </LoadingRegion>
  );
}

export function HomePageSkeleton() {
  return (
    <LoadingRegion
      label="Loading Pantaker"
      className="relative min-h-screen bg-[var(--shop-canvas)] text-[var(--color-ink-black)]"
    >
      <aside className="pointer-events-none fixed left-5 top-1/2 z-50 hidden -translate-y-1/2 flex-col items-center gap-3.5 md:flex">
        <div className="flex flex-col items-center gap-3 rounded-full bg-[var(--color-pure-white)] px-2.5 py-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-9 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-9 w-9 rounded-full bg-[var(--color-shop-violet)]" />
      </aside>

      <div className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6 md:pl-24 md:pr-8">
        <header className="mb-8 flex w-full flex-col items-center">
          <div className="flex w-full flex-col gap-3 sm:min-h-[64px] sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-[64px] w-full max-w-[352px] rounded-full sm:mx-auto sm:w-[352px]" />
            <div className="hidden items-center gap-2 sm:flex">
              <Skeleton className="h-[52px] w-40 rounded-full" />
            </div>
          </div>

          <div className="mt-5 flex w-full items-center justify-center gap-3.5 overflow-hidden">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-36 shrink-0 rounded-full" />
            ))}
            <Skeleton className="hidden h-10 w-10 shrink-0 rounded-full sm:block" />
          </div>
        </header>

        <section className="relative flex min-h-[460px] w-full items-center overflow-hidden rounded-[28px] bg-[var(--color-slate-ink)]">
          <div className="flex w-full flex-col items-center justify-between gap-10 p-8 md:p-12 lg:flex-row lg:p-14">
            <div className="flex w-full max-w-xl flex-1 flex-col gap-8 self-stretch">
              <div>
                <Skeleton className="h-3 w-40 bg-[var(--overlay-paper-40)]" />
                <Skeleton className="mt-3 h-6 w-28 rounded-full bg-[var(--overlay-paper-40)]" />
              </div>
              <div className="my-4 flex flex-col gap-3">
                <Skeleton className="h-12 w-4/5 rounded-[10px] bg-[var(--overlay-paper-40)] sm:h-14" />
                <Skeleton className="h-7 w-48 rounded-[8px] bg-[var(--overlay-paper-40)]" />
              </div>
              <Skeleton className="h-10 w-32 rounded-full bg-[var(--overlay-paper-40)]" />
            </div>
            <div className="grid w-full shrink-0 grid-cols-2 gap-3 lg:w-[460px] xl:w-[490px]">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="aspect-[4/4.5] w-full rounded-[20px] bg-[var(--overlay-paper-40)]"
                />
              ))}
            </div>
          </div>
        </section>

        <section className="mb-8 mt-16 w-full">
          <div className="mb-5 flex items-center justify-between">
            <Skeleton className="h-7 w-56 rounded-[8px]" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="aspect-[4/3] w-full rounded-[28px] bg-[var(--color-pure-white)]" />
            ))}
          </div>
        </section>

        <section className="mb-8 mt-16 w-full">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <Skeleton className="h-7 w-44 rounded-[8px]" />
              <Skeleton className="mt-2 h-3 w-56" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        </section>

        <section className="mb-8 mt-16 w-full">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Skeleton className="h-7 w-44 rounded-[8px]" />
              <Skeleton className="mt-2 h-3 w-52" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-9 w-[340px] max-w-full rounded-full" />
              <Skeleton className="h-9 w-28 rounded-full" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Skeleton className="h-3 w-20" />
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-7 w-24 rounded-full" />
            ))}
          </div>
        </section>

        <section aria-label="Circular economy spotlight" className="my-16 w-full">
          <div className="flex flex-col-reverse items-center justify-between gap-8 rounded-[28px] bg-[var(--color-pure-white)] p-8 sm:p-12 mdlg:flex-row">
            <div className="w-full max-w-xl">
              <Skeleton className="h-3 w-44" />
              <Skeleton className="mt-3 h-7 w-4/5 rounded-[8px] sm:h-8" />
              <Skeleton className="mt-4 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-3/4" />
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Skeleton className="h-10 w-36 rounded-full" />
                <Skeleton className="h-10 w-40 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-56 w-full max-w-sm shrink-0 rounded-[24px] sm:h-64" />
          </div>
        </section>

        <section aria-label="How Pantaker works" className="mb-8 mt-16 w-full">
          <div className="mb-5 flex flex-col items-center">
            <Skeleton className="h-7 w-56 rounded-[8px]" />
            <Skeleton className="mt-2 h-3 w-80 max-w-full" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="shop-card flex flex-col p-6">
                <Skeleton className="mb-5 h-40 w-full rounded-[20px] bg-[var(--color-canvas-mist)]" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-2 h-4 w-40 rounded-[8px]" />
                <Skeleton className="mt-3 h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-5/6" />
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-16 flex w-full flex-col items-center justify-between gap-4 border-t border-[var(--color-ink-06)] pb-12 pt-8 sm:flex-row">
          <Skeleton className="h-3 w-64" />
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-3 w-16" />
            ))}
          </div>
        </footer>
      </div>
    </LoadingRegion>
  );
}
