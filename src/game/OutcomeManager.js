// src/game/OutcomeManager.js
import config from './config.js';

export default class OutcomeManager {
  constructor() {
    this.totalPossibilities = 10000;
    
    // Base Game Outcomes - targeting 66.20% RTP
    this.baseGameOutcomes = [
      // No Win - 72%
      { weight: 7200, type: 'no_win', rtp: 0, description: 'No winning combination' },
      
      // Small Wins
      { weight: 1600, type: 'small_win_low', rtp: 0.35, minWin: 0.05, maxWin: 0.5, description: '3 low symbols (J,Q,K,A)' },
      { weight: 400, type: 'small_win_mid', rtp: 0.8, minWin: 0.5, maxWin: 1.0, description: '3 medium symbols (flag, beer)' },
      { weight: 200, type: 'small_win_high', rtp: 1.8, minWin: 1.0, maxWin: 2.0, description: '3 family symbols' },
      
      // Medium Wins
      { weight: 350, type: 'medium_win_low', rtp: 3.0, minWin: 2.0, maxWin: 4.0, description: '4 medium symbols or wild combinations' },
      { weight: 120, type: 'medium_win_high', rtp: 6.0, minWin: 4.0, maxWin: 8.0, description: '4 family symbols or multiple lines' },
      
      // Large Wins
      { weight: 80, type: 'large_win_low', rtp: 12.0, minWin: 8.0, maxWin: 20.0, description: '5 medium symbols or wild combos' },
      { weight: 30, type: 'large_win_high', rtp: 30.0, minWin: 20.0, maxWin: 100.0, description: '5 family symbols or wilds' },
      
      // Bonus Triggers
      { weight: 35, type: 'free_spins_3', rtp: 0, scatters: 3, freeSpins: 8, description: '3 fire scatters' },
      { weight: 8, type: 'free_spins_4', rtp: 0, scatters: 4, freeSpins: 12, description: '4 fire scatters' },
      { weight: 2, type: 'free_spins_5', rtp: 0, scatters: 5, freeSpins: 15, description: '5 fire scatters' },
      { weight: 100, type: 'puppy_bonus_3', rtp: 0, bonusSymbols: 3, picks: 3, description: '3 elsi bonus on payline' },
      { weight: 30, type: 'puppy_bonus_4', rtp: 0, bonusSymbols: 4, picks: 4, description: '4 elsi bonus on payline' },
      { weight: 15, type: 'puppy_bonus_5', rtp: 0, bonusSymbols: 5, picks: 5, description: '5 elsi bonus on payline' }
    ];
    
    // Free Spins Outcomes - targeting 13.20% RTP
    this.freeSpinsOutcomes = [
      // No Win - 35%
      { weight: 3500, type: 'no_win', rtp: 0, description: 'No win on free spin' },
      
      // Regular Wins
      { weight: 3500, type: 'free_small_win', rtp: 0.75, minWin: 0.5, maxWin: 2.0, description: 'Small free spin win' },
      { weight: 2000, type: 'free_medium_win', rtp: 2.0, minWin: 2.0, maxWin: 6.0, description: 'Medium free spin win' },
      { weight: 800, type: 'free_large_win', rtp: 4.0, minWin: 6.0, maxWin: 15.0, description: 'Large free spin win' },
      { weight: 200, type: 'free_huge_win', rtp: 10.0, minWin: 15.0, maxWin: 40.0, description: 'Huge free spin win' },
      
      // Wild Expansion Features
      { weight: 200, type: 'wild_expand_small', rtp: 2.5, minWin: 4.0, maxWin: 12.0, description: '1-2 reels with expanding wilds' },
      { weight: 50, type: 'wild_expand_medium', rtp: 7.5, minWin: 12.0, maxWin: 30.0, description: '3 reels with expanding wilds' },
      { weight: 10, type: 'wild_expand_large', rtp: 20.0, minWin: 30.0, maxWin: 100.0, description: '4+ reels with expanding wilds' },
      
      // Retrigger
      { weight: 10, type: 'retrigger_3', rtp: 0, scatters: 3, additionalSpins: 8, description: 'Retrigger with 3 scatters' },
      { weight: 5, type: 'retrigger_4_5', rtp: 0, scatters: 4, additionalSpins: 12, description: 'Retrigger with 4-5 scatters' }
    ];
    
    // Puppy Bonus Prize Pool - targeting 17.35% RTP
    this.puppyBonusPrizes = [
      { weight: 2800, type: 'small_credit', multiplier: 1, rtp: 0.28, description: '1x bet credit' },
      { weight: 2500, type: 'medium_credit', multiplier: 2, rtp: 0.5, description: '2x bet credit' },
      { weight: 1800, type: 'good_credit', multiplier: 3, rtp: 0.54, description: '3x bet credit' },
      { weight: 1400, type: 'large_credit', multiplier: 5, rtp: 0.7, description: '5x bet credit' },
      { weight: 900, type: 'huge_credit', multiplier: 8, rtp: 0.72, description: '8x bet credit' },
      { weight: 400, type: 'massive_credit', multiplier: 15, rtp: 0.6, description: '15x bet credit' },
      { weight: 150, type: 'mega_credit', multiplier: 25, rtp: 0.375, description: '25x bet credit' },
      { weight: 50, type: 'jackpot_credit', multiplier: 50, rtp: 0.25, description: '50x bet credit' },
      { weight: 0, type: 'poop', multiplier: 0, rtp: 0, description: 'POOP! - ends bonus' }
    ];
  }
  
