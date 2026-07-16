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
    if ("+-*/^%!&|~".includes(c)) {
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
      if (op === "!") {
        // pós-fixo: aplica direto
        out.push({ kind: "op", op: "!" });
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

export function evaluate(expr: string, angle: AngleMode = "deg"): number {
  const rpn = toRpn(tokenize(expr, false));
  const st: number[] = [];
  const F = fns(angle);
  for (const item of rpn) {
    if (item.kind === "num") st.push(item.value);
    else if (item.kind === "big") st.push(Number(item.value));
    else if (item.kind === "call") {
      if (item.argc === 0) {
        const c = CONSTANTS[item.name];
        if (c === undefined) throw new Error(`desconhecido: ${item.name}`);
        st.push(c);
      } else {
        const f = F[item.name];
        if (!f) throw new Error(`função desconhecida: ${item.name}`);
        if (st.length < item.argc) throw new Error("expressão incompleta");
        const args = st.splice(st.length - item.argc, item.argc);
        st.push(f(...args));
      }
    } else if (item.kind === "op") {
      if (item.op === "u-") {
        if (st.length < 1) throw new Error("expressão incompleta");
        st.push(-st.pop()!);
      } else if (item.op === "!") {
        if (st.length < 1) throw new Error("expressão incompleta");
        st.push(factorial(st.pop()!));
      } else {
        if (st.length < 2) throw new Error("expressão incompleta");
        const b = st.pop()!;
        const a = st.pop()!;
        switch (item.op) {
          case "+": st.push(a + b); break;
          case "-": st.push(a - b); break;
          case "*": st.push(a * b); break;
          case "/": st.push(a / b); break;
          case "%":
          case "mod": st.push(a % b); break;
          case "^": st.push(Math.pow(a, b)); break;
          default: throw new Error(`operador inválido aqui: ${item.op}`);
        }
      }
    } else {
      throw new Error("expressão inválida");
    }
  }
  if (st.length !== 1) throw new Error("expressão incompleta");
  const r = st[0];
  if (Number.isNaN(r)) throw new Error("resultado indefinido");
  return r;
}

/** Formata pra exibição: 12 dígitos significativos, sem ruído binário. */
export function formatResult(value: number): string {
  if (!Number.isFinite(value)) return value > 0 ? "∞" : value < 0 ? "-∞" : "NaN";
  if (Number.isInteger(value) && Math.abs(value) < 1e15) return String(value);
  const s = value.toPrecision(12);
  // tira zeros à direita ("0.500000000000" → "0.5")
  return String(Number(s));
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
