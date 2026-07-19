/**
 * Motor de expressões do LocalCalc — próprio, pequeno e testável (sem mathjs).
 *
 * Científica: f64 com formatação de 12 dígitos significativos na saída (o
 * ruído binário some na exibição; `rust_decimal` só se um dia precisar).
 * Programador: BigInt (precisão arbitrária) com AND/OR/XOR/NOT/<</>> e
 * literais 0x/0o/0b.
 */

export type AngleMode = "deg" | "rad";

// ---------- tokenizer ----------

type Tok =
  | { kind: "num"; value: number }
  | { kind: "big"; value: bigint }
  | { kind: "ident"; name: string }
  | { kind: "op"; op: string }
  | { kind: "lparen" }
  | { kind: "rparen" }
  | { kind: "comma" };

const WORD_OPS = new Set(["and", "or", "xor", "not", "shl", "shr", "mod"]);

function tokenize(src: string, programmer: boolean): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const s = src.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/,/g, ".");
  while (i < s.length) {
    const c = s[i];
    if (c === " " || c === "\t") {
      i++;
      continue;
    }
    // números: 0x/0o/0b (programador) ou decimal com ponto/expoente
    if (/[0-9.]/.test(c)) {
      if (programmer && c === "0" && /[xob]/i.test(s[i + 1] ?? "")) {
        const base = s[i + 1].toLowerCase();
        const digits = base === "x" ? /[0-9a-fA-F]/ : base === "o" ? /[0-7]/ : /[01]/;
        let j = i + 2;
        while (j < s.length && digits.test(s[j])) j++;
        if (j === i + 2) throw new Error("número inválido");
        out.push({ kind: "big", value: BigInt(s.slice(i, j)) });
        i = j;
        continue;
      }
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      // expoente científico (1.5e-3)
      if (!programmer && (s[j] === "e" || s[j] === "E") && /[0-9+-]/.test(s[j + 1] ?? "")) {
        let k = j + 1;
        if (s[k] === "+" || s[k] === "-") k++;
        while (k < s.length && /[0-9]/.test(s[k])) k++;
        j = k;
      }
      const raw = s.slice(i, j);
      if ((raw.match(/\./g) ?? []).length > 1) throw new Error("número inválido");
      if (programmer) out.push({ kind: "big", value: BigInt(raw.split(".")[0] || "0") });
      else out.push({ kind: "num", value: Number(raw) });
      i = j;
      continue;
    }
    if (/[a-zA-Zπ]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-zA-Z0-9π]/.test(s[j])) j++;
      const word = s.slice(i, j);
      const lower = word.toLowerCase();
      if (programmer && WORD_OPS.has(lower)) out.push({ kind: "op", op: lower });
      else out.push({ kind: "ident", name: lower });
      i = j;
      continue;
    }
    if (c === "(") {
      out.push({ kind: "lparen" });
      i++;
      continue;
    }
    if (c === ")") {
      out.push({ kind: "rparen" });
      i++;
      continue;
    }
    if (c === ";") {
      out.push({ kind: "comma" });
      i++;
      continue;
    }
    if (c === "<" && s[i + 1] === "<") {
      out.push({ kind: "op", op: "shl" });
      i += 2;
      continue;
    }
    if (c === ">" && s[i + 1] === ">") {
      out.push({ kind: "op", op: "shr" });
      i += 2;
      continue;
    }
    if (c === "%") {
      // Científica/padrão: `%` é porcentagem pós-fixa (200+10% = 220).
      // Programador: `%` continua sendo módulo (`mod` também existe lá).
      out.push({ kind: "op", op: programmer ? "%" : "pct" });
      i++;
      continue;
    }
    if ("+-*/^!&|~".includes(c)) {
      // & | ~ são atalhos do modo programador
      const map: Record<string, string> = { "&": "and", "|": "or", "~": "not" };
      out.push({ kind: "op", op: map[c] ?? c });
      i++;
      continue;
    }
    throw new Error(`caractere inválido: ${c}`);
  }
  return out;
}

// ---------- parser (shunting-yard) ----------

interface OpInfo {
  prec: number;
  rightAssoc?: boolean;
  unary?: boolean;
}