  /**
   * Selects a weighted outcome from the given table
   * @param {Array} outcomeTable - Array of outcome objects with weight property
   * @returns {Object} Selected outcome
   */
  selectOutcome(outcomeTable) {
    const totalWeight = outcomeTable.reduce((sum, outcome) => sum + outcome.weight, 0);
    const random = Math.floor(Math.random() * totalWeight);
    
    let currentWeight = 0;
    for (const outcome of outcomeTable) {
      currentWeight += outcome.weight;
      if (random < currentWeight) {
        return outcome;
      }
    }
    // Fallback to first outcome (should never reach here)
    return outcomeTable[0];
  }
  
  /**
   * Gets a base game outcome
   * @returns {Object} Base game outcome
   */
  getBaseGameOutcome() {
    return this.selectOutcome(this.baseGameOutcomes);
  }
  
  /**
   * Gets a free spins outcome
   * @returns {Object} Free spins outcome
   */
  getFreeSpinOutcome() {
    return this.selectOutcome(this.freeSpinsOutcomes);
  }
  
  /**
   * Gets a puppy bonus outcome with dynamic POOP probability
   * @param {number} pickNumber - Current pick number (1, 2, 3...)
   * @param {number} totalPicks - Total picks available
   * @returns {Object} Puppy bonus outcome
   */
  getPuppyBonusOutcome(pickNumber, totalPicks) {
    // Create a copy of the prizes table
    const adjustedTable = [...this.puppyBonusPrizes];
    const poopIndex = adjustedTable.findIndex(p => p.type === 'poop');
    
    // Calculate POOP weight based on pick progression
    // Starts at 0% for first pick, grows progressively
    adjustedTable[poopIndex].weight = Math.floor(1200 * Math.pow(pickNumber / totalPicks, 1.5));
    
    return this.selectOutcome(adjustedTable);
  }
  
  /**
   * Gets all symbol IDs from config for validation
   * @returns {Array} Array of symbol IDs
   */
  getSymbolIds() {
    const baseSymbols = config.symbols.map(s => s.id);
    const specialSymbols = [config.wild.id, config.scatter.id, config.bonus.id];
    return [...baseSymbols, ...specialSymbols];
  }
  
  /**
   * Validates if a symbol ID exists in config
   * @param {string} symbolId - Symbol ID to validate
   * @returns {boolean} True if symbol exists
   */
  isValidSymbol(symbolId) {
    return this.getSymbolIds().includes(symbolId);
  }
  
  /**
   * Gets symbol category (high, medium, low) from config
   * @param {string} symbolId - Symbol ID
   * @returns {string} Symbol category or 'special'
   */
  getSymbolCategory(symbolId) {
    if (symbolId === config.wild.id || symbolId === config.scatter.id || symbolId === config.bonus.id) {
      return 'special';
    }
    
    // Determine category based on pay values
    const symbol = config.symbols.find(s => s.id === symbolId);
    if (!symbol) return 'unknown';
    
    const pay3 = symbol.pays[3];
    if (pay3 >= 6) return 'high';
    if (pay3 >= 3) return 'medium';
    return 'low';
  }
  
  /**
   * Debug method to calculate expected RTPs
   * @returns {Object} Expected RTP breakdown
   */
  calculateExpectedRTPs() {
    const baseRTP = this.baseGameOutcomes.reduce((sum, outcome) => 
      sum + ((outcome.weight / this.totalPossibilities) * outcome.rtp), 0);
    
    const freeSpinRTP = this.freeSpinsOutcomes.reduce((sum, outcome) => 
      sum + ((outcome.weight / this.totalPossibilities) * outcome.rtp), 0);
    
    // Note: Puppy bonus RTP is more complex due to dynamic POOP weights
    // This gives a rough estimate assuming average pick progression
    const puppyRTP = this.puppyBonusPrizes.slice(0, -1).reduce((sum, outcome) => 
      sum + ((outcome.weight / 10000) * outcome.rtp), 0) * 0.7; // Rough adjustment for POOP
    
    return {
      baseGame: baseRTP,
      freeSpins: freeSpinRTP,
      puppyBonus: puppyRTP,
      total: baseRTP + freeSpinRTP + puppyRTP
    };
  }
}

// Export convenience methods for direct import if needed
export const getSymbolIds = () => {
  const baseSymbols = config.symbols.map(s => s.id);
  const specialSymbols = [config.wild.id, config.scatter.id, config.bonus.id];
  return [...baseSymbols, ...specialSymbols];
};