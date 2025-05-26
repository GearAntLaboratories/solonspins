// src/scenes/MainScene.js
import Phaser from 'phaser';
import config from '../game/config'; // Ensure correct path
import OutcomeManager from '../game/OutcomeManager';


export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
    this.reelState = 'idle'; // idle, spinning, evaluation, bonus
    this.symbolSprites = [];
    this.reelBackgrounds = []; // Keep this to store individual reel backgrounds
    this.currentBet = 0;
    this.winLineGraphics = null;
    this.spinSequences = [];
    this.compositeMask = null;
    console.log("MainScene constructed");

     // Initialize OutcomeManager
     this.outcomeManager = new OutcomeManager();

    // Explicitly bind handlers (Using Puppy Bonus names)
    this.freeSpinsCompleted = this.freeSpinsCompleted.bind(this);
    this.puppyBonusCompleted = this.puppyBonusCompleted.bind(this);
    console.log("MainScene: Bonus completion handlers bound in constructor.");
    this.reelStartY = 275; // Define reel start position, adjust as needed if logo needs more space
  }

  create() {
    console.log('MainScene: create() started');

    // Add the NEW main background image FIRST, at lowest depth
    this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'main_background')
        .setOrigin(0.5)
        .setDisplaySize(this.cameras.main.width, this.cameras.main.height)
        .setDepth(-1); // Behind everything

    // Add the NEW main logo
    this.add.image(640, 100, 'main_logo').setOrigin(0.5).setDepth(1).setScale(.475); // Adjust Y as needed

    // Remove the OLD 'reelBackground' image that covered the whole area
    // REMOVED: this.add.image(640, 360, 'reelBackground').setDepth(0);

    // Remove the debug text
    // REMOVED: this.add.text(640, 100, 'MAIN SCENE ACTIVE', ...);

    this.createInitialReels(); // This will create the individual reel boxes again
    this.createWinLineGraphics();
    this.createMask();

    console.log("MainScene: Setting up 'spin' event listener.");
    this.events.on('spin', this.spin, this);

    // Listen for GLOBAL bonus completion events (Using Puppy Bonus names)
    console.log("MainScene: Setting up GLOBAL listeners for bonus completion in create().");
    this.sys.events.off('freeSpinsCompleteGlobal', this.freeSpinsCompleted, this);
    this.sys.events.off('puppyBonusCompleteGlobal', this.puppyBonusCompleted, this);
    this.sys.events.on('freeSpinsCompleteGlobal', this.freeSpinsCompleted, this);
    this.sys.events.on('puppyBonusCompleteGlobal', this.puppyBonusCompleted, this);

    // Add registry check for bonus completion (Using Puppy Bonus names)
    this.game.registry.events.on('changedata', (parent, key, data) => {
      if (key === 'bonusCompleted' && data) {
        console.log("MainScene: Registry detected bonus completion:", data);
        if (data.type === 'freeSpins') {
          this.freeSpinsCompleted(data.totalWin);
        } else if (data.type === 'puppyBonus') { // Check for puppyBonus type
          this.puppyBonusCompleted(data.totalWin); // Call puppyBonus handler
        }
        this.game.registry.set('bonusCompleted', null);
      }
    });

    console.log(`MainScene: Listener count for freeSpinsCompleteGlobal: ${this.sys.events.listenerCount('freeSpinsCompleteGlobal')}`);
    console.log(`MainScene: Listener count for puppyBonusCompleteGlobal: ${this.sys.events.listenerCount('puppyBonusCompleteGlobal')}`); // Check puppy event
    if (this.sys.events.listenerCount('freeSpinsCompleteGlobal') === 0 || this.sys.events.listenerCount('puppyBonusCompleteGlobal') === 0) {
        console.error("MainScene: A bonus completion listener failed to attach!");
    }

    console.log("MainScene: create() finished");
  }

  wake() {
    console.log("MainScene: wake() called - scene was resumed");
    if (this.reelState === 'bonus') {
      console.log("MainScene: Detected wake from bonus - restoring visibility");
      this.scene.setVisible(true);

      // Restore visibility of individual reel backgrounds
      for (let r = 0; r < config.reels; r++) {
        if (!this.reelBackgrounds[r]) continue;
        for (let w = 0; w < config.rows; w++) {
          if (this.reelBackgrounds[r][w]) {
            this.reelBackgrounds[r][w].setVisible(true);
          }
        }
      }

      this.applyMaskToAll(); // Re-apply mask
    }
  }
 // DEFINITIVE FIX for runSpinAnimation method
// This ensures the final board symbols end up exactly where they should be

