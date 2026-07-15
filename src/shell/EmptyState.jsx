/**
 * Empty state per Hard Rule 1: icon + short sentence + start button.
 * Rendered anywhere data is missing instead of blank tables/charts.
 */
export default function EmptyState({ icon, title, body, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-line bg-white/60 px-8 py-14">
      {icon && <div className="text-brand-500 mb-3">{icon}</div>}
      <h3 className="font-display text-lg font-medium text-ink">{title}</h3>
      {body && <p className="text-sm text-ink/50 mt-2 max-w-md leading-relaxed">{body}</p>}
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function SunIcon({ size = 40 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.2 5.2l1.7 1.7M17.1 17.1l1.7 1.7M18.8 5.2l-1.7 1.7M6.9 17.1l-1.7 1.7" />
    </svg>
  );
}
