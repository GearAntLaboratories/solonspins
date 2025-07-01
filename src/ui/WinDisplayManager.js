// src/ui/WinDisplayManager.js
import config from '../game/config.js';
import {
  showBigWinEffects,
  showMediumWinEffects
} from '../utils/winEffects.js';

export default class WinDisplayManager {
  constructor(scene) {
    this.scene = scene;
    this.activeWinLines = [];
    this.totalWinText = null;
  }

  // Clean up all win displays - call this when starting a new spin
  clearWinDisplays() {
    // Clear active win lines
    if (this.activeWinLines) {
      this.activeWinLines.forEach(g => g?.destroy());
      this.activeWinLines = [];
    }

    // Clear win line graphics
    if (this.scene.winLineGraphics) {
      this.scene.winLineGraphics.clear();
    }

    // Remove win pucks and labels
    this.scene.children.list.slice().forEach(child => {
      if (child?.getData?.('isWinPuck')) {
        try { child.destroy(); } catch(e) {}
      }
      if (child?.getData?.('isWinLabel')) {
        try { child.destroy(); } catch(e) {}
      }
    });

    // Remove total win text
    if (this.totalWinText && this.totalWinText.scene) {
      this.totalWinText.destroy();
      this.totalWinText = null;
    }
  }

  showWinningLines(winningLines, currentBet, positionConfig = {}, onAllComplete = null) { // Claude suggested change on 2025-06-08: Added callback for completion
    // Claude suggested enhancement on 2025-06-08: Added positioning parameters for scene flexibility
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
    
    // Allow position overrides while maintaining defaults for backward compatibility
    const REEL_WIDTH = positionConfig.reelWidth || 150;
    const REEL_HEIGHT = positionConfig.reelHeight || 150;
    const START_X = positionConfig.startX || 350;
    const START_Y = positionConfig.startY || this.scene.reelStartY;
    const PUCK_RADIUS = positionConfig.puckRadius || 38;
    const OUTSIDE_X = positionConfig.outsideX || (START_X + (4 * REEL_WIDTH) + 180); // Claude suggested change on 2025-06-08: Moved line labels further right
  
    // Calculate total win for effects
    const totalWin = winningLines.reduce((sum, line) => sum + line.winAmount, 0);
    const winMultiplier = totalWin / currentBet;
  
    // Add screen effects for big wins
    if (winMultiplier >= 25) {
      showBigWinEffects(this.scene, totalWin, currentBet);
    } else if (winMultiplier >= 10) {
      showMediumWinEffects(this.scene);
    }
  
    // ---- CLEAN UP previous win lines and pucks ----
    // Track all animated line graphics for cleanup
    if (!this.activeWinLines) this.activeWinLines = [];
    this.activeWinLines.forEach(g => g.destroy());
    this.activeWinLines = [];
  
    this.scene.winLineGraphics.clear();
  
    // Remove old pucks and win labels
    this.scene.children.list.forEach(child => {
      if (child.getData && child.getData('isWinPuck')) child.destroy();
      if (child.getData && child.getData('isWinLabel')) child.destroy();
    });
  
    // Remove previous total win text (if any)
    if (this.totalWinText && this.totalWinText.scene) this.totalWinText.destroy();
    this.totalWinText = null;
  
    // Claude suggested change on 2025-06-08: Track label count per row for immediate positioning
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
        // Claude suggested change on 2025-06-08: Position scatter win to align with credits text
        const scatterLabelX = START_X + (4 * REEL_WIDTH) - 10; // Right side of reels, moved slightly left
        const scatterLabelY = 183; // Match credits text position exactly (195 - half of text height)
        this.showWinLabel(
          `SCATTER: ${winInfo.winAmount.toFixed(2)}`,
          scatterLabelX,
          scatterLabelY,
          0xFFD700
        );
        // Claude suggested change on 2025-06-08: Add scatter win to running total
        if (onComplete) onComplete(runningTotal + winInfo.winAmount);
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
          this.scene.time.delayedCall(symbolIdx * 50, () => {
            this._drawPuckOverSymbol(r, w, color, PUCK_RADIUS);
          });
        });
  
        // Claude suggested change on 2025-06-08: Show win label immediately after line animation
        const [finalReel, finalRow] = payline[payline.length - 1];
        const targetRow = typeof finalRow === 'number' ? finalRow : 1;
        
        // Calculate position for this line's win label
        if (!rowLabelMap[targetRow]) rowLabelMap[targetRow] = 0; // Track count per row
        const labelY = START_Y + (targetRow * REEL_HEIGHT) + (rowLabelMap[targetRow] * 32) - 16;
        rowLabelMap[targetRow]++; // Increment for next label in this row
        
        // Show the win label immediately
        this.showWinLabel(
          `LINE ${winInfo.lineIndex + 1}: ${winInfo.winAmount.toFixed(2)}`,
          OUTSIDE_X,
          labelY,
          color
        );
  
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
        this.scene.game.events.emit('updateTotalWinText', value);

        if (step < steps) {
          this.scene.time.delayedCall(25, doStep, [], this.scene);
        } else if (onComplete) {
          onComplete();
        }
      };
      doStep();
    };
  
    // ---- Sequence win lines and total win counting ----
    const animateNextLine = (idx, runningTotal) => {
      if (idx >= winningLines.length) {
        // Claude suggested change on 2025-06-08: Call completion callback when all animations are done
        if (onAllComplete) {
          onAllComplete();
        }
        return;
      }
      const winInfo = winningLines[idx];
  
      animateLine(winInfo, idx, runningTotal, (newTotal) => {
        animateTotalWin(runningTotal, newTotal, value => {
          // Remove and update total win text
          if (this.totalWinText && this.totalWinText.scene) this.totalWinText.destroy();
        }, () => {
          // After count up, animate next line
          animateNextLine(idx + 1, newTotal);
        });
      });
    };
  
    // ---- Start with the first win line and 0 running total ----
    animateNextLine(0, 0);
  }
  
  // Animate a payline snake-style from left to right
  // points = array of {x, y}, color = hex, duration = ms, onComplete = callback
  animateWinningLine(points, color, duration = 600, onComplete = () => {}) {
    const gfx = this.scene.add.graphics().setDepth(2002); // Higher depth to ensure visible
    let progress = 0;
    let totalLength = 0;

    // Calculate total line length
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      totalLength += Math.sqrt(dx * dx + dy * dy);
    }

    const startTime = this.scene.time.now;

    const drawStep = () => {
      let elapsed = this.scene.time.now - startTime;
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
        this.scene.time.delayedCall(16, drawStep, [], this.scene); // 60fps
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
    const REEL_WIDTH = 150, REEL_HEIGHT = 150, START_X = 350, START_Y = this.scene.reelStartY;
    const x = START_X + (reel * REEL_WIDTH);
    const y = START_Y + (row * REEL_HEIGHT);

    // Main puck (glow effect)
    const puck = this.scene.add.circle(x, y, radius, color, 0.34)
      .setStrokeStyle(2, 0xffffff, 0.7)
      .setDepth(1550)
      .setData('isWinPuck', true)
      .setAlpha(0);
    // Animate in with a little pop
    this.scene.tweens.add({
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
    const rectWidth = 160; // Claude suggested change on 2025-06-08: Made wider for better appearance
    const rectHeight = 36;
    const cornerRadius = 1;
  
    // Draw the darker background with a colored outline
    const rect = this.scene.add.graphics();
    rect.fillStyle(0x111111, 0.96); 
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
  
    const label = this.scene.add.text(x, y, text, style)
      .setOrigin(0.5)
      .setDepth(1601)
      .setAlpha(1)
      .setData('isWinLabel', true);
  }
  
  showMediumWinEffects(totalWin) {
    const glow = this.scene.add.sprite(640, 360, 'beer')
      .setAlpha(0.3)
      .setScale(15)
      .setTint(0xFFD700)
      .setDepth(10);
    
    this.scene.tweens.add({
      targets: glow,
      alpha: 0,
      scale: 20,
      duration: 1000,
      onComplete: () => glow.destroy()
    });
  }
}