export default function Slider({ label, value, onChange, min, max, step, unit, format }) {
  const display = format ? format(value) : `${value} ${unit || ""}`;
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm text-ink/60">{label}</label>
        <span className="text-sm font-medium text-ink">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
