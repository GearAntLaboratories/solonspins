// src/scenes/MainScene.js
import Phaser from 'phaser';
import config from '../game/config';

export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
    this.reelState = 'idle';
    this.symbolSprites = [];
    this.currentBet = 0;
  }
  
  create() {
    console.log('MainScene created');
    
    // Add the reel background first (before the reels)
    this.add.image(640, 360, 'reelBackground').setDepth(0);
    
    // Add debug text
    this.add.text(640, 100, 'MAIN SCENE ACTIVE', {
      fontSize: '32px',
      color: '#FFFFFF'
    }).setOrigin(0.5).setDepth(100);
    
    // Create reels and win line graphics
    this.createSimpleReels();
    this.createWinLineGraphics();

    // Listen for spin events from UI
    this.events.on('spin', this.onSpin, this);
  }
  
  createSimpleReels() {
    console.log('Creating simple reels');
    
    const reelWidth = 150;
    const reelHeight = 150;
    const startX = 390;
    const startY = 200;
    
    // All symbol options for random selection
    const symbolOptions = ['j', 'a', 'k', 'q', 'compass', 'anchor', 'mermaid', 'ship', 'captain', 'chest', 'kraken', 'map', 'pearl'];
    
    // Create a colored grid showing where the reels should be
    for (let reel = 0; reel < config.reels; reel++) {
      this.symbolSprites[reel] = [];
      
      for (let row = 0; row < config.rows; row++) {
        const x = startX + (reel * reelWidth);
        const y = startY + (row * reelHeight);
        
        // Create a colored rectangle for the background with high depth
        const bgColor = 0x333333; // Dark gray
        const bg = this.add.rectangle(x, y, reelWidth - 10, reelHeight - 10, bgColor);
        bg.setStrokeStyle(2, 0xFFFFFF); // White border
        bg.setDepth(1000); 
        
        // Randomly select a symbol
        const symbolType = symbolOptions[Math.floor(Math.random() * symbolOptions.length)];
        
        // Create symbol sprite with fixed dimensions
        const symbol = this.add.sprite(x, y, symbolType);
        
        // IMPORTANT: Force exact display size for ALL symbols
        symbol.setDisplaySize(reelWidth * 0.7, reelHeight * 0.7); // Fixed size for all symbols
        
        symbol.setDepth(1001);
        
        // Store reference
        this.symbolSprites[reel][row] = symbol;
      }
    }
  }
  
  createWinLineGraphics() {
    if (!this.winLineGraphics) {
      this.winLineGraphics = this.add.graphics();
      this.winLineGraphics.setDepth(1500);
    }
  }
  
  // In MainScene.js - Update the spin method to fix symbol size issue
