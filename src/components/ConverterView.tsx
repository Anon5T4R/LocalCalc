import { useState } from "react";
import { formatResult } from "../lib/engine";
import { t, type MessageKey } from "../lib/i18n";
import { CATEGORIES, TEMP_UNITS, convert, convertTemp, type TempUnit } from "../lib/units";

/** Rótulo da unidade: símbolo universal, ou tradução pras "de palavra". */
const UNIT_LABEL_KEY: Record<string, MessageKey> = {
  day: "unit.day",
  week: "unit.week",
  year: "unit.year",
  cup: "unit.cup",
  gal: "unit.gal",
  knot: "unit.knot",
};
const UNIT_SYMBOL: Record<string, string> = {
  ms_s: "m/s",
  kmh: "km/h",
  cm2: "cm²",
  m2: "m²",
  km2: "km²",
  ft2: "ft²",
  m3: "m³",
};

function unitLabel(id: string): string {
  const key = UNIT_LABEL_KEY[id];
  if (key) return t(key);
  return UNIT_SYMBOL[id] ?? id;
}

const TEMP_LABEL: Record<TempUnit, string> = { c: "°C", f: "°F", k: "K" };

/** Conversor de unidades offline (fatores fixos; temperatura com offset). */
export default function ConverterView() {
  const [cat, setCat] = useState<string>("length");
  const [value, setValue] = useState("1");
  const [from, setFrom] = useState("m");
  const [to, setTo] = useState("km");
  const [tFrom, setTFrom] = useState<TempUnit>("c");
  const [tTo, setTTo] = useState<TempUnit>("f");

  const isTemp = cat === "temp";
  const category = CATEGORIES.find((c) => c.id === cat);

  const changeCat = (id: string) => {
    setCat(id);
    if (id !== "temp") {
      const c = CATEGORIES.find((x) => x.id === id)!;
      setFrom(c.units[0].id);
      setTo(c.units[1]?.id ?? c.units[0].id);
    }
  };

  const swap = () => {
    if (isTemp) {
      setTFrom(tTo);
      setTTo(tFrom);
    } else {
      setFrom(to);
      setTo(from);
    }
  };

  const num = Number(value.replace(",", "."));
  let result: string = "—";
  if (Number.isFinite(num)) {
    try {
      result = formatResult(
        isTemp ? convertTemp(num, tFrom, tTo) : convert(cat, num, from, to),
      );
    } catch {
      result = "—";
    }
  }

  const cats: { id: string; key: MessageKey }[] = [
    { id: "length", key: "cat.length" },
    { id: "mass", key: "cat.mass" },
    { id: "temp", key: "cat.temp" },
    { id: "data", key: "cat.data" },
    { id: "time", key: "cat.time" },
    { id: "area", key: "cat.area" },
    { id: "volume", key: "cat.volume" },
    { id: "speed", key: "cat.speed" },
  ];

  return (
    <div className="converter">
      <div className="conv-cats">
        {cats.map((c) => (
          <button
            key={c.id}
            className={cat === c.id ? "active" : ""}
            onClick={() => changeCat(c.id)}
          >
            {t(c.key)}
          </button>
        ))}
      </div>

      <label className="conv-field">
        <span>{t("conv.value")}</span>
        <input
          value={value}
          inputMode="decimal"
          spellCheck={false}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>

      <div className="conv-units">
        {isTemp ? (
          <select value={tFrom} onChange={(e) => setTFrom(e.target.value as TempUnit)}>
            {TEMP_UNITS.map((u) => (
              <option key={u} value={u}>
                {TEMP_LABEL[u]}
              </option>
            ))}
          </select>
        ) : (
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            {category?.units.map((u) => (
              <option key={u.id} value={u.id}>
                {unitLabel(u.id)}
              </option>
            ))}
          </select>
        )}
        <button className="conv-swap" title={t("conv.swap")} onClick={swap}>
          ⇄
        </button>
        {isTemp ? (
          <select value={tTo} onChange={(e) => setTTo(e.target.value as TempUnit)}>
            {TEMP_UNITS.map((u) => (
              <option key={u} value={u}>
                {TEMP_LABEL[u]}
              </option>
            ))}
          </select>
        ) : (
          <select value={to} onChange={(e) => setTo(e.target.value)}>
            {category?.units.map((u) => (
              <option key={u.id} value={u.id}>
                {unitLabel(u.id)}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="conv-result">{result}</div>
    </div>
  );
}
