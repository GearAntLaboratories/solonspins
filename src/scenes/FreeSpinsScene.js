// Simplified FreeSpinsScene.js
import Phaser from 'phaser';
import config from '../game/config';

export default class FreeSpinsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FreeSpinsScene' });
    this.spinsRemaining = 0;
    this.totalWin = 0;
    this.currentBet = 0;
    this.symbolSprites = [];
    this.expandedWilds = []; // Track which reels have expanded wilds
  }
  
  init(data) {
    console.log('FreeSpinsScene init with data:', data);
    this.spinsRemaining = data.spins || 8;
    this.currentBet = data.bet || 0.09;
    this.totalWin = 0;
    this.expandedWilds = [false, false, false, false, false]; // Reset expanded wilds
  }
  
  create() {
    // Create simple underwater background
    this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000066, 0.8)
      .setOrigin(0);
    
    // Add some simple decorations
    for (let i = 0; i < 10; i++) {
      const x = Phaser.Math.Between(50, 1230);
      const y = Phaser.Math.Between(50, 670);
      this.add.circle(x, y, Phaser.Math.Between(2, 8), 0xFFFFFF, 0.4);
    }
    
    // Title
    this.add.text(640, 50, 'FREE SPINS BONUS', {
      fontSize: '36px',
      color: '#FFD700',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Add 2x multiplier indicator
    this.add.text(640, 95, 'ALL WINS × 1.5', {
      fontSize: '24px',
      color: '#FF9900',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Display remaining spins
    this.spinsText = this.add.text(440, 95, `SPINS: ${this.spinsRemaining}`, {
      fontSize: '24px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    
    // Total win display
    this.winText = this.add.text(840, 95, `WIN: ${this.totalWin.toFixed(2)}`, {
      fontSize: '24px',
      color: '#FFD700'
    }).setOrigin(0.5);
    
    // Create reels
    this.createReels();
    
    // Create win line graphics
    this.winLineGraphics = this.add.graphics();
    this.winLineGraphics.setDepth(1500);
    
    // Define paylines
    this.paylines = [
      // Line 1: Middle row straight
      [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1]],
      // Line 2: Top row straight
      [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
      // Line 3: Bottom row straight
      [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2]],
      // Line 4: V-shape
      [[0, 0], [1, 1], [2, 2], [3, 1], [4, 0]],
      // Line 5: Inverted V-shape
      [[0, 2], [1, 1], [2, 0], [3, 1], [4, 2]],
      // Line 6: W-shape
      [[0, 0], [1, 2], [2, 0], [3, 2], [4, 0]],
      // Line 7: M-shape
      [[0, 2], [1, 0], [2, 2], [3, 0], [4, 2]],
      // Line 8: Zigzag down-up-down
      [[0, 0], [1, 2], [2, 1], [3, 2], [4, 0]],
      // Line 9: Zigzag up-down-up
      [[0, 2], [1, 0], [2, 1], [3, 0], [4, 2]]
    ];
    
    // Auto-start first spin after a delay
    this.time.delayedCall(1500, this.spin, [], this);
  }
  
  createReels() {
    // Create reels with consistent sizes
    const reelWidth = 150;
    const reelHeight = 150;
    const startX = 390;
    const startY = 200;
    
    // Create a container for each reel
    for (let reel = 0; reel < config.reels; reel++) {
      this.symbolSprites[reel] = [];
      
      for (let row = 0; row < config.rows; row++) {
        const x = startX + (reel * reelWidth);
        const y = startY + (row * reelHeight);
        
        // Create reel background
        const bg = this.add.rectangle(x, y, reelWidth - 10, reelHeight - 10, 0x333333, 0.7);
        bg.setStrokeStyle(2, 0x666666);
        bg.setDepth(1000);
        
        // Create symbol sprite with a random symbol
        const symbolOptions = ['j', 'a', 'k', 'q', 'compass', 'anchor', 'mermaid', 'ship', 'captain', 'chest', 'kraken', 'map', 'pearl'];
        const randomSymbol = symbolOptions[Math.floor(Math.random() * symbolOptions.length)];
        
        const symbol = this.add.sprite(x, y, randomSymbol);
        symbol.setDisplaySize(reelWidth * 0.7, reelHeight * 0.7);
        symbol.setDepth(1001);
        
        // Store reference
        this.symbolSprites[reel][row] = symbol;
      }
    }
  }
  
  spin() {
    if (this.spinsRemaining <= 0) return;
    
    console.log('Spinning in free spins bonus');
    
    // Decrement spins
    this.spinsRemaining--;
    this.spinsText.setText(`SPINS: ${this.spinsRemaining}`);
    
    // Reset expanded wilds for this spin
    this.expandedWilds = [false, false, false, false, false];
    
    // Clear any win line displays
    this.winLineGraphics.clear();
    
    // Simulate spinning animation
    const spinDuration = 2000;
    const reelStaggerTime = 200;
    
    // Generate spin result before animation starts
    const spinResult = this.generateSpinResult();
    
    // Play spin sound
    if (this.sound.get('spinSound')) {
      this.sound.play('spinSound');
    }
    
    // Animate each reel
    for (let reel = 0; reel < config.reels; reel++) {
      // Add blur/alpha effect during spin
      for (let row = 0; row < config.rows; row++) {
        this.tweens.add({
          targets: this.symbolSprites[reel][row],
          alpha: 0.5,
          duration: 200,
          yoyo: true,
          repeat: 3,
          delay: reel * reelStaggerTime
        });
      }
      
      // After delay, update with new symbols
      this.time.delayedCall(spinDuration + (reel * reelStaggerTime), () => {
        // Update symbols for this reel
        for (let row = 0; row < config.rows; row++) {
          this.symbolSprites[reel][row].setTexture(spinResult[reel][row]);
          this.symbolSprites[reel][row].setDisplaySize(150 * 0.7, 150 * 0.7); // Maintain consistent size
        }
        
        // Check if this reel has a wild and expand it
        if (spinResult[reel].includes('kraken')) {
          this.expandWild(reel, spinResult);
        }
        
        // If last reel, evaluate win
        if (reel === config.reels - 1) {
          this.time.delayedCall(500, () => {
            this.evaluateWin();
          });
        }
      });
    }
  }
  
  generateSpinResult() {
    // All possible symbol IDs
    const symbolOptions = ['j', 'a', 'k', 'q', 'compass', 'anchor', 'mermaid', 'ship', 'captain', 'chest', 'kraken', 'map', 'pearl'];
    
    // Weight symbols (reduced probability of wilds and scatters to fix issue)
    const weightedOptions = [...symbolOptions];
    
    // Reduce frequency of wilds - add only 1 extra wild
    weightedOptions.push('kraken');
    
    // Generate result
    const result = [];
    for (let reel = 0; reel < config.reels; reel++) {
      result[reel] = [];
      
      for (let row = 0; row < config.rows; row++) {
        // Pick a random symbol
        const randomIndex = Math.floor(Math.random() * weightedOptions.length);
        result[reel][row] = weightedOptions[randomIndex];
      }
    }
    
    // Ensure scatter symbols appear at most once per reel
    // This is typical for traditional slots
    for (let reel = 0; reel < config.reels; reel++) {
      let scatterCount = 0;
      
      // Count scatters on this reel
      for (let row = 0; row < config.rows; row++) {
        if (result[reel][row] === 'map') {
          scatterCount++;
        }
      }
      
      // If more than 1 scatter on this reel, remove extras
      if (scatterCount > 1) {
        // Keep only the first scatter
        let foundFirst = false;
        for (let row = 0; row < config.rows; row++) {
          if (result[reel][row] === 'map') {
            if (foundFirst) {
              // Replace with a random non-scatter, non-wild symbol
              const regularSymbols = ['j', 'a', 'k', 'q', 'compass', 'anchor', 'mermaid', 'ship', 'captain', 'chest'];
              const replacement = regularSymbols[Math.floor(Math.random() * regularSymbols.length)];
              result[reel][row] = replacement;
            } else {
              foundFirst = true;
            }
          }
        }
      }
    }
    
    return result;
  }
  
  expandWild(reelIndex, spinResult) {
    // Mark this reel as having an expanded wild
    this.expandedWilds[reelIndex] = true;
    
    // Update all symbols in this reel to be wilds
    for (let row = 0; row < config.rows; row++) {
      // Set texture to wild
      this.symbolSprites[reelIndex][row].setTexture('kraken');
      // Ensure consistent size
      this.symbolSprites[reelIndex][row].setDisplaySize(150 * 0.7, 150 * 0.7);
      
      // Update the result array to match
      spinResult[reelIndex][row] = 'kraken';
    }
    
    // Add a subtle glow effect behind the expanded wild reel
    const reelWidth = 150;
    const reelHeight = 150 * 3; // Height of entire reel
    const startX = 390 + (reelIndex * reelWidth);
    const startY = 200 + reelHeight/2 - 75; // Center of reel
    
    const glow = this.add.rectangle(
      startX,
      startY,
      reelWidth,
      reelHeight,
      0x00FFFF,
      0.2
    ).setDepth(999);
    
    // Simple pulse animation for the glow
    this.tweens.add({
      targets: glow,
      alpha: 0.4,
      duration: 600,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        glow.destroy();
      }
    });
  }
  
  // Modify the evaluateWin method
evaluateWin() {
  // Get current board state
  const currentBoard = [];
  for (let reel = 0; reel < config.reels; reel++) {
    currentBoard[reel] = [];
    for (let row = 0; row < config.rows; row++) {
      currentBoard[reel][row] = this.symbolSprites[reel][row].texture.key;
    }
  }
  
  // Check for retrigger first (3+ scatters)
  let scatterCount = 0;
  for (let reel = 0; reel < config.reels; reel++) {
    for (let row = 0; row < config.rows; row++) {
      if (currentBoard[reel][row] === 'map') {
        scatterCount++;
      }
    }
  }
  
  // Handle retrigger if applicable
  if (scatterCount >= 3) {
    // Cap total free spins to prevent excessive play
    const maxSpins = 50;
    
    // Calculate extra spins
    let extraSpins = scatterCount === 3 ? 8 : scatterCount === 4 ? 12 : 15;
    
    // Cap if needed
    if (this.spinsRemaining + extraSpins > maxSpins) {
      extraSpins = maxSpins - this.spinsRemaining;
      if (extraSpins <= 0) extraSpins = 0;
    }
    
    // Only show message if actually adding spins
    if (extraSpins > 0) {
      this.spinsRemaining += extraSpins;
      this.showRetriggerMessage(extraSpins);
    }
  }
  
  // Evaluate payline wins
  const { totalWin, winningLines } = this.calculateWins(currentBoard);
  
  // Apply a smaller win multiplier for more reasonable payouts
  // Changes from 2x to 1.5x
  const multipliedWin = totalWin * 1.5;
  
  // Show win lines and animations
  if (winningLines.length > 0) {
    this.showWinningLines(winningLines);
    
    // Play win sound
    if (this.sound.get('winSound')) {
      this.sound.play('winSound');
    }
    
    // Display win amount
    if (multipliedWin > 0) {
      this.showWinMessage(multipliedWin);
    }
    
    // Add to total win
    this.totalWin += multipliedWin;
    this.winText.setText(`WIN: ${this.totalWin.toFixed(2)}`);
  }
  
  // Check if free spins are done
  if (this.spinsRemaining <= 0) {
    // After a delay, end the bonus
    this.time.delayedCall(2500, this.endBonus, [], this);
  } else {
    // Continue with next spin after delay
    this.time.delayedCall(2500, this.spin, [], this);
  }
}


  
  // Update the calculateWins method in FreeSpinsScene.js

// Completely revised calculateWins method
// Completely rewritten wild calculation logic
// Updated calculateWins method to handle SYMBOL followed by WILDs
calculateWins(currentBoard) {
  let totalWin = 0;
  const winningLines = [];
  
  // For debugging
  console.log("Current board:");
  for (let row = 0; row < 3; row++) {
    let rowStr = "";
    for (let reel = 0; reel < 5; reel++) {
      rowStr += currentBoard[reel][row].padEnd(10, ' ');
    }
    console.log(rowStr);
  }
  
  // Check each payline
  for (let lineIndex = 0; lineIndex < this.paylines.length; lineIndex++) {
    const line = this.paylines[lineIndex];
    
    // Get symbols on this payline
    const lineSymbols = line.map(([reel, row]) => currentBoard[reel][row]);
    console.log(`Payline ${lineIndex+1}:`, lineSymbols.join(', '));
    
    // Find first non-wild symbol (if any)
    let firstNonWildIndex = -1;
    let firstNonWildSymbol = null;
    
    for (let i = 0; i < lineSymbols.length; i++) {
      if (lineSymbols[i] !== 'kraken') {
        firstNonWildIndex = i;
        firstNonWildSymbol = lineSymbols[i];
        break;
      }
    }
    
    // If the entire line is wilds, use the highest symbol
    if (firstNonWildIndex === -1) {
      firstNonWildSymbol = 'chest'; // Highest paying regular symbol
    }
    
    // Try each position as a potential starting point for a win
    // This handles cases like SYMBOL, WILD, WILD, WILD, WILD
    for (let startPos = 0; startPos <= firstNonWildIndex; startPos++) {
      // Skip positions beyond the first non-wild (they can't be the start of a win)
      if (startPos > firstNonWildIndex && firstNonWildIndex !== -1) break;
      
      // For startPos before firstNonWildIndex, we need the symbol to evaluate
      let symbolToEvaluate = firstNonWildSymbol;
      
      // Check each regular symbol if we're starting with wilds
      if (startPos < firstNonWildIndex || firstNonWildIndex === -1) {
        const regularSymbols = ['chest', 'captain', 'ship', 'mermaid', 'anchor', 'compass', 'a', 'k', 'q', 'j'];
        
        // Try each regular symbol and find best win
        for (const symbol of regularSymbols) {
          const result = this.checkSymbolWin(lineSymbols, symbol, startPos, line);
          if (result.win > 0) {
            totalWin += result.win;
            winningLines.push(result.winLine);
          }
        }
      } else {
        // We're starting at a non-wild symbol, just check that specific symbol
        const result = this.checkSymbolWin(lineSymbols, symbolToEvaluate, startPos, line);
        if (result.win > 0) {
          totalWin += result.win;
          winningLines.push(result.winLine);
        }
      }
    }
  }
  
  // Separately check for scatter wins
  let scatterCount = 0;
  let scatterPositions = [];
  
  for (let reel = 0; reel < config.reels; reel++) {
    for (let row = 0; row < config.rows; row++) {
      if (currentBoard[reel][row] === 'map') {
        scatterCount++;
        scatterPositions.push([reel, row]);
      }
    }
  }
  
  // If 3+ scatters, add scatter win
  if (scatterCount >= 3) {
    const scatterValue = config.scatter.pays[scatterCount] || 0;
    const scatterWin = scatterValue * this.currentBet;
    
    if (scatterWin > 0) {
      console.log(`Scatter win: ${scatterCount} scatters for ${scatterWin}`);
      totalWin += scatterWin;
      winningLines.push({
        line: -1, // Special indicator for scatter
        symbolPositions: scatterPositions.slice(0, scatterCount),
        symbol: 'map',
        win: scatterWin,
        count: scatterCount
      });
    }
  }
  
  return { totalWin, winningLines };
}

// Helper method to check if a symbol forms a win from a starting position
checkSymbolWin(lineSymbols, symbolToMatch, startPos, line) {
  // Count consecutive matches from startPos
  let matchCount = 0;
  
  for (let i = startPos; i < lineSymbols.length; i++) {
    const currentSymbol = lineSymbols[i];
    
    // If this symbol matches or is a wild, count it
    if (currentSymbol === symbolToMatch || currentSymbol === 'kraken') {
      matchCount++;
    } else {
      break; // Stop at first non-match
    }
  }
  
  // Only consider wins of 3+ symbols
  if (matchCount >= 3) {
    // Find this symbol's pay value
    let payValue = 0;
    for (const symbolConfig of config.symbols) {
      if (symbolConfig.id === symbolToMatch) {
        payValue = symbolConfig.pays[matchCount] || 0;
        break;
      }
    }
    
    // Calculate win
    const win = payValue * (this.currentBet / config.paylines);
    console.log(`Win with ${symbolToMatch} starting at pos ${startPos}: ${matchCount} matches = ${win}`);
    
    return {
      win: win,
      winLine: {
        line: line.indexOf(line),
        symbolPositions: line.slice(startPos, startPos + matchCount),
        symbol: symbolToMatch,
        win: win,
        count: matchCount
      }
    };
  }
  
  return { win: 0, winLine: null };
}
  
  showWinningLines(winningLines) {
    // Clear previous lines
    this.winLineGraphics.clear();
    
    // Use simpler highlighting for winning symbols
    winningLines.forEach(winLine => {
      // Highlight the winning symbols with a simple rectangle
      winLine.symbolPositions.forEach(([reel, row]) => {
        // Calculate position
        const reelWidth = 150;
        const reelHeight = 150;
        const startX = 390;
        const startY = 200;
        const x = startX + (reel * reelWidth);
        const y = startY + (row * reelHeight);
        
        // Add rectangle outline around symbol
        this.winLineGraphics.lineStyle(3, 0xFFFF00, 0.8);
        this.winLineGraphics.strokeRect(x - 55, y - 55, 110, 110);
      });
    });
  }
  
  showWinMessage(amount) {
    // Create simpler win message
    const message = this.add.text(640, 360, `WIN: ${amount.toFixed(2)}`, {
      fontSize: '32px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(2000);
    
    // Simple fade in/out animation
    message.setAlpha(0);
    this.tweens.add({
      targets: message,
      alpha: 1,
      duration: 500,
      yoyo: true,
      hold: 800,
      onComplete: () => {
        message.destroy();
      }
    });
  }
  
  showRetriggerMessage(spins) {
    // Play special sound if available
    if (this.sound.get('bonusSound')) {
      this.sound.play('bonusSound');
    }
    
    // Simple retrigger message
    const message = this.add.text(640, 360, `FREE SPINS RETRIGGERED!\n+${spins} FREE SPINS`, {
      fontSize: '32px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 5,
      align: 'center'
    }).setOrigin(0.5).setDepth(2000);
    
    // Update spins counter
    this.spinsText.setText(`SPINS: ${this.spinsRemaining}`);
    
    // Simple fade in/out animation
    message.setAlpha(0);
    this.tweens.add({
      targets: message,
      alpha: 1,
      duration: 800,
      hold: 1500,
      yoyo: true,
      onComplete: () => {
        message.destroy();
      }
    });
  }
  
  endBonus() {
    console.log('Ending Free Spins bonus with total win:', this.totalWin);
    
    // Show ending message with simpler animation
    const message = this.add.text(640, 360, `FREE SPINS COMPLETED!\nTOTAL WIN: ${this.totalWin.toFixed(2)}`, {
      fontSize: '32px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 5,
      align: 'center',
      backgroundColor: '#000000',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setDepth(2000);
    
    // Play win sound
    if (this.sound.get('winSound')) {
      this.sound.play('winSound');
    }
    
    // After a delay, return to main game
    this.time.delayedCall(3000, () => {
      // Resume main scenes
      this.scene.resume('MainScene');
      this.scene.resume('UIScene');
      
      // Pass data back to main scene
      this.scene.get('MainScene').freeSpinsCompleted(this.totalWin);
      
      // Stop this scene
      this.scene.stop();
    });
  }
}