import { formatResult } from "../lib/engine";
import { t } from "../lib/i18n";
import { useCalc } from "../state/store";

/**
 * Painel das variáveis nomeadas (`x = 12`). Clicar numa linha insere o NOME na
 * expressão, não o valor: inserir o número quebraria o vínculo — o usuário
 * redefine `taxa` depois e a conta antiga continuaria com o número velho.
 *
 * O painel existe tanto pra consultar quanto pra ser a válvula de saída da
 * persistência: variável guardada entre sessões só não vira lixo porque está
 * visível e apagável (✕ por linha, "limpar tudo" no topo).
 */
export default function VarsPanel() {
  const open = useCalc((s) => s.varsOpen);
  const vars = useCalc((s) => s.vars);
  const { clearVars, removeVar, insert, toggleVars } = useCalc.getState();

  if (!open) return null;

  const names = Object.keys(vars).sort();

  return (
    <div className="history-panel" onClick={toggleVars}>
      <div className="history-inner" onClick={(e) => e.stopPropagation()}>
        <div className="history-head">
          <strong>{t("vars.title")}</strong>
          {names.length > 0 && (
            <button className="hist-clear" onClick={clearVars}>
              {t("vars.clear")}
            </button>
          )}
        </div>

        {names.length === 0 && <div className="muted">{t("vars.empty")}</div>}

        {names.map((name) => (
          <div key={name} className="var-row">
            <button
              className="var-item"
              title={t("vars.reuse")}
              onClick={() => {
                insert(name);
                toggleVars();
              }}
            >
              <span className="var-name">{name}</span>
              <span className="var-value">{formatResult(vars[name])}</span>
            </button>
            <button
              className="var-remove"
              title={t("vars.remove", { name })}
              aria-label={t("vars.remove", { name })}
              onClick={() => removeVar(name)}
            >
              ✕
            </button>
          </div>
        ))}

        <div className="var-hint muted">{t("vars.hint")}</div>
      </div>
    </div>
  );
}
