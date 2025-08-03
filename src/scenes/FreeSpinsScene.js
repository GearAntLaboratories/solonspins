// src/scenes/FreeSpinsScene.js
import Phaser from 'phaser';
import config from '../game/config';
import OutcomeManager from '../game/OutcomeManager';
import WinEvaluator from '../game/WinEvaluator';
import WinDisplayManager from '../ui/WinDisplayManager';

export default class FreeSpinsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FreeSpinsScene' });
    this.spinsRemaining = 0;
    this.initialSpins = 0;
    this.totalWin = 0;
    this.currentBet = 0;
    this.symbolSprites = [];
    this.expandedWilds = [false, false, false, false, false]; // Tracks which reels HAVE expanded
    this.reelsToExpand = []; // Tracks which reels SHOULD expand based on outcome
    this.winLineGraphics = null;
    this.spinSequences = [];
    this.compositeMask = null;
    this.spinState = 'idle'; // idle, spinning, evaluation, transitioning, ending
    this.reelStartY = 295; // Match MainScene positioning

    // Claude suggested addition on 2025-06-08: Inferno Reel enhancement system
    this.infernoReels = [false, false, false, false, false]; // Tracks which reels are on fire this spin
    this.emberParticles = []; // Active ember particles
    this.infernoBackgrounds = []; // Fire background overlays
    this.emberTimingController = null; // Controls ember sequence timing
    this.predeterminedOutcome = null; // Pre-determined outcome for ember targeting

    // Initialize OutcomeManager, WinEvaluator, and WinDisplayManager
    this.outcomeManager = new OutcomeManager();
    this.winEvaluator = new WinEvaluator(config);
    this.winDisplayManager = new WinDisplayManager(this);
  }

  init(data) {
    console.log('FreeSpinsScene init:', data);
    this.spinsRemaining = data.spins || 10; // Changed to 10 default
    this.initialSpins = data.spins || 10;
    this.currentBet = data.bet || config.defaultBet;
    this.totalWin = 0;
    this.spinState = 'idle';
    this.expandedWilds = [false, false, false, false, false];
    this.reelsToExpand = [];
    this.minimumWinGuaranteed = this.currentBet * 5; // Minimum 5x bet win
    
    // Claude suggested addition on 2025-06-08: Reset Inferno Reel system
    this.infernoReels = [false, false, false, false, false];
    this.predeterminedOutcome = null;
    this.cleanupEmberSystem();
  }

  create() {
    console.log('FreeSpinsScene create');

    this.children.removeAll();
    if (this.winLineGraphics) {
      this.winLineGraphics.clear();
      this.winLineGraphics.destroy();
      this.winLineGraphics = null;
    }
    
    // Clear any previous win displays using WinDisplayManager
    this.winDisplayManager.clearWinDisplays();
    
    // Reset total win
    this.totalWin = 0;
    
    // Claude suggested fix on 2025-07-05: Ensure state is properly reset for second entry
    this.spinState = 'idle';

    this.createNewBackground();

    this.add.image(640, 110, 'freespins_logo')
        .setOrigin(0.5)
        .setScale(0.4)
        .setDepth(1);
    
    this.sound.play('music_bonus_freespins_loop', { loop: true });
    

    this.spinsText = this.add.text(420, 195, `FREE SPINS LEFT: ${this.spinsRemaining}`, {
        fontSize: '24px', color: '#FFFFFF', backgroundColor: '#00000088',
        padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(100);

    this.winText = this.add.text(900, 195, `TOTAL WIN: ${this.totalWin.toFixed(2)}`, {
        fontSize: '24px', color: '#FFD700', backgroundColor: '#00000088',
        padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(100);

    this.createMask(); // Create the mask geometry BEFORE creating reels
    this.createInitialReels(); // Create the actual symbols
    this.createWinLineGraphics();
    this.applyMaskToAll(); // Apply the created mask AFTER symbols exist

    // Claude suggested addition on 2025-06-08: Start ambient ember system
    this.createAmbientEmbers();

    this.time.delayedCall(1500, this.startNextSpin, [], this);
  }

  createNewBackground() {
    this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'freespins_background')
        .setOrigin(0.5)
        .setDisplaySize(this.cameras.main.width, this.cameras.main.height)
        .setDepth(-1);
  }

  createInitialReels() {
    console.log('FS createInitialReels');
    const rW = 150, rH = 150, sX = 350, sY = this.reelStartY, dS = rW * 0.7;
    const symbolOptions = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi' && s !== 'loon');

    this.symbolSprites.forEach(reel => reel?.forEach(s => s?.destroy()));
    this.symbolSprites = [];

    for (let r = 0; r < config.reels; r++) {
        this.symbolSprites[r] = [];
        for (let w = 0; w < config.rows; w++) {
            const x = sX + r * rW;
            const y = sY + w * rH;
            this.add.rectangle(x, y, rW - 10, rH - 10, 0x8B4513, .7)
                .setStrokeStyle(2, 0xD2691E)
                .setDepth(10);
            const sT = symbolOptions[Math.floor(Math.random() * symbolOptions.length)];
            const s = this.add.sprite(x, y, sT)
                .setDisplaySize(dS, dS)
                .setDepth(11);
            this.symbolSprites[r][w] = s;
        }
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
    console.log("FS createMask called.");
    const rW = 150, rH = 150, sX = 350, sY = this.reelStartY, dS = rW * 0.7;
    if (this.compositeMask) {
        try { this.compositeMask.destroy(); } catch (e) { console.warn("Error destroying old mask:", e); }
        this.compositeMask = null;
    }
    let gfx = this.make.graphics({ add: false });
    gfx.fillStyle(0xffffff);
    const mX = sX - (rW / 2);
    const mW = rW * config.reels;
    for (let w = 0; w < config.rows; w++) {
        let mY = (sY + w * rH) - (dS / 2);
        gfx.fillRect(mX, mY, mW, dS);
    }
    this.compositeMask = gfx.createGeometryMask();
    console.log("FS Mask geometry created.");
  }

  applyMaskToAll() {
    if (!this.compositeMask) {
        console.error("FS applyMaskToAll: Mask not created yet!");
        return;
    }
    console.log("FS applyMaskToAll called.");
    let appliedCount = 0;
    for (let r = 0; r < config.reels; r++) {
        if (this.symbolSprites[r]) {
            for (let i = 0; i < this.symbolSprites[r].length; i++) {
                if (this.symbolSprites[r][i] && typeof this.symbolSprites[r][i].setMask === 'function') {
                    this.symbolSprites[r][i].setMask(this.compositeMask);
                    appliedCount++;
                }
            }
        }
    }
    console.log(`FS Applied mask to ${appliedCount} sprites.`);
  }

  startNextSpin() {
    console.log(`FS: startNextSpin() called. spinsRemaining: ${this.spinsRemaining}, spinState: ${this.spinState}`);
    if (this.spinsRemaining <= 0 || this.spinState !== 'idle') {
        console.log(`FS: startNextSpin() blocked. spinsRemaining: ${this.spinsRemaining}, spinState: ${this.spinState}`);
        if (this.spinsRemaining <= 0 && this.spinState === 'idle') {
            this.endBonus();
        }
        return;
    }
    const curSpin = this.initialSpins - this.spinsRemaining + 1;
    console.log(`Starting FS ${curSpin}/${this.initialSpins}`);
    
    // Claude suggested addition on 2025-06-08: Phase 1 - Ember sequence before spin
    this.cleanupEmberSystem(); // Clean up previous spin's effects
    
    // Pre-determine the outcome so ember system knows which reels will expand
    this.predetermineOutcome();
    
    // Create ember shower with dramatic pause
    this.createEmberShower();
    
    // Claude suggested fix on 2025-06-08: Longer delay for new over-reels animation system
    // Wait for ember sequence to complete before starting spin
    this.time.delayedCall(4500, () => {
      this.spin();
    }, [], this);
  }

  predetermineOutcome() {
    // Claude suggested addition on 2025-06-08: Pre-determine outcome for ember targeting
    let outcome;
    
    // Check if we need to force a win for minimum guarantee
    if (this.forceWinNextSpin) {
      console.log("FS: Forcing a winning outcome for minimum guarantee");
      const guaranteedWinOutcomes = [
        { type: 'free_large_win', rtp: 3.0, minWin: 8.0, maxWin: 20.0 },
        { type: 'free_huge_win', rtp: 6.0, minWin: 20.0, maxWin: 50.0 },
        { type: 'wild_expand_medium', rtp: 5.0, minWin: 15.0, maxWin: 40.0 }
      ];
      outcome = guaranteedWinOutcomes[Math.floor(Math.random() * guaranteedWinOutcomes.length)];
      this.forceWinNextSpin = false;
    } else {
      outcome = this.outcomeManager.getFreeSpinOutcome();
    }
    
    console.log("FS: Pre-determined outcome:", outcome);

    // For wild expansion outcomes, determine which reels should expand
    this.reelsToExpand = [];
    if (outcome.type.includes('wild_expand')) {
      let numReelsToExpand;
      switch(outcome.type) {
        case 'wild_expand_small': numReelsToExpand = Math.random() < 0.7 ? 1 : 2; break;
        case 'wild_expand_medium': numReelsToExpand = 3; break;
        case 'wild_expand_large': numReelsToExpand = Math.random() < 0.8 ? 4 : 5; break;
        default: numReelsToExpand = 1;
      }
      
      while (this.reelsToExpand.length < numReelsToExpand) {
        const reel = Math.floor(Math.random() * config.reels);
        if (!this.reelsToExpand.includes(reel)) {
          this.reelsToExpand.push(reel);
        }
      }
      console.log("FS: Reels that will expand this spin:", this.reelsToExpand);
    }
    
    // Store outcome for later use in spin()
    this.predeterminedOutcome = outcome;
  }

  spin() {
    if (this.spinState !== 'idle') return;
    this.spinState = 'spinning';
    this.expandedWilds = [false, false, false, false, false];

    this.spinsRemaining--;
    this.spinsText.setText(`FREE SPINS LEFT: ${this.spinsRemaining}`);
    console.log('Spinning in FS');

    if (this.winLineGraphics) {
      this.winLineGraphics.clear();
    }

    this.children.list.slice().forEach(child => {
      if (child && child.getData?.('isWinLabel') || child.getData?.('isWinPuck')) {
        child.destroy();
      }
    });

    if (this.sound.get('spinSound')) {
      this.sound.play('spinSound');
    }

    // Use the pre-determined outcome
    const outcome = this.predeterminedOutcome;
    console.log("FS: Using pre-determined outcome:", outcome);

    const symbolBoard = this.generateSymbolBoardFromOutcome(outcome);
    console.log("FS: Generated board for spin animation:", symbolBoard);

    this.runSpinAnimation(symbolBoard, outcome);
  }

  generateSymbolBoardFromOutcome(outcome) {
    switch (outcome.type) {
      case 'no_win':
        return this.generateNoWinBoard();
      case 'free_small_win':
        return this.generateWinBoard(['j', 'q', 'k', 'a', 'beer', 'flag'], 3, outcome);
      case 'free_medium_win':
        return this.generateWinBoard(['pam_mike', 'grant', 'logan', 'nick'], 3, outcome);
      case 'free_large_win':
        return this.generateWinBoard(['pam_mike', 'grant', 'logan', 'nick'], 4, outcome);
      case 'free_huge_win':
        return this.generateWinBoard(['pam_mike', 'grant'], 5, outcome);
      case 'wild_expand_small':
      case 'wild_expand_medium':
      case 'wild_expand_large':
        return this.generateExpandingWildBoard(outcome);
      default:
        console.warn(`Unknown FS outcome type: ${outcome.type}`);
        return this.generateRandomBoard();
    }
  }

  createEmptyBoard() {
    return Array(config.reels).fill().map(() => Array(config.rows).fill(null));
  }

  generateNoWinBoard() {
    const board = this.createEmptyBoard();
    const symbols = this.outcomeManager.getSymbolIds()
      .filter(s => s !== 'fire' && s !== 'elsi' && s !== 'loon');
    
    for (let r = 0; r < config.reels; r++) {
      const usedInReel = [];
      for (let row = 0; row < config.rows; row++) {
        let symbol;
        do {
          symbol = symbols[Math.floor(Math.random() * symbols.length)];
        } while (usedInReel.includes(symbol) && usedInReel.length < symbols.length);
        
        board[r][row] = symbol;
        usedInReel.push(symbol);
      }
    }
    
    // Verify no accidental wins
    const fsMultiplier = config.freeSpins?.multiplier || 1;
    const wins = this.winEvaluator.evaluateWins(board, this.currentBet, fsMultiplier);
    if (wins.totalWin > 0) {
      return this.generateNoWinBoard();
    }
    
    return board;
  }

  generateWinBoard(symbolPool, matchLength, outcome) {
    // Start with controlled board
    const board = this.createEmptyBoard();
    const symbols = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi' && s !== 'loon');
    
    // Fill with non-winning symbols
    for (let r = 0; r < config.reels; r++) {
      for (let row = 0; row < config.rows; row++) {
        board[r][row] = symbols[Math.floor(Math.random() * symbols.length)];
      }
    }
    
    // Place the intended win
    const targetPayline = config.paylinesDefinition[Math.floor(Math.random() * config.paylinesDefinition.length)];
    const symbol = symbolPool[Math.floor(Math.random() * symbolPool.length)];
    
    for (let i = 0; i < matchLength; i++) {
      const [reel, row] = targetPayline[i];
      board[reel][row] = symbol;
    }
    
    // Ensure no extension beyond intended length
    if (matchLength < 5) {
      const [nextReel, nextRow] = targetPayline[matchLength];
      const otherSymbols = symbols.filter(s => s !== symbol);
      board[nextReel][nextRow] = otherSymbols[Math.floor(Math.random() * otherSymbols.length)];
    }
    
    // Verify win is within expected range if specified
    if (outcome.minWin && outcome.maxWin) {
      const fsMultiplier = config.freeSpins?.multiplier || 1;
      const wins = this.winEvaluator.evaluateWins(board, this.currentBet, fsMultiplier);
      const winMultiplier = wins.totalWin / this.currentBet;
      
      if (winMultiplier < outcome.minWin || winMultiplier > outcome.maxWin) {
        return this.generateWinBoard(symbolPool, matchLength, outcome);
      }
    }
    
    return board;
  }

  generateExpandingWildBoard(outcome) {
    // Start with a controlled board that ensures wins through wild connections
    const board = this.createEmptyBoard();
    const symbols = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi' && s !== 'loon');
    
    // First, fill the board with random symbols
    for (let r = 0; r < config.reels; r++) {
      for (let row = 0; row < config.rows; row++) {
        board[r][row] = symbols[Math.floor(Math.random() * symbols.length)];
      }
    }
    
    // Place wilds on designated reels
    this.reelsToExpand.forEach(reel => {
      const row = Math.floor(Math.random() * config.rows);
      board[reel][row] = 'loon';
    });
    
    // Now ensure there are matching symbols that will create wins through the wild reels
    // Pick a few symbols to create guaranteed wins
    const winningSymbols = ['pam_mike', 'grant', 'logan', 'nick', 'beer', 'flag'];
    const guaranteedWins = Math.min(3, Math.floor(this.reelsToExpand.length * 1.5));
    
    for (let w = 0; w < guaranteedWins; w++) {
      const symbol = winningSymbols[Math.floor(Math.random() * winningSymbols.length)];
      const row = Math.floor(Math.random() * config.rows);
      
      // Place matching symbols on non-wild reels
      for (let r = 0; r < config.reels; r++) {
        if (!this.reelsToExpand.includes(r)) {
          // 70% chance to place the symbol on this row
          if (Math.random() < 0.7) {
            board[r][row] = symbol;
          }
        }
      }
    }
    
    // Verify the board will create wins within expected range
    const testBoard = JSON.parse(JSON.stringify(board));
    // Simulate wild expansion
    this.reelsToExpand.forEach(reel => {
      for (let row = 0; row < config.rows; row++) {
        testBoard[reel][row] = 'loon';
      }
    });
    
    const fsMultiplier = config.freeSpins?.multiplier || 1;
    const wins = this.winEvaluator.evaluateWins(testBoard, this.currentBet, fsMultiplier);
    const winMultiplier = wins.totalWin / this.currentBet;
    
    if (outcome.minWin && outcome.maxWin) {
      if (winMultiplier < outcome.minWin || winMultiplier > outcome.maxWin) {
        return this.generateExpandingWildBoard(outcome);
      }
    }
    
    console.log("FS: Board for expanding wild outcome (pre-spin):", board, "Reels to expand:", this.reelsToExpand);
    return board;
  }

  generateRandomBoard() {
    const board = this.createEmptyBoard();
    const symbols = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi' && s !== 'loon');
    
    for (let r = 0; r < config.reels; r++) {
      let hasScatterOnReel = false;
      for (let row = 0; row < config.rows; row++) {
        // Very rare chance for scatter (0.3%) but max 1 per reel
        if (Math.random() < 0.003 && !hasScatterOnReel) {
          board[r][row] = 'fire';
          hasScatterOnReel = true;
        } else {
          board[r][row] = symbols[Math.floor(Math.random() * symbols.length)];
        }
      }
    }
    return board;
  }

  runSpinAnimation(finalBoard, outcome) {
    const spinInterval = 100;
    const baseTotalShifts = 25;
    const reelDelayFactor = 5;
    const reelHeight = 150;
    const reelWidth = 150;
    const symbolDisplaySize = reelWidth * 0.7;
    const startX = 350;
    const startY = this.reelStartY;
    const wildId = config.wild?.id || 'loon';
    const symbolOptions = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi');

    this.applyMaskToAll();
    this.spinSequences = [];

    // Create spin sequences with correct final positioning
    for (let reel = 0; reel < config.reels; reel++) {
      let reelTotalShifts = baseTotalShifts + reel * reelDelayFactor;
      let seq = [];
      const finalBlockLength = config.rows + 1;

      // Fill with random symbols
      for (let i = 0; i < reelTotalShifts - finalBlockLength; i++) {
        let s = symbolOptions[Math.floor(Math.random() * symbolOptions.length)];
        if (outcome.type.includes('wild_expand') && Math.random() < 0.10) s = wildId;
        seq.push(s);
      }

      // Add final board symbols
      for (let row = config.rows - 1; row >= 0; row--) {
        seq.push(finalBoard[reel][row]);
      }
      seq.push(symbolOptions[Math.floor(Math.random() * symbolOptions.length)]);

      this.spinSequences[reel] = seq;
    }

    // Set up sprites for animation
    for (let reel = 0; reel < config.reels; reel++) {
      if (!this.symbolSprites[reel]) this.symbolSprites[reel] = [];
      if (this.symbolSprites[reel].length !== config.rows + 1) {
        this.symbolSprites[reel].forEach(s => s?.destroy());
        this.symbolSprites[reel] = [];

        let x_above = startX + reel * reelWidth;
        let y_above = startY - reelHeight;
        let tex_above = this.spinSequences[reel]?.[0] || symbolOptions[0];
        this.symbolSprites[reel].push(this.add.sprite(x_above, y_above, tex_above)
          .setDisplaySize(symbolDisplaySize, symbolDisplaySize)
          .setDepth(11)
          .setMask(this.compositeMask));

        for (let row = 0; row < config.rows; row++) {
          let x = startX + reel * reelWidth;
          let y = startY + row * reelHeight;
          const sT = finalBoard[reel]?.[row] || symbolOptions[0];
          this.symbolSprites[reel].push(this.add.sprite(x, y, sT)
            .setDisplaySize(symbolDisplaySize, symbolDisplaySize)
            .setDepth(11)
            .setMask(this.compositeMask));
        }
      }

      if (this.symbolSprites[reel][0]) {
        this.symbolSprites[reel][0].y = startY - reelHeight;
        let tex = this.spinSequences[reel]?.[0] || symbolOptions[0];
        this.symbolSprites[reel][0].setTexture(tex).setVisible(true).setMask(this.compositeMask);
      }
    }

    let reelsFinished = 0;
    const animateReel = (reel, shiftsRemaining) => {
      if (shiftsRemaining <= 0) {
        reelsFinished++;
        
        // Check for wild expansion
        if (outcome.type.includes('wild_expand') && this.reelsToExpand?.includes(reel)) {
          let wildLandedOnReel = false;
          for (let row = 0; row < config.rows; row++) {
            if (this.symbolSprites[reel]?.[row + 1]?.texture.key === wildId) {
              wildLandedOnReel = true;
              break;
            }
          }
          if (wildLandedOnReel) {
            this.expandWild(reel);
          }
        }

        if (reelsFinished === config.reels) {
          const evalDelay = this.expandedWilds.some(e => e) ? 600 : 200;
          this.time.delayedCall(evalDelay, () => {
            this.evaluateWin(finalBoard, outcome);
          });
        }
        return;
      }

      if (!this.symbolSprites[reel] || this.symbolSprites[reel].length !== config.rows + 1) {
        animateReel(reel, 0);
        return;
      }

      this.tweens.add({
        targets: this.symbolSprites[reel],
        y: `+=${reelHeight}`,
        duration: spinInterval,
        ease: 'Linear',
        onComplete: () => {
          let offScreenSprite = this.symbolSprites[reel][config.rows];
          if (!offScreenSprite) {
            animateReel(reel, shiftsRemaining - 1);
            return;
          }
          let nextTexture = this.spinSequences[reel]?.shift() || symbolOptions[0];
          offScreenSprite.setTexture(nextTexture)
            .setScale(1)
            .setAlpha(1)
            .setDisplaySize(symbolDisplaySize, symbolDisplaySize)
            .setMask(this.compositeMask);
          offScreenSprite.y = startY - reelHeight;
          this.symbolSprites[reel].pop();
          this.symbolSprites[reel].unshift(offScreenSprite);
          animateReel(reel, shiftsRemaining - 1);
        },
        callbackScope: this
      });
    };

    for (let reel = 0; reel < config.reels; reel++) {
      animateReel(reel, baseTotalShifts + reel * reelDelayFactor);
    }
    
    // Add anticipation for big wins
    if (outcome.type.includes('large') || outcome.type.includes('huge') || outcome.type.includes('wild_expand')) {
      this.time.delayedCall(2000, () => {
        if (this.sound.get('bonusSound')) {
          this.sound.play('bonusSound', { volume: 0.3 });
        }
      });
    }
  }

  evaluateWin(finalBoard, outcome) {
    if (this.spinState !== 'spinning') {
      console.warn("FS evaluateWin called in wrong state:", this.spinState);
      if (this.spinState !== 'ending' && this.spinState !== 'transitioning') {
        this.spinState = 'idle';
        if (this.spinsRemaining <= 0) {
          this.endBonus();
        }
      }
      return;
    }

    this.spinState = 'evaluation';
    console.log("FS: Evaluating Win. Outcome type:", outcome.type);
    
    const boardStateForWinCalc = this.getCurrentBoardState();
    console.log("FS: Board state for win calculation (after any expansions):", boardStateForWinCalc);

    const fsMultiplier = config.freeSpins?.multiplier || 1;
    const { totalWin, winningLines } = this.winEvaluator.evaluateWins(boardStateForWinCalc, this.currentBet, fsMultiplier);

    if (totalWin > 0) {
      console.log(`FS Win: ${totalWin.toFixed(2)}`);
      // Use WinDisplayManager with FreeSpins positioning (Y offset 295 vs MainScene 275)
      const positionConfig = {
        startY: this.reelStartY // 295 for FreeSpinsScene
      };
      this.winDisplayManager.showWinningLines(winningLines, this.currentBet, positionConfig);
      if (this.sound.get('winSound')) {
        this.sound.play('winSound');
      }
      // Win message is now handled by WinDisplayManager
      this.totalWin += totalWin;
      this.winText.setText(`TOTAL WIN: ${this.totalWin.toFixed(2)}`);
    }

    this.spinState = 'transitioning';
    // Calculate delay based on number of win lines for proper animation completion
    // WinDisplayManager timing breakdown:
    // - Line snake animation: 900ms per line
    // - Count-up animations: ~200ms per line  
    // - Win text boxes appear: +1000ms delay after all lines complete
    // - Extra buffer for expanding wilds with many lines: +2000ms
    // Formula: minimum 5s, or 1.5s per line + 3s total buffer (generous for expanding wilds)
    const displayDelay = totalWin > 0 ? 
      Math.max(5000, winningLines.length * 1500 + 3000) : 500;
    
    console.log(`FS: Win display delay set to ${displayDelay}ms for ${winningLines.length} lines`);
    
    this.time.delayedCall(displayDelay, () => {
      if (this.spinsRemaining > 0) {
        // Clear win displays before starting next spin
        this.winDisplayManager.clearWinDisplays();
        this.spinState = 'idle';
        this.startNextSpin();
      } else {
        // Check if minimum win is met before ending
        if (this.totalWin < this.minimumWinGuaranteed) {
          console.log(`FS: Total win ${this.totalWin} below minimum ${this.minimumWinGuaranteed}, forcing bonus spin`);
          // Force a winning spin
          this.spinsRemaining = 1;
          this.forceWinNextSpin = true;
          this.winDisplayManager.clearWinDisplays();
          this.spinState = 'idle';
          this.startNextSpin();
        } else {
          this.spinState = 'idle';
          this.endBonus();
        }
      }
    }, [], this);
  }

  expandWild(reelIndex) {
    if (reelIndex < 0 || reelIndex >= config.reels) return;
    console.log(`FS: Expanding wild on reel ${reelIndex}`);
    this.sound.play('sfx_expanding_wild');

    this.expandedWilds[reelIndex] = true;
    const wildId = config.wild?.id || 'loon';
    for (let row = 0; row < config.rows; row++) {
      const sprite = this.symbolSprites[reelIndex]?.[row + 1];
      if (sprite) {
        sprite.setTexture(wildId);
        this.showWildExpansionEffect(sprite);
      }
    }
  }

  showWildExpansionEffect(sprite) {
    if (!sprite) return;
    const wildId = config.wild?.id || 'loon';
    const effect = this.add.sprite(sprite.x, sprite.y, wildId)
      .setDepth(sprite.depth + 1)
      .setAlpha(0.6)
      .setScale(0.9);
    
    this.tweens.add({
      targets: effect,
      scale: 1.4,
      alpha: 0,
      duration: 400,
      ease: 'Quad.easeOut',
      onComplete: () => effect.destroy()
    });
    
    this.tweens.add({
      targets: sprite,
      scale: 1.1,
      duration: 150,
      yoyo: true,
      ease: 'Quad.easeInOut'
    });
  }

  getCurrentBoardState() {
    const board = [];
    for (let r = 0; r < config.reels; r++) {
      board[r] = [];
      const sprites = this.symbolSprites[r];
      const expectedLen = config.rows + 1;
      
      if (!sprites || sprites.length !== expectedLen) {
        console.warn(`FS: Reel ${r} invalid sprite array length ${sprites?.length}. Expected ${expectedLen}.`);
        for (let w = 0; w < config.rows; w++) board[r][w] = '__DEFAULT';
      } else {
        for (let w = 0; w < config.rows; w++) {
          board[r][w] = sprites[w + 1]?.texture.key || '__DEFAULT';
        }
      }
    }
    return board;
  }

  // Claude suggested refactor on 2025-06-08: Removed duplicate win display methods
  // All win display logic now handled by WinDisplayManager for consistency
 
 
  endBonus() {
    console.log(`FreeSpinsScene: endBonus() called. Win: ${this.totalWin}. State: ${this.spinState}`);
    this.sound.play('sfx_bonus_end');

    if (this.spinState === 'ending') return;
    this.spinState = 'ending';
 
    if (this.winLineGraphics) this.winLineGraphics.clear();
    this.children.list.slice().forEach(child => {
      if (child && (child.getData?.('isWinLabel') || child.getData?.('isWinPuck'))) {
        try { child.destroy(); } catch (e) {}
      }
    });
 
    const message = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY,
      `FREE SPINS COMPLETE!\nTOTAL WIN: ${this.totalWin.toFixed(2)}`, {
      fontSize: '40px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 5,
      align: 'center',
      backgroundColor: '#000000E0',
      padding: { x: 25, y: 15 }
    }).setOrigin(0.5).setDepth(2000).setScale(0);
 
    this.tweens.add({
      targets: message,
      scale: 1,
      duration: 600,
      ease: 'Back.easeOut'
    });
 
    if (this.totalWin > 0 && this.sound.get('bonusSound')) {
      this.sound.play('bonusSound');
    }
 
    const delayDuration = 4000;
    this.time.delayedCall(delayDuration, () => {
      console.log("FreeSpinsScene: Setting registry data for bonus completion");
      this.game.registry.set('bonusCompleted', { type: 'freeSpins', totalWin: this.totalWin });
      console.log("FreeSpinsScene: Emitting 'freeSpinsCompleteGlobal' globally.");
      this.sys.events.emit('freeSpinsCompleteGlobal', this.totalWin);
      if (this.sound.get('music_bonus_freespins_loop')) {
        this.sound.stopByKey('music_bonus_freespins_loop');
      }
      
      this.time.delayedCall(100, () => {
        console.log("FreeSpinsScene: Stopping FreeSpinsScene now.");
        // Claude suggested addition on 2025-06-08: Cleanup ambient embers when scene ends
        this.cleanupAmbientEmbers();
        this.events.removeAllListeners();
        this.scene.stop();
      });
    }, [], this);
  }

  // Claude suggested addition on 2025-06-08: Phase 1 - Ember Particle System Manager
  createEmberShower() {
    console.log("FS: Creating ember shower effect");
    
    // Claude suggested fix on 2025-06-08: Embers rise from campfire, float up, then fall down to reels
    const emberCount = Phaser.Math.Between(7, 12); // Increased count as requested
    const campfireX = this.cameras.main.width * 0.8; // Campfire position (slightly left from edge)
    const campfireY = this.cameras.main.height * 0.85; // Bottom area where campfire is
    
    for (let i = 0; i < emberCount; i++) {
      // Claude suggested fix on 2025-06-08: Start embers slightly higher
      // Spawn embers from the campfire area
      const ember = this.add.circle(
        campfireX + Phaser.Math.Between(-40, 40),
        campfireY - 30 + Phaser.Math.Between(-20, 20), // Raised by 30 pixels
        Phaser.Math.Between(3, 7),
        0xFF6600,
        0.8
      ).setDepth(1999); // High depth to appear over everything
      
      // Add glow effect
      ember.setStrokeStyle(2, 0xFFCC00, 0.6);
      
      this.emberParticles.push(ember);
      
      // Claude suggested fix on 2025-06-08: All embers travel over reels, only some ignite
      // Check if this ember should actually ignite a reel (expand wild reel)
      const shouldIgniteReel = this.shouldEmberTargetReel();
      
      // All embers travel over random reels for natural movement
      const pathOverReels = this.generateEmberPath();
      
      if (shouldIgniteReel.target) {
        // This ember will ignite the designated expanding wild reel
        this.animateEmberOverReelsWithIgnition(ember, pathOverReels, shouldIgniteReel.reelIndex, i * 100);
      } else {
        // This ember just travels over reels but doesn't ignite anything
        this.animateEmberOverReels(ember, pathOverReels, i * 50);
      }
    }
  }
  
  shouldEmberTargetReel() {
    // Only target reels that will actually expand (based on this.reelsToExpand)
    if (this.reelsToExpand && this.reelsToExpand.length > 0) {
      // Find reels that will expand but aren't already inferno reels
      const availableReels = this.reelsToExpand.filter(reel => !this.infernoReels[reel]);
      
      if (availableReels.length > 0) {
        // 70% chance to target an expanding reel
        if (Math.random() < 0.7) {
          const targetReel = availableReels[Math.floor(Math.random() * availableReels.length)];
          return { target: true, reelIndex: targetReel };
        }
      }
    }
    
    return { target: false };
  }
  
  generateEmberPath() {
    // Claude suggested addition on 2025-06-08: Generate random path over reels
    const startReel = Phaser.Math.Between(0, 4); // Which reel to start over
    const reelSpan = Phaser.Math.Between(1, 5 - startReel); // How many reels to cross
    const floatHeight = this.reelStartY - Phaser.Math.Between(100, 200); // Above reels
    
    return {
      startReel: startReel,
      endReel: startReel + reelSpan - 1,
      floatHeight: floatHeight,
      reelSpan: reelSpan
    };
  }
  
  animateEmberOverReelsWithIgnition(ember, path, igniteReel, delay) {
    this.time.delayedCall(delay, () => {
      if (!ember.scene) return; // Safety check
      
      const startX = 350 + path.startReel * 150;
      const endX = 350 + path.endReel * 150;
      const igniteX = 350 + igniteReel * 150;
      const igniteY = this.reelStartY + Phaser.Math.Between(0, 2) * 150;
      
      // Phase 1: Float up and drift to start of reel path
      this.tweens.add({
        targets: ember,
        x: startX + Phaser.Math.Between(-30, 30),
        y: path.floatHeight,
        duration: 1500,
        ease: 'Power2.easeOut',
        onComplete: () => {
          // Phase 2: Travel across reels
          this.tweens.add({
            targets: ember,
            x: endX + Phaser.Math.Between(-30, 30),
            y: path.floatHeight + Phaser.Math.Between(-20, 20), // Slight bobbing
            duration: 1000,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              // Phase 3: Drop down to ignite specific reel (might not be on the path)
              this.tweens.add({
                targets: ember,
                x: igniteX + Phaser.Math.Between(-20, 20),
                y: igniteY,
                duration: 1200,
                ease: 'Quad.easeIn',
                onComplete: () => {
                  this.triggerInfernoReel(igniteReel, igniteX, igniteY);
                  this.destroyEmber(ember);
                }
              });
            }
          });
        }
      });
      
      // Fade during entire journey
      this.tweens.add({
        targets: ember,
        alpha: 0.9,
        duration: 3700, // Total journey time
        ease: 'Power1'
      });
    });
  }
  
  animateEmberOverReels(ember, path, delay) {
    this.time.delayedCall(delay, () => {
      if (!ember.scene) return;
      
      const startX = 350 + path.startReel * 150;
      const endX = 350 + path.endReel * 150;
      
      // Phase 1: Float up and drift to start of reel path  
      this.tweens.add({
        targets: ember,
        x: startX + Phaser.Math.Between(-30, 30),
        y: path.floatHeight,
        duration: 1500,
        ease: 'Power2.easeOut',
        onComplete: () => {
          // Phase 2: Travel across reels
          this.tweens.add({
            targets: ember,
            x: endX + Phaser.Math.Between(-30, 30),
            y: path.floatHeight + Phaser.Math.Between(-20, 20), // Slight bobbing
            duration: 1000,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              // Phase 3: Continue falling off screen (no ignition)
              this.tweens.add({
                targets: ember,
                x: ember.x + Phaser.Math.Between(-100, 100),
                y: this.cameras.main.height + 100,
                duration: Phaser.Math.Between(1500, 2500),
                ease: 'Quad.easeIn',
                onComplete: () => this.destroyEmber(ember)
              });
            }
          });
        }
      });
      
      // Fade out during journey
      this.tweens.add({
        targets: ember,
        alpha: 0,
        duration: Phaser.Math.Between(3500, 4500), // Total fade time
        ease: 'Power2'
      });
    });
  }
  
  
  triggerInfernoReel(reelIndex, x, y) {
    // Claude suggested fix on 2025-06-08: Only trigger if reel isn't already on fire
    if (this.infernoReels[reelIndex]) {
      console.log(`FS: Ember landed on reel ${reelIndex} but it's already on fire - no effect`);
      return; // Already on fire, no message or effect
    }
    
    console.log(`FS: Triggering Inferno Reel ${reelIndex}`);
    this.infernoReels[reelIndex] = true;
    
    // Create dramatic ignition effect (only when actually igniting)
    this.createIgnitionEffect(x, y);
    
    // Create fire background for this reel
    this.createInfernoBackground(reelIndex);
    
    // Play ignition sound
    // TODO: Add when audio assets are available
    // this.sound.play('sfx_reel_ignition');
  }
  
  createIgnitionEffect(x, y) {
    // Flash effect at ignition point
    const flash = this.add.circle(x, y, 80, 0xFF3300, 0.8)
      .setDepth(2000);
    
    this.tweens.add({
      targets: flash,
      scale: 2,
      alpha: 0,
      duration: 300,
      ease: 'Power2.easeOut',
      onComplete: () => flash.destroy()
    });
    
    // "INFERNO REEL!" message
    const message = this.add.text(x, y - 50, 'INFERNO REEL!', {
      fontSize: '24px',
      color: '#FF3300',
      stroke: '#000000',
      strokeThickness: 3,
      fontFamily: 'Arial Black'
    }).setOrigin(0.5).setDepth(2001).setAlpha(0);
    
    this.tweens.add({
      targets: message,
      alpha: 1,
      y: y - 80,
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(1000, () => {
          this.tweens.add({
            targets: message,
            alpha: 0,
            duration: 500,
            onComplete: () => message.destroy()
          });
        });
      }
    });
  }
  
  createInfernoBackground(reelIndex) {
    const reelX = 350 + reelIndex * 150;
    const reelY = this.reelStartY + 150; // Center of reel area
    const reelWidth = 150;
    const reelHeight = 150 * config.rows;
    
    // Create fire background overlay
    const fireBackground = this.add.rectangle(
      reelX, 
      reelY, 
      reelWidth - 5, 
      reelHeight - 5, 
      0xFF3300, 
      0.3
    ).setDepth(9); // Behind symbols but above normal backgrounds
    
    fireBackground.setStrokeStyle(3, 0xFF6600, 0.8);
    
    // Add pulsing animation
    this.tweens.add({
      targets: fireBackground,
      alpha: { from: 0.3, to: 0.5 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Add crackling particle effects around the reel edges
    this.createInfernoParticles(reelX, reelY, reelWidth, reelHeight);
    
    this.infernoBackgrounds[reelIndex] = fireBackground;
    console.log(`FS: Created inferno background for reel ${reelIndex}`);
  }
  
  createInfernoParticles(centerX, centerY, width, height) {
    // Create small fire particles around the reel edges
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const radius = Math.max(width, height) * 0.6;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      const particle = this.add.circle(x, y, Phaser.Math.Between(2, 4), 0xFF6600, 0.7)
        .setDepth(8);
      
      // Animate particles with random floating motion
      this.tweens.add({
        targets: particle,
        x: x + Phaser.Math.Between(-20, 20),
        y: y + Phaser.Math.Between(-20, 20),
        alpha: { from: 0.7, to: 0.2 },
        duration: Phaser.Math.Between(1500, 2500),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      this.emberParticles.push(particle); // Track for cleanup
    }
  }
  
  cleanupEmberSystem() {
    console.log("FS: Cleaning up ember system");
    
    // Only clean up shower embers, keep ambient embers running
    const showerEmbers = this.emberParticles.filter(ember => 
      ember.depth === 1999 // High depth = shower embers
    );
    
    showerEmbers.forEach(ember => {
      if (ember?.scene) ember.destroy();
      const index = this.emberParticles.indexOf(ember);
      if (index > -1) {
        this.emberParticles.splice(index, 1);
      }
    });
    
    // Destroy inferno backgrounds
    this.infernoBackgrounds.forEach(bg => {
      if (bg?.scene) bg.destroy();
    });
    this.infernoBackgrounds = [];
    
    // Clear ember timing controller
    if (this.emberTimingController) {
      this.emberTimingController.destroy();
      this.emberTimingController = null;
    }
    
    // Reset inferno reel states
    this.infernoReels = [false, false, false, false, false];
  }
  
  destroyEmber(ember) {
    if (ember?.scene) {
      ember.destroy();
      const index = this.emberParticles.indexOf(ember);
      if (index > -1) {
        this.emberParticles.splice(index, 1);
      }
    }
  }
  
  // Claude suggested addition on 2025-06-08: Ambient floating ember system
  createAmbientEmbers() {
    console.log("FS: Creating ambient floating embers");
    
    // Create initial batch of ambient embers
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 2000, () => {
        this.spawnAmbientEmber();
      });
    }
    
    // Continue spawning ambient embers periodically
    this.ambientEmberTimer = this.time.addEvent({
      delay: Phaser.Math.Between(4000, 8000), // Every 4-8 seconds
      callback: this.spawnAmbientEmber,
      callbackScope: this,
      loop: true
    });
  }
  
  spawnAmbientEmber() {
    if (!this.scene || this.emberParticles.length > 20) return; // Limit total embers
    
    const campfireX = this.cameras.main.width * 0.8;
    const campfireY = this.cameras.main.height * 0.85;
    
    // Create small ambient ember
    const ember = this.add.circle(
      campfireX + Phaser.Math.Between(-30, 30),
      campfireY + Phaser.Math.Between(-15, 15),
      Phaser.Math.Between(2, 4), // Smaller than shower embers
      0xFF6600,
      0.6 // More subtle
    ).setDepth(500); // Lower depth, behind main action
    
    ember.setStrokeStyle(1, 0xFFCC00, 0.4);
    this.emberParticles.push(ember);
    
    // Gentle floating animation
    this.tweens.add({
      targets: ember,
      x: ember.x + Phaser.Math.Between(-200, 300),
      y: ember.y - Phaser.Math.Between(200, 400),
      duration: Phaser.Math.Between(8000, 15000), // Long, slow float
      ease: 'Sine.easeInOut',
      onComplete: () => this.destroyEmber(ember)
    });
    
    // Gentle fade and pulse
    this.tweens.add({
      targets: ember,
      alpha: { from: 0.6, to: 0.1 },
      duration: Phaser.Math.Between(8000, 15000),
      ease: 'Power2'
    });
    
    // Subtle size pulsing
    this.tweens.add({
      targets: ember,
      scale: { from: 1, to: 1.3 },
      duration: Phaser.Math.Between(2000, 4000),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
  
  cleanupAmbientEmbers() {
    if (this.ambientEmberTimer) {
      this.ambientEmberTimer.destroy();
      this.ambientEmberTimer = null;
    }
  }
 }