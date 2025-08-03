// src/game/BoardGenerator.js
import WinEvaluator from './WinEvaluator.js';

export default class BoardGenerator {
  constructor(outcomeManager, config) {
    this.outcomeManager = outcomeManager;
    this.config = config;
    this.winEvaluator = new WinEvaluator(config);
  }

  // Main entry point - generates symbol board based on outcome
  generateSymbolBoardFromOutcome(outcome, bet) {
    const board = this.createEmptyBoard();
    
    switch(outcome.type) {
      case 'no_win':
        return this.generateNoWinBoard();
      
      // Near misses
      case 'near_miss_scatter_2':
        return this.generateNearMissScatterBoard();
      case 'near_miss_bonus_2':
        return this.generateNearMissBonusBoard();
      
      // Tiny wins
      case 'tiny_win_2_high':
        return this.generateTinyWinBoard(['pam_mike', 'grant'], outcome, bet);
      case 'tiny_win_mixed':
        return this.generateTinyWinMixedBoard(outcome, bet);
      
      // Small wins
      case 'small_win_3_low':
        return this.generateWinBoard(['j', 'q', 'k', 'a'], 3, outcome, bet);
      case 'small_win_3_med':
        return this.generateWinBoard(['beer', 'flag'], 3, outcome, bet);
      case 'small_win_3_high':
        return this.generateWinBoard(['pam_mike', 'grant', 'logan', 'nick'], 3, outcome, bet);
      
      // Multi-line wins
      case 'multi_line_small':
        return this.generateMultiLineBoard(2, 3, outcome, bet);
      case 'multi_line_mixed':
        return this.generateMultiLineBoard(3, 4, outcome, bet);
      
      // Medium wins
      case 'medium_win_4_any':
        return this.generateWinBoard(['j', 'q', 'k', 'a', 'beer', 'flag', 'pam_mike', 'grant'], 4, outcome, bet);
      case 'medium_win_wild':
        return this.generateWildWinBoard(outcome, bet);
      
      // Large wins
      case 'large_win_5_low':
        return this.generateWinBoard(['j', 'q', 'k', 'a', 'beer', 'flag'], 5, outcome, bet);
      case 'large_win_5_high':
        return this.generateWinBoard(['pam_mike', 'grant', 'logan', 'nick'], 5, outcome, bet);
      
      // Scatter pays
      case 'scatter_pay_2':
        return this.generateScatterPayBoard(outcome.scatters);
      
      // Bonus triggers
      case 'free_spins_trigger':
        return this.generateScatterBoard(3);
      case 'puppy_bonus_3':
      case 'puppy_bonus_4':
      case 'puppy_bonus_5':
        return this.generateBonusBoard(outcome.bonusSymbols);
      
      default:
        console.warn(`Unknown outcome type: ${outcome.type}`);
        return this.generateRandomBoard();
    }
  }

  createEmptyBoard() {
    return Array(this.config.reels).fill().map(() => Array(this.config.rows).fill(null));
  }

  generateNoWinBoard() {
    const board = this.createEmptyBoard();
    const symbols = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi');
    
    // Include wilds occasionally but ensure no wins
    for (let r = 0; r < this.config.reels; r++) {
      const usedInReel = [];
      for (let row = 0; row < this.config.rows; row++) {
        let symbol;
        // 3% chance for wild in no-win boards
        if (Math.random() < 0.03 && r > 0) { // No wilds on reel 0 to prevent wild lines
          symbol = 'loon';
        } else {
          do {
            symbol = symbols[Math.floor(Math.random() * symbols.length)];
          } while (usedInReel.includes(symbol) && usedInReel.length < symbols.length - 1);
        }
        
        board[r][row] = symbol;
        usedInReel.push(symbol);
      }
    }
    
    // Claude suggested addition on 2025-07-01: Add anticipation teaser symbols
    this.addAnticipationTeasers(board);
    
    // Verify no accidental wins - use a default bet for validation
    const wins = this.evaluateWins(board, 10);
    if (wins.totalWin > 0) {
      // If we accidentally created a win, try again
      return this.generateNoWinBoard();
    }
    
    return board;
  }

