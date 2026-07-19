import { create } from "zustand";
import {
  evaluate,
  evaluateAssignment,
  evaluateBig,
  formatResult,
  parseAssignment,
  type AngleMode,
} from "../lib/engine";

export type Mode = "standard" | "scientific" | "programmer" | "converter" | "graph";

export interface HistoryItem {
  expr: string;
  result: string;
  mode: Mode;
}

const HIST_KEY = "localcalc.history";
const ANGLE_KEY = "localcalc.angle";
const MODE_KEY = "localcalc.mode";
const VARS_KEY = "localcalc.vars";

/**
 * Teto de variáveis guardadas. Não é defesa contra o usuário (ninguém nomeia 60
 * valores à mão) e sim contra o localStorage virar depósito silencioso.
 */
const MAX_VARS = 50;

/**
 * Variáveis PERSISTEM entre sessões (como o histórico já persiste).
 *
 * O trade-off pedido: variável que some ao fechar frustra quem montou um
 * orçamento em 6 nomes; variável eterna vira lixo que ninguém lembra de onde
 * veio. A saída é persistir + dar saída fácil — o painel tem "limpar tudo" e ✕
 * por linha, e o painel em si torna o estado VISÍVEL (lixo invisível é que é o
 * problema; 6 linhas na tela o usuário apaga sozinho).
 *
 * A leitura é desconfiada de propósito: o JSON vem do disco e pode estar
 * corrompido ou ter sido editado à mão. Só passa par nome→número FINITO —
 * `NaN`/`Infinity` viram `null` no JSON.stringify e voltariam envenenando toda
 * conta seguinte com um erro que não aponta pra origem.
 */
function loadVars(): Record<string, number> {
  try {
    const raw = localStorage.getItem(VARS_KEY);
    if (!raw) return {};
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const out: Record<string, number> = {};
    for (const [k, val] of Object.entries(v).slice(0, MAX_VARS)) {
      if (typeof val === "number" && Number.isFinite(val)) out[k] = val;
    }
    return out;
  } catch {
    /* ignora */
  }
  return {};
}

function saveVars(vars: Record<string, number>) {
  try {
    localStorage.setItem(VARS_KEY, JSON.stringify(vars));
  } catch {
    /* localStorage indisponível/cheio — perder a persistência não pode derrubar a conta */
  }
}

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
  /** Última resposta confirmada (usável como `ans` na expressão). */
  ans: number;
  history: HistoryItem[];
  historyOpen: boolean;
  /** Variáveis nomeadas pelo usuário (`x = 12`), usáveis nas expressões seguintes. */
  vars: Record<string, number>;
  varsOpen: boolean;

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
  toggleVars: () => void;
  removeVar: (name: string) => void;
  clearVars: () => void;
}

/**
 * Ambiente de avaliação: variáveis do usuário + `ans`.
 *
 * `ans` entra DEPOIS e vence de propósito — ele é do motor, não do usuário, e
 * `RESERVED_NAMES` já impede que alguém defina uma variável com esse nome; o
 * spread nessa ordem é só o cinto de segurança se um `localcalc.vars` editado à
 * mão trouxer um "ans".
 */
function envOf(s: { vars: Record<string, number>; ans: number }): Record<string, number> {
  return { ...s.vars, ans: s.ans };
}

function computePreview(
  expr: string,
  mode: Mode,
  angle: AngleMode,
  env: Record<string, number>,
): string | null {
  if (!expr.trim() || mode === "graph") return null;
  try {
    if (mode === "programmer") return evaluateBig(expr).toString(10);
    // Numa atribuição o preview mostra o valor do LADO DIREITO (`x = 5*2` → 10):
    // é o que vai ser guardado, e sem isso a linha fica sem feedback nenhum
    // enquanto se digita. Preview não grava nada — quem grava é o `equals`.
    const a = parseAssignment(expr);
    return formatResult(evaluate(a ? a.expr : expr, angle, env));
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
  ans: 0,
  history: loadHistory(),
  historyOpen: false,
  vars: loadVars(),
  varsOpen: false,

  setMode: (mode) => {
    localStorage.setItem(MODE_KEY, mode);
    const s = get();
    set({
      mode,
      error: null,
      result: null,
      preview: computePreview(s.expr, mode, s.angle, envOf(s)),
    });
  },

  setExpr: (expr) => {
    const s = get();
    set({
      expr,
      error: null,
      result: null,
      preview: computePreview(expr, s.mode, s.angle, envOf(s)),
    });
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
      let ansNum = s.ans;
      let result: string;
      let vars = s.vars;
      const assign = s.mode === "programmer" ? null : parseAssignment(s.expr);

      if (s.mode === "programmer") {
        // Atribuição fica fora do modo programador: `evaluateBig` trabalha em
        // BigInt e o ambiente de variáveis é f64 — misturar os dois truncaria
        // valores calados. Aqui `=` continua sendo "caractere inválido", que é
        // o erro certo.
        result = evaluateBig(s.expr).toString(10);
      } else if (assign) {
        const { name, value } = evaluateAssignment(assign, s.angle, envOf(s));
        // Redefinir é permitido e substitui (é o uso normal: ajustar `taxa` e
        // refazer a conta). O corte por MAX_VARS só morde nomes NOVOS, senão
        // atualizar uma variável existente falharia com o painel cheio.
        if (!(name in s.vars) && Object.keys(s.vars).length >= MAX_VARS) {
          throw new Error(`limite de ${MAX_VARS} variáveis — limpe alguma`);
        }
        vars = { ...s.vars, [name]: value };
        saveVars(vars);
        ansNum = value;
        result = formatResult(value);
      } else {
        ansNum = evaluate(s.expr, s.angle, envOf(s));
        result = formatResult(ansNum);
      }

      const history = [
        { expr: s.expr, result, mode: s.mode },
        ...s.history.filter((h) => h.expr !== s.expr || h.result !== result),
      ].slice(0, 100);
      localStorage.setItem(HIST_KEY, JSON.stringify(history));
      // O resultado vira a nova expressão (continua a conta em cima dele) e
      // fica disponível como `ans`. Numa atribuição isso é ainda mais
      // importante: deixar `x = 12` na linha e apertar `=` de novo só
      // regravaria o mesmo valor, sem sinal de que já foi.
      set({ result, expr: result, preview: null, error: null, history, ans: ansNum, vars });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), result: null });
    }
  },

  setAngle: (angle) => {
    localStorage.setItem(ANGLE_KEY, angle);
    const s = get();
    set({ angle, preview: computePreview(s.expr, s.mode, angle, envOf(s)) });
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

  toggleVars: () => set((s) => ({ varsOpen: !s.varsOpen })),

  // Apagar variável NÃO recalcula nem invalida nada já calculado: os resultados
  // no histórico são números congelados, não referências. O preview da linha
  // atual, esse sim, é recomputado — se ele dependia do nome apagado, some (o
  // sinal certo de que a expressão não fecha mais).
  removeVar: (name) => {
    const s = get();
    if (!(name in s.vars)) return;
    const vars = { ...s.vars };
    delete vars[name];
    saveVars(vars);
    set({ vars, preview: computePreview(s.expr, s.mode, s.angle, envOf({ ...s, vars })) });
  },

  clearVars: () => {
    const s = get();
    saveVars({});
    set({ vars: {}, preview: computePreview(s.expr, s.mode, s.angle, envOf({ ...s, vars: {} })) });
  },
}));
