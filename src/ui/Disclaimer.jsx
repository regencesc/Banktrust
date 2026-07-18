import { useApp } from "../state/AppContext.jsx";

/** Short disclaimer footer for every results page (Hard Rule 3). */
export default function Disclaimer() {
  const { strings } = useApp();
  return (
    <p className="text-[11px] text-ink/35 leading-relaxed border-t border-line pt-3">
      {strings.common.disclaimer}
    </p>
  );
}
