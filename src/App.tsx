import ConverterView from "./components/ConverterView";
import Display from "./components/Display";
import GraphView from "./components/GraphView";
import HistoryPanel from "./components/HistoryPanel";
import { ProgrammerPad, ScientificPad, StandardPad } from "./components/Keypad";
import ProgrammerView from "./components/ProgrammerView";
import SettingsModal from "./components/SettingsModal";
import Toasts from "./components/Toasts";
import VarsPanel from "./components/VarsPanel";
import { t } from "./lib/i18n";
import { useCalc, type Mode } from "./state/store";
import { useUi } from "./state/ui";

export default function App() {
  const mode = useCalc((s) => s.mode);
  const varCount = useCalc((s) => Object.keys(s.vars).length);
  const { setMode, toggleHistory, toggleVars } = useCalc.getState();
  const setSettingsOpen = useUi((s) => s.setSettingsOpen);

  const modes: { id: Mode; label: string }[] = [
    { id: "standard", label: t("mode.standard") },
    { id: "scientific", label: t("mode.scientific") },
    { id: "programmer", label: t("mode.programmer") },
    { id: "graph", label: t("mode.graph") },
    { id: "converter", label: t("mode.converter") },
  ];

  return (
    <div className="app">
      <div className="topbar">
        <div className="mode-tabs">
          {modes.map((m) => (
            <button
              key={m.id}
              className={mode === m.id ? "active" : ""}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="topbar-actions">
          {/* O contador é o que impede a persistência de virar lixo esquecido:
              sem ele, variáveis de uma sessão antiga ficariam invisíveis. */}
          <button title={t("top.vars")} onClick={toggleVars}>
            𝑥{varCount > 0 && <span className="var-badge">{varCount}</span>}
          </button>
          <button title={t("top.history")} onClick={toggleHistory}>
            🕘
          </button>
          <button title={t("top.settingsTitle")} onClick={() => setSettingsOpen(true)}>
            ⚙
          </button>
        </div>
      </div>

      {mode === "converter" ? (
        <ConverterView />
      ) : mode === "graph" ? (
        <GraphView />
      ) : (
        <>
          <Display />
          {mode === "programmer" && <ProgrammerView />}
          <div className="pad-area">
            {mode === "standard" && <StandardPad />}
            {mode === "scientific" && <ScientificPad />}
            {mode === "programmer" && <ProgrammerPad />}
          </div>
        </>
      )}

      <HistoryPanel />
      <VarsPanel />
      <SettingsModal />
      <Toasts />
    </div>
  );
}