const OPS: Record<string, OpInfo> = {
  "u-": { prec: 7, rightAssoc: true, unary: true },
  not: { prec: 7, rightAssoc: true, unary: true },
  "!": { prec: 8, unary: true }, // fatorial, pós-fixo (tratado à parte)
  "^": { prec: 6, rightAssoc: true },
  "*": { prec: 5 },
  "/": { prec: 5 },
  "%": { prec: 5 },
  mod: { prec: 5 },
  "+": { prec: 4 },
  "-": { prec: 4 },
  shl: { prec: 3 },
  shr: { prec: 3 },
  and: { prec: 2 },
  xor: { prec: 1.5 },
  or: { prec: 1 },
};

type RpnItem = Tok | { kind: "call"; name: string; argc: number } | { kind: "op"; op: string };

function toRpn(toks: Tok[]): RpnItem[] {
  const out: RpnItem[] = [];
  const stack: (Tok | { kind: "func"; name: string; argc: number })[] = [];
  let prev: Tok | null = null;

  for (let idx = 0; idx < toks.length; idx++) {
    const tok = toks[idx];
    if (tok.kind === "num" || tok.kind === "big") {
      out.push(tok);
    } else if (tok.kind === "ident") {
      // Lookahead: "(" logo depois = função; senão é constante (vai direto
      // pra saída — empilhar quebraria a ordem em "pi*2").
      if (toks[idx + 1]?.kind === "lparen") {
        stack.push({ kind: "func", name: tok.name, argc: 1 });
      } else {
        out.push({ kind: "call", name: tok.name, argc: 0 });
      }
    } else if (tok.kind === "op") {
      let op = tok.op;
      // menos unário: começo, depois de operador ou "("
      if (
        op === "-" &&
        (!prev || prev.kind === "op" || prev.kind === "lparen" || prev.kind === "comma")
      ) {
        op = "u-";
      }
      if (op === "!" || op === "pct") {
        // pós-fixos: aplicam direto ao operando anterior
        out.push({ kind: "op", op });
        prev = tok;
        continue;
      }
      const info = OPS[op];
      if (!info) throw new Error(`operador desconhecido: ${op}`);
      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        if (top.kind === "op") {
          const ti = OPS[top.op];
          if (ti.prec > info.prec || (ti.prec === info.prec && !info.rightAssoc)) {
            out.push(stack.pop() as RpnItem);
            continue;
          }
        }
        break;
      }
      stack.push({ kind: "op", op });
    } else if (tok.kind === "lparen") {
      // se o topo é um ident pendente, vira função de verdade
      stack.push(tok);
    } else if (tok.kind === "comma") {
      while (stack.length > 0 && stack[stack.length - 1].kind !== "lparen") {
        out.push(stack.pop() as RpnItem);
      }
      // marca +1 argumento na função abaixo do lparen
      const lp = stack.length - 1;
      const fn = stack[lp - 1];
      if (fn && fn.kind === "func") fn.argc += 1;
    } else if (tok.kind === "rparen") {
      while (stack.length > 0 && stack[stack.length - 1].kind !== "lparen") {
        out.push(stack.pop() as RpnItem);
      }
      if (stack.length === 0) throw new Error("parênteses desbalanceados");
      stack.pop(); // lparen
      const top = stack[stack.length - 1];
      if (top && top.kind === "func") {
        stack.pop();
        out.push({ kind: "call", name: top.name, argc: top.argc });
      }
    }
    prev = tok;
  }
  while (stack.length > 0) {
    const top = stack.pop()!;
    if (top.kind === "lparen") throw new Error("parênteses desbalanceados");
    if (top.kind === "func") throw new Error("expressão incompleta");
    out.push(top as RpnItem);
  }
  return out;
}

// ---------- avaliação científica (f64) ----------

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  "π": Math.PI,
  e: Math.E,
};

