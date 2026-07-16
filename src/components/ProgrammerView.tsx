import { bigBases, evaluateBig } from "../lib/engine";
import { t } from "../lib/i18n";
import { useCalc } from "../state/store";
import { useUi } from "../state/ui";

/** As 4 bases do valor atual (clicar numa linha copia). */
export default function ProgrammerView() {
  const expr = useCalc((s) => s.expr);

  let bases: { dec: string; hex: string; oct: string; bin: string } | null = null;
  try {
    if (expr.trim()) bases = bigBases(evaluateBig(expr));
  } catch {
    bases = null;
  }

  const copy = async (v: string) => {
    try {
      await navigator.clipboard.writeText(v);
      useUi.getState().pushToast("ok", t("toast.copied"));
    } catch {
      useUi.getState().pushToast("error", t("toast.copyFailed"));
    }
  };

  const row = (label: string, value: string | undefined) => (
    <button className="base-row" onClick={() => value && void copy(value)} disabled={!value}>
      <span className="base-label">{label}</span>
      <span className="base-value">{value ?? "—"}</span>
    </button>
  );

  return (
    <div className="bases">
      {row("HEX", bases?.hex)}
      {row("DEC", bases?.dec)}
      {row("OCT", bases?.oct)}
      {row("BIN", bases?.bin)}
      <div className="prog-hint muted">{t("prog.hint")}</div>
    </div>
  );
}