  generateWinBoard(symbolPool, matchLength, outcome, bet) {
    // Start with controlled board
    const board = this.createEmptyBoard();
    const symbols = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi' && s !== 'loon');
    
    // Fill with non-winning symbols
    for (let r = 0; r < this.config.reels; r++) {
      for (let row = 0; row < this.config.rows; row++) {
        board[r][row] = symbols[Math.floor(Math.random() * symbols.length)];
      }
    }
    
    // Place the intended win
    const targetPayline = this.config.paylinesDefinition[Math.floor(Math.random() * this.config.paylinesDefinition.length)];
    const symbol = symbolPool[Math.floor(Math.random() * symbolPool.length)];
    
    // Place the winning symbols
    for (let i = 0; i < matchLength; i++) {
      const [reel, row] = targetPayline[i];
      board[reel][row] = symbol;
    }
    
    // Add wilds occasionally for higher outcomes (but controlled)
    if (outcome.rtp > 1.0 && Math.random() < 0.3 && matchLength < 5) {
      const wildPosition = Math.floor(Math.random() * matchLength);
      const [reel, row] = targetPayline[wildPosition];
      board[reel][row] = 'loon';
    }
    
    // Ensure no extension beyond intended length
    if (matchLength < 5) {
      const [nextReel, nextRow] = targetPayline[matchLength];
      const otherSymbols = symbols.filter(s => s !== symbol);
      board[nextReel][nextRow] = otherSymbols[Math.floor(Math.random() * otherSymbols.length)];
    }
    
    // Claude suggested addition on 2025-07-01: Add anticipation teaser symbols for winning spins too
    this.addAnticipationTeasers(board);
    
    // Verify win is within expected range
    const wins = this.evaluateWins(board, bet);
    const winMultiplier = wins.totalWin / bet;
    
    if (outcome.minWin && outcome.maxWin) {
      if (winMultiplier < outcome.minWin || winMultiplier > outcome.maxWin) {
        // Try again if outside range
        return this.generateWinBoard(symbolPool, matchLength, outcome, bet);
      }
    }
    
    return board;
  }

  generateRandomBoard() {
    const board = this.createEmptyBoard();
    const symbols = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi');
    
    for (let r = 0; r < this.config.reels; r++) {
      for (let row = 0; row < this.config.rows; row++) {
        // 5% chance for wild in random boards
        if (Math.random() < 0.05) {
          board[r][row] = 'loon';
        } else {
          board[r][row] = symbols[Math.floor(Math.random() * symbols.length)];
        }
      }
    }
    
    // Claude suggested addition on 2025-07-01: Add anticipation teasers to random boards too
    this.addAnticipationTeasers(board);
    
    return board;
  }

  generateScatterBoard(scatterCount) {
    const board = this.generateRandomBoard();
    
    // Clear any scatters that may have been randomly placed
    for (let r = 0; r < this.config.reels; r++) {
      for (let row = 0; row < this.config.rows; row++) {
        if (board[r][row] === 'fire') {
          const symbols = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi');
          board[r][row] = symbols[Math.floor(Math.random() * symbols.length)];
        }
      }
    }
    
    // Now place scatters correctly (one per reel max)
    const reels = [0, 1, 2, 3, 4];
    for (let i = reels.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [reels[i], reels[j]] = [reels[j], reels[i]];
    }
    
    for (let i = 0; i < scatterCount; i++) {
      const reel = reels[i];
      const row = Math.floor(Math.random() * this.config.rows);
      board[reel][row] = 'fire';
    }
    
    return board;
  }

  generateBonusBoard(bonusCount) {
    const board = this.generateRandomBoard();
    const payline = this.config.paylinesDefinition[Math.floor(Math.random() * this.config.paylinesDefinition.length)];
    
    // Place bonus symbols on a payline
    for (let i = 0; i < bonusCount; i++) {
      const [reel, row] = payline[i];
      board[reel][row] = 'elsi';
    }
    
    return board;
  }

  generateNearMissScatterBoard() {
    const board = this.generateRandomBoard();
    
    // Place exactly 2 scatters on different reels
    const reels = [0, 1, 2, 3, 4];
    // Shuffle reels array
    for (let i = reels.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [reels[i], reels[j]] = [reels[j], reels[i]];
    }
    
    // Take first 2 reels for scatter placement
    for (let i = 0; i < 2; i++) {
      const reel = reels[i];
      const row = Math.floor(Math.random() * this.config.rows);
      
      // Clear any existing scatters on this reel first
      for (let r = 0; r < this.config.rows; r++) {
        if (board[reel][r] === 'fire') {
          const symbols = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi');
          board[reel][r] = symbols[Math.floor(Math.random() * symbols.length)];
        }
      }
      
      // Place the scatter
      board[reel][row] = 'fire';
    }
    
    return board;
  }