function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) throw new Error("fatorial só de inteiro ≥ 0");
  if (n > 170) return Infinity;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function fns(angle: AngleMode): Record<string, (...a: number[]) => number> {
  const toR = (x: number) => (angle === "deg" ? (x * Math.PI) / 180 : x);
  const fromR = (x: number) => (angle === "deg" ? (x * 180) / Math.PI : x);
  return {
    sin: (x) => Math.sin(toR(x)),
    cos: (x) => Math.cos(toR(x)),
    tan: (x) => Math.tan(toR(x)),
    asin: (x) => fromR(Math.asin(x)),
    acos: (x) => fromR(Math.acos(x)),
    atan: (x) => fromR(Math.atan(x)),
    ln: (x) => Math.log(x),
    log: (x) => Math.log10(x),
    log2: (x) => Math.log2(x),
    sqrt: (x) => Math.sqrt(x),
    cbrt: (x) => Math.cbrt(x),
    exp: (x) => Math.exp(x),
    abs: (x) => Math.abs(x),
    floor: (x) => Math.floor(x),
    ceil: (x) => Math.ceil(x),
    round: (x) => Math.round(x),
    min: (...a) => Math.min(...a),
    max: (...a) => Math.max(...a),
    pow: (a, b) => Math.pow(a, b),
  };
}

/**
 * Núcleo de avaliação de um RPN já tokenizado. Usado pela `evaluate` e pelo
 * plot (que reaproveita o mesmo RPN por ponto, sem re-tokenizar).
 *
 * Porcentagem pós-fixa (`pct`): uma pilha booleana paralela marca quais valores
 * são "porcentagem". A resolução depende do operador que os consome —
 *   a + b%  → a + a·b/100      a * b%  → a · b/100
 *   a - b%  → a − a·b/100      a / b%  → a / (b/100)
 * — e uma porcentagem "solta" (sem operador aditivo/multiplicativo, ou como
 * argumento de função, ou resultado final) vira simplesmente b/100.
 */
function evalCore(
  rpn: RpnItem[],
  F: Record<string, (...a: number[]) => number>,
  vars: Record<string, number>,
): number {
  const st: number[] = [];
  const pf: boolean[] = []; // pf[i] = st[i] é porcentagem
  const push = (v: number, pct = false) => {
    st.push(v);
    pf.push(pct);
  };
  const pop = (): [number, boolean] => {
    if (st.length < 1) throw new Error("expressão incompleta");
    return [st.pop()!, pf.pop()!];
  };
  const val = ([v, p]: [number, boolean]) => (p ? v / 100 : v);

  for (const item of rpn) {
    if (item.kind === "num") push(item.value);
    else if (item.kind === "big") push(Number(item.value));
    else if (item.kind === "call") {
      if (item.argc === 0) {
        // Variáveis do chamador (ans, x do gráfico…) têm precedência.
        const c = vars[item.name] ?? CONSTANTS[item.name];
        if (c === undefined) throw new Error(`desconhecido: ${item.name}`);
        push(c);
      } else {
        const f = F[item.name];
        if (!f) throw new Error(`função desconhecida: ${item.name}`);
        if (st.length < item.argc) throw new Error("expressão incompleta");
        const args: number[] = [];
        for (let k = 0; k < item.argc; k++) args.unshift(val(pop()));
        push(f(...args));
      }
    } else if (item.kind === "op") {
      if (item.op === "u-") {
        const [v, p] = pop();
        push(-v, p);
      } else if (item.op === "!") {
        push(factorial(val(pop())));
      } else if (item.op === "pct") {
        // marca o topo como porcentagem (resolvida por quem consumir)
        if (pf.length < 1) throw new Error("expressão incompleta");
        pf[pf.length - 1] = true;
      } else {
        const [b, pb] = pop();
        let [a, pa] = pop();
        if (pa) a = a / 100; // porcentagem à esquerda vira valor solto
        let r: number;
        switch (item.op) {
          case "+": r = a + (pb ? (a * b) / 100 : b); break;
          case "-": r = a - (pb ? (a * b) / 100 : b); break;
          case "*": r = a * (pb ? b / 100 : b); break;
          case "/": r = a / (pb ? b / 100 : b); break;
          case "^": r = Math.pow(a, pb ? b / 100 : b); break;
          case "%":
          case "mod": r = a % (pb ? b / 100 : b); break;
          default: throw new Error(`operador inválido aqui: ${item.op}`);
        }
        push(r);
      }
    } else {
      throw new Error("expressão inválida");
    }
  }
  if (st.length !== 1) throw new Error("expressão incompleta");
  return val([st[0], pf[0]]);
}

