// src/scenes/MainScene.js
import Phaser from 'phaser';
import config from '../game/config'; // Ensure correct path
import OutcomeManager from '../game/OutcomeManager';
import BoardGenerator from '../game/BoardGenerator';
import WinEvaluator from '../game/WinEvaluator';
import AnimationManager from '../game/AnimationManager';
import WinDisplayManager from '../ui/WinDisplayManager';
import BonusManager from '../game/BonusManager';
import { generateSpinResult } from '../utils/spinResultGenerator';
import {
  showBigWinEffects,
  createWinParticles,
  showMediumWinEffects
} from '../utils/winEffects';

import { createScatterGlow } from '../utils/scatterGlow';


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
    this.backgroundMusic = null; // Claude suggested addition on 2025-06-08: Background music reference
    console.log("MainScene constructed");

     this.outcomeManager = new OutcomeManager();
     this.boardGenerator = new BoardGenerator(this.outcomeManager, config);
     this.winEvaluator = new WinEvaluator(config);
     this.animationManager = new AnimationManager(this, this.outcomeManager);
     this.winDisplayManager = new WinDisplayManager(this);
     this.bonusManager = new BonusManager(this);
    this.reelStartY = 275; // Define reel start position, adjust as needed if logo needs more space
  }

  create() {
    console.log('MainScene: create() started');

   
    this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'main_background')
        .setOrigin(0.5)
        .setDisplaySize(this.cameras.main.width, this.cameras.main.height)
        .setDepth(-1); // Behind everything

    // Add the NEW main logo
    this.add.image(640, 100, 'main_logo').setOrigin(0.5).setDepth(1).setScale(.475); // Adjust Y as needed

    this.createInitialReels(); 
    this.createWinLineGraphics();
    this.createMask();
    this.createCombinedInfoPanel(); // Claude suggested change on 2025-06-08: Combined paylines and helper info
    this.setupBackgroundMusic(); // Claude suggested addition on 2025-06-08: Setup background music

    console.log("MainScene: Setting up 'spin' event listener.");
    this.events.on('spin', this.spin, this);

    // Setup bonus event listeners through BonusManager
    this.bonusManager.setupEventListeners();

    // Claude suggested addition on 2025-07-01: Keyboard shortcuts for game controls
    this.setupKeyboardControls();

    console.log("MainScene: create() finished");
  }

  wake() {
    console.log("MainScene: wake() called - scene was resumed");
    this.animationManager.cleanupAnticipationEffects();


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

  // Claude suggested change on 2025-06-08: Combined paylines and helper info panel
  createCombinedInfoPanel() {
    const panelX = 137; // Center between screen edge (0) and reel area (275)
    const panelY = this.reelStartY + 280; // Position to align bottom with controls
    const panelWidth = 240;
    const panelHeight = 300;

    // Main background panel
    const mainBg = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x000000, 0.9);
    mainBg.setStrokeStyle(2, 0xFFD700);
    mainBg.setDepth(10);

    // === PAYLINES SECTION (TOP) ===
    const paylinesY = panelY - 80;
    
    // Paylines title
    const titleStyle = {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 2
    };
    this.add.text(panelX, paylinesY - 60, 'PAYLINES', titleStyle).setOrigin(0.5).setDepth(11);

    // Group paylines into 4 logical groups with individual colors for each line
    const paylineGroups = [
      { 
        lines: [0, 1, 2], 
        colors: [0xFF4444, 0xFF8888, 0xFFAAAA], // Red variations
        label: '1-3' 
      },
      { 
        lines: [3, 4], 
        colors: [0x44FF44, 0x88FF88], // Green variations
        label: '4-5' 
      },
      { 
        lines: [5, 6], 
        colors: [0x4444FF, 0x8888FF], // Blue variations
        label: '6-7' 
      },
      { 
        lines: [7, 8], 
        colors: [0xFFFF44, 0xFFFF88], // Yellow variations
        label: '8-9' 
      }
    ];

    const miniGridSize = 40;
    const cellSize = 6;
    const gridSpacing = 60; // Closer spacing for 2x2 layout

    paylineGroups.forEach((group, groupIndex) => {
      // 2x2 layout: 2 columns, 2 rows
      const col = groupIndex % 2;
      const row = Math.floor(groupIndex / 2);
      const gridX = panelX - 30 + col * gridSpacing;
      const gridY = paylinesY - 20 + row * 60; // Moved down (-20 vs -30) and added padding (60 vs 50)

      // Mini grid background
      const miniGridBg = this.add.rectangle(gridX, gridY, miniGridSize + 8, miniGridSize + 8, 0x222222, 0.8);
      miniGridBg.setStrokeStyle(1, 0x666666);
      miniGridBg.setDepth(11);

      // Label
      const labelStyle = {
        fontFamily: 'Arial',
        fontSize: '8px',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 1
      };
      this.add.text(gridX, gridY - 25, group.label, labelStyle).setOrigin(0.5).setDepth(12);

      // Draw mini grid cells
      for (let reel = 0; reel < 5; reel++) {
        for (let row = 0; row < 3; row++) {
          const cellX = gridX - 15 + reel * cellSize;
          const cellY = gridY - 9 + row * cellSize;
          
          const cell = this.add.rectangle(cellX, cellY, cellSize - 1, cellSize - 1, 0x444444, 0.6);
          cell.setStrokeStyle(0.5, 0x888888);
          cell.setDepth(11);
        }
      }

      // Draw paylines for this group with different colors for each line
      group.lines.forEach((lineIndex, colorIndex) => {
        if (lineIndex < config.paylinesDefinition.length) {
          const payline = config.paylinesDefinition[lineIndex];
          const graphics = this.add.graphics();
          graphics.setDepth(13);
          graphics.lineStyle(1.5, group.colors[colorIndex], 1.0);

          payline.forEach((position, posIndex) => {
            const [reel, row] = position;
            const x = gridX - 15 + reel * cellSize;
            const y = gridY - 9 + row * cellSize;

            if (posIndex === 0) {
              graphics.moveTo(x, y);
            } else {
              graphics.lineTo(x, y);
            }
          });
          graphics.strokePath();
        }
      });
    });

    // === HELPER TEXT SECTION (BOTTOM) ===
    const helperY = panelY + 60;
    const iconSize = 26; // Increased from 20 to 26
    const textStyle = {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 1,
      wordWrap: { width: 130 }
    };

    // Helper text 1: Free Spins trigger
    const fireIconBox = this.add.rectangle(panelX - 85, helperY - 45, iconSize + 4, iconSize + 4, 0xFFFFFF, 1.0);
    fireIconBox.setStrokeStyle(1, 0x000000).setDepth(11);
    
    const fireIcon = this.add.image(panelX - 85, helperY - 45, 'fire');
    fireIcon.setDisplaySize(iconSize, iconSize).setDepth(12);
    
    const freeSpinsText = this.add.text(panelX - 60, helperY - 45, '3 Fire symbols\ntrigger Free Spins!', textStyle);
    freeSpinsText.setOrigin(0, 0.5).setDepth(11);

    // Helper text 2: Puppy Bonus trigger
    const elsiIconBox = this.add.rectangle(panelX - 85, helperY - 5, iconSize + 4, iconSize + 4, 0xFFFFFF, 1.0);
    elsiIconBox.setStrokeStyle(1, 0x000000).setDepth(11);
    
    const elsiIcon = this.add.image(panelX - 85, helperY - 5, 'elsi');
    elsiIcon.setDisplaySize(iconSize, iconSize).setDepth(12);
    
    const puppyBonusText = this.add.text(panelX - 60, helperY - 5, '3 Puppies trigger\nPuppy Pick Bonus!', textStyle);
    puppyBonusText.setOrigin(0, 0.5).setDepth(11);

    // Helper text 3: Wild explanation
    const loonIconBox = this.add.rectangle(panelX - 85, helperY + 35, iconSize + 4, iconSize + 4, 0xFFFFFF, 1.0);
    loonIconBox.setStrokeStyle(1, 0x000000).setDepth(11);
    
    const loonIcon = this.add.image(panelX - 85, helperY + 35, 'loon');
    loonIcon.setDisplaySize(iconSize, iconSize).setDepth(12);
    
    const wildText = this.add.text(panelX - 60, helperY + 35, 'Wild Loons substitute\nfor all except', textStyle);
    wildText.setOrigin(0, 0.5).setDepth(11);
    
    // Small fire and elsi icons after "except" with white boxes
    const fireIconSmallBox = this.add.rectangle(panelX + 20, helperY + 45, 22, 22, 0xFFFFFF, 1.0);
    fireIconSmallBox.setStrokeStyle(1, 0x000000).setDepth(11);
    
    const fireIconSmall = this.add.image(panelX + 20, helperY + 45, 'fire');
    fireIconSmall.setDisplaySize(18, 18).setDepth(12); // Increased from 14 to 18
    
    const elsiIconSmallBox = this.add.rectangle(panelX + 40, helperY + 45, 22, 22, 0xFFFFFF, 1.0);
    elsiIconSmallBox.setStrokeStyle(1, 0x000000).setDepth(11);
    
    const elsiIconSmall = this.add.image(panelX + 40, helperY + 45, 'elsi');
    elsiIconSmall.setDisplaySize(18, 18).setDepth(12); // Increased from 14 to 18

    console.log("MainScene: Combined info panel created");
  }

  spin(bet) {
    if (this.reelState !== 'idle') { 
      console.warn(`MainScene: Spin blocked, state is: ${this.reelState}`); 
      return; 
    }
    this.animationManager.cleanupAnticipationEffects();
    this.inAnticipation = false;

    console.log(`MainScene: spin() called with bet ${bet}. State changing to 'spinning'.`);
    this.currentBet = bet;
    this.reelState = 'spinning';
    
    this.sound.play('sfx_reel_start');

    
    // Clear all previous win displays
    console.log("MainScene: Clearing win displays.");
    this.winDisplayManager.clearWinDisplays();
    this.animationManager.cleanupAnticipationEffects();
    
    // NEW: Get weighted outcome instead of generating random result
    const outcome = this.outcomeManager.getBaseGameOutcome();
    console.log("MainScene: Got weighted outcome:", outcome);
    
    // Generate symbol board based on the outcome
    const symbolBoard = this.boardGenerator.generateSymbolBoardFromOutcome(outcome, bet);
    console.log("MainScene: Generated symbol board:", symbolBoard);
    
    this.animationManager.runSpinAnimation(symbolBoard, outcome);
  }




  generateSpinResult() {
    return generateSpinResult(this.outcomeManager);
  }
  

  evaluateWin(finalBoard, outcome) {
    if (this.reelState !== 'spinning') { 
      console.warn(`MainScene: evaluateWin called state: ${this.reelState}.`); 
      if (this.reelState !== 'bonus') { 
        this.reelState = 'idle'; 
        this.resetUISceneSpinningFlag(); 
      } 
      return; 
    }
    
    this.reelState = 'evaluation';
    
    console.log("=== BOARD DEBUG ===");
    console.log("Expected finalBoard:", finalBoard);
    
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
    console.log("=== END BOARD DEBUG ==="); 
    console.log("MainScene: evaluateWin() -> 'evaluation'."); 
    console.log("MainScene: Final board:", finalBoard); 
    console.log("MainScene: Outcome:", outcome);
    
    const { totalWin, winningLines } = this.winEvaluator.evaluateWins(finalBoard, this.currentBet); 
    const bonusInfo = this.winEvaluator.checkBonusTriggers(finalBoard, outcome); 
    console.log("MainScene: Bonus check results:", bonusInfo); 
    
    // Handle bonus launches through BonusManager
    const bonusLaunched = this.bonusManager.handleBonusLaunch(bonusInfo); 
    
    if (!bonusLaunched) { 
      if (winningLines.length > 0) { 
        console.log(`MainScene: Win! Amount: ${totalWin}.`); 

        // Claude suggested change on 2025-06-08: Use completion callback instead of fixed delay
        this.winDisplayManager.showWinningLines(winningLines, this.currentBet, {}, () => {
          console.log("MainScene: All win animations completed, re-enabling spin button.");
          if (this.reelState === 'evaluation') { 
            this.reelState = 'idle'; 
            console.log("MainScene: State -> 'idle' after all win animations."); 
            this.resetUISceneSpinningFlag(); 
          } else { 
            console.log("MainScene: State wrong in win completion callback."); 
          }
        }); 
        this.sound.play('sfx_win_small');

        this.events.emit('win', { amount: totalWin, lines: winningLines }); 
      } else { 
        console.log("MainScene: No win."); 
        this.events.emit('win', { amount: 0 }); 
        this.reelState = 'idle'; 
        console.log("MainScene: State -> 'idle' (no win)."); 
        this.resetUISceneSpinningFlag(); 
      } 
    } else { 
      console.log("MainScene: Bonus launched."); 
    }
  }

  getCurrentBoardState() {
    const currentBoard = []; for (let reel = 0; reel < config.reels; reel++) { currentBoard[reel] = []; const reelSprites = this.symbolSprites[reel]; const expectedLen = config.rows + 1; if (!reelSprites || reelSprites.length !== expectedLen) { console.error(`MainScene: Reel ${reel} unexpected length ${reelSprites?.length}. Reading fallback.`); if (reelSprites?.length === config.rows) { for (let row = 0; row < config.rows; row++) { currentBoard[reel][row] = reelSprites[row]?.texture.key || '__DEFAULT'; }} else {for (let row = 0; row < config.rows; row++) currentBoard[reel][row] = '__DEFAULT';} } else { for (let row = 0; row < config.rows; row++) { currentBoard[reel][row] = reelSprites[row + 1]?.texture.key || '__DEFAULT'; } } } return currentBoard;
  }



  resetUISceneSpinningFlag() {
    console.log("MainScene: Attempting direct reset UIScene.isSpinning"); this.sys.events.emit('spinCompleteGlobal'); console.log("MainScene: Emitted 'spinCompleteGlobal'"); const uiScene = this.scene.manager.getScene('UIScene'); if (uiScene) { if (typeof uiScene.isSpinning !== 'undefined') { console.log(`MainScene: Found UIScene. isSpinning: ${uiScene.isSpinning}. Setting false.`); uiScene.isSpinning = false; if (uiScene.spinButton) { uiScene.spinButton.clearTint(); console.log("MainScene: Cleared spin button tint."); } } else { console.warn("MainScene: UIScene missing 'isSpinning'."); } } else { console.error("MainScene: Could not find UIScene to reset flag!"); }
  }

  applyMaskToAll() {
    console.log("MainScene: applyMaskToAll() called."); if (!this.compositeMask) { console.error("MainScene: Mask missing!"); return; } let spritesMaskedCount = 0; for (let reel = 0; reel < config.reels; reel++) { if (!this.symbolSprites[reel]) { continue; } for (let i = 0; i < this.symbolSprites[reel].length; i++) { const sprite = this.symbolSprites[reel][i]; if (sprite && typeof sprite.setMask === 'function') { sprite.setVisible(true); sprite.setMask(this.compositeMask); spritesMaskedCount++; } } } console.log(`MainScene: Applied mask to ${spritesMaskedCount} sprites.`);
  }

  
  

  // Claude suggested addition on 2025-06-08: Background music system
  setupBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.destroy();
    }

    this.backgroundMusic = this.sound.add('music_main', {
      volume: 0.3, // Quieter volume
      loop: true
    });

    // Start with fade in to handle non-perfect loop
    this.backgroundMusic.play();
    this.backgroundMusic.setVolume(0);
    
    this.tweens.add({
      targets: this.backgroundMusic,
      volume: 0.3,
      duration: 1000,
      ease: 'Power2'
    });

    console.log("MainScene: Background music started");
  }

  pauseBackgroundMusic() {
    if (this.backgroundMusic) {
      // Stop immediately instead of fade out to prevent overlapping
      this.backgroundMusic.stop();
    }
  }

  resumeBackgroundMusic() {
    if (this.backgroundMusic && !this.backgroundMusic.isPlaying) {
      // Restart the music instead of resuming since we stopped it
      this.backgroundMusic.play();
      this.backgroundMusic.setVolume(0.3);
    }
  }

  // Claude suggested addition on 2025-07-01: Setup keyboard shortcuts for game controls
  setupKeyboardControls() {
    // Claude suggested fix on 2025-07-01: Remove any existing listeners first to prevent conflicts
    this.input.keyboard.off('keydown-UP');
    this.input.keyboard.off('keydown-DOWN');
    this.input.keyboard.off('keydown-SPACE');
    this.input.keyboard.off('keydown-ESC');
    this.input.keyboard.off('keydown-PLUS');
    this.input.keyboard.off('keydown-P');
    this.input.keyboard.off('keydown-C'); // Claude suggested addition on 2025-07-01: C key for cashout test
    
    // Up arrow - Increase bet
    this.input.keyboard.on('keydown-UP', () => {
      const uiScene = this.scene.manager.getScene('UIScene');
      if (uiScene && !uiScene.isCashoutDialogActive && typeof uiScene.increaseBet === 'function') {
        uiScene.increaseBet();
      }
    });
    
    // Down arrow - Decrease bet
    this.input.keyboard.on('keydown-DOWN', () => {
      const uiScene = this.scene.manager.getScene('UIScene');
      if (uiScene && !uiScene.isCashoutDialogActive && typeof uiScene.decreaseBet === 'function') {
        uiScene.decreaseBet();
      }
    });
    
    // Space bar - Spin
    this.input.keyboard.on('keydown-SPACE', () => {
      const uiScene = this.scene.manager.getScene('UIScene');
      if (uiScene && !uiScene.isCashoutDialogActive && typeof uiScene.onSpinClick === 'function') {
        uiScene.onSpinClick();
      }
    });
    
    // Escape key - Cashout
    this.input.keyboard.on('keydown-ESC', () => {
      const uiScene = this.scene.manager.getScene('UIScene');
      if (uiScene && !uiScene.isCashoutDialogActive && typeof uiScene.showCashoutConfirmation === 'function') {
        uiScene.showCashoutConfirmation();
      }
    });
    
    // Plus key - Add credits
    this.input.keyboard.on('keydown-PLUS', () => {
      const uiScene = this.scene.manager.getScene('UIScene');
      if (uiScene && !uiScene.isCashoutDialogActive && typeof uiScene.addDebugCredits === 'function') {
        uiScene.addDebugCredits();
      }
    });
    
    // P key - Paytable
    this.input.keyboard.on('keydown-P', () => {
      const uiScene = this.scene.manager.getScene('UIScene');
      if (uiScene && !uiScene.isCashoutDialogActive && typeof uiScene.showPaytable === 'function') {
        uiScene.showPaytable();
      }
    });
    
    // Claude suggested addition on 2025-07-01: C key - Cashout
    this.input.keyboard.on('keydown-C', () => {
      const uiScene = this.scene.manager.getScene('UIScene');
      if (uiScene && !uiScene.isCashoutDialogActive && typeof uiScene.showCashoutConfirmation === 'function') {
        uiScene.showCashoutConfirmation();
      }
    });
  }

  // --- DEBUG METHODS---
  triggerDebugFreeSpins() {
    this.bonusManager.triggerDebugFreeSpins();
  }

  triggerDebugPuppy() {
    this.bonusManager.triggerDebugPuppy();
  }
} 