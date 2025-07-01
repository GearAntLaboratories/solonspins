// src/utils/spinResultGenerator.js
import config from '../game/config';

export function generateSpinResult(outcomeManager) {
  const result = [];
  const symbolOptions = config.symbols.map(s => s.id)
    .concat([config.wild?.id, config.scatter?.id, config.bonus?.id])
    .filter(Boolean);

  const regularSymbols = config.symbols.map(s => s.id)
    .concat([config.wild?.id])
    .filter(Boolean);

  const scatterId = config.scatter?.id;
  const bonusId = config.bonus?.id;

  for (let reel = 0; reel < config.reels; reel++) {
    result[reel] = [];
    let hasScatter = false;
    let hasBonus = false;
    for (let row = 0; row < config.rows; row++) {
      let chosenSymbol;
      let validSymbol = false;
      let attempts = 0;

      while (!validSymbol && attempts < 20) {
        chosenSymbol = symbolOptions[Math.floor(Math.random() * symbolOptions.length)];

        if (chosenSymbol === scatterId) {
          if (!hasScatter) {
            validSymbol = true;
            hasScatter = true;
          } else {
            chosenSymbol = regularSymbols[Math.floor(Math.random() * regularSymbols.length)];
            validSymbol = true;
          }
        } else if (chosenSymbol === bonusId) {
          if (!hasBonus) {
            validSymbol = true;
            hasBonus = true;
          } else {
            chosenSymbol = regularSymbols[Math.floor(Math.random() * regularSymbols.length)];
            validSymbol = true;
          }
        } else {
          validSymbol = true;
        }

        attempts++;
      }

      if (!validSymbol) {
        chosenSymbol = regularSymbols[Math.floor(Math.random() * regularSymbols.length)];
        console.warn(`SpinResult fallback r${reel}`);
      }

      result[reel][row] = chosenSymbol;
    }
  }

  return result;
}
