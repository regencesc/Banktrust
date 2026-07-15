/** White dashboard card per SPEC-UPGRADE.md §6. */
export default function Panel({ title, subtitle, badge, children, className = "" }) {
  return (
    <section
      className={`bg-white rounded-2xl border border-line shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-5 ${className}`}
    >
      {(title || badge) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            {title && (
              <h2 className="font-display text-base font-medium text-ink">{title}</h2>
            )}
            {subtitle && <p className="text-xs text-ink/50 mt-0.5">{subtitle}</p>}
          </div>
          {badge}
        </div>
      )}
      {children}
    </section>
  );
}
