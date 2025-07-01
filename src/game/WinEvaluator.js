// src/game/WinEvaluator.js
export default class WinEvaluator {
  constructor(config) {
    this.config = config;
  }

  evaluateWins(boardState, currentBet, multiplier = 1) {
    const paylines = this.config.paylinesDefinition || [];
    let totalWin = 0;
    let winningLines = [];
    const wildSymbolKey = this.config.wild?.id;
    const scatterSymbolKey = this.config.scatter?.id;
    const bonusSymbolKey = this.config.bonus?.id;
    
    // Check each payline for wins
    for (let lineIndex = 0; lineIndex < paylines.length; lineIndex++) {
      const lineCoordinates = paylines[lineIndex];
      const lineSymbols = [];
      const linePositions = [];
      
      for (const pos of lineCoordinates) {
        const [r,w] = pos;
        if (boardState[r]?.[w] !== undefined) {
          lineSymbols.push(boardState[r][w]);
          linePositions.push(pos);
        } else {
          lineSymbols.push(null);
          linePositions.push(pos);
        }
      }
      
      if (lineSymbols.length === 0 || lineSymbols[0] === null || lineSymbols[0] === scatterSymbolKey || lineSymbols[0] === bonusSymbolKey) continue;
      
      let firstSymbol = lineSymbols[0];
      let matchCount = 0;
      let effectiveSymbol = firstSymbol;
      
      for (let i = 0; i < lineSymbols.length; i++) {
        const currentSymbol = lineSymbols[i];
        
        if (i === 0) {
          if (currentSymbol === wildSymbolKey) {
            matchCount++;
            // Look for first non-wild to determine line type
            for (let j = 1; j < lineSymbols.length; j++) {
              if (lineSymbols[j] !== wildSymbolKey && lineSymbols[j] !== scatterSymbolKey && lineSymbols[j] !== bonusSymbolKey) {
                effectiveSymbol = lineSymbols[j];
                break;
              }
            }
            if (effectiveSymbol === wildSymbolKey) {
              effectiveSymbol = wildSymbolKey; // All wilds
            }
          } else {
            matchCount++;
            effectiveSymbol = currentSymbol;
          }
        } else {
          if (currentSymbol === effectiveSymbol || currentSymbol === wildSymbolKey) {
            matchCount++;
          } else {
            break;
          }
        }
      }
      
      // Check for wins (now including 2-symbol wins for high symbols)
      const symbolConfig = effectiveSymbol === wildSymbolKey ? this.config.wild : this.config.symbols.find(s => s.id === effectiveSymbol);
      
      if (symbolConfig?.pays?.[matchCount]) {
        const symbolPay = symbolConfig.pays[matchCount];
        const betPerLine = currentBet / (this.config.paylines || 9);
        const lineWin = symbolPay * betPerLine * multiplier;
        
        if (lineWin > 0) {
          totalWin += lineWin;
          winningLines.push({
            lineIndex: lineIndex,
            symbolPositions: linePositions.slice(0, matchCount),
            symbol: effectiveSymbol,
            winAmount: lineWin,
            count: matchCount
          });
        }
      }
    }
    
    // Check for scatter pays
    let scatterCount = 0;
    let scatterPositions = [];
    for (let r = 0; r < this.config.reels; r++) {
      for (let w = 0; w < this.config.rows; w++) {
        if (boardState[r]?.[w] === scatterSymbolKey) {
          scatterCount++;
          scatterPositions.push([r, w]);
        }
      }
    }
    
    // Scatter pays (including 2 scatters now)
    if (scatterCount >= 2 && this.config.scatter?.pays?.[scatterCount]) {
      let scatterPay = this.config.scatter.pays[scatterCount];
      const scatterWinAmount = scatterPay * currentBet * multiplier;
      
      if (scatterWinAmount > 0) {
        totalWin += scatterWinAmount;
        winningLines.push({
          lineIndex: -1,
          symbolPositions: scatterPositions,
          symbol: scatterSymbolKey,
          winAmount: scatterWinAmount,
          count: scatterCount
        });
      }
    }
    
    return { totalWin, winningLines };
  }

  checkBonusTriggers(boardState, outcome) {
    const scatterId = this.config.scatter?.id;
    const bonusId = this.config.bonus?.id;
    const freeSpinsTriggerCount = this.config.freeSpins?.triggerCount || 3;
    const puppyBonusTriggerCount = this.config.puppyBonus?.triggerCount || 3;
    
    // Count scatters
    let scatterCount = 0;
    for (let r = 0; r < this.config.reels; r++) {
      for (let w = 0; w < this.config.rows; w++) {
        if (boardState[r]?.[w] === scatterId) scatterCount++;
      }
    }
    
    // Check if this is a scatter pay only (no bonus trigger)
    const isScatterPayOnly = outcome && outcome.type === 'scatter_pay_2';

    // Award free spins based on outcome type, not scatter count
    // This ensures scatter pays don't trigger free spins
    const triggersFreeSpin = outcome && outcome.type === 'free_spins_trigger';
    const freeSpinsAwarded = triggersFreeSpin ? 10 : 0; 
    
    // Check for bonus symbols on paylines
    const paylines = this.config.paylinesDefinition || [];
    let maxBonusOnLine = 0;
    
    for (const line of paylines) {
      let bonusOnThisLine = 0;
      let lineMatch = true;
      
      for (let i = 0; i < line.length; i++) {
        const [r,w] = line[i];
        if (boardState[r]?.[w] === bonusId) {
          if(lineMatch) bonusOnThisLine++;
        } else {
          lineMatch = false;
          if (i < puppyBonusTriggerCount) break;
        }
      }
      
      if (bonusOnThisLine >= puppyBonusTriggerCount) {
        maxBonusOnLine = Math.max(maxBonusOnLine, bonusOnThisLine);
      }
    }
    
    const puppyBonusPicks = maxBonusOnLine;
    
    return {
      freeSpins: triggersFreeSpin && !isScatterPayOnly,
      freeSpinsCount: freeSpinsAwarded,
      puppyBonus: maxBonusOnLine >= puppyBonusTriggerCount,
      puppyBonusPicks: puppyBonusPicks
    };
  }
}