  generateNearMissBonusBoard() {
    const board = this.generateRandomBoard();
    const payline = this.config.paylinesDefinition[Math.floor(Math.random() * this.config.paylinesDefinition.length)];
    
    // Place exactly 2 bonus symbols on first 2 positions of a payline
    board[payline[0][0]][payline[0][1]] = 'elsi';
    board[payline[1][0]][payline[1][1]] = 'elsi';
    
    // Make sure the 3rd position is NOT a bonus symbol
    if (board[payline[2][0]][payline[2][1]] === 'elsi') {
      const symbols = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi');
      board[payline[2][0]][payline[2][1]] = symbols[Math.floor(Math.random() * symbols.length)];
    }
    
    return board;
  }

  generateTinyWinBoard(symbolPool, outcome, bet) {
    // Start with empty board to have full control
    const board = this.createEmptyBoard();
    const symbols = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi' && s !== 'loon');
    
    // Fill board with non-winning symbols first
    for (let r = 0; r < this.config.reels; r++) {
      for (let row = 0; row < this.config.rows; row++) {
        board[r][row] = symbols[Math.floor(Math.random() * symbols.length)];
      }
    }
    
    // Now place our intended tiny win
    const targetPayline = this.config.paylinesDefinition[Math.floor(Math.random() * this.config.paylinesDefinition.length)];
    const symbol = symbolPool[Math.floor(Math.random() * symbolPool.length)];
    
    // Place only 2 matching symbols
    board[targetPayline[0][0]][targetPayline[0][1]] = symbol;
    board[targetPayline[1][0]][targetPayline[1][1]] = symbol;
    
    // Ensure 3rd position is different to prevent extending the win
    const otherSymbols = symbols.filter(s => s !== symbol);
    board[targetPayline[2][0]][targetPayline[2][1]] = otherSymbols[Math.floor(Math.random() * otherSymbols.length)];
    
    // Claude suggested addition on 2025-07-01: Add anticipation teasers
    this.addAnticipationTeasers(board);
    
    // Verify the win is within expected range
    const wins = this.evaluateWins(board, bet);
    const winMultiplier = wins.totalWin / bet;
    
    if (winMultiplier < outcome.minWin || winMultiplier > outcome.maxWin) {
      // Try again if win is outside expected range
      return this.generateTinyWinBoard(symbolPool, outcome, bet);
    }
    
    return board;
  }

  generateTinyWinMixedBoard(outcome, bet) {
    // Start with empty board to have full control
    const board = this.createEmptyBoard();
    const symbols = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi' && s !== 'loon');
    
    // Fill board with non-winning symbols first
    for (let r = 0; r < this.config.reels; r++) {
      for (let row = 0; row < this.config.rows; row++) {
        board[r][row] = symbols[Math.floor(Math.random() * symbols.length)];
      }
    }
    
    // Pick a high value symbol and a payline
    const highSymbols = ['pam_mike', 'grant'];
    const symbol = highSymbols[Math.floor(Math.random() * highSymbols.length)];
    const targetPayline = this.config.paylinesDefinition[Math.floor(Math.random() * this.config.paylinesDefinition.length)];
    
    // Place 1 symbol and 1 wild to make 2-of-a-kind
    board[targetPayline[0][0]][targetPayline[0][1]] = symbol;
    board[targetPayline[1][0]][targetPayline[1][1]] = 'loon';
    
    // Ensure 3rd position is different and not a wild
    const otherSymbols = symbols.filter(s => s !== symbol);
    board[targetPayline[2][0]][targetPayline[2][1]] = otherSymbols[Math.floor(Math.random() * otherSymbols.length)];
    
    // Make sure no other symbols on this payline can extend the win
    for (let i = 3; i < targetPayline.length; i++) {
      const [r, row] = targetPayline[i];
      if (board[r][row] === symbol || board[r][row] === 'loon') {
        board[r][row] = otherSymbols[Math.floor(Math.random() * otherSymbols.length)];
      }
    }
    
    // Claude suggested addition on 2025-07-01: Add anticipation teasers
    this.addAnticipationTeasers(board);
    
    // Verify the win is within expected range
    const wins = this.evaluateWins(board, bet);
    const winMultiplier = wins.totalWin / bet;
    
    if (winMultiplier < outcome.minWin || winMultiplier > outcome.maxWin) {
      // Try again if win is outside expected range
      return this.generateTinyWinMixedBoard(outcome, bet);
    }
    
    return board;
  }

