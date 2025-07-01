// src/game/AnimationManager.js
import config from './config.js';
import { createScatterGlow } from '../utils/scatterGlow.js';

export default class AnimationManager {
  constructor(scene, outcomeManager) {
    this.scene = scene;
    this.outcomeManager = outcomeManager;
    
    // Animation state
    this.inAnticipation = false;
    this.anticipationReels = [];
    this.anticipationElements = null;
    this.anticipationSpotlights = [];
    this.scatterGlows = [];
    this.currentAnimateReel = null;
  }

  runSpinAnimation(finalBoard, outcome) {
    const spinInterval = 100;
    const baseTotalShifts = 25;
    const reelDelayFactor = 5;
    const reelHeight = 150;
    const reelWidth = 150;
    const symbolDisplaySize = reelWidth * 0.7;
    const startX = 350;
    const startY = this.scene.reelStartY;
    const symbolOptions = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi');
    
    this.scene.applyMaskToAll();
    this.scene.spinSequences = [];
    
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

      this.scene.spinSequences[reel] = seq;
    }
    
    // Set up sprites (same as before)
    for (let reel = 0; reel < config.reels; reel++) {
      if (!this.scene.symbolSprites[reel]) this.scene.symbolSprites[reel] = [];
      if (this.scene.symbolSprites[reel].length !== config.rows + 1) {
        this.scene.symbolSprites[reel].forEach(s => s.destroy()); 
        this.scene.symbolSprites[reel] = [];
        
        let x_above = startX + reel * reelWidth;
        let y_above = startY - reelHeight;
        let tex_above = this.scene.spinSequences[reel]?.[0] || symbolOptions[0];
        this.scene.symbolSprites[reel].push(this.scene.add.sprite(x_above, y_above, tex_above)
          .setDisplaySize(symbolDisplaySize, symbolDisplaySize)
          .setDepth(5)
          .setMask(this.scene.compositeMask));
        
        for(let row = 0; row < config.rows; row++) {
          let x = startX + reel * reelWidth;
          let y = startY + row * reelHeight;
          let tex = symbolOptions[Math.floor(Math.random() * symbolOptions.length)];
          this.scene.symbolSprites[reel].push(this.scene.add.sprite(x, y, tex)
            .setDisplaySize(symbolDisplaySize, symbolDisplaySize)
            .setDepth(5)
            .setMask(this.scene.compositeMask));
        }
      }
      
      if(this.scene.symbolSprites[reel][0]) {
        this.scene.symbolSprites[reel][0].y = startY - reelHeight;
        let tex = this.scene.spinSequences[reel]?.[0] || symbolOptions[0];
        this.scene.symbolSprites[reel][0].setTexture(tex).setVisible(true).setMask(this.scene.compositeMask);
      }
    }
    
