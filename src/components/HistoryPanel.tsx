import { t } from "../lib/i18n";
import { useCalc } from "../state/store";

/** Histórico de contas (clicar reusa a expressão). */
export default function HistoryPanel() {
  const open = useCalc((s) => s.historyOpen);
  const history = useCalc((s) => s.history);
  const { clearHistory, useHistory, toggleHistory } = useCalc.getState();

  if (!open) return null;

  return (
    <div className="history-panel" onClick={toggleHistory}>
      <div className="history-inner" onClick={(e) => e.stopPropagation()}>
        <div className="history-head">
          <strong>{t("hist.title")}</strong>
          {history.length > 0 && (
            <button className="hist-clear" onClick={clearHistory}>
              {t("hist.clear")}
            </button>
          )}
        </div>
        {history.length === 0 && <div className="muted">{t("hist.empty")}</div>}
        {history.map((h, i) => (
          <button
            key={i}
            className="hist-item"
            title={t("hist.reuse")}
            onClick={() => useHistory(h)}
          >
            <span className="hist-expr">{h.expr}</span>
            <span className="hist-result">= {h.result}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