  generateMultiLineBoard(minLines, maxLines, outcome, bet) {
    // Start with controlled board
    const board = this.createEmptyBoard();
    const symbols = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi' && s !== 'loon');
    
    // Fill with non-winning symbols
    for (let r = 0; r < this.config.reels; r++) {
      for (let row = 0; row < this.config.rows; row++) {
        board[r][row] = symbols[Math.floor(Math.random() * symbols.length)];
      }
    }
    
    const numLines = Math.floor(Math.random() * (maxLines - minLines + 1)) + minLines;
    const usedPaylines = [];
    
    // Select random paylines
    const availablePaylines = [...Array(this.config.paylinesDefinition.length).keys()];
    for (let i = 0; i < numLines && availablePaylines.length > 0; i++) {
      const idx = Math.floor(Math.random() * availablePaylines.length);
      usedPaylines.push(availablePaylines[idx]);
      availablePaylines.splice(idx, 1);
    }
    
    // Create wins on selected paylines
    for (const paylineIdx of usedPaylines) {
      const payline = this.config.paylinesDefinition[paylineIdx];
      const symbolPool = i => {
        if (i === 0) return ['j', 'q', 'k', 'a']; // Low symbols for first line
        if (i === 1) return ['beer', 'flag']; // Medium for second
        return ['pam_mike', 'grant', 'logan', 'nick']; // High for third+
      };
      
      const symbolsToUse = symbolPool(usedPaylines.indexOf(paylineIdx));
      const symbol = symbolsToUse[Math.floor(Math.random() * symbolsToUse.length)];
      const matchCount = Math.random() < 0.7 ? 3 : 4;
      
      for (let i = 0; i < matchCount; i++) {
        board[payline[i][0]][payline[i][1]] = symbol;
      }
      
      // Ensure win doesn't extend
      if (matchCount < 5) {
        const [nextReel, nextRow] = payline[matchCount];
        const otherSymbols = symbols.filter(s => s !== symbol);
        board[nextReel][nextRow] = otherSymbols[Math.floor(Math.random() * otherSymbols.length)];
      }
    }
    
    // Claude suggested addition on 2025-07-01: Add anticipation teasers
    this.addAnticipationTeasers(board);
    
    // Verify win is within expected range
    const wins = this.evaluateWins(board, bet);
    const winMultiplier = wins.totalWin / bet;
    
    if (winMultiplier < outcome.minWin || winMultiplier > outcome.maxWin) {
      // Try again if outside range
      return this.generateMultiLineBoard(minLines, maxLines, outcome, bet);
    }
    
    return board;
  }

  generateWildWinBoard(outcome, bet) {
    // Start with controlled board
    const board = this.createEmptyBoard();
    const symbols = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi' && s !== 'loon');
    
    // Fill with non-winning symbols
    for (let r = 0; r < this.config.reels; r++) {
      for (let row = 0; row < this.config.rows; row++) {
        board[r][row] = symbols[Math.floor(Math.random() * symbols.length)];
      }
    }
    
    // Pick a symbol and create a win with wild substitution
    const winSymbols = ['beer', 'flag', 'pam_mike', 'grant', 'logan', 'nick'];
    const symbol = winSymbols[Math.floor(Math.random() * winSymbols.length)];
    const targetPayline = this.config.paylinesDefinition[Math.floor(Math.random() * this.config.paylinesDefinition.length)];
    
    // Decide on 3 or 4 symbol win
    const baseCount = Math.random() < 0.6 ? 3 : 4;
    
    // Place symbols with exactly one wild
    const wildPosition = Math.floor(Math.random() * baseCount);
    for (let i = 0; i < baseCount; i++) {
      if (i === wildPosition) {
        board[targetPayline[i][0]][targetPayline[i][1]] = 'loon';
      } else {
        board[targetPayline[i][0]][targetPayline[i][1]] = symbol;
      }
    }
    
    // Ensure win doesn't extend beyond intended length
    if (baseCount < 5) {
      const [nextReel, nextRow] = targetPayline[baseCount];
      const otherSymbols = symbols.filter(s => s !== symbol);
      board[nextReel][nextRow] = otherSymbols[Math.floor(Math.random() * otherSymbols.length)];
    }
    
    // Claude suggested addition on 2025-07-01: Add anticipation teasers
    this.addAnticipationTeasers(board);
    
    // Verify win is within expected range
    const wins = this.evaluateWins(board, bet);
    const winMultiplier = wins.totalWin / bet;
    
    if (winMultiplier < outcome.minWin || winMultiplier > outcome.maxWin) {
      // Try again if outside range
      return this.generateWildWinBoard(outcome, bet);
    }
    
    return board;
  }

