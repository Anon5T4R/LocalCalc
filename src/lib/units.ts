/**
 * Conversor de unidades OFFLINE — fatores fixos por categoria (unidade-base
 * por categoria; temperatura é o caso especial com offset).
 */

export interface Unit {
  id: string;
  /** Fator pra unidade-base da categoria (x[unid] * factor = x[base]). */
  factor: number;
}

export interface Category {
  id: string;
  units: Unit[];
}

export const CATEGORIES: Category[] = [
  {
    id: "length",
    units: [
      { id: "mm", factor: 0.001 },
      { id: "cm", factor: 0.01 },
      { id: "m", factor: 1 },
      { id: "km", factor: 1000 },
      { id: "in", factor: 0.0254 },
      { id: "ft", factor: 0.3048 },
      { id: "yd", factor: 0.9144 },
      { id: "mi", factor: 1609.344 },
    ],
  },
  {
    id: "mass",
    units: [
      { id: "mg", factor: 0.000001 },
      { id: "g", factor: 0.001 },
      { id: "kg", factor: 1 },
      { id: "t", factor: 1000 },
      { id: "oz", factor: 0.028349523125 },
      { id: "lb", factor: 0.45359237 },
    ],
  },
  {
    id: "data",
    units: [
      { id: "B", factor: 1 },
      { id: "KB", factor: 1024 },
      { id: "MB", factor: 1024 ** 2 },
      { id: "GB", factor: 1024 ** 3 },
      { id: "TB", factor: 1024 ** 4 },
      { id: "kbit", factor: 125 },
      { id: "Mbit", factor: 125000 },
      { id: "Gbit", factor: 125000000 },
    ],
  },
  {
    id: "time",
    units: [
      { id: "ms", factor: 0.001 },
      { id: "s", factor: 1 },
      { id: "min", factor: 60 },
      { id: "h", factor: 3600 },
      { id: "day", factor: 86400 },
      { id: "week", factor: 604800 },
      { id: "year", factor: 31557600 }, // ano juliano (365,25 d)
    ],
  },
  {
    id: "area",
    units: [
      { id: "cm2", factor: 0.0001 },
      { id: "m2", factor: 1 },
      { id: "km2", factor: 1e6 },
      { id: "ha", factor: 10000 },
      { id: "ft2", factor: 0.09290304 },
      { id: "acre", factor: 4046.8564224 },
    ],
  },
  {
    id: "volume",
    units: [
      { id: "ml", factor: 0.001 },
      { id: "l", factor: 1 },
      { id: "m3", factor: 1000 },
      { id: "cup", factor: 0.2365882365 }, // US cup
      { id: "gal", factor: 3.785411784 }, // US gallon
    ],
  },
  {
    id: "speed",
    units: [
      { id: "ms_s", factor: 1 },
      { id: "kmh", factor: 1 / 3.6 },
      { id: "mph", factor: 0.44704 },
      { id: "knot", factor: 0.514444444 },
    ],
  },
];

export const TEMP_UNITS = ["c", "f", "k"] as const;
export type TempUnit = (typeof TEMP_UNITS)[number];

export function convertTemp(value: number, from: TempUnit, to: TempUnit): number {
  // normaliza pra Celsius
  const c = from === "c" ? value : from === "f" ? ((value - 32) * 5) / 9 : value - 273.15;
  return to === "c" ? c : to === "f" ? (c * 9) / 5 + 32 : c + 273.15;
}

export function convert(categoryId: string, value: number, fromId: string, toId: string): number {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) throw new Error(`categoria desconhecida: ${categoryId}`);
  const from = cat.units.find((u) => u.id === fromId);
  const to = cat.units.find((u) => u.id === toId);
  if (!from || !to) throw new Error("unidade desconhecida");
  return (value * from.factor) / to.factor;
}
