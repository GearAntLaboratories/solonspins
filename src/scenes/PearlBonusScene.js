// src/scenes/PearlBonusScene.js
import Phaser from 'phaser';

export default class PearlBonusScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PearlBonusScene' });
    this.picks = 0; this.bet = 1; this.totalWin = 0; this.prizes = [];
    this.pearlSprites = []; this.picksLeftText = null; this.winText = null;
    this.isEnding = false;
  }
  
  init(data) { 
    console.log("PearlBonusScene: init()", data); 
    this.picks = data.picks || 3; 
    this.bet = data.bet || 1; 
    this.totalWin = 0; 
    this.isEnding = false; 
  }
  
  create() {
    console.log("PearlBonusScene: create()"); 
    this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x003366).setOrigin(0);
    this.add.text(640, 80, 'PEARL BONUS!', { fontSize: '48px', fontStyle: 'bold', color: '#FFFFFF', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5).setDepth(1000);
    
    // Setup prizes array
    this.prizes = [ 1, 2, 3, 5, 1, 2, 0, 5, 10, 2, 1, 0, 3, 1, 20, 5, 2, 1, 1, 50, 2, 0, 10, 3 ]; 
    const numPearls = 24; 
    while(this.prizes.length < numPearls) this.prizes.push(1); 
    this.prizes = this.prizes.slice(0, numPearls); 
    Phaser.Utils.Array.Shuffle(this.prizes);
    
    // Create pearl sprites
    this.pearlSprites = []; 
    const startX = 240; 
    const startY = 180; 
    const spacingX = 150; 
    const spacingY = 120; 
    const pearlsPerRow = 6;
    
    for (let i = 0; i < numPearls; i++) { 
      const col = i % pearlsPerRow; 
      const row = Math.floor(i / pearlsPerRow); 
      const x = startX + col * spacingX; 
      const y = startY + row * spacingY; 
      const pearl = this.add.sprite(x, y, 'pearl').setInteractive()
        .setData('index', i)
        .setData('revealed', false);
        
      pearl.setScale(0.6);
      
      pearl.on('pointerover', () => { 
        if (!pearl.getData('revealed')) pearl.setScale(0.7); 
      });
      
      pearl.on('pointerout', () => { 
        if (!pearl.getData('revealed')) pearl.setScale(0.6); 
      });
      
      pearl.on('pointerdown', () => this.revealPrize(pearl));
      this.pearlSprites.push(pearl);
    }
    
    const textStyle = { 
      fontSize: '28px', 
      fontStyle: 'bold', 
      color: '#FFD700', 
      backgroundColor: '#00000088', 
      padding: { x: 12, y: 6 } 
    };
    
    this.picksLeftText = this.add.text(300, this.cameras.main.height - 60, `PICKS LEFT: ${this.picks}`, textStyle).setOrigin(0.5);
    this.winText = this.add.text(this.cameras.main.width - 300, this.cameras.main.height - 60, `TOTAL WIN: ${this.totalWin.toFixed(2)}`, 
      { ...textStyle, color: '#00FF00'}).setOrigin(0.5);
    
    console.log("PearlBonusScene: create() finished.");
  }
  
  revealPrize(pearl) {
    if (this.picks <= 0 || pearl.getData('revealed') || this.isEnding) return;
    
    pearl.disableInteractive();
    pearl.setData('revealed', true);
    console.log(`PearlBonusScene: Revealing pearl index ${pearl.getData('index')}`);
    
    this.tweens.add({
      targets: pearl,
      scale: 0.65,
      alpha: 0.7,
      duration: 150,
      yoyo: true
    });
    
    const index = pearl.getData('index');
    const prizeMultiplier = this.prizes[index];
    
    if (prizeMultiplier === 0) {
      console.log("PearlBonusScene: Revealed COLLECT.");
      const prizeText = this.add.text(pearl.x, pearl.y, "COLLECT", { 
        fontSize: '18px', 
        fontStyle: 'bold', 
        color: '#FF4444', 
        stroke: '#000000', 
        strokeThickness: 3 
      }).setOrigin(0.5).setDepth(pearl.depth + 1);
      
      this.endBonus("COLLECT");
    }
    else {
      const prizeAmount = prizeMultiplier * this.bet;
      this.totalWin += prizeAmount;
      console.log(`PearlBonusScene: Revealed prize ${prizeMultiplier}x, amount ${prizeAmount.toFixed(2)}. Total win: ${this.totalWin.toFixed(2)}`);
      
      const prizeTextStyle = { 
        fontSize: '20px', 
        fontStyle: 'bold', 
        color: '#FFFF00', 
        stroke: '#000000', 
        strokeThickness: 3, 
        backgroundColor: '#000000A0', 
        padding: {x: 5, y: 3} 
      };
      
      const prizeText = this.add.text(pearl.x, pearl.y, `${prizeAmount.toFixed(2)}`, prizeTextStyle)
        .setOrigin(0.5)
        .setDepth(pearl.depth + 1);
      
      prizeText.setScale(0);
      this.tweens.add({
        targets: prizeText,
        scale: 1,
        duration: 300,
        ease: 'Back.easeOut'
      });
      
      this.picks--;
      this.picksLeftText.setText(`PICKS LEFT: ${this.picks}`);
      this.winText.setText(`TOTAL WIN: ${this.totalWin.toFixed(2)}`);
      
      if (this.picks === 0) {
        console.log("PearlBonusScene: No picks left.");
        this.endBonus("NO_PICKS");
      }
    }
  }
  
  endBonus(reason = "UNKNOWN") {
    if (this.isEnding) return;
    this.isEnding = true;
    console.log(`PearlBonusScene: endBonus() called. Reason: ${reason}. Win: ${this.totalWin}.`);
    
    // Disable all pearl interactions
    this.pearlSprites.forEach(p => p.disableInteractive());
    
    // Show completion message
    const endMsg = this.add.text(
      this.cameras.main.centerX, 
      this.cameras.main.centerY, 
      `BONUS COMPLETE!\nFINAL WIN: ${this.totalWin.toFixed(2)}`, 
      { 
        fontSize: '36px', 
        color: '#FFFF00', 
        stroke: '#000', 
        strokeThickness: 4, 
        align: 'center', 
        backgroundColor: '#000000E0', 
        padding: {x:20, y:10}
      }
    ).setOrigin(0.5).setDepth(2000).setAlpha(0);
    
    this.tweens.add({ 
      targets: endMsg, 
      alpha: 1, 
      duration: 500 
    });
    
    const delayDuration = 3000;
    console.log(`PearlBonusScene: Scheduling stop & GLOBAL event in ${delayDuration}ms.`);
    
    this.time.delayedCall(delayDuration, () => {
      console.log("PearlBonusScene: Delayed call executing.");
      
      // Set registry data first (more reliable)
      console.log("PearlBonusScene: Setting registry data for bonus completion");
      this.game.registry.set('bonusCompleted', {
        type: 'pearlBonus',
        totalWin: this.totalWin
      });
      
      // Then emit global event
      console.log("PearlBonusScene: Emitting 'pearlBonusCompleteGlobal' globally.");
      this.sys.events.emit('pearlBonusCompleteGlobal', this.totalWin);
      
      // Add delay before stopping scene to ensure event propagation
      this.time.delayedCall(100, () => {
        console.log("PearlBonusScene: Stopping PearlBonusScene now.");
        this.scene.stop();
      });
    }, [], this);
  }
} // End of PearlBonusScene Class