  generateScatterPayBoard(scatterCount) {
    const board = this.generateRandomBoard();
    
    // Ensure we don't try to place more scatters than reels
    scatterCount = Math.min(scatterCount, this.config.reels);
    
    // Select random reels for scatter placement
    const reels = [0, 1, 2, 3, 4];
    // Shuffle reels array
    for (let i = reels.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [reels[i], reels[j]] = [reels[j], reels[i]];
    }
    
    // Place one scatter on each selected reel
    for (let i = 0; i < scatterCount; i++) {
      const reel = reels[i];
      const row = Math.floor(Math.random() * this.config.rows);
      
      // Clear any existing scatters on this reel first
      for (let r = 0; r < this.config.rows; r++) {
        if (board[reel][r] === 'fire') {
          const symbols = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi');
          board[reel][r] = symbols[Math.floor(Math.random() * symbols.length)];
        }
      }
      // Place the scatter
      board[reel][row] = 'fire';
    }
    
    return board;
  }

  // Claude suggested addition on 2025-07-01: Add anticipation teaser symbols to improve game feel
  addAnticipationTeasers(board) {
    // Add single fire symbol for anticipation (15% chance)
    // Never add if outcome already contains fire symbols to avoid conflicts
    if (Math.random() < 0.15) {
      // Count existing fire symbols to ensure we don't exceed 1
      let fireCount = 0;
      for (let r = 0; r < this.config.reels; r++) {
        for (let row = 0; row < this.config.rows; row++) {
          if (board[r][row] === 'fire') fireCount++;
        }
      }
      
      // Only add fire if none exist (prevents accidental near-miss)
      if (fireCount === 0) {
        const reel = Math.floor(Math.random() * this.config.reels);
        const row = Math.floor(Math.random() * this.config.rows);
        board[reel][row] = 'fire';
      }
    }
    
    // Add 1-2 elsi symbols for anticipation (12% chance)
    // Place in non-payline positions to avoid accidental bonus triggers
    if (Math.random() < 0.12) {
      // Count existing elsi symbols
      let elsiCount = 0;
      for (let r = 0; r < this.config.reels; r++) {
        for (let row = 0; row < this.config.rows; row++) {
          if (board[r][row] === 'elsi') elsiCount++;
        }
      }
      
      // Only add elsi if none exist
      if (elsiCount === 0) {
        const maxElsiToAdd = Math.random() < 0.7 ? 1 : 2; // 70% chance for 1, 30% for 2
        
        for (let attempts = 0; attempts < maxElsiToAdd && attempts < 10; attempts++) {
          const reel = Math.floor(Math.random() * this.config.reels);
          const row = Math.floor(Math.random() * this.config.rows);
          
          // Check if this position would create a payline trigger
          let wouldTriggerPayline = false;
          for (const payline of this.config.paylinesDefinition) {
            let elsiOnPayline = 0;
            for (const [paylineReel, paylineRow] of payline) {
              if ((paylineReel === reel && paylineRow === row) || board[paylineReel][paylineRow] === 'elsi') {
                elsiOnPayline++;
              }
            }
            if (elsiOnPayline >= 3) { // Would trigger bonus
              wouldTriggerPayline = true;
              break;
            }
          }
          
          // Only place if it won't trigger a bonus
          if (!wouldTriggerPayline && board[reel][row] !== 'elsi') {
            board[reel][row] = 'elsi';
          }
        }
      }
    }
  }

  // Use WinEvaluator for win validation
  evaluateWins(boardState, bet) {
    return this.winEvaluator.evaluateWins(boardState, bet);
  }
}