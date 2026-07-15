/** Pill tab group used for mode toggles (tax mode, cash/loan, …). */
export default function Segmented({ options, value, onChange, ariaLabel }) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg bg-surface border border-line p-0.5"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors " +
              (active
                ? "bg-white text-brand-700 shadow-sm border border-line"
                : "text-ink/50 hover:text-ink")
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
