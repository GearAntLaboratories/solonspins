// src/game/OutcomeManager.js
import config from './config.js';

export default class OutcomeManager {
  constructor() {
    this.totalPossibilities = 10000;
    
    // Base Game Outcomes - targeting 82% RTP for 99% total
    this.baseGameOutcomes = [
      // No Win - 55%
      { weight: 5500, type: 'no_win', rtp: 0, description: 'No winning combination' },
      
      // Near Misses - 8.5% (NEW)
      { weight: 550, type: 'near_miss_scatter_2', rtp: 0.2, scatters: 2, description: '2 scatters - near miss' },
      { weight: 300, type: 'near_miss_bonus_2', rtp: 0, bonusSymbols: 2, description: '2 bonus symbols - near miss' },
      
      // Tiny Wins (less than bet) - 10% (NEW)
      { weight: 700, type: 'tiny_win_2_high', rtp: 0.5, minWin: 0.2, maxWin: 0.8, description: '2 high symbols' },
      { weight: 300, type: 'tiny_win_mixed', rtp: 0.6, minWin: 0.3, maxWin: 0.9, description: '2 symbols + wild' },
      
      // Small Wins (0.5x - 2x) - 15%
      { weight: 800, type: 'small_win_3_low', rtp: 0.4, minWin: 0.2, maxWin: 0.8, description: '3 low symbols' },
      { weight: 400, type: 'small_win_3_med', rtp: 0.8, minWin: 0.5, maxWin: 1.5, description: '3 medium symbols' },
      { weight: 300, type: 'small_win_3_high', rtp: 1.2, minWin: 0.8, maxWin: 2.0, description: '3 high symbols' },
      
      // Multi-line Wins - 6% (NEW)
      { weight: 400, type: 'multi_line_small', rtp: 1.8, minWin: 1.0, maxWin: 3.0, description: '2-3 small wins' },
      { weight: 200, type: 'multi_line_mixed', rtp: 3.0, minWin: 2.0, maxWin: 5.0, description: 'mixed symbol wins' },
      
      // Medium Wins (2x - 8x) - 4%
      { weight: 250, type: 'medium_win_4_any', rtp: 4.0, minWin: 2.0, maxWin: 6.0, description: '4 of any symbol' },
      { weight: 150, type: 'medium_win_wild', rtp: 5.0, minWin: 3.0, maxWin: 8.0, description: '3 + wild combinations' },
      
      // Large Wins (8x - 25x) - 1.5%
      { weight: 100, type: 'large_win_5_low', rtp: 8.0, minWin: 5.0, maxWin: 15.0, description: '5 low/medium symbols' },
      { weight: 50, type: 'large_win_5_high', rtp: 15.0, minWin: 10.0, maxWin: 25.0, description: '5 high symbols' },
      
      // Scatter Pays (no bonus trigger) - 0.5% (UPDATED)
      //{ weight: 50, type: 'scatter_pay_2', rtp: 0.2, scatters: 2, description: '2 scatters pay only' },
      
      // Bonus Triggers - 2.5%
      { weight: 150, type: 'free_spins_trigger', rtp: 0, scatters: 3, freeSpins: 10, description: '3+ fire scatters' },
      { weight: 80, type: 'puppy_bonus_3', rtp: 0, bonusSymbols: 3, picks: 3, description: '3 elsi bonus on payline' },
      { weight: 40, type: 'puppy_bonus_4', rtp: 0, bonusSymbols: 4, picks: 4, description: '4 elsi bonus on payline' },
      { weight: 10, type: 'puppy_bonus_5', rtp: 0, bonusSymbols: 5, picks: 5, description: '5 elsi bonus on payline' }
    ];
    
    // Free Spins Outcomes - targeting 10% RTP (no retriggers)
    // Free Spins Outcomes - targeting 10% RTP
this.freeSpinsOutcomes = [
  // No Win - 25% (unchanged)
  { weight: 2500, type: 'no_win', rtp: 0, description: 'No win on free spin' },
  
  // Regular Wins - 45% (reduced from 72%)
  { weight: 2000, type: 'free_small_win', rtp: 0.5, minWin: 1.0, maxWin: 3.0, description: 'Small free spin win' },
  { weight: 1500, type: 'free_medium_win', rtp: 1.5, minWin: 3.0, maxWin: 8.0, description: 'Medium free spin win' },
  { weight: 800, type: 'free_large_win', rtp: 3.0, minWin: 8.0, maxWin: 20.0, description: 'Large free spin win' },
  { weight: 200, type: 'free_huge_win', rtp: 6.0, minWin: 20.0, maxWin: 50.0, description: 'Huge free spin win' },
  
  // Wild Expansion Features - 30% (up from 3%!)
  { weight: 2000, type: 'wild_expand_small', rtp: 2.0, minWin: 5.0, maxWin: 15.0, description: '1-2 reels with expanding wilds' },
  { weight: 800, type: 'wild_expand_medium', rtp: 5.0, minWin: 15.0, maxWin: 40.0, description: '3 reels with expanding wilds' },
  { weight: 200, type: 'wild_expand_large', rtp: 10.0, minWin: 40.0, maxWin: 100.0, description: '4+ reels with expanding wilds' }
];
    
    // Puppy Bonus Prize Pool - targeting 7% RTP (adjusted for better experience)
    this.puppyBonusPrizes = [
      { weight: 2500, type: 'small_credit', multiplier: 2, rtp: 0.5, description: '2x bet credit' },
      { weight: 2000, type: 'medium_credit', multiplier: 3, rtp: 0.6, description: '3x bet credit' },
      { weight: 1500, type: 'good_credit', multiplier: 5, rtp: 0.75, description: '5x bet credit' },
      { weight: 1200, type: 'large_credit', multiplier: 8, rtp: 0.96, description: '8x bet credit' },
      { weight: 1000, type: 'huge_credit', multiplier: 10, rtp: 1.0, description: '10x bet credit' },
      { weight: 1000, type: 'massive_credit', multiplier: 15, rtp: 1.5, description: '15x bet credit' },
      { weight: 600, type: 'mega_credit', multiplier: 25, rtp: 1.5, description: '25x bet credit' },
      { weight: 200, type: 'jackpot_credit', multiplier: 50, rtp: 1.0, description: '50x bet credit' },
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
    
    // Calculate POOP weight - more gradual curve for better experience
    // Starts at 0% for first pick, grows slowly
    const pickRatio = pickNumber / totalPicks;
    adjustedTable[poopIndex].weight = Math.floor(800 * Math.pow(pickRatio, 2));
    
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
    
    // Puppy bonus RTP calculation accounting for average progression
    const puppyRTP = this.puppyBonusPrizes.slice(0, -1).reduce((sum, outcome) => 
      sum + ((outcome.weight / 10000) * outcome.rtp), 0) * 0.85; // Adjusted for POOP probability
    
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