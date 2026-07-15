import { useApp } from "../state/AppContext.jsx";
import EmptyState, { SunIcon } from "../shell/EmptyState.jsx";

/** Placeholder for pages arriving in later phases — never a blank screen. */
export default function ComingSoonPage({ titleKey, phase }) {
  const { strings } = useApp();
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-xl font-semibold text-ink mb-5">
        {strings.nav[titleKey]}
      </h1>
      <EmptyState
        icon={<SunIcon />}
        title={strings.empty.comingSoonTitle}
        body={strings.empty.comingSoonBody(phase)}
      />
    </div>
  );
}
