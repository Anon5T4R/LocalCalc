import { describe, expect, it } from "vitest";
import {
  bigBases,
  checkVarName,
  evaluate,
  evaluateAssignment,
  evaluateBig,
  formatResult,
  parseAssignment,
  plotFunction,
  RESERVED_NAMES,
} from "../engine";
import { convert, convertTemp } from "../units";

describe("evaluate — aritmética e precedência", () => {
  it("básico com precedência", () => {
    expect(evaluate("2+3*4")).toBe(14);
    expect(evaluate("(2+3)*4")).toBe(20);
    expect(evaluate("10/4")).toBe(2.5);
    expect(evaluate("2^10")).toBe(1024);
    expect(evaluate("2^3^2")).toBe(512); // direita-associativo
  });

  it("menos unário", () => {
    expect(evaluate("-5+3")).toBe(-2);
    expect(evaluate("2*-3")).toBe(-6);
    expect(evaluate("-(2+3)")).toBe(-5);
    expect(evaluate("2^-1")).toBe(0.5);
  });

  it("constantes em qualquer posição", () => {
    expect(evaluate("pi*2")).toBeCloseTo(Math.PI * 2, 12);
    expect(evaluate("2*pi")).toBeCloseTo(Math.PI * 2, 12);
    expect(evaluate("e")).toBeCloseTo(Math.E, 12);
  });

  it("funções (DEG por padrão) e aninhadas", () => {
    expect(evaluate("sin(90)")).toBeCloseTo(1, 12);
    expect(evaluate("cos(180)")).toBeCloseTo(-1, 12);
    expect(evaluate("sin(pi/2)", "rad")).toBeCloseTo(1, 12);
    expect(evaluate("sqrt(16)+ln(e)", "rad")).toBeCloseTo(5, 12);
    expect(evaluate("log(1000)")).toBeCloseTo(3, 12);
    expect(evaluate("abs(-8)")).toBe(8);
    expect(evaluate("max(1;5;3)")).toBe(5);
    expect(evaluate("sqrt(abs(-16))")).toBe(4);
  });

  it("fatorial e expoente científico", () => {
    expect(evaluate("5!")).toBe(120);
    expect(evaluate("3!+1")).toBe(7);
    expect(evaluate("1.5e3")).toBe(1500);
    expect(evaluate("1e-2")).toBe(0.01);
  });

  it("vírgula decimal PT aceita", () => {
    expect(evaluate("1,5*2")).toBe(3);
  });

  it("erros claros", () => {
    expect(() => evaluate("2+")).toThrow();
    expect(() => evaluate("(2+3")).toThrow();
    expect(() => evaluate("foo(2)")).toThrow();
    expect(() => evaluate("2..5")).toThrow();
    expect(() => evaluate("0/0")).toThrow();
  });
});

describe("porcentagem (científica)", () => {
  it("% solto é dividir por 100", () => {
    expect(evaluate("50%")).toBe(0.5);
    expect(evaluate("10%")).toBe(0.1);
    expect(evaluate("sqrt(25%)")).toBeCloseTo(0.5, 12); // 25% = 0.25
  });
  it("aditivo: percentual sobre a base (imposto/desconto)", () => {
    expect(evaluate("200+10%")).toBe(220);
    expect(evaluate("200-10%")).toBe(180);
    expect(evaluate("50+50%")).toBe(75);
  });
  it("multiplicativo: fração da base (gorjeta)", () => {
    expect(evaluate("200*15%")).toBeCloseTo(30, 12);
    expect(evaluate("1000/25%")).toBe(4000); // 1000 / 0.25
  });
  it("precedência com a base composta à esquerda", () => {
    expect(evaluate("2*100+10%")).toBe(220); // base = 200
  });
});

describe("variável ans", () => {
  it("usa a última resposta na expressão", () => {
    expect(evaluate("ans+1", "deg", { ans: 41 })).toBe(42);
    expect(evaluate("ans*ans", "deg", { ans: 6 })).toBe(36);
  });
  it("ans desconhecida sem contexto dá erro", () => {
    expect(() => evaluate("ans+1")).toThrow();
  });
});

