export default function Card({ title, subtitle, children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl border border-ink/10 p-5 md:p-6 ${className}`}>
      {title && (
        <div className="mb-4">
          <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
          {subtitle && <p className="text-xs text-ink/50 mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
