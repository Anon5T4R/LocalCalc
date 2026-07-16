# LocalCalc

Calculadora **100% offline** da suíte Local — "todo SO tem", agora a suíte
também: padrão, científica, programador e conversor de unidades num app leve.

## Recursos

**v0.2**
- **Gráfico de função**: modo dedicado que plota `y = f(x)` (ex.: `sin(x)`,
  `x^2`, `1/x`) num intervalo escolhido, com auto-range vertical e assíntotas
  que quebram a linha (não liga através do infinito) — mesmo motor da conta
- **`ans`**: a última resposta vira variável (`ans*2`, `sqrt(ans)`…)

**v0.1**
- **Padrão + Científica**: expressão livre (digite `2*(3+4)^2` direto),
  precedência correta, menos unário, `sin/cos/tan/asin/…` com **DEG/RAD**,
  `ln/log/log2`, `√`, potência, fatorial, `π`/`e`, memória (MC/MR/M+/M−)
- **Preview ao vivo** enquanto digita; `=` confirma e o resultado continua a
  conta; **histórico** (clicar reusa; persiste)
- **Programador**: HEX/DEC/OCT/BIN simultâneos (clicar copia), literais
  `0x/0o/0b`, `AND OR XOR NOT << >>` (ou `& | ~`), **precisão arbitrária**
  (BigInt — `2^100` de boa)
- **Conversor offline**: comprimento, massa, temperatura, dados, tempo, área,
  volume, velocidade
- Resultado sem ruído binário (`0.1+0.2 = 0.3`), vírgula decimal PT aceita
- Tema claro/escuro/sistema · UI em **PT/EN/ES**

## Stack

Tauri 2 + React 19 + Vite + TypeScript. **Motor de expressão próprio em TS**
(tokenizer + shunting-yard, ~40 testes) — sem mathjs, sem rede; o Rust é só a
casca. O app mais leve da suíte.

## Dev

```bash
npm install
npm run tauri dev   # porta 1464
```

## Release

Tag `vX.Y.Z` → GitHub Actions builda NSIS (Windows) + AppImage (Linux) e
publica a Release. Parte da suíte [Local](https://github.com/Anon5T4R).

## Licença

MIT
