const tones = {
  neutral: "bg-surface text-ink/60 border-line",
  brand: "bg-brand-50 text-brand-700 border-brand-200",
  ok: "bg-green-50 text-ok border-green-200",
  warn: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-danger border-red-200",
};

export default function Badge({ tone = "neutral", children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