runSpinAnimation(finalBoard, outcome) {
  const spinInterval = 100;
  const baseTotalShifts = 25;
  const reelDelayFactor = 5;
  const reelHeight = 150;
  const reelWidth = 150;
  const symbolDisplaySize = reelWidth * 0.7;
  const startX = 350;
  const startY = this.reelStartY;
  const symbolOptions = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi');
  
  this.applyMaskToAll();
  this.spinSequences = [];
  
 // Inside runSpinAnimation method:

// Create spin sequences with CORRECT final positioning
for (let reel = 0; reel < config.reels; reel++) {
  let reelTotalShifts = baseTotalShifts + reel * reelDelayFactor;
  let seq = [];

  // Determine number of symbols needed for the final display rows + 1 dummy for the final off-screen position
  const finalBlockLength = config.rows + 1;

  // Fill with random symbols, leaving space for the finalBlockLength
  for (let i = 0; i < reelTotalShifts - finalBlockLength; i++) {
      seq.push(symbolOptions[Math.floor(Math.random() * symbolOptions.length)]);
  }

  // Add the finalBoard symbols that will be visible, in the specific order they need to be shifted.
  // To make finalBoard[reel][0] appear on visible row 0, it must be S_SecondLast.
  // To make finalBoard[reel][config.rows-1] appear on visible row (config.rows-1), it must be S_(N+1)thLast.
  // This means we push them in order from last visible row up to first visible row.
  for (let row = config.rows - 1; row >= 0; row--) {
      seq.push(finalBoard[reel][row]); 
      // Example for config.rows = 3:
      // Pushes finalBoard[reel][2] (will become S_(N+1)thLast)
      // Pushes finalBoard[reel][1] (will become S_ThirdLast)
      // Pushes finalBoard[reel][0] (will become S_SecondLast)
  }

  // Add one more dummy symbol. This will be S_Last, which ends up on the off-screen sprite.
  seq.push(symbolOptions[Math.floor(Math.random() * symbolOptions.length)]); // Or a fixed default like symbolOptions[0]

  this.spinSequences[reel] = seq;

  // Sanity check for sequence length
  if (seq.length !== reelTotalShifts) {
      console.error(`Reel ${reel} sequence length mismatch! Expected ${reelTotalShifts}, Got ${seq.length}. Config rows: ${config.rows}, Final block: ${finalBlockLength}`);
  }
}
  
  // Set up sprites for animation (same as before)
  for (let reel = 0; reel < config.reels; reel++) {
    if (!this.symbolSprites[reel]) this.symbolSprites[reel] = [];
    if (this.symbolSprites[reel].length !== config.rows + 1) {
      console.warn(`MainScene Spin: Correcting sprite length for reel ${reel}`);
      this.symbolSprites[reel].forEach(s => s.destroy()); 
      this.symbolSprites[reel] = [];
      
      // Create above-screen sprite
      let x_above = startX + reel * reelWidth;
      let y_above = startY - reelHeight;
      let tex_above = this.spinSequences[reel]?.[0] || symbolOptions[0];
      this.symbolSprites[reel].push(this.add.sprite(x_above, y_above, tex_above)
        .setDisplaySize(symbolDisplaySize, symbolDisplaySize)
        .setDepth(5)
        .setMask(this.compositeMask));
      
      // Create visible sprites with random symbols initially
      for(let row = 0; row < config.rows; row++) {
        let x = startX + reel * reelWidth;
        let y = startY + row * reelHeight;
        let tex = symbolOptions[Math.floor(Math.random() * symbolOptions.length)];
        this.symbolSprites[reel].push(this.add.sprite(x, y, tex)
          .setDisplaySize(symbolDisplaySize, symbolDisplaySize)
          .setDepth(5)
          .setMask(this.compositeMask));
      }
    }
    
    // Set the first symbol in the sequence to the above-screen sprite
    if(this.symbolSprites[reel][0]) {
      this.symbolSprites[reel][0].y = startY - reelHeight;
      let tex = this.spinSequences[reel]?.[0] || symbolOptions[0];
      this.symbolSprites[reel][0].setTexture(tex).setVisible(true).setMask(this.compositeMask);
    }
  }
  
  let reelsFinished = 0;
  const animateReel = (reel, shiftsRemaining) => {
    if (shiftsRemaining <= 0) {
      reelsFinished++;
      if (reelsFinished === config.reels) {
        console.log("MainScene: All reels finished animation.");
        
        // DEBUG: Verify the final positions
        this.time.delayedCall(100, () => {
          const actualBoard = this.getCurrentBoardState();
          console.log("FINAL VERIFICATION:");
          console.log("Expected finalBoard:", finalBoard);
          console.log("Actual board:", actualBoard);
          
          // Check if we have a perfect match
          let perfectMatch = true;
          for (let r = 0; r < config.reels; r++) {
            for (let row = 0; row < config.rows; row++) {
              if (actualBoard[r][row] !== finalBoard[r][row]) {
                console.error(`STILL MISMATCHED [${r}][${row}]: Expected '${finalBoard[r][row]}', Got '${actualBoard[r][row]}'`);
                perfectMatch = false;
              }
            }
          }
          
          if (perfectMatch) {
            console.log("SUCCESS: Perfect symbol match achieved!");
          } else {
            console.error("FAILURE: Symbols still don't match. Force-fixing...");
            // Force-fix any remaining mismatches
            for (let r = 0; r < config.reels; r++) {
              for (let row = 0; row < config.rows; row++) {
                const spriteIndex = 1 + row;
                if (this.symbolSprites[r]?.[spriteIndex] && 
                    this.symbolSprites[r][spriteIndex].texture.key !== finalBoard[r][row]) {
                  console.log(`Force-fixing [${r}][${row}]: ${this.symbolSprites[r][spriteIndex].texture.key} -> ${finalBoard[r][row]}`);
                  this.symbolSprites[r][spriteIndex].setTexture(finalBoard[r][row]);
                }
              }
            }
          }
          
          this.evaluateWin(finalBoard, outcome);
        });
      }
      return;
    }
    
    if(!this.symbolSprites[reel] || this.symbolSprites[reel].length === 0) {
      console.error(`AnimateReel skip reel ${reel}`);
      animateReel(reel, 0);
      return;
    }
    
    this.tweens.add({
      targets: this.symbolSprites[reel],
      y: `+=${reelHeight}`,
      duration: spinInterval,
      ease: 'Linear',
      onComplete: () => {
        let off = this.symbolSprites[reel]?.[this.symbolSprites[reel].length - 1];
        if (!off) {
          animateReel(reel, shiftsRemaining - 1);
          return;
        }
        
        // Get the next symbol from the sequence
        let tex = this.spinSequences[reel]?.shift() || symbolOptions[0];
        off.setTexture(tex)
          .setScale(1)
          .setAlpha(1)
          .setDisplaySize(symbolDisplaySize, symbolDisplaySize)
          .setMask(this.compositeMask);
        off.y = startY - reelHeight;
        
        // Move the bottom sprite to the top
        this.symbolSprites[reel].pop();
        this.symbolSprites[reel].unshift(off);
        animateReel(reel, shiftsRemaining - 1);
      },
      callbackScope: this
    });
  };
  
  for (let reel = 0; reel < config.reels; reel++) {
    animateReel(reel, baseTotalShifts + reel * reelDelayFactor);
  }
}

  createInitialReels() {
    console.log('MainScene: createInitialReels()');
    this.reelBackgrounds = []; // Re-initialize the array
    const reelWidth = 150;
    const reelHeight = 150;
    const startX = 350;
    const startY = this.reelStartY; // Use class property
    const symbolDisplaySize = reelWidth * 0.7;
    const symbolOptions = config.symbols.map(s => s.id).concat([config.wild?.id, config.scatter?.id, config.bonus?.id]).filter(Boolean);

    for (let reel = 0; reel < config.reels; reel++) {
      this.symbolSprites[reel] = [];
      this.reelBackgrounds[reel] = []; // Initialize inner array

      for (let row = 0; row < config.rows; row++) {
        const x = startX + (reel * reelWidth);
        const y = startY + (row * reelHeight);

        // Add back the individual background rectangle for each symbol position
        const bg = this.add.rectangle(x, y, reelWidth - 10, reelHeight - 10, 0x333333, .85); // Adjust color?
        bg.setStrokeStyle(2, 0xFFFFFF); // Adjust border color?
        bg.setDepth(2); // Set depth below symbols but above main background
        this.reelBackgrounds[reel][row] = bg; // Store reference

        const symbolType = symbolOptions[Math.floor(Math.random() * symbolOptions.length)];
        const symbol = this.add.sprite(x, y, symbolType);
        symbol.setDisplaySize(symbolDisplaySize, symbolDisplaySize);
        symbol.setDepth(5); // Ensure symbol depth is higher than bg depth
        this.symbolSprites[reel][row] = symbol;
      }
    }
    // Apply mask after creating sprites
    if (this.compositeMask) {
        this.applyMaskToAll();
    } else {
        console.warn("Mask not ready during createInitialReels, will apply after mask creation.");
    }
  }

  createWinLineGraphics() {
    if (!this.winLineGraphics) {
      this.winLineGraphics = this.add.graphics().setDepth(1500);
    } else {
        this.winLineGraphics.clear();
    }
  }

  createMask() {
     if (this.compositeMask) {
        try { this.compositeMask.destroy(); } catch(e){}
        this.compositeMask = null;
    }
    const reelWidth = 150;
    const reelHeight = 150;
    const startX = 350;
    const startY = this.reelStartY; // Use class property
    const symbolDisplaySize = reelWidth * 0.7;
    let gfx = this.make.graphics({ add: false });
    gfx.fillStyle(0xffffff);
    const maskStartX = startX - (reelWidth / 2);
    const maskTotalWidth = reelWidth * config.reels;

    for (let row = 0; row < config.rows; row++) {
      let maskTopY = (startY + row * reelHeight) - (symbolDisplaySize / 2);
      gfx.fillRect(maskStartX, maskTopY, maskTotalWidth, symbolDisplaySize);
    }
    this.compositeMask = gfx.createGeometryMask();
    console.log("MainScene: Mask created.");
    // Apply mask immediately after creation if sprites exist
    if (this.symbolSprites.length > 0) {
        this.applyMaskToAll();
    }
  }

  spin(bet) {
    if (this.reelState !== 'idle') { 
      console.warn(`MainScene: Spin blocked, state is: ${this.reelState}`); 
      return; 
    }
    console.log(`MainScene: spin() called with bet ${bet}. State changing to 'spinning'.`);
    this.currentBet = bet;
    this.reelState = 'spinning';
    
    if (this.sound.get('spinSound')) { 
      this.sound.play('spinSound'); 
    } else { 
      console.warn("MainScene: spinSound not found."); 
    }
    
    if (this.winLineGraphics) { 
      console.log("MainScene: Clearing win lines."); 
      this.winLineGraphics.clear(); 
    }
    
    this.children.list.slice().forEach(child => { 
      if (child?.getData?.('isWinLabel')) { 
        try { child.destroy(); } catch(e){} 
      } 
    });
    
    // NEW: Get weighted outcome instead of generating random result
    const outcome = this.outcomeManager.getBaseGameOutcome();
    console.log("MainScene: Got weighted outcome:", outcome);
    
    // Generate symbol board based on the outcome
    const symbolBoard = this.generateSymbolBoardFromOutcome(outcome, bet);
    console.log("MainScene: Generated symbol board:", symbolBoard);
    
    // NEW: Use the new runSpinAnimation method
    this.runSpinAnimation(symbolBoard, outcome);
  }

  // NEW METHOD: Generate symbol board from weighted outcome
  generateSymbolBoardFromOutcome(outcome, bet) {
    const board = this.createEmptyBoard();
    
    switch(outcome.type) {
      case 'no_win':
        return this.generateNoWinBoard();
      
      case 'small_win_low':
        return this.generateWinBoard(['j', 'q', 'k', 'a'], 3, outcome, bet);
      
      case 'small_win_mid':
        return this.generateWinBoard(['beer', 'flag'], 3, outcome, bet);
      
      case 'small_win_high':
        return this.generateWinBoard(['pam_mike', 'grant', 'logan', 'nick'], 3, outcome, bet);
      
      case 'medium_win_low':
        return this.generateWinBoard(['beer', 'flag'], 4, outcome, bet);
      
      case 'medium_win_high':
        return this.generateWinBoard(['pam_mike', 'grant', 'logan', 'nick'], 4, outcome, bet);
      
      case 'large_win_low':
        return this.generateWinBoard(['beer', 'flag'], 5, outcome, bet);
      
      case 'large_win_high':
        return this.generateWinBoard(['pam_mike', 'grant', 'logan', 'nick'], 5, outcome, bet);
      
      case 'free_spins_3':
      case 'free_spins_4':
      case 'free_spins_5':
        return this.generateScatterBoard(outcome.scatters);
      
      case 'puppy_bonus_3':
      case 'puppy_bonus_4':
      case 'puppy_bonus_5':
        return this.generateBonusBoard(outcome.bonusSymbols);
      
      default:
        console.warn(`Unknown outcome type: ${outcome.type}`);
        return this.generateRandomBoard();
    }
  }

  // NEW METHOD: Create empty board
  createEmptyBoard() {
    return Array(config.reels).fill().map(() => Array(config.rows).fill(null));
  }

  // NEW METHOD: Generate no-win board
  generateNoWinBoard() {
    const board = this.createEmptyBoard();
    const symbols = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi' && s !== 'loon');
    
    // Ensure no winning combinations exist
    for (let r = 0; r < config.reels; r++) {
      const usedInReel = [];
      for (let row = 0; row < config.rows; row++) {
        // Pick symbols that don't create lines
        let symbol;
        do {
          symbol = symbols[Math.floor(Math.random() * symbols.length)];
        } while (usedInReel.includes(symbol) && usedInReel.length < symbols.length);
        
        board[r][row] = symbol;
        usedInReel.push(symbol);
      }
    }
    
    // Verify no accidental wins
    const wins = this.evaluateWins(board, 1);
    if (wins.totalWin > 0) {
      // If we accidentally created a win, try again (with recursion limit)
      return this.generateNoWinBoard();
    }
    
    return board;
  }

  // NEW METHOD: Generate winning board
  generateWinBoard(symbolPool, matchLength, outcome, bet) {
    const board = this.generateRandomBoard();
    const targetPayline = config.paylinesDefinition[Math.floor(Math.random() * config.paylinesDefinition.length)];
    const symbol = symbolPool[Math.floor(Math.random() * symbolPool.length)];
    
    // Place the winning symbols
    for (let i = 0; i < matchLength; i++) {
      const [reel, row] = targetPayline[i];
      board[reel][row] = symbol;
    }
    
    // Add wilds occasionally for higher outcomes
    if (outcome.rtp > 1.0 && Math.random() < 0.3) {
      const wildPositions = Math.min(2, Math.floor(Math.random() * matchLength));
      for (let i = 0; i < wildPositions; i++) {
        const [reel, row] = targetPayline[i];
        board[reel][row] = 'loon';
      }
    }
    
    return board;
  }

  // NEW METHOD: Generate random board
  generateRandomBoard() {
    const board = this.createEmptyBoard();
    const symbols = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi');
    
    for (let r = 0; r < config.reels; r++) {
      for (let row = 0; row < config.rows; row++) {
        board[r][row] = symbols[Math.floor(Math.random() * symbols.length)];
      }
    }
    return board;
  }

  // NEW METHOD: Generate scatter board
  generateScatterBoard(scatterCount) {
    const board = this.generateRandomBoard();
    let placed = 0;
    
    // Place scatters randomly across the board
    while (placed < scatterCount) {
      const reel = Math.floor(Math.random() * config.reels);
      const row = Math.floor(Math.random() * config.rows);
      
      if (board[reel][row] !== 'fire') {
        board[reel][row] = 'fire';
        placed++;
      }
    }
    
    return board;
  }

  // NEW METHOD: Generate bonus board
  generateBonusBoard(bonusCount) {
    const board = this.generateRandomBoard();
    const payline = config.paylinesDefinition[Math.floor(Math.random() * config.paylinesDefinition.length)];
    
    // Place bonus symbols on a payline
    for (let i = 0; i < bonusCount; i++) {
      const [reel, row] = payline[i];
      board[reel][row] = 'elsi';
    }
    
    return board;
  }

  generateSpinResult() {
    const result = []; const symbolOptions = config.symbols.map(s => s.id).concat([config.wild?.id, config.scatter?.id, config.bonus?.id]).filter(Boolean); const regularSymbols = config.symbols.map(s => s.id).concat([config.wild?.id]).filter(Boolean); const scatterId = config.scatter?.id; const bonusId = config.bonus?.id; for (let reel = 0; reel < config.reels; reel++) { result[reel] = []; let hasScatter = false; let hasBonus = false; for (let row = 0; row < config.rows; row++) { let chosenSymbol; let validSymbol = false; let attempts = 0; while (!validSymbol && attempts < 20) { chosenSymbol = symbolOptions[Math.floor(Math.random() * symbolOptions.length)]; if (chosenSymbol === scatterId) { if (!hasScatter) { validSymbol = true; hasScatter = true; } else { chosenSymbol = regularSymbols[Math.floor(Math.random() * regularSymbols.length)]; validSymbol = true; } } else if (chosenSymbol === bonusId) { if (!hasBonus) { validSymbol = true; hasBonus = true; } else { chosenSymbol = regularSymbols[Math.floor(Math.random() * regularSymbols.length)]; validSymbol = true; } } else { validSymbol = true; } attempts++; } if (!validSymbol) { chosenSymbol = regularSymbols[Math.floor(Math.random() * regularSymbols.length)]; console.warn(`SpinResult fallback r${reel}`); } result[reel][row] = chosenSymbol; } } return result;
  }

  evaluateWin(finalBoard, outcome) {
    // Using Puppy Bonus names here
    if (this.reelState !== 'spinning') { console.warn(`MainScene: evaluateWin called state: ${this.reelState}.`); if (this.reelState !== 'bonus') { this.reelState = 'idle'; this.resetUISceneSpinningFlag(); } return; }
    this.reelState = 'evaluation';// DEBUG: Log what we think the board should be
    console.log("=== BOARD DEBUG ===");
    console.log("Expected finalBoard:", finalBoard);
    
    // DEBUG: Log what's actually on screen
    const actualBoard = this.getCurrentBoardState();
    console.log("Actual board from sprites:", actualBoard);
    
    // DEBUG: Compare them
    for (let r = 0; r < config.reels; r++) {
      for (let w = 0; w < config.rows; w++) {
        if (finalBoard[r][w] !== actualBoard[r][w]) {
          console.error(`MISMATCH at [${r}][${w}]: Expected '${finalBoard[r][w]}', Got '${actualBoard[r][w]}'`);
        }
      }
    }
    console.log("=== END BOARD DEBUG ==="); console.log("MainScene: evaluateWin() -> 'evaluation'.");  console.log("MainScene: Final board:", finalBoard); console.log("MainScene: Outcome:", outcome);const { totalWin, winningLines } = this.evaluateWins(finalBoard); const bonusInfo = this.checkBonusTriggers(finalBoard); console.log("MainScene: Bonus check results:", bonusInfo); let bonusLaunched = false; if (bonusInfo.freeSpins) { bonusLaunched = true; console.log(`MainScene: FS Trigger! Count: ${bonusInfo.freeSpinsCount}`); if (this.sound.get('bonusSound')) this.sound.play('bonusSound'); this.showFreeSpinsMessage(bonusInfo.freeSpinsCount); this.time.delayedCall(2000, () => { this.launchFreeSpins(bonusInfo.freeSpinsCount); }); } else if (bonusInfo.puppyBonus) { bonusLaunched = true; console.log(`MainScene: Puppy Bonus Trigger! Picks: ${bonusInfo.puppyBonusPicks}`); if (this.sound.get('bonusSound')) this.sound.play('bonusSound'); this.showPuppyBonusMessage(bonusInfo.puppyBonusPicks); this.time.delayedCall(2000, () => { this.launchPuppyBonus(bonusInfo.puppyBonusPicks); }); } if (!bonusLaunched) { if (winningLines.length > 0) { console.log(`MainScene: Win! Amount: ${totalWin}.`); this.showWinningLines(winningLines); if (this.sound.get('winSound')) { this.sound.play('winSound'); } else { console.warn("MainScene: winSound not loaded."); } this.events.emit('win', { amount: totalWin, lines: winningLines }); const winDisplayDuration = 1000; console.log(`MainScene: Scheduling state idle in ${winDisplayDuration}ms.`); this.time.delayedCall(winDisplayDuration, () => { if (this.reelState === 'evaluation') { this.reelState = 'idle'; console.log("MainScene: State -> 'idle' after win delay."); this.resetUISceneSpinningFlag(); } else { console.log("MainScene: State wrong in win delay callback."); } }, [], this); } else { console.log("MainScene: No win."); this.events.emit('win', { amount: 0 }); this.reelState = 'idle'; console.log("MainScene: State -> 'idle' (no win)."); this.resetUISceneSpinningFlag(); } } else { console.log("MainScene: Bonus launched."); }
  }

  getCurrentBoardState() {
    const currentBoard = []; for (let reel = 0; reel < config.reels; reel++) { currentBoard[reel] = []; const reelSprites = this.symbolSprites[reel]; const expectedLen = config.rows + 1; if (!reelSprites || reelSprites.length !== expectedLen) { console.error(`MainScene: Reel ${reel} unexpected length ${reelSprites?.length}. Reading fallback.`); if (reelSprites?.length === config.rows) { for (let row = 0; row < config.rows; row++) { currentBoard[reel][row] = reelSprites[row]?.texture.key || '__DEFAULT'; }} else {for (let row = 0; row < config.rows; row++) currentBoard[reel][row] = '__DEFAULT';} } else { for (let row = 0; row < config.rows; row++) { currentBoard[reel][row] = reelSprites[row + 1]?.texture.key || '__DEFAULT'; } } } return currentBoard;
  }

  evaluateWins(boardState) {
    // ... (evaluateWins logic remains the same as previously provided) ...
    const paylines = config.paylinesDefinition || [ [[0,1],[1,1],[2,1],[3,1],[4,1]],[[0,0],[1,0],[2,0],[3,0],[4,0]],[[0,2],[1,2],[2,2],[3,2],[4,2]],[[0,0],[1,1],[2,2],[3,1],[4,0]],[[0,2],[1,1],[2,0],[3,1],[4,2]],[[0,0],[1,2],[2,0],[3,2],[4,0]],[[0,2],[1,0],[2,2],[3,0],[4,2]],[[0,0],[1,2],[2,1],[3,2],[4,0]],[[0,2],[1,0],[2,1],[3,0],[4,2]] ]; let totalWin = 0; let winningLines = []; const wildSymbolKey = config.wild?.id; const scatterSymbolKey = config.scatter?.id; const bonusSymbolKey = config.bonus?.id; for (let lineIndex = 0; lineIndex < paylines.length; lineIndex++) { const lineCoordinates = paylines[lineIndex]; const lineSymbols = []; const linePositions = []; for (const pos of lineCoordinates) { const [r,w] = pos; if (boardState[r]?.[w]!==undefined) { lineSymbols.push(boardState[r][w]); linePositions.push(pos); } else { lineSymbols.push(null); linePositions.push(pos); } } if (lineSymbols.length === 0 || lineSymbols[0] === null || lineSymbols[0] === scatterSymbolKey || lineSymbols[0] === bonusSymbolKey) continue; let firstSymbol = lineSymbols[0]; let matchCount = 0; let effectiveSymbol = firstSymbol; for (let i = 0; i < lineSymbols.length; i++) { const currentSymbol = lineSymbols[i]; if (i === 0) { if (currentSymbol === wildSymbolKey) { matchCount++; for (let j = 1; j < lineSymbols.length; j++) { if (lineSymbols[j] !== wildSymbolKey && lineSymbols[j] !== scatterSymbolKey && lineSymbols[j] !== bonusSymbolKey) { effectiveSymbol = lineSymbols[j]; break; } } if (effectiveSymbol === wildSymbolKey) { effectiveSymbol = wildSymbolKey; /* All wilds */ } } else { matchCount++; effectiveSymbol = currentSymbol; } } else { if (currentSymbol === effectiveSymbol || currentSymbol === wildSymbolKey) { matchCount++; } else { break; } } } const minMatch = 3; if (matchCount >= minMatch) { let symbolPay = 0; const symbolConfig = effectiveSymbol === wildSymbolKey ? config.wild : config.symbols.find(s => s.id === effectiveSymbol); if (symbolConfig?.pays?.[matchCount]) { symbolPay = symbolConfig.pays[matchCount]; } else if(effectiveSymbol === wildSymbolKey && !symbolConfig?.pays) { console.warn(`No explicit payout for ${matchCount}x WILD. Check config.`); symbolPay = 0; } else { console.warn(`No payout for ${matchCount}x ${effectiveSymbol}`); } const betPerLine = this.currentBet / (config.paylines || 9); const lineWin = symbolPay * betPerLine; if (lineWin > 0) { totalWin += lineWin; winningLines.push({ lineIndex: lineIndex, symbolPositions: linePositions.slice(0, matchCount), symbol: effectiveSymbol, winAmount: lineWin, count: matchCount }); } } } let scatterCount = 0; let scatterPositions = []; for (let r = 0; r < config.reels; r++) { for (let w = 0; w < config.rows; w++) { if (boardState[r]?.[w] === scatterSymbolKey) { scatterCount++; scatterPositions.push([r, w]); } } } const minScatter = 3; if (scatterCount >= minScatter && config.scatter?.pays?.[scatterCount]) { let scatterPay = config.scatter.pays[scatterCount]; const scatterWinAmount = scatterPay * this.currentBet; if (scatterWinAmount > 0) { totalWin += scatterWinAmount; winningLines.push({ lineIndex: -1, symbolPositions: scatterPositions, symbol: scatterSymbolKey, winAmount: scatterWinAmount, count: scatterCount }); } } return { totalWin, winningLines };
  }

  checkBonusTriggers(boardState) {
    // ... (checkBonusTriggers logic remains the same as previously provided, using Puppy Bonus name for result property) ...
     const scatterId = config.scatter?.id; const bonusId = config.bonus?.id; const freeSpinsTriggerCount = config.freeSpins?.triggerCount || 3; const puppyBonusTriggerCount = config.puppyBonus?.triggerCount || 3;
     let scatterCount = 0; for (let r = 0; r < config.reels; r++) { for (let w = 0; w < config.rows; w++) { if (boardState[r]?.[w] === scatterId) scatterCount++; } } const freeSpinsAwarded = config.freeSpins?.awards[scatterCount] || 0; const paylines = config.paylinesDefinition || [ [[0,1],[1,1],[2,1],[3,1],[4,1]],[[0,0],[1,0],[2,0],[3,0],[4,0]],[[0,2],[1,2],[2,2],[3,2],[4,2]],[[0,0],[1,1],[2,2],[3,1],[4,0]],[[0,2],[1,1],[2,0],[3,1],[4,2]],[[0,0],[1,2],[2,0],[3,2],[4,0]],[[0,2],[1,0],[2,2],[3,0],[4,2]],[[0,0],[1,2],[2,1],[3,2],[4,0]],[[0,2],[1,0],[2,1],[3,0],[4,2]] ]; let maxBonusOnLine = 0; for (const line of paylines) { let bonusOnThisLine = 0; let lineMatch = true; for (let i = 0; i < line.length; i++) { const [r,w] = line[i]; if (boardState[r]?.[w] === bonusId) { if(lineMatch) bonusOnThisLine++; } else { lineMatch = false; if (i < puppyBonusTriggerCount) break; } } if (bonusOnThisLine >= puppyBonusTriggerCount) {
      maxBonusOnLine = Math.max(maxBonusOnLine, bonusOnThisLine); } } const puppyBonusPicks = maxBonusOnLine; return { freeSpins: scatterCount >= freeSpinsTriggerCount, freeSpinsCount: freeSpinsAwarded, puppyBonus: maxBonusOnLine >= puppyBonusTriggerCount, puppyBonusPicks: puppyBonusPicks };
  }

  launchFreeSpins(spins) {
    console.log(`MainScene: Launching FS with ${spins} spins.`); this.reelState = 'bonus'; this.game.registry.set('bonusCompleted', null); console.log("MainScene: Pausing MainScene & UIScene. Hiding MainScene."); this.scene.pause(); this.scene.pause('UIScene'); this.scene.setVisible(false); 
    // --- MODIFICATION START ---
// Add a small delay (e.g., 10-50ms) before launching the new scene
// this.time.delayedCall(50, () => {
//   if (this.scene.key === 'MainScene') { // Check if scene is still active
//       console.log("MainScene: Delayed launch of FreeSpinsScene");
//       this.scene.launch('FreeSpinsScene', { spins: spins, bet: this.currentBet });
//   } else {
//       console.warn("MainScene was stopped before delayed FreeSpins launch could occur.");
//   }
// }, [], this);
// --- MODIFICATION END ---
     this.scene.launch('FreeSpinsScene', { spins: spins, bet: this.currentBet });
  }

  launchPuppyBonus(picks) { // Using Puppy Bonus name
    console.log(`MainScene: Launching Puppy Bonus with ${picks} picks.`); this.reelState = 'bonus'; this.game.registry.set('bonusCompleted', null); console.log("MainScene: Pausing MainScene & UIScene. Hiding MainScene."); this.scene.pause(); this.scene.pause('UIScene'); this.scene.setVisible(false);
//     // --- MODIFICATION START ---
// // Add a small delay (e.g., 10-50ms) before launching the new scene
// this.time.delayedCall(50, () => {
//   if (this.scene.key === 'MainScene') { // Check if scene is still active
//      console.log("MainScene: Delayed launch of PuppyBonusScene");
//      this.scene.launch('PuppyBonusScene', { picks: picks, bet: this.currentBet });
//   } else {
//      console.warn("MainScene was stopped before delayed PuppyBonus launch could occur.");
//   }
// }, [], this);
// // --- MODIFICATION END ---
 this.scene.launch('PuppyBonusScene', { picks: picks, bet: this.currentBet }); // Launch PuppyBonusScene
  }

  freeSpinsCompleted(totalWin) {
    console.log(`MainScene: GLOBAL 'freeSpinsCompleteGlobal' received. Win: ${totalWin}. State: ${this.reelState}`); if (this.reelState !== 'bonus') { console.warn(`FS complete handler called in wrong state: ${this.reelState}.`); } console.log("MainScene: Ensuring MainScene is visible"); this.scene.setVisible(true); console.log("MainScene: Resuming MainScene."); this.scene.resume();
    // Add back loop to set reel backgrounds visible
    console.log("MainScene: Setting reel BGs visible.");
    for (let r = 0; r < config.reels; r++) {
      if (!this.reelBackgrounds[r]) continue;
      for (let w = 0; w < config.rows; w++) {
        if (this.reelBackgrounds[r][w]) {
          this.reelBackgrounds[r][w].setVisible(true);
        }
      }
    }
    console.log("MainScene: Force applying mask to all sprites"); this.applyMaskToAll(); const uiScene = this.scene.manager.getScene('UIScene'); if (uiScene && this.scene.manager.isPaused('UIScene')) { console.log("MainScene: Resuming UIScene."); this.scene.resume('UIScene'); } else { console.warn(`MainScene: UIScene not found or not paused.`); } if (totalWin > 0) { console.log("MainScene: Emitting 'win' event."); this.events.emit('win', { amount: totalWin, bonusType: 'freeSpins' }); } this.reelState = 'idle'; console.log("MainScene: State -> 'idle' after FS handler."); this.resetUISceneSpinningFlag();
  }

  puppyBonusCompleted(totalWin) { // Using Puppy Bonus name
    console.log(`MainScene: GLOBAL 'puppyBonusCompleteGlobal' received. Win: ${totalWin}. State: ${this.reelState}`); if (this.reelState !== 'bonus') { console.warn(`Puppy Bonus complete handler called in wrong state: ${this.reelState}.`); } console.log("MainScene: Ensuring MainScene is visible"); this.scene.setVisible(true); console.log("MainScene: Resuming MainScene."); this.scene.resume();
    // Add back loop to set reel backgrounds visible
    console.log("MainScene: Setting reel BGs visible.");
     for (let r = 0; r < config.reels; r++) {
      if (!this.reelBackgrounds[r]) continue;
      for (let w = 0; w < config.rows; w++) {
        if (this.reelBackgrounds[r][w]) {
          this.reelBackgrounds[r][w].setVisible(true);
        }
      }
    }
    console.log("MainScene: Force applying mask to all sprites"); this.applyMaskToAll(); const uiScene = this.scene.manager.getScene('UIScene'); if (uiScene && this.scene.manager.isPaused('UIScene')) { console.log("MainScene: Resuming UIScene."); this.scene.resume('UIScene'); } else { console.warn(`MainScene: UIScene not found or not paused.`); } if (totalWin > 0) { console.log("MainScene: Emitting 'win' event for Puppy Bonus."); this.events.emit('win', { amount: totalWin, bonusType: 'puppyBonus' }); } this.reelState = 'idle'; console.log("MainScene: State -> 'idle' after Puppy Bonus handler."); this.resetUISceneSpinningFlag();
  }

  resetUISceneSpinningFlag() {
    console.log("MainScene: Attempting direct reset UIScene.isSpinning"); this.sys.events.emit('spinCompleteGlobal'); console.log("MainScene: Emitted 'spinCompleteGlobal'"); const uiScene = this.scene.manager.getScene('UIScene'); if (uiScene) { if (typeof uiScene.isSpinning !== 'undefined') { console.log(`MainScene: Found UIScene. isSpinning: ${uiScene.isSpinning}. Setting false.`); uiScene.isSpinning = false; if (uiScene.spinButton) { uiScene.spinButton.clearTint(); console.log("MainScene: Cleared spin button tint."); } } else { console.warn("MainScene: UIScene missing 'isSpinning'."); } } else { console.error("MainScene: Could not find UIScene to reset flag!"); }
  }

  applyMaskToAll() {
    console.log("MainScene: applyMaskToAll() called."); if (!this.compositeMask) { console.error("MainScene: Mask missing!"); return; } let spritesMaskedCount = 0; for (let reel = 0; reel < config.reels; reel++) { if (!this.symbolSprites[reel]) { continue; } for (let i = 0; i < this.symbolSprites[reel].length; i++) { const sprite = this.symbolSprites[reel][i]; if (sprite && typeof sprite.setMask === 'function') { sprite.setVisible(true); sprite.setMask(this.compositeMask); spritesMaskedCount++; } } } console.log(`MainScene: Applied mask to ${spritesMaskedCount} sprites.`);
  }

  showWinningLines(winningLines) {
    // Constants for payline visuals
    const NEON_COLORS = [
      0xFFD700, 0x00eaff, 0x6eff7c, 0xfc41a1, 0xff5c0a,
      0xa182fc, 0x1fc1c3, 0xc1fc1e, 0xfcfc1e
    ];
    const PAYLINES = config.paylinesDefinition || [
      [[0,1],[1,1],[2,1],[3,1],[4,1]], [[0,0],[1,0],[2,0],[3,0],[4,0]], [[0,2],[1,2],[2,2],[3,2],[4,2]],
      [[0,0],[1,1],[2,2],[3,1],[4,0]], [[0,2],[1,1],[2,0],[3,1],[4,2]], [[0,0],[1,2],[2,0],[3,2],[4,0]],
      [[0,2],[1,0],[2,2],[3,0],[4,2]], [[0,0],[1,2],[2,1],[3,2],[4,0]], [[0,2],[1,0],[2,1],[3,0],[4,2]]
    ];
    const REEL_WIDTH = 150, REEL_HEIGHT = 150, START_X = 350, START_Y = this.reelStartY;
    const PUCK_RADIUS = 38;
    const OUTSIDE_X = START_X + (4 * REEL_WIDTH) + 140; // Always outside 5th reel
  
    // Clear previous lines and pucks
    this.winLineGraphics.clear();
  
    // Remove old pucks and win labels
    this.children.list.forEach(child => {
      if (child.getData && child.getData('isWinPuck')) child.destroy();
      if (child.getData && child.getData('isWinLabel')) child.destroy();
    });
  
    // Prepare a map to stack win labels by row at OUTSIDE_X
    const rowLabelMap = {}; // key: row number, value: [labels]
  
    winningLines.forEach((winInfo, idx) => {
      // Only show winning lines
      if (winInfo.lineIndex === -1) {
        // Scatter win: highlight scatter symbols and show label
        winInfo.symbolPositions.forEach(([r, w]) => {
          this._drawPuckOverSymbol(r, w, 0xFFD700, PUCK_RADIUS);
        });
        this.showWinLabel(
          `SCATTER: ${winInfo.winAmount.toFixed(2)}`,
          this.cameras.main.centerX,
          START_Y - 55,
          0xFFD700
        );
        return;
      }
  
      // "Neon" color selection
      const color = NEON_COLORS[winInfo.lineIndex % NEON_COLORS.length];
      const payline = PAYLINES[winInfo.lineIndex];
      const points = payline.map(
        ([r, w]) => ({
          x: START_X + (r * REEL_WIDTH),
          y: START_Y + (w * REEL_HEIGHT)
        })
      );
  
      // Draw glow line (underneath)
      this.winLineGraphics.lineStyle(14, color, 0.18);
      this.winLineGraphics.beginPath();
      this.winLineGraphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        this.winLineGraphics.lineTo(points[i].x, points[i].y);
      }
      this.winLineGraphics.strokePath();
  
      // Draw bright core line (on top)
      this.winLineGraphics.lineStyle(5, color, 0.95);
      this.winLineGraphics.beginPath();
      this.winLineGraphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        this.winLineGraphics.lineTo(points[i].x, points[i].y);
      }
      this.winLineGraphics.strokePath();
  
      // Neon "puck" burst over each symbol in the win
      winInfo.symbolPositions.forEach(([r, w]) => {
        this._drawPuckOverSymbol(r, w, color, PUCK_RADIUS);
      });
  
      // Always place win label to the right of 5th reel, aligned with last payline row (not hit symbol)
      const [finalReel, finalRow] = payline[payline.length - 1];
      // We always want finalReel to be 4 (the last reel), but if payline length is shorter, fall back
      const targetRow = typeof finalRow === 'number' ? finalRow : 1; // fallback to row 1 if somehow undefined
      if (!rowLabelMap[targetRow]) rowLabelMap[targetRow] = [];
      rowLabelMap[targetRow].push({
        color,
        amount: winInfo.winAmount,
      });
    });
  
    // Render all stacked win labels at OUTSIDE_X, vertically for each row
    Object.entries(rowLabelMap).forEach(([row, arr]) => {
      const baseY = START_Y + (row * REEL_HEIGHT);
      arr.forEach((info, idx) => {
        // Stack vertically if more than one on the same row
        this.showWinLabel(
          `WIN: ${info.amount.toFixed(2)}`,
          OUTSIDE_X,
          baseY + idx * 32 - (arr.length - 1) * 16, // stack if multiples, centered
          info.color
        );
      });
    });
  }
  


  // Helper: draw a neon puck/glow over a symbol position
  _drawPuckOverSymbol(reel, row, color, radius) {
    // Get sprite position (center of symbol)
    const REEL_WIDTH = 150, REEL_HEIGHT = 150, START_X = 350, START_Y = this.reelStartY;
    const x = START_X + (reel * REEL_WIDTH);
    const y = START_Y + (row * REEL_HEIGHT);

    // Main puck (glow effect)
    const puck = this.add.circle(x, y, radius, color, 0.34)
      .setStrokeStyle(2, 0xffffff, 0.7)
      .setDepth(1550)
      .setData('isWinPuck', true)
      .setAlpha(0);
    // Animate in with a little pop
    this.tweens.add({
      targets: puck,
      alpha: 1,
      scale: { from: 0.85, to: 1.11 },
      yoyo: true,
      duration: 180,
      ease: 'Quad.easeOut'
    });
  }

  showWinLabel(text, x, y, color) {
    // Background rounded rectangle behind the text
    const rectWidth = 130;
    const rectHeight = 36;
    const cornerRadius = 1;
  
    // Draw the darker background with a colored outline
    const rect = this.add.graphics();
    rect.fillStyle(0x111111, 0.96); // darker than before
    rect.lineStyle(3, color, 0.89);
    rect.fillRoundedRect(x - rectWidth/2, y - rectHeight/2, rectWidth, rectHeight, cornerRadius);
    rect.strokeRoundedRect(x - rectWidth/2, y - rectHeight/2, rectWidth, rectHeight, cornerRadius);
    rect.setDepth(1600);
    rect.setAlpha(1);
    rect.setData('isWinLabel', true);
  
    // The win text itself, less bold and no stroke/outline
    const style = {
      fontSize: '20px',
      fontFamily: 'Arial, Helvetica, sans-serif',
      color: '#FFFFFF',
      align: 'center',
      // No fontStyle: 'bold', no stroke, no strokeThickness
      shadow: {
        offsetX: 0, offsetY: 2, color: '#000', blur: 8, fill: true
      }
    };
  
    const label = this.add.text(x, y, text, style)
      .setOrigin(0.5)
      .setDepth(1601)
      .setAlpha(1)
      .setData('isWinLabel', true);
  }
    
  


  showFreeSpinsMessage(spins) {
    const msg = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, `FREE SPINS BONUS!\n${spins} FREE SPINS`, { fontSize: '48px', color: '#FFD700', backgroundColor: '#000000CC', padding: { x: 30, y: 20 }, align: 'center', stroke: '#000000', strokeThickness: 2, fontFamily: 'Arial Black, Arial, sans-serif' }).setOrigin(0.5).setDepth(2000).setScale(0); this.tweens.add({ targets: msg, scale: 1, duration: 500, ease: 'Back.easeOut' }); this.time.delayedCall(2000, () => { if(msg?.scene) { this.tweens.add({ targets: msg, alpha: 0, duration: 300, onComplete: () => { if(msg?.scene) msg.destroy(); } }); } });
  }

  showPuppyBonusMessage(picks) { // Using Puppy Bonus name
    const msg = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, `PUPPY BONUS!\n${picks} PICKS`, { fontSize: '48px', color: '#ADD8E6', backgroundColor: '#000000CC', padding: { x: 30, y: 20 }, align: 'center', stroke: '#654321', strokeThickness: 2, fontFamily: 'Arial Black, Arial, sans-serif' }).setOrigin(0.5).setDepth(2000).setScale(0); this.tweens.add({ targets: msg, scale: 1, duration: 500, ease: 'Back.easeOut' }); this.time.delayedCall(2000, () => { if(msg?.scene) { this.tweens.add({ targets: msg, alpha: 0, duration: 300, onComplete: () => { if(msg?.scene) msg.destroy(); } }); } });
  }

  // --- DEBUG METHODS (Using Puppy Bonus names) ---
  triggerDebugFreeSpins() {
    if (this.reelState !== 'idle') { 
      console.warn("Debug blocked: not idle."); 
      return; 
    } 
    console.log('DEBUG: Triggering FS'); 
    this.reelState = 'evaluation'; 
    
    const scatterId = config.scatter?.id || 'fire'; 
    const needed = config.freeSpins?.triggerCount || 3; 
    const targetRowIndex = 1; 
    const spriteOffset = (this.symbolSprites[0]?.length === config.rows + 1) ? 1 : 0; 
    const physicalRowIndex = targetRowIndex + spriteOffset; 
    
    for (let reel = 0; reel < needed; reel++) { 
      const targetSprite = this.symbolSprites[reel]?.[physicalRowIndex]; 
      if (targetSprite) { 
        targetSprite.setTexture(scatterId); 
        console.log(`DEBUG: Set r${reel} (phys ${physicalRowIndex}) to ${scatterId}`); 
      } else { 
        console.error(`DEBUG FS: Sprite missing r${reel}, phys ${physicalRowIndex}`); 
        this.reelState = 'idle'; 
        return; 
      } 
    } 
    
    const dbgMsg = this.add.text(this.cameras.main.width - 10, 10, 'DEBUG FS', {
      fontSize: '14px', 
      color: '#FF0000', 
      align: 'right'
    }).setOrigin(1, 0).setDepth(3000); 
    
    this.time.delayedCall(2000, () => { 
      if (dbgMsg?.scene) dbgMsg.destroy(); 
    }); 
    
    this.time.delayedCall(100, () => { 
      // Use getCurrentBoardState to read the current sprites
      const finalBoard = this.getCurrentBoardState(); 
      console.log("DEBUG FS Board:", finalBoard); 
      
      // Create a mock outcome for the debug trigger
      const mockOutcome = {
        type: 'free_spins_3',
        scatters: needed,
        freeSpins: config.freeSpins?.awards?.[needed] || 8,
        description: `DEBUG: ${needed} fire scatters`
      };
      
      console.log("DEBUG FS Info:", mockOutcome); 
      
      if (this.sound.get('bonusSound')) this.sound.play('bonusSound'); 
      this.showFreeSpinsMessage(mockOutcome.freeSpins); 
      this.time.delayedCall(2000, () => { 
        this.launchFreeSpins(mockOutcome.freeSpins); 
      }); 
    }); 
  }

  triggerDebugPuppy() { 
    if (this.reelState !== 'idle') { 
      console.warn("Debug blocked: not idle."); 
      return; 
    } 
    console.log('DEBUG: Triggering Puppy Bonus'); 
    this.reelState = 'evaluation'; 
    
    const bonusId = config.bonus?.id || 'elsi'; 
    const needed = config.puppyBonus?.triggerCount || 3;  // Updated from puppyBonus
    const targetRowIndex = 1; 
    const spriteOffset = (this.symbolSprites[0]?.length === config.rows + 1) ? 1 : 0; 
    const physicalRowIndex = targetRowIndex + spriteOffset; 
    
    for (let reel = 0; reel < needed; reel++) { 
      const targetSprite = this.symbolSprites[reel]?.[physicalRowIndex]; 
      if (targetSprite) { 
        targetSprite.setTexture(bonusId); 
        console.log(`DEBUG: Set r${reel} (phys ${physicalRowIndex}) to ${bonusId}`); 
      } else { 
        console.error(`DEBUG Puppy: Sprite missing r${reel}, phys ${physicalRowIndex}`); 
        this.reelState = 'idle'; 
        return; 
      } 
    } 
    
    const dbgMsg = this.add.text(this.cameras.main.width - 10, 30, 'DEBUG Puppy', {
      fontSize: '14px', 
      color: '#00FF00', 
      align: 'right'
    }).setOrigin(1, 0).setDepth(3000); 
    
    this.time.delayedCall(2000, () => { 
      if (dbgMsg?.scene) dbgMsg.destroy(); 
    }); 
    
    this.time.delayedCall(100, () => { 
      // Use getCurrentBoardState to read the current sprites
      const finalBoard = this.getCurrentBoardState(); 
      console.log("DEBUG Puppy Board:", finalBoard); 
      
      // Create a mock outcome for the debug trigger
      const mockOutcome = {
        type: 'puppy_bonus_3',
        bonusSymbols: needed,
        picks: needed, // Picks usually equals trigger count
        description: `DEBUG: ${needed} elsi bonus`
      };
      
      console.log("DEBUG Puppy Info:", mockOutcome); 
      
      if (this.sound.get('bonusSound')) this.sound.play('bonusSound'); 
      this.showPuppyBonusMessage(mockOutcome.picks); 
      this.time.delayedCall(2000, () => { 
        this.launchPuppyBonus(mockOutcome.picks); 
      }); 
    }); 
  }

} // End of MainScene Class