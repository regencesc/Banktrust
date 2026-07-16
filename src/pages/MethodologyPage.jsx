import { useApp } from "../state/AppContext.jsx";
import Panel from "../ui/Panel.jsx";

/** Every formula in the engine, in plain Thai (Hard Rule 4: no black box). */
export default function MethodologyPage() {
  const { strings } = useApp();
  const t = strings.methodologyPage;

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink">{t.title}</h1>
        <p className="text-sm text-ink/50 mt-1 leading-relaxed">{t.intro}</p>
      </div>

      {t.sections.map((section) => (
        <Panel key={section.title} title={section.title}>
          {section.body && (
            <p className="text-sm text-ink/70 leading-relaxed mb-3">{section.body}</p>
          )}
          {section.formulas && (
            <div className="space-y-1.5">
              {section.formulas.map((formula) => (
                <code
                  key={formula}
                  className="block bg-surface border border-line rounded-lg px-3 py-2 text-[11px] text-ink/80 overflow-x-auto whitespace-nowrap"
                >
                  {formula}
                </code>
              ))}
            </div>
          )}
        </Panel>
      ))}

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-display text-sm font-semibold text-amber-800">
          {t.disclaimerTitle}
        </h2>
        <p className="text-xs text-amber-800/80 leading-relaxed mt-1.5">{t.disclaimer}</p>
      </div>
    </div>
  );
}