export function evaluate(
  expr: string,
  angle: AngleMode = "deg",
  vars: Record<string, number> = {},
): number {
  const r = evalCore(toRpn(tokenize(expr, false)), fns(angle), vars);
  if (Number.isNaN(r)) throw new Error("resultado indefinido");
  return r;
}

export interface PlotPoint {
  x: number;
  y: number | null; // null = fora do domínio (assíntota/NaN) — quebra a linha
}

/** Amostra `f(x)` num intervalo pro gráfico (x é uma variável na expressão). */
export function plotFunction(
  expr: string,
  xMin: number,
  xMax: number,
  samples: number,
  angle: AngleMode = "deg",
  vars: Record<string, number> = {},
): PlotPoint[] {
  const rpn = toRpn(tokenize(expr, false)); // valida uma vez, não a cada ponto
  const out: PlotPoint[] = [];
  const step = (xMax - xMin) / (samples - 1);
  const F = fns(angle);
  for (let i = 0; i < samples; i++) {
    const x = xMin + i * step;
    let y: number | null;
    try {
      // O `x` do eixo entra DEPOIS das variáveis do usuário e as sombra de
      // propósito: quem definiu `x = 12` no painel e plota `sin(x)` quer a
      // curva, não a reta constante sin(12). Fora do gráfico o `x` do painel
      // continua valendo normalmente.
      y = evalCore(rpn, F, { ...vars, x });
      if (!Number.isFinite(y)) y = null;
    } catch {
      y = null;
    }
    out.push({ x, y });
  }
  return out;
}

/** Formata pra exibição: 12 dígitos significativos, sem ruído binário. */
export function formatResult(value: number): string {
  if (!Number.isFinite(value)) return value > 0 ? "∞" : value < 0 ? "-∞" : "NaN";
  if (Number.isInteger(value) && Math.abs(value) < 1e15) return String(value);
  const s = value.toPrecision(12);
  // tira zeros à direita ("0.500000000000" → "0.5")
  return String(Number(s));
}

// ---------- variáveis do usuário ----------

/**
 * Nomes que o parser já ocupa e que NÃO podem virar variável: as constantes
 * (`pi`/`e`), toda função científica, os operadores-palavra do modo programador
 * (`and`, `shl`…) e o `ans`.
 *
 * O motivo é `evalCore`: lá `vars[name]` é consultado ANTES de `CONSTANTS[name]`
 * (a precedência que faz `ans` e o `x` do gráfico funcionarem). Logo uma
 * variável chamada `pi` sequestraria π em TODA conta seguinte, calada. Recusar
 * na atribuição, com erro nomeando o conflito, é a única saída honesta —
 * silêncio aqui vira resultado errado com cara de certo.
 */
export const RESERVED_NAMES: ReadonlySet<string> = new Set([
  ...Object.keys(CONSTANTS),
  ...Object.keys(fns("rad")), // o modo de ângulo troca o corpo das fns, não os nomes
  ...WORD_OPS,
  "ans",
]);

/**
 * Forma válida de nome. É deliberadamente a MESMA regra do tokenizer
 * (`[a-zA-Z][a-zA-Z0-9]*`, sem `_` e sem acento) porque ele é quem vai reler o
 * nome na expressão seguinte: aceitar `taxa_iva` ou `preço` criaria variável
 * fantasma — listada no painel e "desconhecida" na hora de usar.
 */
const VAR_NAME_RE = /^[a-zA-Z][a-zA-Z0-9]*$/;

/**
 * Normaliza e valida um nome de variável, ou lança com o motivo exato.
 * O lowercase não é cosmético: o tokenizer minúscula todo ident que lê, então
 * `Total` e `total` são forçosamente a mesma variável — melhor colapsar aqui do
 * que deixar o painel mostrar duas linhas que apontam pro mesmo valor.
 */
export function checkVarName(raw: string): string {
  const name = raw.trim().toLowerCase();
  if (!VAR_NAME_RE.test(name)) {
    throw new Error(`nome inválido: "${raw.trim()}" — use letra seguida de letras/números`);
  }
  if (RESERVED_NAMES.has(name)) {
    throw new Error(`nome reservado pelo parser: ${name}`);
  }
  return name;
}

export interface Assignment {
  name: string;
  expr: string;
}

