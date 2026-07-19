import { beforeEach, describe, expect, it } from "vitest";

/**
 * Testes do fluxo de variáveis no STORE (o motor já é coberto em
 * lib/__tests__/engine.test.ts). Aqui o que importa é o que o usuário vê:
 * definir com `=`, reusar, o que persiste e o que é recusado.
 *
 * O store lê `localStorage` no import (estado inicial), então o stub precisa
 * existir ANTES do import dinâmico — daí o `await import()` dentro do teste em
 * vez do import estático no topo.
 *
 * O store é singleton de módulo (zustand `create` no escopo do arquivo), então
 * os testes COMPARTILHAM instância: cada um começa com `clearVars()` em vez de
 * confiar em isolamento que não existe.
 */
function stubLocalStorage() {
  const mem = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
      clear: () => mem.clear(),
    },
  });
  return mem;
}

async function freshStore() {
  // resetModules garante estado zerado por teste — o store é um singleton de módulo
  const { useCalc } = await import("../store");
  return useCalc;
}

describe("store — variáveis", () => {
  let mem: Map<string, string>;

  beforeEach(() => {
    mem = stubLocalStorage();
  });

  it("`x = 12` define, e `x * 3` usa nas contas seguintes", async () => {
    const useCalc = await freshStore();
    const s = () => useCalc.getState();

    s().clearVars();
    s().setExpr("x = 12");
    s().equals();
    expect(s().error).toBeNull();
    expect(s().vars.x).toBe(12);

    s().setExpr("x * 3");
    s().equals();
    expect(s().result).toBe("36");
  });

  it("redefinir substitui (é o uso normal: ajustar e refazer a conta)", async () => {
    const useCalc = await freshStore();
    const s = () => useCalc.getState();

    s().clearVars();
    s().setExpr("taxa = 0.1");
    s().equals();
    s().setExpr("taxa = 0.25");
    s().equals();
    expect(s().vars.taxa).toBe(0.25);
    expect(Object.keys(s().vars)).toHaveLength(1);
  });

  it("nome reservado é ERRO explícito e não grava nada", async () => {
    const useCalc = await freshStore();
    const s = () => useCalc.getState();

    s().clearVars();
    s().setExpr("pi = 3");
    s().equals();
    expect(s().error).toMatch(/reservado/);
    expect(s().vars.pi).toBeUndefined();
    // e π continua valendo o que sempre valeu
    s().setExpr("pi");
    s().equals();
    expect(Number(s().result)).toBeCloseTo(Math.PI, 10);
  });

  it("persiste no localStorage e limpa por nome e em bloco", async () => {
    const useCalc = await freshStore();
    const s = () => useCalc.getState();

    s().clearVars();
    s().setExpr("a = 1");
    s().equals();
    s().setExpr("b = 2");
    s().equals();
    expect(JSON.parse(mem.get("localcalc.vars")!)).toEqual({ a: 1, b: 2 });

    s().removeVar("a");
    expect(s().vars).toEqual({ b: 2 });
    expect(JSON.parse(mem.get("localcalc.vars")!)).toEqual({ b: 2 });

    s().clearVars();
    expect(s().vars).toEqual({});
    expect(JSON.parse(mem.get("localcalc.vars")!)).toEqual({});
  });

  it("atribuição no modo programador não vira variável (ambiente é f64)", async () => {
    const useCalc = await freshStore();
    const s = () => useCalc.getState();

    s().clearVars();
    s().setMode("programmer");
    s().setExpr("x = 12");
    s().equals();
    expect(s().error).toBeTruthy(); // `=` é caractere inválido lá
    expect(s().vars.x).toBeUndefined();
    s().setMode("standard");
  });

  it("preview de atribuição mostra o lado direito sem gravar", async () => {
    const useCalc = await freshStore();
    const s = () => useCalc.getState();

    s().clearVars();
    s().setExpr("y = 5*2");
    expect(s().preview).toBe("10");
    expect(s().vars.y).toBeUndefined(); // só o `=` grava
  });
});
