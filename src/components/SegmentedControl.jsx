export default function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="inline-flex bg-paper rounded-full p-1 border border-ink/10">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
            value === opt.value
              ? "bg-sky-700 text-white font-medium"
              : "text-ink/60 hover:text-ink"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
