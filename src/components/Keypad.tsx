import { useCalc } from "../state/store";

/**
 * Teclado por modo. Cada botão insere texto na expressão (o input continua
 * sendo a fonte da verdade — teclado físico funciona igual).
 */

interface Key {
  label: string;
  insert?: string;
  action?: "clear" | "back" | "equals" | "m+" | "m-" | "mr" | "mc" | "deg";
  cls?: string;
  span?: number;
}

const STANDARD: Key[][] = [
  [
    { label: "MC", action: "mc", cls: "fn" },
    { label: "MR", action: "mr", cls: "fn" },
    { label: "M+", action: "m+", cls: "fn" },
    { label: "M−", action: "m-", cls: "fn" },
  ],
  [
    { label: "C", action: "clear", cls: "danger" },
    { label: "(", insert: "(" },
    { label: ")", insert: ")" },
    { label: "⌫", action: "back" },
  ],
  [
    { label: "7", insert: "7" },
    { label: "8", insert: "8" },
    { label: "9", insert: "9" },
    { label: "÷", insert: "/" , cls: "op"},
  ],
  [
    { label: "4", insert: "4" },
    { label: "5", insert: "5" },
    { label: "6", insert: "6" },
    { label: "×", insert: "*", cls: "op" },
  ],
  [
    { label: "1", insert: "1" },
    { label: "2", insert: "2" },
    { label: "3", insert: "3" },
    { label: "−", insert: "-", cls: "op" },
  ],
  [
    { label: "0", insert: "0" },
    { label: ",", insert: "." },
    { label: "=", action: "equals", cls: "eq" },
    { label: "+", insert: "+", cls: "op" },
  ],
];

const SCI_EXTRA: Key[][] = [
  [
    { label: "sin", insert: "sin(", cls: "fn" },
    { label: "cos", insert: "cos(", cls: "fn" },
    { label: "tan", insert: "tan(", cls: "fn" },
    { label: "π", insert: "pi", cls: "fn" },
    { label: "e", insert: "e", cls: "fn" },
  ],
  [
    { label: "ln", insert: "ln(", cls: "fn" },
    { label: "log", insert: "log(", cls: "fn" },
    { label: "√", insert: "sqrt(", cls: "fn" },
    { label: "xʸ", insert: "^", cls: "fn" },
    { label: "n!", insert: "!", cls: "fn" },
  ],
  [
    { label: "asin", insert: "asin(", cls: "fn" },
    { label: "acos", insert: "acos(", cls: "fn" },
    { label: "atan", insert: "atan(", cls: "fn" },
    { label: "x²", insert: "^2", cls: "fn" },
    { label: "%", insert: "%", cls: "fn" },
  ],
];

const PROG: Key[][] = [
  [
    { label: "AND", insert: " and ", cls: "fn" },
    { label: "OR", insert: " or ", cls: "fn" },
    { label: "XOR", insert: " xor ", cls: "fn" },
    { label: "NOT", insert: "not ", cls: "fn" },
  ],
  [
    { label: "<<", insert: " shl ", cls: "fn" },
    { label: ">>", insert: " shr ", cls: "fn" },
    { label: "0x", insert: "0x", cls: "fn" },
    { label: "0b", insert: "0b", cls: "fn" },
  ],
  [
    { label: "A", insert: "A" },
    { label: "B", insert: "B" },
    { label: "C", insert: "C" },
    { label: "D", insert: "D" },
  ],
  [
    { label: "E", insert: "E" },
    { label: "F", insert: "F" },
    { label: "(", insert: "(" },
    { label: ")", insert: ")" },
  ],
  [
    { label: "7", insert: "7" },
    { label: "8", insert: "8" },
    { label: "9", insert: "9" },
    { label: "÷", insert: "/", cls: "op" },
  ],
  [
    { label: "4", insert: "4" },
    { label: "5", insert: "5" },
    { label: "6", insert: "6" },
    { label: "×", insert: "*", cls: "op" },
  ],
  [
    { label: "1", insert: "1" },
    { label: "2", insert: "2" },
    { label: "3", insert: "3" },
    { label: "−", insert: "-", cls: "op" },
  ],
  [
    { label: "0", insert: "0" },
    { label: "⌫", action: "back" },
    { label: "=", action: "equals", cls: "eq" },
    { label: "+", insert: "+", cls: "op" },
  ],
];

function KeyButton({ k }: { k: Key }) {
  const calc = useCalc.getState();
  const angle = useCalc((s) => s.angle);
  const onClick = () => {
    switch (k.action) {
      case "clear": return calc.clear();
      case "back": return calc.backspace();
      case "equals": return calc.equals();
      case "m+": return calc.memAdd(1);
      case "m-": return calc.memAdd(-1);
      case "mr": return calc.memRecall();
      case "mc": return calc.memClear();
      case "deg": return calc.setAngle(angle === "deg" ? "rad" : "deg");
      default: if (k.insert) calc.insert(k.insert);
    }
  };
  const label = k.action === "deg" ? angle.toUpperCase() : k.label;
  return (
    <button className={`key ${k.cls ?? ""}`} onClick={onClick} style={k.span ? { gridColumn: `span ${k.span}` } : undefined}>
      {label}
    </button>
  );
}

export function StandardPad() {
  return (
    <div className="keypad cols-4">
      {STANDARD.flat().map((k, i) => (
        <KeyButton key={i} k={k} />
      ))}
    </div>
  );
}

export function ScientificPad() {
  return (
    <>
      <div className="keypad cols-5 sci">
        <KeyButton k={{ label: "DEG", action: "deg", cls: "fn toggle" }} />
        {SCI_EXTRA.flat().map((k, i) => (
          <KeyButton key={i} k={k} />
        ))}
      </div>
      <div className="keypad cols-4">
        {STANDARD.flat().map((k, i) => (
          <KeyButton key={i} k={k} />
        ))}
      </div>
    </>
  );
}

export function ProgrammerPad() {
  return (
    <div className="keypad cols-4">
      {PROG.flat().map((k, i) => (
        <KeyButton key={i} k={k} />
      ))}
    </div>
  );
}
