import { useSyncExternalStore } from "react";

/**
 * i18n leve da UI (padrão da suíte). Símbolos de unidade (mm, kg, °C…) são
 * universais e NÃO se traduzem; só categorias e unidades "de palavra"
 * (dia/semana/ano) têm chave.
 */

export type Locale = "pt" | "en" | "es";

export const LOCALE_LABELS: Record<Locale, string> = {
  pt: "Português",
  en: "English",
  es: "Español",
};

const LOCALE_KEY = "localcalc.locale";

const pt = {
  // Modos
  "mode.standard": "Padrão",
  "mode.scientific": "Científica",
  "mode.programmer": "Programador",
  "mode.graph": "Gráfico",
  "mode.converter": "Conversor",

  // Gráfico
  "graph.fx": "f(x) =",
  "graph.xmin": "x mín.",
  "graph.xmax": "x máx.",
  "graph.noPoints": "Nada pra plotar nesse intervalo.",

  // Topo
  "top.history": "Histórico",
  "top.vars": "Variáveis",
  "top.settingsTitle": "Configurações",

  // Variáveis
  "vars.title": "Variáveis",
  "vars.empty": "Nenhuma variável definida ainda.",
  "vars.clear": "limpar tudo",
  "vars.reuse": "Inserir o nome na expressão",
  "vars.remove": "Apagar {name}",
  "vars.hint": "Defina com nome = expressão (ex.: x = 12) e use o nome nas contas seguintes.",

  // Display / ações
  "display.placeholder": "Digite a expressão…",
  "display.error": "Erro: {msg}",
  "btn.clear": "C",
  "btn.equals": "=",
  "copy.result": "Copiar resultado",
  "toast.copied": "Resultado copiado",
  "toast.copyFailed": "Não consegui copiar",

  // Memória
  "mem.hint": "Memória: {v}",

  // Programador
  "prog.hint": "Operadores: AND OR XOR NOT << >>  ·  Literais: 0x 0o 0b",

  // Conversor
  "conv.value": "Valor",
  "conv.swap": "Inverter unidades",
  "cat.length": "Comprimento",
  "cat.mass": "Massa",
  "cat.temp": "Temperatura",
  "cat.data": "Dados",
  "cat.time": "Tempo",
  "cat.area": "Área",
  "cat.volume": "Volume",
  "cat.speed": "Velocidade",
  "unit.day": "dia",
  "unit.week": "semana",
  "unit.year": "ano",
  "unit.cup": "xícara (US)",
  "unit.gal": "galão (US)",
  "unit.knot": "nó",

  // Histórico
  "hist.title": "Histórico",
  "hist.empty": "Nada calculado ainda.",
  "hist.clear": "limpar tudo",
  "hist.reuse": "Reusar esta conta",

  // Settings
  "settings.title": "Configurações",
  "settings.theme": "Tema",
  "settings.themeSystem": "Sistema",
  "settings.themeLight": "Claro",
  "settings.themeDark": "Escuro",
  "settings.themeNature": "Natureza",
  "settings.themeDarkBlue": "Azul escuro",
  "settings.themeCalmGreen": "Verde calmo",
  "settings.themePastelPink": "Rosa pastel",
  "settings.themePunkPrincess": "PunkPrincess",
  "settings.language": "Idioma",
  "settings.about":
    " — calculadora 100% offline: padrão, científica (DEG/RAD, memória), programador (HEX/DEC/OCT/BIN, bitwise, precisão arbitrária) e conversor de unidades. Motor de expressão próprio, testado. Parte da suíte Local.",
  "dlg.ok": "OK",
} as const;

export type MessageKey = keyof typeof pt;

const en: Record<MessageKey, string> = {
  "mode.standard": "Standard",
  "mode.scientific": "Scientific",
  "mode.programmer": "Programmer",
  "mode.graph": "Graph",
  "mode.converter": "Converter",

  "graph.fx": "f(x) =",
  "graph.xmin": "x min",
  "graph.xmax": "x max",
  "graph.noPoints": "Nothing to plot in this range.",

  "top.history": "History",
  "top.vars": "Variables",
  "top.settingsTitle": "Settings",

  "vars.title": "Variables",
  "vars.empty": "No variables defined yet.",
  "vars.clear": "clear all",
  "vars.reuse": "Insert the name into the expression",
  "vars.remove": "Delete {name}",
  "vars.hint": "Define with name = expression (e.g. x = 12) and use the name in later calculations.",

  "display.placeholder": "Type an expression…",
  "display.error": "Error: {msg}",
  "btn.clear": "C",
  "btn.equals": "=",
  "copy.result": "Copy result",
  "toast.copied": "Result copied",
  "toast.copyFailed": "Couldn't copy",

  "mem.hint": "Memory: {v}",

  "prog.hint": "Operators: AND OR XOR NOT << >>  ·  Literals: 0x 0o 0b",

  "conv.value": "Value",
  "conv.swap": "Swap units",
  "cat.length": "Length",
  "cat.mass": "Mass",
  "cat.temp": "Temperature",
  "cat.data": "Data",
  "cat.time": "Time",
  "cat.area": "Area",
  "cat.volume": "Volume",
  "cat.speed": "Speed",
  "unit.day": "day",
  "unit.week": "week",
  "unit.year": "year",
  "unit.cup": "cup (US)",
  "unit.gal": "gallon (US)",
  "unit.knot": "knot",

  "hist.title": "History",
  "hist.empty": "Nothing calculated yet.",
  "hist.clear": "clear all",
  "hist.reuse": "Reuse this calculation",

  "settings.title": "Settings",
  "settings.theme": "Theme",
  "settings.themeSystem": "System",
  "settings.themeLight": "Light",
  "settings.themeDark": "Dark",
  "settings.themeNature": "Nature",
  "settings.themeDarkBlue": "Dark blue",
  "settings.themeCalmGreen": "Calm green",
  "settings.themePastelPink": "Pastel pink",
  "settings.themePunkPrincess": "PunkPrincess",
  "settings.language": "Language",
  "settings.about":
    " — 100% offline calculator: standard, scientific (DEG/RAD, memory), programmer (HEX/DEC/OCT/BIN, bitwise, arbitrary precision) and unit converter. In-house tested expression engine. Part of the Local suite.",
  "dlg.ok": "OK",
};