describe("variáveis do usuário — parseAssignment", () => {
  it("reconhece `nome = expressão`", () => {
    expect(parseAssignment("x = 12")).toEqual({ name: "x", expr: "12" });
    expect(parseAssignment("taxa=0.15")).toEqual({ name: "taxa", expr: "0.15" });
    expect(parseAssignment("  total  =  2 + 3 * 4 ")).toEqual({
      name: "total",
      expr: "2 + 3 * 4 ",
    });
  });

  it("expressão comum NÃO é atribuição", () => {
    expect(parseAssignment("2+2")).toBeNull();
    expect(parseAssignment("sin(90)")).toBeNull();
    expect(parseAssignment("2 + 2 = 4")).toBeNull(); // "2" não é seguido de `=`
    expect(parseAssignment("")).toBeNull();
  });

  it("só o PRIMEIRO `=` separa (sem encadeamento silencioso)", () => {
    expect(parseAssignment("x = y = 2")).toEqual({ name: "x", expr: "y = 2" });
    // e o lado direito `y = 2` é expressão inválida, não uma segunda atribuição
    expect(() => evaluate("y = 2")).toThrow();
  });
});

describe("variáveis do usuário — nomes reservados", () => {
  it("recusa constantes e funções que o parser já usa", () => {
    for (const name of ["pi", "e", "sin", "cos", "sqrt", "log", "max", "abs", "ans"]) {
      expect(() => checkVarName(name)).toThrow(/reservado/);
    }
  });

  it("o conjunto reservado cobre constantes, funções, ops-palavra e ans", () => {
    expect(RESERVED_NAMES.has("pi")).toBe(true);
    expect(RESERVED_NAMES.has("atan")).toBe(true);
    expect(RESERVED_NAMES.has("shl")).toBe(true); // operador-palavra do programador
    expect(RESERVED_NAMES.has("ans")).toBe(true);
    expect(RESERVED_NAMES.has("x")).toBe(false); // `x` é do usuário (o gráfico o sombreia)
  });

  it("recusa formas que o tokenizer não conseguiria reler", () => {
    expect(() => checkVarName("2x")).toThrow(/inválido/); // começa com dígito
    expect(() => checkVarName("taxa_iva")).toThrow(/inválido/); // `_` não é ident
    expect(() => checkVarName("preço")).toThrow(/inválido/); // acento não é ident
    expect(() => checkVarName("")).toThrow(/inválido/);
  });

  it("normaliza pra minúsculo (o tokenizer minúscula todo ident)", () => {
    expect(checkVarName("Total")).toBe("total");
    expect(checkVarName("  Sub2  ")).toBe("sub2");
    expect(() => checkVarName("PI")).toThrow(/reservado/); // reservado é case-insensitive
  });
});

describe("variáveis do usuário — avaliação", () => {
  it("define e reusa nas expressões seguintes", () => {
    const { name, value } = evaluateAssignment({ name: "x", expr: "12" });
    expect(name).toBe("x");
    expect(value).toBe(12);
    expect(evaluate("x * 3", "deg", { x: 12 })).toBe(36);
  });

  it("a definição enxerga as variáveis já existentes", () => {
    const r = evaluateAssignment({ name: "dobro", expr: "x * 2" }, "deg", { x: 21 });
    expect(r).toEqual({ name: "dobro", value: 42 });
  });

  it("nome é validado ANTES de avaliar (não gasta a conta pra depois recusar)", () => {
    expect(() => evaluateAssignment({ name: "pi", expr: "1/0" })).toThrow(/reservado/);
  });

  it("`x = x + 1` usa o x ANTIGO — avaliação ansiosa mata recursão e ciclo", () => {
    // Sem detecção de grafo: o ambiente guarda NÚMERO, então a auto-referência
    // é só uma leitura do valor anterior.
    expect(evaluateAssignment({ name: "x", expr: "x + 1" }, "deg", { x: 12 }).value).toBe(13);
    // E sem valor anterior é o erro normal de identificador desconhecido.
    expect(() => evaluateAssignment({ name: "x", expr: "x + 1" })).toThrow(/desconhecido/);
  });

  it("ciclo a→b→a é impossível: b congelou o número, não a expressão", () => {
    const a = evaluateAssignment({ name: "a", expr: "10" }).value;
    const b = evaluateAssignment({ name: "b", expr: "a * 2" }, "deg", { a }).value;
    expect(b).toBe(20);
    // redefinir `a` apontando pra `b` termina — `b` já é 20, não "a*2"
    const a2 = evaluateAssignment({ name: "a", expr: "b + 1" }, "deg", { a, b }).value;
    expect(a2).toBe(21);
  });

  it("variável convive com constantes e funções na mesma expressão", () => {
    expect(evaluate("sin(ang)", "deg", { ang: 90 })).toBeCloseTo(1, 12);
    expect(evaluate("raio^2*pi", "deg", { raio: 2 })).toBeCloseTo(4 * Math.PI, 12);
  });

  it("variável desconhecida dá erro claro, não zero silencioso", () => {
    expect(() => evaluate("naoexiste + 1")).toThrow(/desconhecido/);
  });
});

