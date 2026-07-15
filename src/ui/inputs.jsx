// ============================================================================
// inputs.jsx — controlled inputs that treat null as "empty" (Hard Rule 1:
// projects start blank, so every numeric field must round-trip null cleanly).
// ============================================================================

const base =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink " +
  "placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-brand-200 " +
  "focus:border-brand-500 tabular-nums";

const readOnlyStyle =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink/60 tabular-nums";

/** Avoid 0.07*100 = 7.000000000000001 artifacts in percent fields. */
const round10 = (v) => Math.round(v * 1e10) / 1e10;

/**
 * Numeric input. `percent` stores a fraction (0.07) but displays 7.
 * Empty string <-> null. `unit` renders a suffix inside the box.
 */
export function NumberInput({
  value,
  onChange,
  percent = false,
  unit,
  placeholder,
  readOnly = false,
  step,
  min,
  max,
  ariaLabel,
}) {
  const display =
    value === null || value === undefined
      ? ""
      : percent
        ? round10(value * 100)
        : value;

  return (
    <div className="relative">
      <input
        type="number"
        className={readOnly ? readOnlyStyle : base}
        value={display}
        readOnly={readOnly}
        placeholder={placeholder}
        step={step}
        min={min}
        max={max}
        aria-label={ariaLabel}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return onChange(null);
          const n = Number(raw);
          if (!Number.isFinite(n)) return;
          onChange(percent ? n / 100 : n);
        }}
      />
      {unit && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink/40 pointer-events-none">
          {unit}
        </span>
      )}
    </div>
  );
}

export function TextInput({ value, onChange, placeholder, ariaLabel }) {
  return (
    <input
      type="text"
      className={base}
      value={value ?? ""}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      className={base}
      value={value ?? ""}
      placeholder={placeholder}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/** Read-only computed value styled per spec §5.2 (gray box). */
export function ComputedValue({ value, unit }) {
  return (
    <div className={readOnlyStyle}>
      {value ?? "-"}
      {unit && value != null && <span className="text-ink/40 ml-1">{unit}</span>}
    </div>
  );
}
