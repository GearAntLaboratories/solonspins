// src/scenes/PuppyBonusScene.js
import Phaser from 'phaser';
import OutcomeManager from '../game/OutcomeManager';

export default class PuppyBonusScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PuppyBonusScene' });
    this.picks = 0;
    this.bet = 1;
    this.totalWin = 0;
    this.prizes = [];
    this.dogPhotoSprites = [];
    this.picksLeftText = null;
    this.winText = null;
    this.isEnding = false;
    this.picksUsed = 0; // Track picks used
    
    // Claude suggested addition on 2025-07-01: Keyboard navigation properties
    this.selectedPuppyIndex = 0; // Currently highlighted puppy (starts at top-left)
    this.borderGraphics = []; // Store border graphics for each puppy
    
    // Initialize OutcomeManager
    this.outcomeManager = new OutcomeManager();
  }

  init(data) {
    console.log("PuppyBonusScene: init()", data);
    this.picks = data.picks || 3;
    this.bet = data.bet || 1;
    this.totalWin = 0;
    this.isEnding = false;
    this.picksUsed = 0;
    
    // Claude suggested fix on 2025-07-01: Reset keyboard navigation state for reused scenes
    this.selectedPuppyIndex = 0;
    this.borderGraphics = [];
    this.dogPhotoSprites = [];
  }

  create() {
    console.log("PuppyBonusScene: create()");

    // Add new background image
    this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'puppy_background')
        .setOrigin(0.5)
        .setDisplaySize(this.cameras.main.width, this.cameras.main.height)
        .setDepth(-1);

    // Add Puppy Bonus Logo (adjust Y as needed)
    const logoX = this.cameras.main.width * 0.168;
    const logoY = 90; // Try 120, adjust up/down as needed
    
    this.add.image(logoX, logoY, 'puppy_logo')
      .setOrigin(0.5)
      .setDepth(1)
      .setScale(0.3);
    
    // REMOVED: Old prizes array generation - now using weighted outcomes
    // the prizes array is no longer needed since each pick uses weighted selection

    // Create dog photo sprites (pickable items)
        // Create dog photo sprites (pickable items)
        this.dogPhotoSprites = [];
        const dogImages = ['elsi', 'ruby', 'marlin', 'minnow'];
        const itemDisplaySize = 128; // Reduced by 20% from 160px (160 * 0.8 = 128)
    
        // Clean grid layout - two rows of 6 puppies each
        // Claude suggested adjustment on 2025-06-08: Moved up and reduced size by 20%
        const puppySpots = [];
        
        const startX = 380;  // Just to the right of logo
        const spacingX = 140; // Consistent horizontal spacing
        const row1Y = 70;    // Top row Y position (moved up from 130)
        const row2Y = 220;    // Bottom row Y position (moved up from 250)
        
        // First row - 6 puppies
        for (let i = 0; i < 6; i++) {
          puppySpots.push([startX + (i * spacingX), row1Y]);
        }
        
        // Second row - 6 puppies  
        for (let i = 0; i < 6; i++) {
          puppySpots.push([startX + (i * spacingX), row2Y]);
        }
    
        for (let i = 0; i < puppySpots.length; i++) {
          const [x, y] = puppySpots[i];
          const dogImageKey = Phaser.Utils.Array.GetRandom(dogImages);
    
          const dogPhoto = this.add.sprite(x, y, dogImageKey)
            .setInteractive()
            .setData('index', i)
            .setData('revealed', false);
    
          dogPhoto.setDisplaySize(itemDisplaySize, itemDisplaySize);
    
          // ---- Mask code: Crop to a circle ----
          const maskRadius = itemDisplaySize / 2 - 10;
    
          // Claude suggested change on 2025-07-01: Store border graphics for highlighting system
          const borderGraphics = this.add.graphics();
          borderGraphics.lineStyle(4, 0xffffff, 1); // Default white border
          borderGraphics.strokeCircle(dogPhoto.x, dogPhoto.y, maskRadius + 2);
          borderGraphics.setDepth(dogPhoto.depth - 1);
          
          // Store border graphics for keyboard navigation highlighting
          this.borderGraphics.push(borderGraphics);
    
          // Draw and apply the mask
          const maskGraphics = this.make.graphics({ x: 0, y: 0, add: false });
          maskGraphics.fillStyle(0xffffff);
          maskGraphics.fillCircle(dogPhoto.x, dogPhoto.y, maskRadius);
          const circleMask = maskGraphics.createGeometryMask();
          dogPhoto.setMask(circleMask);
          // --------------------------------------
    
          dogPhoto.on('pointerover', () => {
            if (!dogPhoto.getData('revealed')) {
              dogPhoto.setScale(dogPhoto.scaleX * 1.1, dogPhoto.scaleY * 1.1);
            }
          });
    
          dogPhoto.on('pointerout', () => {
            if (!dogPhoto.getData('revealed')) {
              dogPhoto.setDisplaySize(itemDisplaySize, itemDisplaySize); // Reset scale
            }
          });
    
          dogPhoto.on('pointerdown', () => this.revealPrize(dogPhoto));
          this.dogPhotoSprites.push(dogPhoto);
        }
    

    // Text displays at the bottom
    const textStyle = {
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#FFD700',
      backgroundColor: '#000000A0',
      padding: { x: 12, y: 6 }
    };

    this.picksLeftText = this.add.text(300, this.cameras.main.height - 60, `PICKS LEFT: ${this.picks}`, textStyle)
      .setOrigin(0.5)
      .setDepth(1000);
    
    this.winText = this.add.text(this.cameras.main.width - 300, this.cameras.main.height - 60, `BONUS WIN: ${this.totalWin.toFixed(2)}`, {
        ...textStyle, 
        color: '#00FF00'
      })
      .setOrigin(0.5)
      .setDepth(1000);

    // Claude suggested addition on 2025-07-01: Setup keyboard navigation
    this.setupKeyboardControls();
    this.updateHighlight(); // Highlight the first puppy initially

    console.log("PuppyBonusScene: create() finished.");
    this.sound.play('music_bonus_puppy_loop', { loop: true });

  }

  revealPrize(dogPhoto) {
    if (this.picks <= 0 || dogPhoto.getData('revealed') || this.isEnding) return;

    dogPhoto.disableInteractive();
    dogPhoto.setData('revealed', true);
    this.picksUsed++;
    console.log(`PuppyBonusScene: Revealing item index ${dogPhoto.getData('index')} (Pick ${this.picksUsed}/${this.picksUsed + this.picks - 1})`);

    this.tweens.add({
      targets: dogPhoto,
      scale: dogPhoto.scale * 0.9,
      alpha: 0.7,
      duration: 150,
      yoyo: false
    });

    // Get weighted outcome for this pick
    const totalPicks = this.picksUsed + this.picks - 1; // Total picks available at start
    const outcome = this.outcomeManager.getPuppyBonusOutcome(this.picksUsed, totalPicks);
    console.log("PuppyBonusScene: Got outcome:", outcome);

    if (outcome.type === 'poop') { // POOP!
      console.log("PuppyBonusScene: Revealed POOP!");
      let poopDisplay;
      this.sound.play('sfx_pick_poop');

      if (this.textures.exists('poop')) {
        poopDisplay = this.add.image(dogPhoto.x, dogPhoto.y, 'poop')
          .setDisplaySize(80, 80)
          .setDepth(dogPhoto.depth + 1);
      } else {
        poopDisplay = this.add.text(dogPhoto.x, dogPhoto.y, "POOP!", {
          fontSize: '24px', 
          fontStyle: 'bold', 
          color: '#8B4513',
          stroke: '#000000', 
          strokeThickness: 3
        })
        .setOrigin(0.5)
        .setDepth(dogPhoto.depth + 1);
      }
      
      this.tweens.add({ 
        targets: poopDisplay, 
        angle: { from: -15, to: 15 }, 
        duration: 100, 
        yoyo: true, 
        repeat: 3 
      });
      
      // If ending too early, ensure minimum win
      if (this.totalWin < this.bet * 5) {
        console.log("PuppyBonusScene: Total win too low, converting POOP to minimum prize");
        this.time.delayedCall(500, () => {
          poopDisplay.destroy();
          const minPrize = this.bet * (5 - this.totalWin / this.bet);
          this.totalWin += minPrize;
          
          const prizeText = this.add.text(dogPhoto.x, dogPhoto.y, `${minPrize.toFixed(2)}`, {
            fontSize: '20px', 
            fontStyle: 'bold', 
            color: '#FFFF00',
            stroke: '#000000', 
            strokeThickness: 3, 
            backgroundColor: '#000000A0',
            padding: {x: 5, y: 3}
          })
          .setOrigin(0.5)
          .setDepth(dogPhoto.depth + 1);
          
          this.winText.setText(`BONUS WIN: ${this.totalWin.toFixed(2)}`);
          this.endBonus("MIN_WIN_ADJUSTED");
        });
      } else {
        this.endBonus("POOP");
      }
    } else { // Credit Win
      const prizeAmount = outcome.multiplier * this.bet;
      this.totalWin += prizeAmount;
      console.log(`PuppyBonusScene: Revealed prize ${outcome.multiplier}x, amount ${prizeAmount.toFixed(2)}. Total win: ${this.totalWin.toFixed(2)}`);
      this.sound.play('sfx_pick_credit');

      const prizeTextStyle = {
        fontSize: '20px', 
        fontStyle: 'bold', 
        color: '#FFFF00',
        stroke: '#000000', 
        strokeThickness: 3, 
        backgroundColor: '#000000A0',
        padding: {x: 5, y: 3}
      };
      
      const prizeText = this.add.text(dogPhoto.x, dogPhoto.y, `${prizeAmount.toFixed(2)}`, prizeTextStyle)
        .setOrigin(0.5)
        .setDepth(dogPhoto.depth + 1);

      prizeText.setScale(0);
      this.tweens.add({
        targets: prizeText, 
        scale: 1.1, 
        duration: 300, 
        ease: 'Back.easeOut',
        onComplete: () => { 
          this.tweens.add({
            targets: prizeText, 
            scale: 1, 
            duration: 150
          }); 
        }
      });

      this.picks--;
      this.picksLeftText.setText(`PICKS LEFT: ${this.picks}`);
      this.winText.setText(`BONUS WIN: ${this.totalWin.toFixed(2)}`);

      if (this.picks === 0) {
        console.log("PuppyBonusScene: No picks left.");
        this.endBonus("NO_PICKS");
      }
    }
  }

  endBonus(reason = "UNKNOWN") {
    if (this.isEnding) return;
    this.isEnding = true;
    console.log(`PuppyBonusScene: endBonus() called. Reason: ${reason}. Win: ${this.totalWin}.`);
    this.sound.play('sfx_bonus_end');

    this.dogPhotoSprites.forEach(p => p.disableInteractive());

    const endMsg = this.add.text(
      this.cameras.main.centerX, 
      this.cameras.main.centerY,
      `PUPPY BONUS COMPLETE!\nFINAL WIN: ${this.totalWin.toFixed(2)}`, {
        fontSize: '36px', 
        color: '#FFFF00', 
        stroke: '#000', 
        strokeThickness: 4,
        align: 'center', 
        backgroundColor: '#000000E0', 
        padding: {x:20, y:10}
      }
    )
    .setOrigin(0.5)
    .setDepth(2000)
    .setAlpha(0);

    this.tweens.add({ 
      targets: endMsg, 
      alpha: 1, 
      duration: 500 
    });
    if (this.sound.get('music_bonus_puppy_loop')) {
      this.sound.stopByKey('music_bonus_puppy_loop');
    }
    
    const delayDuration = 3000;
    console.log(`PuppyBonusScene: Scheduling stop & GLOBAL event in ${delayDuration}ms.`);

    this.time.delayedCall(delayDuration, () => {
      console.log("PuppyBonusScene: Delayed call executing.");
      console.log("PuppyBonusScene: Setting registry data for bonus completion");
      this.game.registry.set('bonusCompleted', {
        type: 'puppyBonus',
        totalWin: this.totalWin
      });

      console.log("PuppyBonusScene: Emitting 'puppyBonusCompleteGlobal' globally.");
      this.sys.events.emit('puppyBonusCompleteGlobal', this.totalWin);

      this.time.delayedCall(100, () => {
        console.log("PuppyBonusScene: Stopping PuppyBonusScene now.");
        this.scene.stop();
      });
    }, [], this);
  }

  // Claude suggested addition on 2025-07-01: Keyboard navigation methods
  setupKeyboardControls() {
    // Clear any existing listeners
    this.input.keyboard.off('keydown-UP');
    this.input.keyboard.off('keydown-DOWN');
    this.input.keyboard.off('keydown-SPACE');
    
    // Up arrow - move right (next puppy)
    this.input.keyboard.on('keydown-UP', () => {
      if (!this.isEnding) {
        this.moveSelection(1);
      }
    });
    
    // Down arrow - move left (previous puppy)
    this.input.keyboard.on('keydown-DOWN', () => {
      if (!this.isEnding) {
        this.moveSelection(-1);
      }
    });
    
    // Space bar - select highlighted puppy
    this.input.keyboard.on('keydown-SPACE', () => {
      if (!this.isEnding) {
        this.selectCurrentPuppy();
      }
    });
  }

  moveSelection(direction) {
    // Move through the 12 puppies (2 rows of 6)
    this.selectedPuppyIndex += direction;
    
    // Wrap around - if go past end, go to beginning; if go before beginning, go to end
    if (this.selectedPuppyIndex >= this.dogPhotoSprites.length) {
      this.selectedPuppyIndex = 0;
    } else if (this.selectedPuppyIndex < 0) {
      this.selectedPuppyIndex = this.dogPhotoSprites.length - 1;
    }
    
    this.updateHighlight();
  }

  updateHighlight() {
    // Reset all borders to white
    this.borderGraphics.forEach((border, index) => {
      if (border && border.scene) {
        border.clear();
        border.lineStyle(4, 0xffffff, 1); // White border
        
        // Get the puppy position to redraw border
        const puppy = this.dogPhotoSprites[index];
        if (puppy && puppy.scene) {
          const maskRadius = (puppy.displayWidth || 128) / 2 - 10;
          border.strokeCircle(puppy.x, puppy.y, maskRadius + 2);
        }
      }
    });
    
    // Highlight the selected puppy with red border and hover effect
    const selectedBorder = this.borderGraphics[this.selectedPuppyIndex];
    const selectedPuppy = this.dogPhotoSprites[this.selectedPuppyIndex];
    
    if (selectedBorder && selectedBorder.scene && selectedPuppy && selectedPuppy.scene) {
      // Clear and redraw with red border
      selectedBorder.clear();
      selectedBorder.lineStyle(4, 0xff0000, 1); // Red border
      
      const maskRadius = (selectedPuppy.displayWidth || 128) / 2 - 10;
      selectedBorder.strokeCircle(selectedPuppy.x, selectedPuppy.y, maskRadius + 2);
      
      // Apply hover effect (scale up) if not revealed
      if (!selectedPuppy.getData('revealed')) {
        selectedPuppy.setScale(selectedPuppy.scaleX * 1.1, selectedPuppy.scaleY * 1.1);
      }
    }
    
    // Reset scale for all other puppies
    this.dogPhotoSprites.forEach((puppy, index) => {
      if (index !== this.selectedPuppyIndex && puppy && puppy.scene && !puppy.getData('revealed')) {
        const itemDisplaySize = 128;
        puppy.setDisplaySize(itemDisplaySize, itemDisplaySize);
      }
    });
  }

  selectCurrentPuppy() {
    const selectedPuppy = this.dogPhotoSprites[this.selectedPuppyIndex];
    if (selectedPuppy && selectedPuppy.scene && !selectedPuppy.getData('revealed')) {
      this.revealPrize(selectedPuppy);
    }
  }
}
