export function AuthCard({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="w-full max-w-[416px] rounded-[28px] bg-[var(--color-pure-white)] p-6 sm:p-8">
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-shop-violet)]">
          {eyebrow}
        </p>
      )}
      
      {subtitle && (
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-muted-gray)]">
          {subtitle}
        </p>
      )}
      <div className="mt-6 flex flex-col items-center">{children}</div>
    </section>
  );
}
