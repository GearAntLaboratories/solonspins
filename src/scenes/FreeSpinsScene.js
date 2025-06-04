// src/scenes/FreeSpinsScene.js
import Phaser from 'phaser';
import config from '../game/config';
import OutcomeManager from '../game/OutcomeManager';

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

    // Initialize OutcomeManager
    this.outcomeManager = new OutcomeManager();
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
  }

  create() {
    console.log('FreeSpinsScene create');

    this.children.removeAll();
    if (this.winLineGraphics) {
      this.winLineGraphics.clear();
      this.winLineGraphics.destroy();
      this.winLineGraphics = null;
    }
    
    // Reset total win
    this.totalWin = 0;

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
    if (this.spinsRemaining <= 0 || this.spinState !== 'idle') {
        if (this.spinsRemaining <= 0 && this.spinState === 'idle') {
            this.endBonus();
        }
        return;
    }
    const curSpin = this.initialSpins - this.spinsRemaining + 1;
    console.log(`Starting FS ${curSpin}/${this.initialSpins}`);
    this.spin();
  }

  spin() {
    if (this.spinState !== 'idle') return;
    this.spinState = 'spinning';
    this.expandedWilds = [false, false, false, false, false];
    this.reelsToExpand = [];

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

    let outcome;
    
    // Check if we need to force a win for minimum guarantee
    if (this.forceWinNextSpin) {
      console.log("FS: Forcing a winning outcome for minimum guarantee");
      // Force a good win outcome
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
    
    console.log("FS: Got outcome:", outcome);

    // For wild expansion outcomes, determine which reels should expand
    if (outcome.type.includes('wild_expand')) {
      let numReelsToExpand;
      switch(outcome.type) {
        case 'wild_expand_small': numReelsToExpand = Math.random() < 0.7 ? 1 : 2; break;
        case 'wild_expand_medium': numReelsToExpand = 3; break;
        case 'wild_expand_large': numReelsToExpand = Math.random() < 0.8 ? 4 : 5; break;
        default: numReelsToExpand = 1;
      }
      this.reelsToExpand = [];
      while (this.reelsToExpand.length < numReelsToExpand) {
        const reel = Math.floor(Math.random() * config.reels);
        if (!this.reelsToExpand.includes(reel)) {
          this.reelsToExpand.push(reel);
        }
      }
    }

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
    const wins = this.evaluateWins(board);
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
      const wins = this.evaluateWins(board);
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
    
    const wins = this.evaluateWins(testBoard);
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

    const { totalWin, winningLines } = this.evaluateWins(boardStateForWinCalc);

    if (totalWin > 0) {
      console.log(`FS Win: ${totalWin.toFixed(2)}`);
      this.showWinningLines(winningLines);
      if (this.sound.get('winSound')) {
        this.sound.play('winSound');
      }
      this.showWinMessage(totalWin);
      this.totalWin += totalWin;
      this.winText.setText(`TOTAL WIN: ${this.totalWin.toFixed(2)}`);
    }

    this.spinState = 'transitioning';
    const displayDelay = totalWin > 0 ? 2000 : 500;
    
    this.time.delayedCall(displayDelay, () => {
      if (this.spinsRemaining > 0) {
        this.spinState = 'idle';
        this.startNextSpin();
      } else {
        // Check if minimum win is met before ending
        if (this.totalWin < this.minimumWinGuaranteed) {
          console.log(`FS: Total win ${this.totalWin} below minimum ${this.minimumWinGuaranteed}, forcing bonus spin`);
          // Force a winning spin
          this.spinsRemaining = 1;
          this.forceWinNextSpin = true;
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

  evaluateWins(boardState) {
    const paylines = config.paylinesDefinition || [];
    let totalWin = 0;
    let winningLines = [];
    const wildKey = config.wild?.id || 'loon';
    const scatterKey = config.scatter?.id || 'fire';
    const bonusKey = config.bonus?.id || 'elsi';
    
    // Check each payline for wins
    for (let lineIndex = 0; lineIndex < paylines.length; lineIndex++) {
      const lineCoordinates = paylines[lineIndex];
      const lineSymbols = [];
      const linePositions = [];
      
      for (const pos of lineCoordinates) {
        const [r, w] = pos;
        if (boardState[r]?.[w] !== undefined) {
          lineSymbols.push(boardState[r][w]);
          linePositions.push(pos);
        } else {
          lineSymbols.push(null);
          linePositions.push(pos);
        }
      }
      
      if (lineSymbols.length === 0 || lineSymbols[0] === null || 
          lineSymbols[0] === scatterKey || lineSymbols[0] === bonusKey) continue;
      
      let firstSymbol = lineSymbols[0];
      let matchCount = 0;
      let effectiveSymbol = firstSymbol;
      
      for (let i = 0; i < lineSymbols.length; i++) {
        const currentSymbol = lineSymbols[i];
        
        if (i === 0) {
          if (currentSymbol === wildKey) {
            matchCount++;
            // Look for first non-wild to determine line type
            for (let j = 1; j < lineSymbols.length; j++) {
              if (lineSymbols[j] !== wildKey && lineSymbols[j] !== scatterKey && lineSymbols[j] !== bonusKey) {
                effectiveSymbol = lineSymbols[j];
                break;
              }
            }
            if (effectiveSymbol === wildKey) {
              effectiveSymbol = wildKey; // All wilds
            }
          } else {
            matchCount++;
            effectiveSymbol = currentSymbol;
          }
        } else {
          if (currentSymbol === effectiveSymbol || currentSymbol === wildKey) {
            matchCount++;
          } else {
            break;
          }
        }
      }
      
      // Check for wins (including 2-symbol wins for high symbols)
      const symbolConfig = effectiveSymbol === wildKey ? config.wild : config.symbols.find(s => s.id === effectiveSymbol);
      
      if (symbolConfig?.pays?.[matchCount]) {
        const symbolPay = symbolConfig.pays[matchCount];
        const betPerLine = this.currentBet / (config.paylines || 9);
        const fsMultiplier = config.freeSpins?.multiplier || 1;
        const lineWin = symbolPay * betPerLine * fsMultiplier;
        
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
    for (let r = 0; r < config.reels; r++) {
      for (let w = 0; w < config.rows; w++) {
        if (boardState[r]?.[w] === scatterKey) {
          scatterCount++;
          scatterPositions.push([r, w]);
        }
      }
    }
    
    // Scatter pays (including 2 scatters)
    if (scatterCount >= 2 && config.scatter?.pays?.[scatterCount]) {
      let scatterPay = config.scatter.pays[scatterCount];
      const scatterWinAmount = scatterPay * this.currentBet;
      
      if (scatterWinAmount > 0) {
        totalWin += scatterWinAmount;
        winningLines.push({
          lineIndex: -1,
          symbolPositions: scatterPositions,
          symbol: scatterKey,
          winAmount: scatterWinAmount,
          count: scatterCount
        });
      }
    }
    
    return { totalWin, winningLines };
  }
 
  showWinningLines(winningLines) {
    // Use MainScene-style win display
    const NEON_COLORS = [
      0xFFD700, 0x00eaff, 0x6eff7c, 0xfc41a1, 0xff5c0a,
      0xa182fc, 0x1fc1c3, 0xc1fc1e, 0xfcfc1e
    ];
    const PAYLINES = config.paylinesDefinition || [];
    const REEL_WIDTH = 150, REEL_HEIGHT = 150, START_X = 350, START_Y = this.reelStartY;
    const PUCK_RADIUS = 38;
    const OUTSIDE_X = START_X + (4 * REEL_WIDTH) + 140;
    
    // Calculate total win for effects
    const totalWin = winningLines.reduce((sum, line) => sum + line.winAmount, 0);
    const winMultiplier = totalWin / this.currentBet;
    
    // Add screen effects for big wins
    if (winMultiplier >= 25) {
      this.showBigWinEffects(totalWin);
    } else if (winMultiplier >= 10) {
      this.showMediumWinEffects(totalWin);
    }
    
    // Clear previous lines
    this.winLineGraphics.clear();
    
    // Remove old pucks and win labels
    this.children.list.forEach(child => {
      if (child.getData && child.getData('isWinPuck')) child.destroy();
      if (child.getData && child.getData('isWinLabel')) child.destroy();
    });
    
    // Prepare a map to stack win labels by row
    const rowLabelMap = {};
    
    winningLines.forEach((winInfo, idx) => {
      // Delay each line reveal for cascading effect
      this.time.delayedCall(idx * 200, () => {
        if (winInfo.lineIndex === -1) {
          // Scatter win
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
        
        // Color selection
        const color = NEON_COLORS[winInfo.lineIndex % NEON_COLORS.length];
        const payline = PAYLINES[winInfo.lineIndex];
        const points = payline.map(
          ([r, w]) => ({
            x: START_X + (r * REEL_WIDTH),
            y: START_Y + (w * REEL_HEIGHT)
          })
        );
        
        // Draw glow line
        this.winLineGraphics.lineStyle(14, color, 0.18);
        this.winLineGraphics.beginPath();
        this.winLineGraphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          this.winLineGraphics.lineTo(points[i].x, points[i].y);
        }
        this.winLineGraphics.strokePath();
        
        // Draw bright core line
        this.winLineGraphics.lineStyle(5, color, 0.95);
        this.winLineGraphics.beginPath();
        this.winLineGraphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          this.winLineGraphics.lineTo(points[i].x, points[i].y);
        }
        this.winLineGraphics.strokePath();
        
        // Puck burst over each winning symbol
        winInfo.symbolPositions.forEach(([r, w], symbolIdx) => {
          this.time.delayedCall(symbolIdx * 50, () => {
            this._drawPuckOverSymbol(r, w, color, PUCK_RADIUS);
          });
        });
        
        // Place win label to the right of 5th reel
        const [finalReel, finalRow] = payline[payline.length - 1];
        const targetRow = typeof finalRow === 'number' ? finalRow : 1;
        if (!rowLabelMap[targetRow]) rowLabelMap[targetRow] = [];
        rowLabelMap[targetRow].push({
          color,
          amount: winInfo.winAmount,
        });
      });
    });
    
    // Render all stacked win labels
    this.time.delayedCall(winningLines.length * 200 + 100, () => {
      Object.entries(rowLabelMap).forEach(([row, arr]) => {
        const baseY = START_Y + (row * REEL_HEIGHT);
        arr.forEach((info, idx) => {
          this.showWinLabel(
            `WIN: ${info.amount.toFixed(2)}`,
            OUTSIDE_X,
            baseY + idx * 32 - (arr.length - 1) * 16,
            info.color
          );
        });
      });
    });
  }
 
  _drawPuckOverSymbol(reel, row, color, radius) {
    const REEL_WIDTH = 150, REEL_HEIGHT = 150, START_X = 350, START_Y = this.reelStartY;
    const x = START_X + (reel * REEL_WIDTH);
    const y = START_Y + (row * REEL_HEIGHT);
 
    const puck = this.add.circle(x, y, radius, color, 0.34)
      .setStrokeStyle(2, 0xffffff, 0.7)
      .setDepth(1550)
      .setData('isWinPuck', true)
      .setAlpha(0);
      
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
    // Use MainScene-style win labels
    const rectWidth = 130;
    const rectHeight = 36;
    const cornerRadius = 1;
    
    const rect = this.add.graphics();
    rect.fillStyle(0x111111, 0.96);
    rect.lineStyle(3, color, 0.89);
    rect.fillRoundedRect(x - rectWidth/2, y - rectHeight/2, rectWidth, rectHeight, cornerRadius);
    rect.strokeRoundedRect(x - rectWidth/2, y - rectHeight/2, rectWidth, rectHeight, cornerRadius);
    rect.setDepth(1600);
    rect.setAlpha(1);
    rect.setData('isWinLabel', true);
    
    const style = {
      fontSize: '20px',
      fontFamily: 'Arial, Helvetica, sans-serif',
      color: '#FFFFFF',
      align: 'center',
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
 
  showWinMessage(amount) {
    const msg = this.add.text(640, 360, `WIN: ${amount.toFixed(2)}`, {
      fontSize: '32px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 5
    })
    .setOrigin(0.5)
    .setDepth(2000)
    .setAlpha(0)
    .setData('isWinLabel', true);
    
    this.tweens.add({
      targets: msg,
      alpha: 1,
      scale: 1.1,
      duration: 300,
      yoyo: true,
      hold: 800,
      ease: 'Power1'
    });
  }
 
  showBigWinEffects(totalWin) {
    // Screen flash
    const flash = this.add.rectangle(640, 360, 1280, 720, 0xFFFFFF, 0.8)
      .setDepth(2500);
    
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy()
    });
    
    // Camera shake
    this.cameras.main.shake(300, 0.01);
    
    // Big win text
    const bigWinText = this.add.text(640, 200, 'BIG WIN!', {
      fontSize: '72px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 6,
      fontFamily: 'Arial Black'
    })
    .setOrigin(0.5)
    .setDepth(2600)
    .setScale(0);
    
    this.tweens.add({
      targets: bigWinText,
      scale: 1.2,
      duration: 500,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: 1000,
      onComplete: () => bigWinText.destroy()
    });
    
    // Particle effects
    this.createWinParticles(totalWin);
  }
 
  showMediumWinEffects(totalWin) {
    // Glow effect
    const glow = this.add.sprite(640, 360, 'beer')
      .setAlpha(0.3)
      .setScale(15)
      .setTint(0xFFD700)
      .setDepth(10);
    
    this.tweens.add({
      targets: glow,
      alpha: 0,
      scale: 20,
      duration: 1000,
      onComplete: () => glow.destroy()
    });
  }
 
  createWinParticles(winAmount) {
    const particleCount = Math.min(50, Math.floor(winAmount / this.currentBet));
    
    for (let i = 0; i < particleCount; i++) {
      const x = Phaser.Math.Between(200, 1080);
      const y = Phaser.Math.Between(200, 520);
      
      const particle = this.add.sprite(x, y, 'beer')
        .setScale(0.3)
        .setAlpha(0)
        .setDepth(2400);
      
      this.tweens.add({
        targets: particle,
        alpha: 1,
        scale: 0.5,
        x: x + Phaser.Math.Between(-100, 100),
        y: y - Phaser.Math.Between(50, 150),
        duration: Phaser.Math.Between(1000, 2000),
        delay: i * 20,
        ease: 'Power2',
        onComplete: () => {
          this.tweens.add({
            targets: particle,
            alpha: 0,
            duration: 500,
            onComplete: () => particle.destroy()
          });
        }
      });
    }
  }
 
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
        this.events.removeAllListeners();
        this.scene.stop();
      });
    }, [], this);
  }
 }