// In MainScene.js - Animated reel movement
spin(bet) {
  if (this.reelState !== 'idle') return;
  
  console.log('Spinning reels with bet:', bet);
  
  // Store the bet amount for win calculation
  this.currentBet = bet;
  
  this.reelState = 'spinning';
  
  // Play spin sound
  if (this.sound.get('spinSound')) {
    this.sound.play('spinSound');
  }
  
  // Clear any previous win lines
  if (this.winLineGraphics) {
    this.winLineGraphics.clear();
  }
  
  // Generate spin result for the final outcome
  const spinResult = this.generateSpinResult();
  
  // Animation configuration
  const reelWidth = 150;
  const reelHeight = 150;
  const startX = 390;
  const startY = 200;
  const symbolsPerReel = 20; // Total symbols to show during the spin
  const moveDelay = 150; // Time between movements (ms)
  const reelDelay = 500; // Delay between reels stopping (ms)
  
  // All possible symbols
  const symbolOptions = ['j', 'a', 'k', 'q', 'compass', 'anchor', 'mermaid', 'ship', 'captain', 'chest', 'kraken', 'map', 'pearl'];
  
  // Store original positions to restore later
  const originalPositions = [];
  for (let reel = 0; reel < config.reels; reel++) {
    originalPositions[reel] = [];
    for (let row = 0; row < config.rows; row++) {
      originalPositions[reel][row] = {
        x: this.symbolSprites[reel][row].x,
        y: this.symbolSprites[reel][row].y
      };
    }
  }
  
  // For each reel, create a sequence that will be shown
  const reelSequences = [];
  for (let reel = 0; reel < config.reels; reel++) {
    const sequence = [];
    
    // Add random symbols for the main part of the spin
    for (let i = 0; i < symbolsPerReel; i++) {
      sequence.push(symbolOptions[Math.floor(Math.random() * symbolOptions.length)]);
    }
    
    // Add the final symbols at the end
    sequence.push(spinResult[reel][0]);
    sequence.push(spinResult[reel][1]);
    sequence.push(spinResult[reel][2]);
    
    reelSequences.push(sequence);
  }
  
  // For each reel, create a set of 4 symbols that will be animated
  const reelSymbols = [];
  for (let reel = 0; reel < config.reels; reel++) {
    reelSymbols[reel] = [];
    
    // Create 4 sprites (1 above visible area, 3 visible)
    for (let i = 0; i < 4; i++) {
      const symbol = this.add.sprite(
        startX + (reel * reelWidth),
        startY - reelHeight + (i * reelHeight),
        symbolOptions[Math.floor(Math.random() * symbolOptions.length)]
      );
      
      symbol.setDisplaySize(reelWidth * 0.7, reelHeight * 0.7);
      symbol.setDepth(1001);
      
      reelSymbols[reel].push(symbol);
    }
  }
  
  // Hide the original symbols
  for (let reel = 0; reel < config.reels; reel++) {
    for (let row = 0; row < config.rows; row++) {
      this.symbolSprites[reel][row].setAlpha(0);
    }
  }
  
  // For each reel, start the spinning animation
  for (let reel = 0; reel < config.reels; reel++) {
    // Calculate how many symbols this reel will show
    const symbolCount = symbolsPerReel + 3 + reel * 5;
    let currentStep = 0;
    
    // Function to move the symbols down one position
    const moveSymbols = () => {
      // Move all symbols down
      for (let i = 0; i < reelSymbols[reel].length; i++) {
        // Create tween for smooth movement
        this.tweens.add({
          targets: reelSymbols[reel][i],
          y: reelSymbols[reel][i].y + reelHeight,
          duration: moveDelay - 20,
          ease: 'Linear'
        });
      }
      
      // After moving, reorganize the symbols
      this.time.delayedCall(moveDelay - 10, () => {
        // Move bottom symbol to top with new texture
        const bottomSymbol = reelSymbols[reel].pop();
        
        // Get the next symbol from the sequence
        const nextIndex = currentStep % reelSequences[reel].length;
        const nextSymbol = reelSequences[reel][nextIndex];
        
        // Update the symbol
        bottomSymbol.setTexture(nextSymbol);
        bottomSymbol.y = startY - reelHeight;
        
        // Add to the beginning of the array
        reelSymbols[reel].unshift(bottomSymbol);
        
        // Increment step counter
        currentStep++;
        
        // Check if we're done spinning this reel
        if (currentStep >= symbolCount) {
          // Play reel stop sound
          if (this.sound.get('spinSound')) {
            this.sound.play('spinSound', { volume: 0.3 });
          }
          
          // Stop this reel's movement
          clearInterval(moveIntervals[reel]);
          
          // Add a bounce effect
          for (let i = 1; i < 4; i++) { // Positions 1, 2, 3 are the visible ones
            this.tweens.add({
              targets: reelSymbols[reel][i],
              y: reelSymbols[reel][i].y + 10,
              duration: 100,
              yoyo: true,
              ease: 'Bounce.easeOut'
            });
          }
          
          // Restore original symbols if this is the last reel
          if (reel === config.reels - 1) {
            this.time.delayedCall(500, () => {
              // Destroy all animated symbols
              for (let r = 0; r < config.reels; r++) {
                for (let s = 0; s < reelSymbols[r].length; s++) {
                  reelSymbols[r][s].destroy();
                }
              }
              
              // Restore original sprites with final textures
              for (let r = 0; r < config.reels; r++) {
                for (let row = 0; row < config.rows; row++) {
                  this.symbolSprites[r][row].setTexture(spinResult[r][row]);
                  this.symbolSprites[r][row].setAlpha(1);
                  this.symbolSprites[r][row].x = originalPositions[r][row].x;
                  this.symbolSprites[r][row].y = originalPositions[r][row].y;
                  this.symbolSprites[r][row].setDisplaySize(reelWidth * 0.7, reelHeight * 0.7);
                }
              }
              
              // Evaluate wins
              this.evaluateWin(spinResult);
            });
          }
        }
      });
    };
    
    // Start the animation loop after a staggered delay
    this.time.delayedCall(reel * 200, () => {
      // Set up interval to move symbols periodically
      moveIntervals[reel] = setInterval(moveSymbols, moveDelay);
    });
    
    // Set up a timeout to force stop after maximum spins (failsafe)
    this.time.delayedCall(moveDelay * symbolCount + reel * 200 + 5000, () => {
      if (moveIntervals[reel]) {
        clearInterval(moveIntervals[reel]);
      }
    });
  }
  
  // Array to track intervals for cleanup
  const moveIntervals = [null, null, null, null, null];
}

  // Original onSpin method (maintained for backward compatibility)
  onSpin(bet) {
    console.log(`Original onSpin triggered with bet ${bet}`);
    
    if (this.reelState !== 'idle') return;
    this.currentBet = bet;

    this.reelState = 'spinning';
    
    // Play spin sound
    if (this.sound.get('spinSound')) {
      this.sound.play('spinSound');
    }
    
    // More elaborate spinning animation with staggered timing
    for (let reel = 0; reel < config.reels; reel++) {
      // Each reel spins longer than the previous one
      const spinDuration = 1500 + (reel * 300);
      
      // Create a tween for each reel
      this.tweens.add({
        targets: this.symbolSprites[reel],
        // Simulate vertical movement
        y: '+=30',
        duration: 200,
        yoyo: true,
        repeat: Math.floor(spinDuration / 400), // Repeat based on duration
        ease: 'Cubic.easeInOut',
        delay: reel * 200, // Staggered start
        onComplete: () => {
          // When the last reel stops, evaluate results
          if (reel === config.reels - 1) {
            this.completeReel();
          }
        }
      });
      
      // Add blur effect during spin
      for (let row = 0; row < config.rows; row++) {
        // Add a motion blur effect by changing alpha
        this.tweens.add({
          targets: this.symbolSprites[reel][row],
          alpha: 0.7,
          duration: 200,
          yoyo: true,
          repeat: Math.floor(spinDuration / 400),
          delay: reel * 200
        });
      }
    }
  }
  
  generateSpinResult() {
    // Create a result array with random symbols
    const result = [];
    const symbolOptions = ['j', 'a', 'k', 'q', 'compass', 'anchor', 'mermaid', 'ship', 'captain', 'chest', 'kraken', 'map', 'pearl'];
    
    for (let reel = 0; reel < config.reels; reel++) {
      result[reel] = [];
      for (let row = 0; row < config.rows; row++) {
        const randomIndex = Math.floor(Math.random() * symbolOptions.length);
        result[reel][row] = symbolOptions[randomIndex];
      }
    }
    
    return result;
  }
  
  evaluateWin(spinResult) {
    this.reelState = 'evaluation';
    
    // Clear any previous win lines
    this.winLineGraphics.clear();
    
    // Evaluate wins based on paylines
    const { totalWin, winningLines } = this.evaluateWins();
    
    // If we have any wins, show them
    if (winningLines.length > 0) {
      // Show win lines
      this.showWinningLines(winningLines);
      
      // Play win sound
      if (this.sound.get('winSound')) {
        this.sound.play('winSound');
      }
      
      // Emit win event to update credits
      this.events.emit('win', { amount: totalWin, lines: winningLines });
    } else {
      // No win
      this.events.emit('win', { amount: 0 });
    }
    
    // After a delay, return to idle state
    this.time.delayedCall(1500, () => {
      this.reelState = 'idle';
      this.events.emit('spinComplete');
    });
  }

  completeReel() {
    // All symbol options for random selection
    const symbolOptions = ['j', 'a', 'k', 'q', 'compass', 'anchor', 'mermaid', 'ship', 'captain', 'chest', 'kraken', 'map', 'pearl'];
    const reelWidth = 150;
    const reelHeight = 150;
    
    // Update symbols
    for (let reel = 0; reel < config.reels; reel++) {
      for (let row = 0; row < config.rows; row++) {
        // Pick a random new symbol
        const symbolType = symbolOptions[Math.floor(Math.random() * symbolOptions.length)];
        this.symbolSprites[reel][row].setTexture(symbolType);
        
        // Reapply the fixed size after changing texture
        this.symbolSprites[reel][row].setDisplaySize(reelWidth * 0.7, reelHeight * 0.7);
      }
    }
    
    // Check for bonus triggers
    const bonusInfo = this.checkBonusTriggers();
    
    // Handle bonus features
    if (bonusInfo.freeSpins) {
      // Play bonus sound
      if (this.sound.get('bonusSound')) {
        this.sound.play('bonusSound');
      }
      
      // Show free spins notification
      this.showFreeSpinsMessage(bonusInfo.freeSpinsCount);
      
      // Launch free spins scene after delay
      this.time.delayedCall(3000, () => {
        this.launchFreeSpins(bonusInfo.freeSpinsCount);
      });
    } 
    else if (bonusInfo.pearlBonus) {
      // Play bonus sound
      if (this.sound.get('bonusSound')) {
        this.sound.play('bonusSound');
      }
      
      // Show pearl bonus notification
      this.showPearlBonusMessage(bonusInfo.pearlBonusPicks);
      
      // Launch pearl bonus scene after delay
      this.time.delayedCall(3000, () => {
        this.launchPearlBonus(bonusInfo.pearlBonusPicks);
      });
    }
    else {
      // Evaluate regular wins
      const { totalWin, winningLines } = this.evaluateWins();
      
      // Highlight winning lines
      if (winningLines.length > 0) {
        // Play win sound
        if (this.sound.get('winSound')) {
          this.sound.play('winSound');
        }
        
        // Show winning lines
        this.showWinningLines(winningLines);
        
        // Highlight winning symbols
        for (const winLine of winningLines) {
          for (const [reel, row] of winLine.symbolPositions) {
            // Make the winning symbol pulse
            this.tweens.add({
              targets: this.symbolSprites[reel][row],
              scaleX: 1.3,
              scaleY: 1.3,
              duration: 300,
              yoyo: true,
              repeat: 3
            });
          }
        }
      }
      
      // Emit win event
      this.events.emit('win', { amount: totalWin, lines: winningLines });
    }
    
    // Return to idle state
    this.reelState = 'idle';
    
    // Signal spin complete
    this.events.emit('spinComplete');
  }
  
  // Evaluate wins based on paylines
  evaluateWins() {
    // Define our 9 paylines
    const paylines = [
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

    // Get the current symbols on the board
    const currentBoard = [];
    for (let reel = 0; reel < config.reels; reel++) {
      currentBoard[reel] = [];
      for (let row = 0; row < config.rows; row++) {
        // Get the current texture key (symbol type)
        currentBoard[reel][row] = this.symbolSprites[reel][row].texture.key;
      }
    }
    console.log("Current board:", currentBoard);

    let totalWin = 0;
    let winningLines = [];

    // Check each payline
    for (let lineIndex = 0; lineIndex < paylines.length; lineIndex++) {
      const line = paylines[lineIndex];
      const lineSymbols = [];
      
      // Get symbols on this payline
      for (let pos = 0; pos < line.length; pos++) {
        const [reel, row] = line[pos];
        lineSymbols.push(currentBoard[reel][row]);
      }
      
      // Check for wins (3+ matching symbols from left to right)
      const firstSymbol = lineSymbols[0];
      let matchCount = 1;
      
      for (let i = 1; i < lineSymbols.length; i++) {
        const currentSymbol = lineSymbols[i];
        
        // Wild symbol (kraken) matches anything
        if (currentSymbol === firstSymbol || currentSymbol === 'kraken' || 
            (firstSymbol === 'kraken' && matchCount === 1)) {
          matchCount++;
        } else {
          break;
        }
      }
      
      // If we have at least 3 matches, it's a win
      if (matchCount >= 3) {
        // Find the matching symbol (could be the first or a wild)
        const matchingSymbol = firstSymbol === 'kraken' && matchCount > 1 ? 
                              lineSymbols[1] : firstSymbol;
                              
        // Look up the symbol's paytable value
        let symbolValue = 0;
        for (const symbol of config.symbols) {
          if (symbol.id === matchingSymbol) {
            symbolValue = symbol.pays[matchCount];
            break;
          }
        }
        
        // Special case for scatter symbol which pays differently
        if (matchingSymbol === 'map') {
          symbolValue = config.scatter.pays[matchCount];
        }
        
        // Calculate win amount based on the bet
        const lineWin = symbolValue * (this.currentBet / config.paylines);
        
        if (lineWin > 0) {
          totalWin += lineWin;
          winningLines.push({
            line: lineIndex,
            symbolPositions: line.slice(0, matchCount),
            symbol: matchingSymbol,
            win: lineWin,
            count: matchCount
          });
        }
      }
    }
    console.log("Total win:", totalWin);
    console.log("Winning lines:", winningLines);
    
    return { totalWin, winningLines };
  }
  
  // Check for bonus triggers
  checkBonusTriggers() {
    // Check for Free Spins trigger (3+ scatter symbols anywhere)
    let scatterCount = 0;
    
    // Count scatter symbols (map)
    for (let reel = 0; reel < config.reels; reel++) {
      for (let row = 0; row < config.rows; row++) {
        if (this.symbolSprites[reel][row].texture.key === 'map') {
          scatterCount++;
        }
      }
    }
    
    // Check for Pearl Bonus trigger (3+ pearl symbols on a payline)
    let pearlCount = 0;
    let maxPearlsOnLine = 0;
    
    // Define paylines (same as in evaluateWins)
    const paylines = [
      // Line 1: Middle row straight
      [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1]],
      // Lines 2-9 (same as in evaluateWins)
      // ...
    ];
    
    // Check each payline for pearls
    for (const line of paylines) {
      let pearls = 0;
      
      for (const [reel, row] of line) {
        if (this.symbolSprites[reel][row].texture.key === 'pearl') {
          pearls++;
        }
      }
      
      maxPearlsOnLine = Math.max(maxPearlsOnLine, pearls);
    }
    
    // Return bonus info
    return {
      freeSpins: scatterCount >= 3 ? true : false,
      freeSpinsCount: scatterCount === 3 ? 8 : scatterCount === 4 ? 12 : scatterCount === 5 ? 15 : 0,
      pearlBonus: maxPearlsOnLine >= 3 ? true : false,
      pearlBonusPicks: maxPearlsOnLine
    };
  }
  
  // Launch free spins bonus
  launchFreeSpins(spins) {
    console.log('About to launch Free Spins with', spins, 'spins');
    
    // Pause current scenes
    this.scene.pause('MainScene');
    console.log('MainScene paused');
    
    this.scene.pause('UIScene');
    console.log('UIScene paused');
    
    // Start free spins scene
    console.log('Launching FreeSpinsScene');
    this.scene.launch('FreeSpinsScene', {
      spins: spins,
      bet: this.currentBet
    });
    console.log('FreeSpinsScene launched');
  }
  
  // Launch pearl collection bonus
  launchPearlBonus(picks) {
    // Pause current scenes
    this.scene.pause('MainScene');
    this.scene.pause('UIScene');
    
    // Start pearl bonus scene
    this.scene.launch('PearlBonusScene', {
      picks: picks,
      bet: this.currentBet
    });
  }
  
  // Callback when free spins bonus completes
  freeSpinsCompleted(totalWin) {
    console.log(`Free Spins completed with win: ${totalWin}`);
    
    // Add win to UI
    if (totalWin > 0) {
      this.events.emit('win', { 
        amount: totalWin, 
        bonusType: 'freeSpins'
      });
    }
    
    // Return to idle state
    this.reelState = 'idle';
    
    // Signal spin complete
    this.events.emit('spinComplete');
  }
  
  // Callback when pearl bonus completes
  pearlBonusCompleted(totalWin) {
    console.log(`Pearl Bonus completed with win: ${totalWin}`);
    
    // Add win to UI
    if (totalWin > 0) {
      this.events.emit('win', { 
        amount: totalWin, 
        bonusType: 'pearlBonus'
      });
    }
    
    // Return to idle state
    this.reelState = 'idle';
    
    // Signal spin complete
    this.events.emit('spinComplete');
  }
  
  // Show winning paylines
  showWinningLines(winningLines) {
    // Define the paylines
    const paylines = [
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
    
    // Define line colors for each payline
    const lineColors = [
      0xFF0000, // red
      0x00FF00, // green
      0x0000FF, // blue
      0xFFFF00, // yellow
      0xFF00FF, // magenta
      0x00FFFF, // cyan
      0xFFAA00, // orange
      0xAAFF00, // lime
      0xFF00AA  // pink
    ];
    
    // Calculate positions for drawing lines
    const reelWidth = 150;
    const reelHeight = 150;
    const startX = 390;
    const startY = 200;
    
    // For each winning line, show the payline with animation
    winningLines.forEach((winLine, idx) => {
      // Get the line index and number of matches
      const lineIndex = winLine.line;
      const matchCount = winLine.count;
      
      // Skip scatter wins (they don't have a payline)
      if (lineIndex === -1) return;
      
      // Get the payline positions
      const line = paylines[lineIndex];
      
      // Get color for this line
      const color = lineColors[lineIndex % lineColors.length];
      
      // Draw line connecting winning symbols
      this.winLineGraphics.lineStyle(3, color, 0.8);
      
      // Start line at first symbol
      const [firstReel, firstRow] = line[0];
      const startPointX = startX + (firstReel * reelWidth);
      const startPointY = startY + (firstRow * reelHeight);
      
      this.winLineGraphics.beginPath();
      this.winLineGraphics.moveTo(startPointX, startPointY);
      
      // Draw line through each matching symbol position
      for (let i = 1; i < matchCount; i++) {
        const [reel, row] = line[i];
        const x = startX + (reel * reelWidth);
        const y = startY + (row * reelHeight);
        this.winLineGraphics.lineTo(x, y);
      }
      
      this.winLineGraphics.strokePath();
      
      // Highlight the winning symbols
      for (let i = 0; i < matchCount; i++) {
        const [reel, row] = line[i];
        const symbolType = this.symbolSprites[reel][row].texture.key;
        
        // Only apply strong pulsing to bonus symbols (wild, scatter, bonus)
        if (symbolType === 'kraken' || symbolType === 'map' || symbolType === 'pearl') {
          // Add stronger pulsing animation to bonus symbols
          this.tweens.add({
            targets: this.symbolSprites[reel][row],
            scale: 1.2,
            duration: 300,
            yoyo: true,
            repeat: 3
          });
        } else {
          // For regular symbols, just add a subtle highlight
          // Create a glowing outline instead of scaling
          const outline = this.add.circle(
            startX + (reel * reelWidth),
            startY + (row * reelHeight), 
            reelWidth/2 - 5, 
            lineColors[lineIndex % lineColors.length], 
            0.3
          ).setDepth(900);
          
          // Animate the outline
          this.tweens.add({
            targets: outline,
            alpha: 0.5,
            duration: 400,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
              outline.destroy();
            }
          });
        }
      }
      
      // Show a label with the win amount
      const labelX = startX + ((line[0][0] + line[matchCount-1][0]) / 2) * reelWidth;
      const labelY = startY - 60; // Above the reels
      
      const winLabel = this.add.text(labelX, labelY, `LINE ${lineIndex + 1}: ${winLine.win.toFixed(2)}`, {
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#FFFFFF',
        stroke: `#${color.toString(16).padStart(6, '0')}`,
        strokeThickness: 4,
        backgroundColor: '#00000088',
        padding: { x: 10, y: 5 }
      }).setOrigin(0.5).setDepth(1600).setAlpha(0);
      
      // Fade in the label
      this.tweens.add({
        targets: winLabel,
        alpha: 1,
        y: labelY - 10,
        duration: 400,
        ease: 'Back.easeOut',
        onComplete: () => {
          // Then fade it out after a delay
          this.tweens.add({
            targets: winLabel,
            alpha: 0,
            y: labelY - 20,
            delay: 1000,
            duration: 400,
            onComplete: () => {
              winLabel.destroy();
            }
          });
        }
      });
    });
  }
  
  // Show free spins message
  showFreeSpinsMessage(spins) {
    const message = this.add.text(640, 360, `FREE SPINS BONUS!\n${spins} FREE SPINS`, {
      fontSize: '32px',
      color: '#FFD700',
      backgroundColor: '#000000',
      padding: { x: 20, y: 10 },
      align: 'center'
    }).setOrigin(0.5).setDepth(2000);
    
    // Remove after 3 seconds
    this.time.delayedCall(3000, () => {
      message.des