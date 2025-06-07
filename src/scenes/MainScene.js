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
    this.cleanupAnticipationEffects();


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

cleanupAnticipationEffects() {
  this.inAnticipation = false;

  // Clean up all anticipation elements
  if (this.anticipationElements) {
    Object.values(this.anticipationElements).forEach(el => el?.destroy());
    this.anticipationElements = null;
  }
  
  if (this.scatterGlows) {
    this.scatterGlows.forEach(g => g?.destroy());
    this.scatterGlows = [];
  }

  if (this.anticipationSpotlights) {
    this.anticipationSpotlights.forEach(s => s.destroy());
    this.anticipationSpotlights = null;
  }
  
  
  // Clean up any spotlight effects
  this.children.list.forEach(child => {
    if (child && child.type === 'Circle' && child.blendMode === Phaser.BlendModes.ADD) {
      child.destroy();
    }
  });
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
  const symbolOptions = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi');
  
  this.applyMaskToAll();
  this.spinSequences = [];
  
  // Track scatter positions for anticipation
  const scatterPositions = [];
  let scattersLanded = 0;

  // PRE-DETECTION: Analyze finalBoard for scatter anticipation potential
console.log("=== PRE-DETECTION ANALYSIS ===");
console.log("Final board for this spin:", finalBoard);

let scatterReels = [];
for (let r = 0; r < config.reels; r++) {
  for (let row = 0; row < config.rows; row++) {
    if (finalBoard[r][row] === 'fire') {
      scatterReels.push(r);
      console.log(`PRE-DETECT: Scatter found at reel ${r}, row ${row}`);
      break; // Only count one scatter per reel
    }
  }
}

console.log("PRE-DETECT: Scatter reels:", scatterReels);
console.log("PRE-DETECT: Scatter count:", scatterReels.length);

// Determine if we should pre-set anticipation mode
let shouldAnticipate = false;
let anticipationReels = [];

if (scatterReels.length === 2) {
  shouldAnticipate = true;
  const lastScatterReel = Math.max(...scatterReels);
  console.log("PRE-DETECT: Last scatter reel:", lastScatterReel);
  
  // All reels AFTER the last scatter reel need anticipation
  for (let r = lastScatterReel + 1; r < config.reels; r++) {
    anticipationReels.push(r);
  }
  
  console.log("PRE-DETECT: Reels that need anticipation:", anticipationReels);
  
  if (anticipationReels.length > 0) {
    this.inAnticipation = true;
    this.anticipationReels = anticipationReels;
    console.log("PRE-DETECT: Setting this.inAnticipation = true");
    console.log("PRE-DETECT: Setting this.anticipationReels =", this.anticipationReels);
  } else {
    console.log("PRE-DETECT: No reels need anticipation (last scatter is on final reel)");
  }
} else {
  console.log("PRE-DETECT: Not a 2-scatter situation, no anticipation needed");
}

console.log("=== END PRE-DETECTION ===");
  
  // Create spin sequences (same as before)
  // Create spin sequences with correct final positioning
for (let reel = 0; reel < config.reels; reel++) {
  let reelTotalShifts = baseTotalShifts + reel * reelDelayFactor;
  
  // Extend sequences for anticipation reels
  if (this.inAnticipation && this.anticipationReels && this.anticipationReels.includes(reel)) {
    const anticipationIndex = this.anticipationReels.indexOf(reel);
    const extraShifts = 50 + (anticipationIndex * 25); // DO NOT REMOVE THIS COMMENT. Always keep in line with animation execution
    reelTotalShifts += extraShifts;
    console.log(`SEQUENCE: Reel ${reel} getting ${extraShifts} extra shifts, total: ${reelTotalShifts}`);
  }
  
  let seq = [];
  const finalBlockLength = config.rows + 1;

    for (let i = 0; i < reelTotalShifts - finalBlockLength; i++) {
        seq.push(symbolOptions[Math.floor(Math.random() * symbolOptions.length)]);
    }

    for (let row = config.rows - 1; row >= 0; row--) {
        seq.push(finalBoard[reel][row]);
    }
    seq.push(symbolOptions[Math.floor(Math.random() * symbolOptions.length)]);

    this.spinSequences[reel] = seq;
  }
  
  // Set up sprites (same as before)
  for (let reel = 0; reel < config.reels; reel++) {
    if (!this.symbolSprites[reel]) this.symbolSprites[reel] = [];
    if (this.symbolSprites[reel].length !== config.rows + 1) {
      this.symbolSprites[reel].forEach(s => s.destroy()); 
      this.symbolSprites[reel] = [];
      
      let x_above = startX + reel * reelWidth;
      let y_above = startY - reelHeight;
      let tex_above = this.spinSequences[reel]?.[0] || symbolOptions[0];
      this.symbolSprites[reel].push(this.add.sprite(x_above, y_above, tex_above)
        .setDisplaySize(symbolDisplaySize, symbolDisplaySize)
        .setDepth(5)
        .setMask(this.compositeMask));
      
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
    
    if(this.symbolSprites[reel][0]) {
      this.symbolSprites[reel][0].y = startY - reelHeight;
      let tex = this.spinSequences[reel]?.[0] || symbolOptions[0];
      this.symbolSprites[reel][0].setTexture(tex).setVisible(true).setMask(this.compositeMask);
    }
  }
  
  let reelsFinished = 0;
  const animateReel = (reel, shiftsRemaining, slowdownFactor = 1) => {
    if (shiftsRemaining <= 0) {
      reelsFinished++;
      this.sound.play('sfx_reel_stop');

      // Check if scatter landed on this reel
      for (let row = 0; row < config.rows; row++) {
        if (finalBoard[reel][row] === 'fire') {
          scattersLanded++;
          scatterPositions.push({ reel, row });
          this.sound.play('sfx_scatter_landed');

          
          // Create scatter glow effect
          const x = startX + reel * reelWidth;
          const y = startY + row * reelHeight;
          this.createScatterGlow(x, y);
          
          // Check if we need anticipation mode
          if (scattersLanded === 2 && reelsFinished < config.reels) {
            this.enterScatterAnticipation(scatterPositions);
          }
        }
      }
      
      if (reelsFinished === config.reels) {
        // Check if we were close to bonus
        if (scattersLanded === 2) {
          this.showNearMissEffect();
        }
        
        this.time.delayedCall(100, () => {
          const actualBoard = this.getCurrentBoardState();
          console.log("Expected finalBoard:", finalBoard);
          console.log("Actual board:", actualBoard);
          this.evaluateWin(finalBoard, outcome);
        });
      }
      return;
    }
    
    if(!this.symbolSprites[reel] || this.symbolSprites[reel].length === 0) {
      animateReel(reel, 0);
      return;
    }
    
    // Apply slowdown if in anticipation mode
    // Apply dramatic slowdown for anticipation reels in final moments
    // Calculate interval - completely separate logic for anticipation vs normal reels
let actualInterval;

if (this.inAnticipation && this.anticipationReels && this.anticipationReels.includes(reel)) {
  // Anticipation reels: Use single smooth curve instead of phases
  if (shiftsRemaining <= 50) {
    // Single smooth exponential curve from normal speed to very slow
    const progress = (50 - shiftsRemaining) / 50; // 0.0 to 1.0
    const smoothFactor = 1 + (progress * progress * progress * 2); // Cubic curve, max 3x slower
    actualInterval = spinInterval * smoothFactor;
  } else {
    actualInterval = spinInterval; // Normal speed
  }
} else {
  // Non-anticipation reels: Use existing system
  actualInterval = spinInterval * slowdownFactor;
}
    
    this.tweens.add({
      targets: this.symbolSprites[reel],
      y: `+=${reelHeight}`,
      duration: actualInterval,
      ease: 'Linear',
      onComplete: () => {
        let off = this.symbolSprites[reel]?.[this.symbolSprites[reel].length - 1];
        if (!off) {
          // Don't pass slowdown factor for anticipation reels - we handle timing internally
if (this.inAnticipation && this.anticipationReels && this.anticipationReels.includes(reel)) {
  animateReel(reel, shiftsRemaining - 1, 1); // Always pass 1 for anticipation reels
} else {
  animateReel(reel, shiftsRemaining - 1, slowdownFactor); // Normal logic for others
}
          return;
        }
        
        let tex = this.spinSequences[reel]?.shift() || symbolOptions[0];
        off.setTexture(tex)
          .setScale(1)
          .setAlpha(1)
          .setDisplaySize(symbolDisplaySize, symbolDisplaySize)
          .setMask(this.compositeMask);
        off.y = startY - reelHeight;
        
        this.symbolSprites[reel].pop();
        this.symbolSprites[reel].unshift(off);
        
        // Add stutter effect if 2 scatters and approaching end
        // if (scattersLanded === 2 && shiftsRemaining <= 5 && reel >= 2) {
        //   // Random stutter
        //   if (Math.random() < 0.6) {
        //     this.time.delayedCall(50, () => {
        //       animateReel(reel, shiftsRemaining - 1, slowdownFactor * 1.5);
        //     });
        //     return;
        //   }
        // }
        
        // Don't pass slowdown factor for anticipation reels - we handle timing internally
if (this.inAnticipation && this.anticipationReels && this.anticipationReels.includes(reel)) {
  animateReel(reel, shiftsRemaining - 1, 1); // Always pass 1 for anticipation reels
} else {
  animateReel(reel, shiftsRemaining - 1, slowdownFactor); // Normal logic for others
}
      },
      callbackScope: this
    });
  };
  
  // Store animateReel function for scatter anticipation
  this.currentAnimateReel = animateReel;
  
  for (let reel = 0; reel < config.reels; reel++) {
    let extraShifts = 0;
    // TEMPORARILY DISABLED FOR TESTING
    // if (this.inAnticipation && reel >= 2) {
    //   extraShifts = 150;
    // }
    let totalShiftsForReel = baseTotalShifts + reel * reelDelayFactor + extraShifts;
    
    // For anticipation reels, we need to use the EXTENDED shift count that was used to build the sequence
    if (this.inAnticipation && this.anticipationReels && this.anticipationReels.includes(reel)) {
      const anticipationIndex = this.anticipationReels.indexOf(reel);
      const extraShifts = 50 + (anticipationIndex * 25); // Same calculation as sequence generation
      totalShiftsForReel = baseTotalShifts + reel * reelDelayFactor + extraShifts;
      console.log(`ANIMATE: Reel ${reel} using extended shifts: ${totalShiftsForReel} (was ${baseTotalShifts + reel * reelDelayFactor})`);
    }
    
    console.log(`ANIMATE: Starting reel ${reel} with ${totalShiftsForReel} shifts (sequence length: ${this.spinSequences[reel]?.length})`);
    animateReel(reel, totalShiftsForReel);
  }
  
  
  // Track potential big wins for anticipation
  this.checkForAnticipation(finalBoard, outcome);
}

// NEW: Check for anticipation moments
checkForAnticipation(finalBoard, outcome) {
  // Check if this is a big win or bonus trigger
  const isBigWin = outcome.type.includes('large') || outcome.type.includes('huge') || 
                   outcome.type.includes('bonus') || outcome.type.includes('free_spins');
  
  if (isBigWin) {
    // Add anticipation sound when last reel is spinning
    this.time.delayedCall(2000, () => {
      if (this.sound.get('bonusSound')) {
        this.sound.play('bonusSound', { volume: 0.3 });
      }
    });
  }
}

createScatterGlow(x, y) {
  // Create pulsing glow effect
  const glow = this.add.sprite(x, y, 'fire')
    .setScale(1.2)
    .setAlpha(0.6)
    .setDepth(20)
    .setTint(0xFFAA00);
  
  this.tweens.add({
    targets: glow,
    scale: 1.5,
    alpha: 0.3,
    duration: 800,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });
  
  // Store for cleanup
  if (!this.scatterGlows) this.scatterGlows = [];
  this.scatterGlows.push(glow);
}

enterScatterAnticipation(scatterPositions) {
  this.inAnticipation = true;

  // Darken the screen except scatters
  const darkOverlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.5)
    .setDepth(15);
  
    this.anticipationSpotlights = [];
  
  // Make scatters shine through
  scatterPositions.forEach(pos => {
    const x = 350 + pos.reel * 150;
    const y = this.reelStartY + pos.row * 150;
    
    // Create spotlight effect
    const spotlight = this.add.circle(x, y, 80, 0xFFFFFF, 0.2)
      .setDepth(16)
      .setBlendMode(Phaser.BlendModes.ADD);
    
    this.tweens.add({
      targets: spotlight,
      scale: { from: 0.8, to: 1.2 },
      alpha: { from: 0.2, to: 0.4 },
      duration: 600,
      yoyo: true,
      repeat: -1
    });
    // STORE IT FOR CLEANUP
  this.anticipationSpotlights.push(spotlight);

  });
  
  // Show "1 MORE!" text
  const oneMoreText = this.add.text(640, 200, '1 MORE!', {
    fontSize: '48px',
    color: '#FFD700',
    stroke: '#000000',
    strokeThickness: 4,
    fontFamily: 'Arial Black'
  })
  .setOrigin(0.5)
  .setDepth(100)
  .setScale(0);
  
  this.tweens.add({
    targets: oneMoreText,
    scale: { from: 0, to: 1.2 },
    duration: 300,
    ease: 'Back.easeOut',
    yoyo: true,
    repeat: -1,
    hold: 200
  });
  
  // Slow down remaining reels
  for (let r = 2; r < config.reels; r++) {
    if (this.symbolSprites[r]) {
      // Add extra spins to remaining reels
      if (this.spinSequences[r]) {
        for (let i = 0; i < 1000; i++) {
          this.spinSequences[r].unshift(this.outcomeManager.getSymbolIds()
            .filter(s => s !== 'elsi')[Math.floor(Math.random() * 10)]);
        }
      }
    }
  }
  
  // Store elements for cleanup
  this.anticipationElements = { darkOverlay, oneMoreText };
}

