import { useEffect, useRef } from "react";
import { t } from "../lib/i18n";
import { useCalc } from "../state/store";
import { useUi } from "../state/ui";

/** Display: expressão editável + preview/resultado + erro. */
export default function Display() {
  const expr = useCalc((s) => s.expr);
  const preview = useCalc((s) => s.preview);
  const result = useCalc((s) => s.result);
  const error = useCalc((s) => s.error);
  const memory = useCalc((s) => s.memory);
  const { setExpr, equals } = useCalc.getState();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const copyResult = async () => {
    const v = result ?? preview;
    if (!v) return;
    try {
      await navigator.clipboard.writeText(v);
      useUi.getState().pushToast("ok", t("toast.copied"));
    } catch {
      useUi.getState().pushToast("error", t("toast.copyFailed"));
    }
  };

  return (
    <div className="display">
      {memory !== 0 && <div className="mem-hint">{t("mem.hint", { v: memory })}</div>}
      <input
        ref={ref}
        className="expr-input"
        value={expr}
        placeholder={t("display.placeholder")}
        spellCheck={false}
        onChange={(e) => setExpr(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            equals();
          }
          if (e.key === "Escape") useCalc.getState().clear();
        }}
      />
      <div
        className={`result-line ${result ? "final" : ""} ${error ? "error" : ""}`}
        onClick={() => void copyResult()}
        title={t("copy.result")}
      >
        {error ? t("display.error", { msg: error }) : result ?? (preview ? `= ${preview}` : " ")}
      </div>
    </div>
  );
}