const es: Record<MessageKey, string> = {
  "mode.standard": "Estándar",
  "mode.scientific": "Científica",
  "mode.programmer": "Programador",
  "mode.graph": "Gráfico",
  "mode.converter": "Conversor",

  "graph.fx": "f(x) =",
  "graph.xmin": "x mín.",
  "graph.xmax": "x máx.",
  "graph.noPoints": "Nada que graficar en este intervalo.",

  "top.history": "Historial",
  "top.vars": "Variables",
  "top.settingsTitle": "Configuración",

  "vars.title": "Variables",
  "vars.empty": "Ninguna variable definida todavía.",
  "vars.clear": "borrar todo",
  "vars.reuse": "Insertar el nombre en la expresión",
  "vars.remove": "Borrar {name}",
  "vars.hint": "Define con nombre = expresión (ej.: x = 12) y usa el nombre en los cálculos siguientes.",

  "display.placeholder": "Escribe una expresión…",
  "display.error": "Error: {msg}",
  "btn.clear": "C",
  "btn.equals": "=",
  "copy.result": "Copiar resultado",
  "toast.copied": "Resultado copiado",
  "toast.copyFailed": "No se pudo copiar",

  "mem.hint": "Memoria: {v}",

  "prog.hint": "Operadores: AND OR XOR NOT << >>  ·  Literales: 0x 0o 0b",

  "conv.value": "Valor",
  "conv.swap": "Invertir unidades",
  "cat.length": "Longitud",
  "cat.mass": "Masa",
  "cat.temp": "Temperatura",
  "cat.data": "Datos",
  "cat.time": "Tiempo",
  "cat.area": "Área",
  "cat.volume": "Volumen",
  "cat.speed": "Velocidad",
  "unit.day": "día",
  "unit.week": "semana",
  "unit.year": "año",
  "unit.cup": "taza (US)",
  "unit.gal": "galón (US)",
  "unit.knot": "nudo",

  "hist.title": "Historial",
  "hist.empty": "Nada calculado todavía.",
  "hist.clear": "borrar todo",
  "hist.reuse": "Reusar este cálculo",

  "settings.title": "Configuración",
  "settings.theme": "Tema",
  "settings.themeSystem": "Sistema",
  "settings.themeLight": "Claro",
  "settings.themeDark": "Oscuro",
  "settings.themeNature": "Naturaleza",
  "settings.themeDarkBlue": "Azul oscuro",
  "settings.themeCalmGreen": "Verde tranquilo",
  "settings.themePastelPink": "Rosa pastel",
  "settings.themePunkPrincess": "PunkPrincess",
  "settings.language": "Idioma",
  "settings.about":
    " — calculadora 100% offline: estándar, científica (DEG/RAD, memoria), programador (HEX/DEC/OCT/BIN, bitwise, precisión arbitraria) y conversor de unidades. Motor de expresiones propio y testeado. Parte de la suite Local.",
  "dlg.ok": "OK",
};

const DICTS: Record<Locale, Record<MessageKey, string>> = { pt, en, es };

export function detectLocale(): Locale {
  const l = (typeof navigator !== "undefined" ? navigator.language : "pt").toLowerCase();
  if (l.startsWith("en")) return "en";
  if (l.startsWith("es")) return "es";
  return "pt";
}

function loadLocale(): Locale {
  const v = typeof localStorage !== "undefined" ? localStorage.getItem(LOCALE_KEY) : null;
  return v === "pt" || v === "en" || v === "es" ? v : detectLocale();
}

let current: Locale = loadLocale();
const listeners = new Set<() => void>();

export function getLocale(): Locale {
  return current;
}

export function setLocale(locale: Locale) {
  if (locale === current) return;
  current = locale;
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    /* localStorage indisponível */
  }
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, getLocale);
}

export function t(key: MessageKey, params?: Record<string, string | number>): string {
  let msg: string = DICTS[current][key] ?? pt[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      msg = msg.split(`{${k}}`).join(String(v));
    }
  }
  return msg;
}