showNearMissEffect() {
  // Clean up anticipation elements
  if (this.anticipationElements) {
    Object.values(this.anticipationElements).forEach(el => el?.destroy());
  }
  this.sound.play('sfx_near_miss');

  
  if (this.scatterGlows) {
    this.scatterGlows.forEach(g => g?.destroy());
  }
  
  // Quick flash effect for near miss
  const flash = this.add.rectangle(640, 360, 1280, 720, 0xFF6600, 0.3)
    .setDepth(50);
  
  this.tweens.add({
    targets: flash,
    alpha: 0,
    duration: 500,
    onComplete: () => flash.destroy()
  });
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
    this.cleanupAnticipationEffects();
    this.inAnticipation = false;

    console.log(`MainScene: spin() called with bet ${bet}. State changing to 'spinning'.`);
    this.currentBet = bet;
    this.reelState = 'spinning';
    
    this.sound.play('sfx_reel_start');

    
    if (this.winLineGraphics) { 
      console.log("MainScene: Clearing win lines."); 
      this.winLineGraphics.clear(); 
    }
    this.cleanupAnticipationEffects();

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

  // NEW METHOD: Create empty board
  createEmptyBoard() {
    return Array(config.reels).fill().map(() => Array(config.rows).fill(null));
  }

  // NEW METHOD: Generate no-win board
  generateNoWinBoard() {
    const board = this.createEmptyBoard();
    const symbols = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi');
    
    // Include wilds occasionally but ensure no wins
    for (let r = 0; r < config.reels; r++) {
      const usedInReel = [];
      for (let row = 0; row < config.rows; row++) {
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
    
    // Verify no accidental wins
    const wins = this.evaluateWins(board, this.currentBet);
    if (wins.totalWin > 0) {
      // If we accidentally created a win, try again
      return this.generateNoWinBoard();
    }
    
    return board;
  }

  // NEW METHOD: Generate winning board
  generateWinBoard(symbolPool, matchLength, outcome, bet) {
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

  // NEW METHOD: Generate random board
  generateRandomBoard() {
    const board = this.createEmptyBoard();
    const symbols = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi');
    
    for (let r = 0; r < config.reels; r++) {
      let hasScatterOnReel = false;
      for (let row = 0; row < config.rows; row++) {
        // 5% chance for wild in random boards
        if (Math.random() < 0.05) {
          board[r][row] = 'loon';
        } else {
          // Very rare chance for scatter (0.5%) but max 1 per reel
          if (Math.random() < 0.005 && !hasScatterOnReel) {
            board[r][row] = 'fire';
            hasScatterOnReel = true;
          } else {
            board[r][row] = symbols[Math.floor(Math.random() * symbols.length)];
          }
        }
      }
    }
    return board;
  }

  // NEW METHOD: Generate scatter board
  // NEW METHOD: Generate scatter board
generateScatterBoard(scatterCount) {
  const board = this.generateRandomBoard();
  
  // Clear any scatters that may have been randomly placed
  for (let r = 0; r < config.reels; r++) {
    for (let row = 0; row < config.rows; row++) {
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
    const row = Math.floor(Math.random() * config.rows);
    board[reel][row] = 'fire';
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

  // NEW: Generate near miss scatter board
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
      const row = Math.floor(Math.random() * config.rows);
      
      // Clear any existing scatters on this reel first
      for (let r = 0; r < config.rows; r++) {
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

  // NEW: Generate near miss bonus board
  generateNearMissBonusBoard() {
    const board = this.generateRandomBoard();
    const payline = config.paylinesDefinition[Math.floor(Math.random() * config.paylinesDefinition.length)];
    
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

  // NEW: Generate tiny win board (2 symbols)
  generateTinyWinBoard(symbolPool, outcome, bet) {
    // Start with empty board to have full control
    const board = this.createEmptyBoard();
    const symbols = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi' && s !== 'loon');
    
    // Fill board with non-winning symbols first
    for (let r = 0; r < config.reels; r++) {
      for (let row = 0; row < config.rows; row++) {
        board[r][row] = symbols[Math.floor(Math.random() * symbols.length)];
      }
    }
    
    // Now place our intended tiny win
    const targetPayline = config.paylinesDefinition[Math.floor(Math.random() * config.paylinesDefinition.length)];
    const symbol = symbolPool[Math.floor(Math.random() * symbolPool.length)];
    
    // Place only 2 matching symbols
    board[targetPayline[0][0]][targetPayline[0][1]] = symbol;
    board[targetPayline[1][0]][targetPayline[1][1]] = symbol;
    
    // Ensure 3rd position is different to prevent extending the win
    const otherSymbols = symbols.filter(s => s !== symbol);
    board[targetPayline[2][0]][targetPayline[2][1]] = otherSymbols[Math.floor(Math.random() * otherSymbols.length)];
    
    // Verify the win is within expected range
    const wins = this.evaluateWins(board, bet);
    const winMultiplier = wins.totalWin / bet;
    
    if (winMultiplier < outcome.minWin || winMultiplier > outcome.maxWin) {
      // Try again if win is outside expected range
      return this.generateTinyWinBoard(symbolPool, outcome, bet);
    }
    
    return board;
  }

  // NEW: Generate tiny win with mixed symbols and wild
  generateTinyWinMixedBoard(outcome, bet) {
    // Start with empty board to have full control
    const board = this.createEmptyBoard();
    const symbols = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi' && s !== 'loon');
    
    // Fill board with non-winning symbols first
    for (let r = 0; r < config.reels; r++) {
      for (let row = 0; row < config.rows; row++) {
        board[r][row] = symbols[Math.floor(Math.random() * symbols.length)];
      }
    }
    
    // Pick a high value symbol and a payline
    const highSymbols = ['pam_mike', 'grant'];
    const symbol = highSymbols[Math.floor(Math.random() * highSymbols.length)];
    const targetPayline = config.paylinesDefinition[Math.floor(Math.random() * config.paylinesDefinition.length)];
    
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
    
    // Verify the win is within expected range
    const wins = this.evaluateWins(board, bet);
    const winMultiplier = wins.totalWin / bet;
    
    if (winMultiplier < outcome.minWin || winMultiplier > outcome.maxWin) {
      // Try again if win is outside expected range
      return this.generateTinyWinMixedBoard(outcome, bet);
    }
    
    return board;
  }

  // NEW: Generate multi-line win board
  generateMultiLineBoard(minLines, maxLines, outcome, bet) {
    // Start with controlled board
    const board = this.createEmptyBoard();
    const symbols = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi' && s !== 'loon');
    
    // Fill with non-winning symbols
    for (let r = 0; r < config.reels; r++) {
      for (let row = 0; row < config.rows; row++) {
        board[r][row] = symbols[Math.floor(Math.random() * symbols.length)];
      }
    }
    
    const numLines = Math.floor(Math.random() * (maxLines - minLines + 1)) + minLines;
    const usedPaylines = [];
    
    // Select random paylines
    const availablePaylines = [...Array(config.paylinesDefinition.length).keys()];
    for (let i = 0; i < numLines && availablePaylines.length > 0; i++) {
      const idx = Math.floor(Math.random() * availablePaylines.length);
      usedPaylines.push(availablePaylines[idx]);
      availablePaylines.splice(idx, 1);
    }
    
    // Create wins on selected paylines
    for (const paylineIdx of usedPaylines) {
      const payline = config.paylinesDefinition[paylineIdx];
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
    
    // Verify win is within expected range
    const wins = this.evaluateWins(board, bet);
    const winMultiplier = wins.totalWin / bet;
    
    if (winMultiplier < outcome.minWin || winMultiplier > outcome.maxWin) {
      // Try again if outside range
      return this.generateMultiLineBoard(minLines, maxLines, outcome, bet);
    }
    
    return board;
  }

  // NEW: Generate wild win board
  generateWildWinBoard(outcome, bet) {
    // Start with controlled board
    const board = this.createEmptyBoard();
    const symbols = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi' && s !== 'loon');
    
    // Fill with non-winning symbols
    for (let r = 0; r < config.reels; r++) {
      for (let row = 0; row < config.rows; row++) {
        board[r][row] = symbols[Math.floor(Math.random() * symbols.length)];
      }
    }
    
    // Pick a symbol and create a win with wild substitution
    const winSymbols = ['beer', 'flag', 'pam_mike', 'grant', 'logan', 'nick'];
    const symbol = winSymbols[Math.floor(Math.random() * winSymbols.length)];
    const targetPayline = config.paylinesDefinition[Math.floor(Math.random() * config.paylinesDefinition.length)];
    
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
    
    // Verify win is within expected range
    const wins = this.evaluateWins(board, bet);
    const winMultiplier = wins.totalWin / bet;
    
    if (winMultiplier < outcome.minWin || winMultiplier > outcome.maxWin) {
      // Try again if outside range
      return this.generateWildWinBoard(outcome, bet);
    }
    
    return board;
  }

  // NEW: Generate scatter pay board (no bonus trigger)
  generateScatterPayBoard(scatterCount) {
    const board = this.generateRandomBoard();
    
    // Ensure we don't try to place more scatters than reels
    scatterCount = Math.min(scatterCount, config.reels);
    
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
      const row = Math.floor(Math.random() * config.rows);
      
      // Clear any existing scatters on this reel first
      for (let r = 0; r < config.rows; r++) {
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




  generateSpinResult() {
    const result = []; const symbolOptions = config.symbols.map(s => s.id).concat([config.wild?.id, config.scatter?.id, config.bonus?.id]).filter(Boolean); const regularSymbols = config.symbols.map(s => s.id).concat([config.wild?.id]).filter(Boolean); const scatterId = config.scatter?.id; const bonusId = config.bonus?.id; for (let reel = 0; reel < config.reels; reel++) { result[reel] = []; let hasScatter = false; let hasBonus = false; for (let row = 0; row < config.rows; row++) { let chosenSymbol; let validSymbol = false; let attempts = 0; while (!validSymbol && attempts < 20) { chosenSymbol = symbolOptions[Math.floor(Math.random() * symbolOptions.length)]; if (chosenSymbol === scatterId) { if (!hasScatter) { validSymbol = true; hasScatter = true; } else { chosenSymbol = regularSymbols[Math.floor(Math.random() * regularSymbols.length)]; validSymbol = true; } } else if (chosenSymbol === bonusId) { if (!hasBonus) { validSymbol = true; hasBonus = true; } else { chosenSymbol = regularSymbols[Math.floor(Math.random() * regularSymbols.length)]; validSymbol = true; } } else { validSymbol = true; } attempts++; } if (!validSymbol) { chosenSymbol = regularSymbols[Math.floor(Math.random() * regularSymbols.length)]; console.warn(`SpinResult fallback r${reel}`); } result[reel][row] = chosenSymbol; } } return result;
  }

  evaluateWin(finalBoard, outcome) {
    // Using Puppy Bonus names here
    if (this.reelState !== 'spinning') { 
      console.warn(`MainScene: evaluateWin called state: ${this.reelState}.`); 
      if (this.reelState !== 'bonus') { 
        this.reelState = 'idle'; 
        this.resetUISceneSpinningFlag(); 
      } 
      return; 
    }
    
    this.reelState = 'evaluation';
    
    // DEBUG: Log what we think the board should be
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
    console.log("=== END BOARD DEBUG ==="); 
    console.log("MainScene: evaluateWin() -> 'evaluation'."); 
    console.log("MainScene: Final board:", finalBoard); 
    console.log("MainScene: Outcome:", outcome);
    
    const { totalWin, winningLines } = this.evaluateWins(finalBoard); 
    const bonusInfo = this.checkBonusTriggers(finalBoard, outcome); 
    console.log("MainScene: Bonus check results:", bonusInfo); 
    
    let bonusLaunched = false;
    
    if (bonusInfo.freeSpins) { 
      bonusLaunched = true; 
      console.log(`MainScene: FS Trigger! Count: ${bonusInfo.freeSpinsCount}`); 
      
      // Clean up anticipation effects before launching bonus
      this.cleanupAnticipationEffects();
      
      if (this.sound.get('bonusSound')) this.sound.play('bonusSound'); 
      this.showFreeSpinsMessage(bonusInfo.freeSpinsCount); 
      this.time.delayedCall(2000, () => { 
        this.launchFreeSpins(bonusInfo.freeSpinsCount); 
      }); 
    } else if (bonusInfo.puppyBonus) { 
      bonusLaunched = true; 
      console.log(`MainScene: Puppy Bonus Trigger! Picks: ${bonusInfo.puppyBonusPicks}`);
      
      // Clean up anticipation effects before launching bonus
      this.cleanupAnticipationEffects();
      
      if (this.sound.get('bonusSound')) this.sound.play('bonusSound'); 
      this.showPuppyBonusMessage(bonusInfo.puppyBonusPicks); 
      this.time.delayedCall(2000, () => { 
        this.launchPuppyBonus(bonusInfo.puppyBonusPicks); 
      }); 
    } 
    
    if (!bonusLaunched) { 
      if (winningLines.length > 0) { 
        console.log(`MainScene: Win! Amount: ${totalWin}.`); 

        this.showWinningLines(winningLines); 
        this.sound.play('sfx_win_small');

        this.events.emit('win', { amount: totalWin, lines: winningLines }); 
        const winDisplayDuration = 1000; 
        console.log(`MainScene: Scheduling state idle in ${winDisplayDuration}ms.`); 
        this.time.delayedCall(winDisplayDuration, () => { 
          if (this.reelState === 'evaluation') { 
            this.reelState = 'idle'; 
            console.log("MainScene: State -> 'idle' after win delay."); 
            this.resetUISceneSpinningFlag(); 
          } else { 
            console.log("MainScene: State wrong in win delay callback."); 
          } 
        }, [], this); 
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

  evaluateWins(boardState) {
    const paylines = config.paylinesDefinition || [];
    let totalWin = 0;
    let winningLines = [];
    const wildSymbolKey = config.wild?.id;
    const scatterSymbolKey = config.scatter?.id;
    const bonusSymbolKey = config.bonus?.id;
    
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
      const symbolConfig = effectiveSymbol === wildSymbolKey ? config.wild : config.symbols.find(s => s.id === effectiveSymbol);
      
      if (symbolConfig?.pays?.[matchCount]) {
        const symbolPay = symbolConfig.pays[matchCount];
        const betPerLine = this.currentBet / (config.paylines || 9);
        const lineWin = symbolPay * betPerLine;
        
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
        if (boardState[r]?.[w] === scatterSymbolKey) {
          scatterCount++;
          scatterPositions.push([r, w]);
        }
      }
    }
    
    // Scatter pays (including 2 scatters now)
    if (scatterCount >= 2 && config.scatter?.pays?.[scatterCount]) {
      let scatterPay = config.scatter.pays[scatterCount];
      const scatterWinAmount = scatterPay * this.currentBet;
      
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
    const scatterId = config.scatter?.id;
    const bonusId = config.bonus?.id;
    const freeSpinsTriggerCount = config.freeSpins?.triggerCount || 3;
    const puppyBonusTriggerCount = config.puppyBonus?.triggerCount || 3;
    
    // Count scatters
    let scatterCount = 0;
    for (let r = 0; r < config.reels; r++) {
      for (let w = 0; w < config.rows; w++) {
        if (boardState[r]?.[w] === scatterId) scatterCount++;
      }
    }
    
    // Check if this is a scatter pay only (no bonus trigger)
    const isScatterPayOnly = outcome && outcome.type === 'scatter_pay_2';

    // Award free spins based on outcome type, not scatter count
    // This ensures scatter pays don't trigger free spins
    const triggersFreeSpin = outcome && outcome.type === 'free_spins_trigger';
    const freeSpinsAwarded = triggersFreeSpin ? 10 : 0; // Fixed 10 spins for trigger
    
    // Check for bonus symbols on paylines
    const paylines = config.paylinesDefinition || [];
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
this.sound.play('sfx_bonus_freespins_start');

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
this.sound.play('sfx_bonus_puppy_start');

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
    // Constants for visuals
    const NEON_COLORS = [
      0xFFD87C, // 1 - Sunset Gold
      0xFFA14A, // 2 - Sunset Orange
      0xF589A0, // 3 - Dusty Rose
      0x6DB5D5, // 4 - Lake Blue
      0x4E9459, // 5 - Pine Green
      0xB2C248, // 6 - Olive Green
      0x926943, // 7 - Cabin Brown
      0xA689C2, // 8 - Dusk Violet
      0xFFECC7, // 9 - Cream
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
  
    // ---- CLEAN UP previous win lines and pucks ----
    // Track all animated line graphics for cleanup
    if (!this.activeWinLines) this.activeWinLines = [];
    this.activeWinLines.forEach(g => g.destroy());
    this.activeWinLines = [];
  
    this.winLineGraphics.clear();
  
    // Remove old pucks and win labels
    this.children.list.forEach(child => {
      if (child.getData && child.getData('isWinPuck')) child.destroy();
      if (child.getData && child.getData('isWinLabel')) child.destroy();
    });
  
    // Remove previous total win text (if any)
    if (this.totalWinText && this.totalWinText.scene) this.totalWinText.destroy();
    this.totalWinText = null;
  
    // Prepare a map to stack win labels by row at OUTSIDE_X
    const rowLabelMap = {};
  
    const symbolEdge = (REEL_WIDTH * 0.7) / 2;
const symbolTopY = -symbolEdge;
const symbolBottomY = symbolEdge;
const maxRow = config.rows - 1;

const getLinePoints = (lineCoords) => lineCoords.map(([r, w], idx, arr) => {
  let x = START_X + r * REEL_WIDTH;
  let y = START_Y + w * REEL_HEIGHT;

  // Handle first point
  if (idx === 0) {
    x -= symbolEdge; // left edge
    // Only offset vertically if the next point is NOT the same row
    if (arr[1] && arr[1][1] !== w) {
      if (w === 0) y += symbolTopY;
      else if (w === maxRow) y += symbolBottomY;
    }
  }
  // Handle last point
  else if (idx === arr.length - 1) {
    x += symbolEdge; // right edge
    // Only offset vertically if the previous point is NOT the same row
    if (arr[idx - 1] && arr[idx - 1][1] !== w) {
      if (w === 0) y += symbolTopY;
      else if (w === maxRow) y += symbolBottomY;
    }
  }
  // All other points: stay at center

  return { x, y };
});
    
    

  
    // Helper for handling a single win line's animation and effects
    const animateLine = (winInfo, idx, runningTotal, onComplete) => {
      // Scatter win is handled instantly, not as a "snake"
      if (winInfo.lineIndex === -1) {
        // Highlight scatter symbols and show label
        winInfo.symbolPositions.forEach(([r, w]) => {
          this._drawPuckOverSymbol(r, w, 0xFFD700, PUCK_RADIUS);
        });
        this.showWinLabel(
          `SCATTER: ${winInfo.winAmount.toFixed(2)}`,
          this.cameras.main.centerX,
          START_Y - 55,
          0xFFD700
        );
        if (onComplete) onComplete(runningTotal);
        return;
      }
  
      // "Neon" color for line
      const color = NEON_COLORS[winInfo.lineIndex % NEON_COLORS.length];
      const payline = PAYLINES[winInfo.lineIndex];
      const points = getLinePoints(payline);
  
      // ---- Animate the main "snake" line ----
      const gfx = this.animateWinningLine(points, color, 900, () => {
        // Store reference for cleanup
        this.activeWinLines.push(gfx);
  
        // Neon "puck" burst over each symbol in the win
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
  
        if (onComplete) onComplete(runningTotal + winInfo.winAmount);
      });
      this.activeWinLines.push(gfx);
    };
  
    // Animate total win counter (0 -> total) in sync with line reveals
    const animateTotalWin = (from, to, onUpdate, onComplete) => {
      const steps = 20;
      let step = 0;
      const increment = (to - from) / steps;
      const doStep = () => {
        step++;
        const value = (step < steps) ? from + increment * step : to;
        if (onUpdate) onUpdate(value);
// --- ADD THIS: Notify UIScene to update the total win label ---
this.game.events.emit('updateTotalWinText', value);

        if (step < steps) {
          this.time.delayedCall(25, doStep, [], this);
        } else if (onComplete) {
          onComplete();
        }
      };
      doStep();
    };
  
    // ---- Sequence win lines and total win counting ----
    const animateNextLine = (idx, runningTotal) => {
      if (idx >= winningLines.length) {
        // After all lines, show stacked win labels (like before)
        this.time.delayedCall(1000, () => {
          Object.entries(rowLabelMap).forEach(([row, arr]) => {
            const baseY = START_Y + (row * REEL_HEIGHT);
            arr.forEach((info, i) => {
              this.showWinLabel(
                `WIN: ${info.amount.toFixed(2)}`,
                OUTSIDE_X,
                baseY + i * 32 - (arr.length - 1) * 16,
                info.color
              );
            });
          });
        });
        return;
      }
      const winInfo = winningLines[idx];
  
      animateLine(winInfo, idx, runningTotal, (newTotal) => {
        // Animate total win up to new value
        animateTotalWin(runningTotal, newTotal, value => {
          // Remove and update total win text
          if (this.totalWinText && this.totalWinText.scene) this.totalWinText.destroy();
          // let barX = 650, barY = 685; // Match your UIScene
          // let totalWinX = barX + 55;
          // let totalWinY = barY;

          // this.totalWinText = this.add.text(
          //   totalWinX, totalWinY,
          //   `TOTAL WIN: ${value.toFixed(2)}`,
          //   {
          //     fontSize: '28px',
          //     color: '#FFD700',
          //     fontFamily: 'Arial Black',
          //     stroke: '#000',
          //     strokeThickness: 4,
          //     align: 'center',
          //     backgroundColor: '#000000CC',
          //     padding: { x: 18, y: 8 }
          //   }
          // ).setOrigin(0.5).setDepth(99999).setData('isWinLabel', true);
        }, () => {
          // After count up, animate next line
          animateNextLine(idx + 1, newTotal);
        });
      });
    };
  
    // ---- Start with the first win line and 0 running total ----
    animateNextLine(0, 0);
  }
  

  
 // MainScene.js

// Animate a payline snake-style from left to right
// points = array of {x, y}, color = hex, duration = ms, onComplete = callback
animateWinningLine(points, color, duration = 600, onComplete = () => {}) {
  const gfx = this.add.graphics().setDepth(2002); // Higher depth to ensure visible
  let progress = 0;
  let totalLength = 0;

  // Calculate total line length
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    totalLength += Math.sqrt(dx * dx + dy * dy);
  }

  const startTime = this.time.now;

  const drawStep = () => {
    let elapsed = this.time.now - startTime;
    progress = Phaser.Math.Clamp(elapsed / duration, 0, 1);

    gfx.clear();

    // --- Draw glow line (underneath) ---
    gfx.lineStyle(14, color, 0.18);
    gfx.beginPath();
    gfx.moveTo(points[0].x, points[0].y);
    let drawn = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      const segLen = Math.sqrt(dx * dx + dy * dy);

      if (drawn + segLen > totalLength * progress) {
        const remain = totalLength * progress - drawn;
        const angle = Math.atan2(dy, dx);
        const x = points[i - 1].x + Math.cos(angle) * remain;
        const y = points[i - 1].y + Math.sin(angle) * remain;
        gfx.lineTo(x, y);
        break;
      } else {
        gfx.lineTo(points[i].x, points[i].y);
        drawn += segLen;
      }
    }
    gfx.strokePath();

    // --- Draw bright core line (on top) ---
    gfx.lineStyle(5, color, 0.95);
    gfx.beginPath();
    gfx.moveTo(points[0].x, points[0].y);
    drawn = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      const segLen = Math.sqrt(dx * dx + dy * dy);

      if (drawn + segLen > totalLength * progress) {
        const remain = totalLength * progress - drawn;
        const angle = Math.atan2(dy, dx);
        const x = points[i - 1].x + Math.cos(angle) * remain;
        const y = points[i - 1].y + Math.sin(angle) * remain;
        gfx.lineTo(x, y);
        break;
      } else {
        gfx.lineTo(points[i].x, points[i].y);
        drawn += segLen;
      }
    }
    gfx.strokePath();

    if (progress < 1) {
      this.time.delayedCall(16, drawStep, [], this); // 60fps
    } else {
      if (onComplete) onComplete();
    }
  };

  drawStep();

  return gfx;
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
  }z

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
  
  // NEW: Big win effects
  showBigWinEffects(totalWin) {
    // Screen flash
    const flash = this.add.rectangle(640, 360, 1280, 720, 0xFFFFFF, 0.8)
      .setDepth(2500);
      this.sound.play('sfx_win_big');

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
  
  // NEW: Medium win effects
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
  
  // NEW: Create win particles
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