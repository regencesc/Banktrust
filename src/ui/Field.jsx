/** Label + control + optional hint, used by every form on every page. */
export default function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-medium text-ink/70 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-ink/40 mt-1">{hint}</span>}
    </label>
  );
}
