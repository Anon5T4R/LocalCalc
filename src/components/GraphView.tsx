import { useMemo, useRef, useState } from "react";
import { evaluate, plotFunction } from "../lib/engine";
import { t } from "../lib/i18n";
import { useCalc } from "../state/store";

const W = 640;
const H = 420;
const SAMPLES = 400;

interface Trace {
  x: number;
  y: number;
  px: number; // 0..W
  py: number; // 0..H
}

/** Formatação curta pros eixos/trace: até 5 dígitos, sem zeros à toa. */
function formatAxis(v: number): string {
  if (!Number.isFinite(v)) return "—";
  return String(Number(v.toPrecision(5)));
}

/** Modo gráfico: plota y = f(x) no intervalo, com auto-range vertical. */
export default function GraphView() {
  const angle = useCalc((s) => s.angle);
  const [expr, setExpr] = useState("sin(x)");
  const [xMin, setXMin] = useState(-10);
  const [xMax, setXMax] = useState(10);
  const [trace, setTrace] = useState<Trace | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { path, yMin, yMax, error } = useMemo(() => {
    if (!expr.trim() || xMax <= xMin) {
      return { path: "", yMin: -1, yMax: 1, error: null as string | null };
    }
    try {
      // No modo gráfico o ângulo é sempre RAD (convenção de f(x) matemática).
      const pts = plotFunction(expr, xMin, xMax, SAMPLES, "rad");
      const ys = pts.filter((p) => p.y !== null).map((p) => p.y!);
      if (ys.length === 0) return { path: "", yMin: -1, yMax: 1, error: t("graph.noPoints") };
      let lo = Math.min(...ys);
      let hi = Math.max(...ys);
      if (lo === hi) {
        lo -= 1;
        hi += 1;
      }
      const pad = (hi - lo) * 0.08;
      lo -= pad;
      hi += pad;
      const sx = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
      const sy = (y: number) => H - ((y - lo) / (hi - lo)) * H;
      // Segmentos separados por gaps (null) — não liga através de assíntota.
      let d = "";
      let pen = false;
      for (const p of pts) {
        if (p.y === null) {
          pen = false;
          continue;
        }
        d += `${pen ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)} `;
        pen = true;
      }
      return { path: d.trim(), yMin: lo, yMax: hi, error: null };
    } catch (e) {
      return { path: "", yMin: -1, yMax: 1, error: String(e) };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expr, xMin, xMax, angle]);

  const axisX = xMin < 0 && xMax > 0 ? ((0 - xMin) / (xMax - xMin)) * W : null;
  const axisY = yMin < 0 && yMax > 0 ? H - ((0 - yMin) / (yMax - yMin)) * H : null;

  // Trace: mapeia o cursor → x de dados, avalia f(x) e posiciona a cruz.
  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || !expr.trim() || xMax <= xMin) return;
    const rect = svg.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    if (fx < 0 || fx > 1) return setTrace(null);
    const x = xMin + fx * (xMax - xMin);
    let y: number;
    try {
      y = evaluate(expr, "rad", { x });
    } catch {
      return setTrace(null);
    }
    if (!Number.isFinite(y)) return setTrace(null);
    const py = H - ((y - yMin) / (yMax - yMin)) * H;
    setTrace({ x, y, px: fx * W, py });
  }

  return (
    <div className="graph">
      <div className="graph-controls">
        <label className="field grow">
          <span>{t("graph.fx")}</span>
          <input className="mono" value={expr} spellCheck={false} onChange={(e) => setExpr(e.target.value)} />
        </label>
        <label className="field small">
          <span>{t("graph.xmin")}</span>
          <input type="number" value={xMin} onChange={(e) => setXMin(Number(e.target.value))} />
        </label>
        <label className="field small">
          <span>{t("graph.xmax")}</span>
          <input type="number" value={xMax} onChange={(e) => setXMax(Number(e.target.value))} />
        </label>
      </div>

      <div className="graph-canvas">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="graph-svg"
          onMouseMove={onMove}
          onMouseLeave={() => setTrace(null)}
        >
          {axisX !== null && (
            <line x1={axisX} y1={0} x2={axisX} y2={H} stroke="var(--border)" strokeWidth="1" />
          )}
          {axisY !== null && (
            <line x1={0} y1={axisY} x2={W} y2={axisY} stroke="var(--border)" strokeWidth="1" />
          )}
          {path && <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
          {trace && (
            <g pointerEvents="none">
              <line x1={trace.px} y1={0} x2={trace.px} y2={H} stroke="var(--muted)" strokeWidth="1" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
              <circle cx={trace.px} cy={trace.py} r={4} fill="var(--accent)" vectorEffect="non-scaling-stroke" />
            </g>
          )}
        </svg>
        {error && <div className="graph-error">{error}</div>}
        <div className="graph-yrange muted small">
          {trace
            ? `x = ${formatAxis(trace.x)}   y = ${formatAxis(trace.y)}`
            : `y ∈ [${yMin.toFixed(2)}, ${yMax.toFixed(2)}]`}
        </div>
      </div>
    </div>
  );
}