/**
 * Reconhece `nome = expressão` antes de qualquer tokenização.
 *
 * Tem que ser antes porque `=` não é operador do motor — chegando no tokenizer
 * ele vira "caractere inválido". Só o PRIMEIRO `=` separa: `x = y = 2` não é
 * encadeamento, é `x` recebendo a expressão inválida `y = 2` (erro, não
 * silêncio). Devolve null quando não há atribuição e o chamador segue com a
 * expressão crua.
 */
export function parseAssignment(src: string): Assignment | null {
  const m = /^\s*([^\s=]+)\s*=\s*(.*)$/.exec(src);
  return m ? { name: m[1], expr: m[2] } : null;
}

export interface AssignResult {
  name: string;
  value: number;
}

/**
 * Avalia `nome = expr` e devolve o par pronto pro ambiente.
 *
 * A avaliação é ANSIOSA — o ambiente guarda NÚMERO, nunca expressão — e é
 * exatamente isso que torna ciclo e recursão estruturalmente impossíveis, sem
 * precisar de detecção de ciclo em grafo: `x = x + 1` lê o x ANTIGO (número já
 * resolvido) e grava outro número; sem x anterior é o erro normal
 * "desconhecido: x". Guardar a expressão daria `a = b` / `b = a` travando a
 * avaliação — complexidade que uma calculadora não paga.
 *
 * Ordem importa: o nome é validado ANTES de avaliar, senão `pi = 1/0` gastaria a
 * conta pra só depois recusar o nome.
 */
export function evaluateAssignment(
  a: Assignment,
  angle: AngleMode = "deg",
  vars: Record<string, number> = {},
): AssignResult {
  const name = checkVarName(a.name);
  return { name, value: evaluate(a.expr, angle, vars) };
}

// ---------- avaliação programador (BigInt) ----------

function bigFactorial(n: bigint): bigint {
  if (n < 0n) throw new Error("fatorial só de inteiro ≥ 0");
  let r = 1n;
  for (let i = 2n; i <= n; i++) r *= i;
  return r;
}

export function evaluateBig(expr: string): bigint {
  const rpn = toRpn(tokenize(expr, true));
  const st: bigint[] = [];
  for (const item of rpn) {
    if (item.kind === "big") st.push(item.value);
    else if (item.kind === "num") st.push(BigInt(Math.trunc(item.value)));
    else if (item.kind === "call") throw new Error(`função indisponível no modo programador: ${item.name}`);
    else if (item.kind === "op") {
      if (item.op === "u-") {
        if (st.length < 1) throw new Error("expressão incompleta");
        st.push(-st.pop()!);
      } else if (item.op === "not") {
        if (st.length < 1) throw new Error("expressão incompleta");
        st.push(~st.pop()!);
      } else if (item.op === "!") {
        if (st.length < 1) throw new Error("expressão incompleta");
        st.push(bigFactorial(st.pop()!));
      } else {
        if (st.length < 2) throw new Error("expressão incompleta");
        const b = st.pop()!;
        const a = st.pop()!;
        switch (item.op) {
          case "+": st.push(a + b); break;
          case "-": st.push(a - b); break;
          case "*": st.push(a * b); break;
          case "/":
            if (b === 0n) throw new Error("divisão por zero");
            st.push(a / b);
            break;
          case "%":
          case "mod":
            if (b === 0n) throw new Error("divisão por zero");
            st.push(a % b);
            break;
          case "^": st.push(a ** b); break;
          case "and": st.push(a & b); break;
          case "or": st.push(a | b); break;
          case "xor": st.push(a ^ b); break;
          case "shl": st.push(a << b); break;
          case "shr": st.push(a >> b); break;
          default: throw new Error(`operador inválido: ${item.op}`);
        }
      }
    } else {
      throw new Error("expressão inválida");
    }
  }
  if (st.length !== 1) throw new Error("expressão incompleta");
  return st[0];
}

/** As 4 bases do modo programador (negativos em decimal com sinal). */
export function bigBases(v: bigint): { dec: string; hex: string; oct: string; bin: string } {
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const sign = neg ? "-" : "";
  return {
    dec: v.toString(10),
    hex: sign + "0x" + abs.toString(16).toUpperCase(),
    oct: sign + "0o" + abs.toString(8),
    bin: sign + "0b" + abs.toString(2),
  };
}
