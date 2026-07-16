import { create } from "zustand";
import { evaluate, evaluateBig, formatResult, type AngleMode } from "../lib/engine";

export type Mode = "standard" | "scientific" | "programmer" | "converter";

export interface HistoryItem {
  expr: string;
  result: string;
  mode: Mode;
}

const HIST_KEY = "localcalc.history";
const ANGLE_KEY = "localcalc.angle";
const MODE_KEY = "localcalc.mode";

function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HIST_KEY);
    if (raw) {
      const v = JSON.parse(raw);
      if (Array.isArray(v)) return v.slice(0, 100);
    }
  } catch {
    /* ignora */
  }
  return [];
}

interface CalcState {
  mode: Mode;
  expr: string;
  /** Resultado confirmado (após =). */
  result: string | null;
  /** Preview ao vivo (expressão válida enquanto digita). */
  preview: string | null;
  error: string | null;
  angle: AngleMode;
  memory: number;
  history: HistoryItem[];
  historyOpen: boolean;

  setMode: (m: Mode) => void;
  setExpr: (e: string) => void;
  insert: (text: string) => void;
  backspace: () => void;
  clear: () => void;
  equals: () => void;
  setAngle: (a: AngleMode) => void;
  memAdd: (sign: 1 | -1) => void;
  memRecall: () => void;
  memClear: () => void;
  toggleHistory: () => void;
  clearHistory: () => void;
  useHistory: (item: HistoryItem) => void;
}

function computePreview(expr: string, mode: Mode, angle: AngleMode): string | null {
  if (!expr.trim()) return null;
  try {
    if (mode === "programmer") return evaluateBig(expr).toString(10);
    return formatResult(evaluate(expr, angle));
  } catch {
    return null;
  }
}

export const useCalc = create<CalcState>((set, get) => ({
  mode: (localStorage.getItem(MODE_KEY) as Mode) || "standard",
  expr: "",
  result: null,
  preview: null,
  error: null,
  angle: localStorage.getItem(ANGLE_KEY) === "rad" ? "rad" : "deg",
  memory: 0,
  history: loadHistory(),
  historyOpen: false,

  setMode: (mode) => {
    localStorage.setItem(MODE_KEY, mode);
    const s = get();
    set({ mode, error: null, result: null, preview: computePreview(s.expr, mode, s.angle) });
  },

  setExpr: (expr) => {
    const s = get();
    set({ expr, error: null, result: null, preview: computePreview(expr, s.mode, s.angle) });
  },

  insert: (text) => {
    get().setExpr(get().expr + text);
  },

  backspace: () => {
    get().setExpr(get().expr.slice(0, -1));
  },

  clear: () => set({ expr: "", result: null, preview: null, error: null }),

  equals: () => {
    const s = get();
    if (!s.expr.trim()) return;
    try {
      const result =
        s.mode === "programmer"
          ? evaluateBig(s.expr).toString(10)
          : formatResult(evaluate(s.expr, s.angle));
      const history = [
        { expr: s.expr, result, mode: s.mode },
        ...s.history.filter((h) => h.expr !== s.expr || h.result !== result),
      ].slice(0, 100);
      localStorage.setItem(HIST_KEY, JSON.stringify(history));
      // O resultado vira a nova expressão (continua a conta em cima dele).
      set({ result, expr: result, preview: null, error: null, history });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), result: null });
    }
  },

  setAngle: (angle) => {
    localStorage.setItem(ANGLE_KEY, angle);
    const s = get();
    set({ angle, preview: computePreview(s.expr, s.mode, angle) });
  },

  memAdd: (sign) => {
    const s = get();
    const v = Number(s.result ?? s.preview ?? "");
    if (Number.isFinite(v)) set({ memory: s.memory + sign * v });
  },
  memRecall: () => get().insert(formatResult(get().memory)),
  memClear: () => set({ memory: 0 }),

  toggleHistory: () => set((s) => ({ historyOpen: !s.historyOpen })),
  clearHistory: () => {
    localStorage.setItem(HIST_KEY, "[]");
    set({ history: [] });
  },
  useHistory: (item) => {
    get().setMode(item.mode);
    get().setExpr(item.expr);
    set({ historyOpen: false });
  },
}));