    let reelsFinished = 0;
    const animateReel = (reel, shiftsRemaining, slowdownFactor = 1) => {
      if (shiftsRemaining <= 0) {
        reelsFinished++;
        this.scene.sound.play('sfx_reel_stop');

        // Claude suggested fix on 2025-06-08: Check actual sprite textures instead of finalBoard to prevent overlay bug
        for (let row = 0; row < config.rows; row++) {
          // Check the actual sprite texture that was placed, not the finalBoard expectation
          const sprite = this.scene.symbolSprites[reel]?.[row + 1]; // row + 1 due to animation offset
          const actualTexture = sprite?.texture?.key;
          
          if (actualTexture === 'fire') {
            scattersLanded++;
            scatterPositions.push({ reel, row });
            this.scene.sound.play('sfx_scatter_landed');

            // Create scatter glow effect
            const x = startX + reel * reelWidth;
            const y = startY + row * reelHeight;
            createScatterGlow(this.scene, x, y, this.scatterGlows);

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
          
          this.scene.time.delayedCall(100, () => {
            const actualBoard = this.scene.getCurrentBoardState();
            console.log("Expected finalBoard:", finalBoard);
            console.log("Actual board:", actualBoard);
            this.scene.evaluateWin(finalBoard, outcome);
          });
        }
        return;
      }
      
      if(!this.scene.symbolSprites[reel] || this.scene.symbolSprites[reel].length === 0) {
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
      
      this.scene.tweens.add({
        targets: this.scene.symbolSprites[reel],
        y: `+=${reelHeight}`,
        duration: actualInterval,
        ease: 'Linear',
        onComplete: () => {
          let off = this.scene.symbolSprites[reel]?.[this.scene.symbolSprites[reel].length - 1];
          if (!off) {
            // Don't pass slowdown factor for anticipation reels - we handle timing internally
            if (this.inAnticipation && this.anticipationReels && this.anticipationReels.includes(reel)) {
              animateReel(reel, shiftsRemaining - 1, 1); // Always pass 1 for anticipation reels
            } else {
              animateReel(reel, shiftsRemaining - 1, slowdownFactor); // Normal logic for others
            }
            return;
          }
          
          let tex = this.scene.spinSequences[reel]?.shift() || symbolOptions[0];
          off.setTexture(tex)
            .setScale(1)
            .setAlpha(1)
            .setDisplaySize(symbolDisplaySize, symbolDisplaySize)
            .setMask(this.scene.compositeMask);
          off.y = startY - reelHeight;
          
          this.scene.symbolSprites[reel].pop();
          this.scene.symbolSprites[reel].unshift(off);
          
          // Don't pass slowdown factor for anticipation reels - we handle timing internally
          if (this.inAnticipation && this.anticipationReels && this.anticipationReels.includes(reel)) {
            animateReel(reel, shiftsRemaining - 1, 1); // Always pass 1 for anticipation reels
          } else {
            animateReel(reel, shiftsRemaining - 1, slowdownFactor); // Normal logic for others
          }
        },
        callbackScope: this.scene
      });
    };
    
    // Store animateReel function for scatter anticipation
    this.currentAnimateReel = animateReel;
    
    for (let reel = 0; reel < config.reels; reel++) {
      let extraShifts = 0;
      let totalShiftsForReel = baseTotalShifts + reel * reelDelayFactor + extraShifts;
      
      // For anticipation reels, we need to use the EXTENDED shift count that was used to build the sequence
      if (this.inAnticipation && this.anticipationReels && this.anticipationReels.includes(reel)) {
        const anticipationIndex = this.anticipationReels.indexOf(reel);
        const extraShifts = 50 + (anticipationIndex * 25); // Same calculation as sequence generation
        totalShiftsForReel = baseTotalShifts + reel * reelDelayFactor + extraShifts;
        console.log(`ANIMATE: Reel ${reel} using extended shifts: ${totalShiftsForReel} (was ${baseTotalShifts + reel * reelDelayFactor})`);
      }
      
      console.log(`ANIMATE: Starting reel ${reel} with ${totalShiftsForReel} shifts (sequence length: ${this.scene.spinSequences[reel]?.length})`);
      animateReel(reel, totalShiftsForReel);
    }
    
    this.checkForAnticipation(finalBoard, outcome);
  }

  checkForAnticipation(finalBoard, outcome) {
    // Check if this is a big win or bonus trigger
    const isBigWin = outcome.type.includes('large') || outcome.type.includes('huge') || 
                     outcome.type.includes('bonus') || outcome.type.includes('free_spins');
    
    if (isBigWin) {
      // Add anticipation sound when last reel is spinning
      this.scene.time.delayedCall(2000, () => {
        if (this.scene.sound.get('bonusSound')) {
          this.scene.sound.play('bonusSound', { volume: 0.3 });
        }
      });
    }
  }

  enterScatterAnticipation(scatterPositions) {
    this.inAnticipation = true;

    // Darken the screen except scatters
    const darkOverlay = this.scene.add.rectangle(640, 360, 1280, 720, 0x000000, 0.5)
      .setDepth(15);
    
    this.anticipationSpotlights = [];
    
    // Make scatters shine through
    scatterPositions.forEach(pos => {
      const x = 350 + pos.reel * 150;
      const y = this.scene.reelStartY + pos.row * 150;
      
      // Create spotlight effect
      const spotlight = this.scene.add.circle(x, y, 80, 0xFFFFFF, 0.2)
        .setDepth(16)
        .setBlendMode(Phaser.BlendModes.ADD);
      
      this.scene.tweens.add({
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
    
    const oneMoreText = this.scene.add.text(640, 180, '1 MORE!', { // Claude suggested change on 2025-06-08: Moved up from 200 to 180
      fontSize: '48px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 4,
      fontFamily: 'Arial Black'
    })
    .setOrigin(0.5)
    .setDepth(100)
    .setScale(0);
    
    this.scene.tweens.add({
      targets: oneMoreText,
      scale: { from: 0, to: 1.2 },
      duration: 800, // Claude suggested change on 2025-06-08: Slowed down from 300 to 800ms
      ease: 'Back.easeOut',
      yoyo: true,
      repeat: -1,
      hold: 600 // Claude suggested change on 2025-06-08: Increased hold time from 200 to 600ms
    });
    
    // Slow down remaining reels
    for (let r = 2; r < config.reels; r++) {
      if (this.scene.symbolSprites[r]) {
        // Add extra spins to remaining reels
        if (this.scene.spinSequences[r]) {
          for (let i = 0; i < 1000; i++) {
            this.scene.spinSequences[r].unshift(this.outcomeManager.getSymbolIds()
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
    this.scene.sound.play('sfx_near_miss');

    if (this.scatterGlows) {
      this.scatterGlows.forEach(g => g?.destroy());
    }
    
    // Quick flash effect for near miss
    const flash = this.scene.add.rectangle(640, 360, 1280, 720, 0xFF6600, 0.3)
      .setDepth(50);
    
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 500,
      onComplete: () => flash.destroy()
    });
  }

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
    this.scene.children.list.forEach(child => {
      if (child && child.type === 'Circle' && child.blendMode === Phaser.BlendModes.ADD) {
        child.destroy();
      }
    });
  }
}