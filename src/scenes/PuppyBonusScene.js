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
        const itemDisplaySize = 120;
    
        // YOUR custom positions: (these match your earlier grid picks)
        // [x, y] coordinates (change if you want to move any dog position!)
        const puppySpots = [
          [375, 100],
          [505, 115],
          [660, 90],
          [800, 130],
          [920, 70],
          [410, 250],
          [590, 265],
          [695, 230],
          [890, 325],
          [425, 375],
          [555, 390],
          [300, 290],
      ];
    
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
    
          // Draw border first
          const borderGraphics = this.add.graphics();
          borderGraphics.lineStyle(1, 0xffffff, 1); // 4px white border
          borderGraphics.strokeCircle(dogPhoto.x, dogPhoto.y, maskRadius + 2);
          borderGraphics.setDepth(dogPhoto.depth - 1);
    
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

    console.log("PuppyBonusScene: create() finished.");
  }

  revealPrize(dogPhoto) {
    if (this.picks <= 0 || dogPhoto.getData('revealed') || this.isEnding) return;

    dogPhoto.disableInteractive();
    dogPhoto.setData('revealed', true);
    this.picksUsed++;
    console.log(`PuppyBonusScene: Revealing item index ${dogPhoto.getData('index')} (Pick ${this.picksUsed}/${this.picksUsed + this.picks})`);

    this.tweens.add({
      targets: dogPhoto,
      scale: dogPhoto.scale * 0.9,
      alpha: 0.7,
      duration: 150,
      yoyo: false
    });

    // NEW: Get weighted outcome for this pick
    const outcome = this.outcomeManager.getPuppyBonusOutcome(this.picksUsed, this.picks + this.picksUsed);
    console.log("PuppyBonusScene: Got outcome:", outcome);

    if (outcome.type === 'poop') { // POOP!
      console.log("PuppyBonusScene: Revealed POOP!");
      let poopDisplay;
      
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
      
      this.endBonus("POOP");
    } else { // Credit Win
      const prizeAmount = outcome.multiplier * this.bet;
      this.totalWin += prizeAmount;
      console.log(`PuppyBonusScene: Revealed prize ${outcome.multiplier}x, amount ${prizeAmount.toFixed(2)}. Total win: ${this.totalWin.toFixed(2)}`);

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
}