describe("plotFunction", () => {
  it("amostra sin(x) em RAD com pontos válidos", () => {
    const pts = plotFunction("sin(x)", -Math.PI, Math.PI, 5, "rad");
    expect(pts).toHaveLength(5);
    expect(pts[2].x).toBeCloseTo(0, 10);
    expect(pts[2].y).toBeCloseTo(0, 10);
    expect(pts.every((p) => p.y !== null)).toBe(true);
  });
  it("marca fora-do-domínio como null (1/x em x=0)", () => {
    const pts = plotFunction("1/x", -2, 2, 5, "rad");
    // x=0 é o ponto do meio → y infinito → null
    expect(pts[2].y).toBeNull();
    expect(pts[0].y).toBeCloseTo(-0.5, 10);
  });

  it("variáveis do usuário viram parâmetros da curva", () => {
    const pts = plotFunction("a*x", -2, 2, 5, "rad", { a: 3 });
    expect(pts[4].y).toBeCloseTo(6, 10); // a=3 em x=2
  });

  it("o `x` do eixo SOMBREIA um `x` do usuário (senão a curva viraria reta)", () => {
    const pts = plotFunction("x", -2, 2, 5, "rad", { x: 99 });
    expect(pts.map((p) => p.y)).toEqual([-2, -1, 0, 1, 2]);
  });
});

describe("formatResult — sem ruído binário", () => {
  it("0.1+0.2 vira 0.3", () => {
    expect(formatResult(evaluate("0.1+0.2"))).toBe("0.3");
  });
  it("inteiros ficam inteiros", () => {
    expect(formatResult(1024)).toBe("1024");
  });
  it("divisão por zero mostra infinito", () => {
    expect(formatResult(evaluate("1/0"))).toBe("∞");
  });
});

describe("evaluateBig — modo programador", () => {
  it("bases e bitwise", () => {
    expect(evaluateBig("0xFF")).toBe(255n);
    expect(evaluateBig("0b1010")).toBe(10n);
    expect(evaluateBig("0o17")).toBe(15n);
    expect(evaluateBig("0xF0 or 0x0F")).toBe(255n);
    expect(evaluateBig("0xFF and 0x0F")).toBe(15n);
    expect(evaluateBig("0xFF xor 0x0F")).toBe(240n);
    expect(evaluateBig("1 shl 8")).toBe(256n);
    expect(evaluateBig("256 shr 4")).toBe(16n);
    expect(evaluateBig("not 0")).toBe(-1n);
  });

  it("atalhos & | ~ e << >>", () => {
    expect(evaluateBig("0xF0 | 0x0F")).toBe(255n);
    expect(evaluateBig("0xFF & 0x0F")).toBe(15n);
    expect(evaluateBig("~0")).toBe(-1n);
    expect(evaluateBig("1 << 10")).toBe(1024n);
  });

  it("precisão arbitrária", () => {
    expect(evaluateBig("2^100")).toBe(1267650600228229401496703205376n);
    expect(evaluateBig("20!")).toBe(2432902008176640000n);
  });

  it("divisão inteira e por zero", () => {
    expect(evaluateBig("7/2")).toBe(3n);
    expect(() => evaluateBig("1/0")).toThrow();
  });

  it("bigBases formata as 4 bases", () => {
    expect(bigBases(255n)).toEqual({ dec: "255", hex: "0xFF", oct: "0o377", bin: "0b11111111" });
    expect(bigBases(-5n).dec).toBe("-5");
    expect(bigBases(-5n).hex).toBe("-0x5");
  });
});

describe("conversor de unidades", () => {
  it("comprimento/massa/dados", () => {
    expect(convert("length", 1, "km", "m")).toBe(1000);
    expect(convert("length", 1, "in", "cm")).toBeCloseTo(2.54, 12);
    expect(convert("mass", 1, "lb", "g")).toBeCloseTo(453.59237, 6);
    expect(convert("data", 1, "GB", "MB")).toBe(1024);
  });

  it("temperatura (offsets)", () => {
    expect(convertTemp(0, "c", "f")).toBe(32);
    expect(convertTemp(100, "c", "k")).toBeCloseTo(373.15, 10);
    expect(convertTemp(32, "f", "c")).toBe(0);
  });
});
