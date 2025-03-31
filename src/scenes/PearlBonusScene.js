// Enhanced PearlBonusScene.js
import Phaser from 'phaser';

export default class PearlBonusScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PearlBonusScene' });
    this.picks = 0;
    this.totalWin = 0;
    this.multiplier = 1;
    this.currentBet = 0;
    this.oysters = [];
  }
  
  init(data) {
    console.log('PearlBonusScene init with data:', data);
    this.picks = data.picks || 3;
    this.currentBet = data.bet || 0.09;
    this.totalWin = 0;
    this.multiplier = 1;
  }
  
  create() {
    console.log('PearlBonusScene create method running');
    
    // Create underwater background
    this.createBackground();
    
    // Add title
    this.add.text(640, 50, 'PEARL COLLECTION BONUS', {
      fontSize: '36px',
      color: '#FFD700',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Display remaining picks
    this.picksText = this.add.text(640, 100, `PICKS REMAINING: ${this.picks}`, {
      fontSize: '24px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    
    // Display current multiplier
    this.multiplierText = this.add.text(440, 100, `MULTIPLIER: ${this.multiplier}×`, {
      fontSize: '24px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    
    // Total win display
    this.winText = this.add.text(840, 100, `WIN: ${this.totalWin.toFixed(2)}`, {
      fontSize: '24px',
      color: '#FFD700'
    }).setOrigin(0.5);
    
    // Create grid of oysters
    this.createOysterGrid();
    
    // Add instruction text
    this.add.text(640, 650, 'Click on oysters to reveal prizes', {
      fontSize: '24px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    
    console.log('PearlBonusScene create method completed');
  }
  
  createBackground() {
    // Create deep sea background
    const bg = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x004466, 0.8)
      .setOrigin(0);
    
    // Add decorative bubbles
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(50, 1230);
      const y = Phaser.Math.Between(50, 670);
      const size = Phaser.Math.Between(2, 8);
      this.add.circle(x, y, size, 0xFFFFFF, 0.4);
    }
    
    // Add seaweed decorations
    for (let i = 0; i < 8; i++) {
      const x = Phaser.Math.Between(50, 1200);
      const height = Phaser.Math.Between(100, 250);
      const width = Phaser.Math.Between(20, 40);
      
      // Draw a seaweed-like shape
      const seaweed = this.add.graphics();
      seaweed.fillStyle(0x006633, 0.6);
      seaweed.fillRoundedRect(x, 720 - height, width, height, { tl: 10, tr: 10, bl: 0, br: 0 });
      
      // Add a gentle sway animation
      this.tweens.add({
        targets: seaweed,
        x: x + Phaser.Math.Between(-15, 15),
        duration: Phaser.Math.Between(3000, 5000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }
  
  createOysterGrid() {
    this.oysters = [];
    
    const gridWidth = 5;
    const gridHeight = 5;
    const oysterSize = 100;
    // Adjust startX and startY for better positioning
    const startX = 290;
    const startY = 220;
    
    // Create grid layout
    for (let row = 0; row < gridHeight; row++) {
      for (let col = 0; col < gridWidth; col++) {
        const x = startX + col * oysterSize;
        const y = startY + row * oysterSize;
        
        // Create oyster background
        const bg = this.add.circle(x, y, oysterSize/2 - 5, 0x333333, 0.7);
        bg.setStrokeStyle(2, 0x666666);
        
        // Create oyster sprite
        const oyster = this.add.sprite(x, y, 'pearl')
          .setDisplaySize(80, 80)
          .setInteractive()
          .setData('opened', false)
          .setData('row', row)
          .setData('col', col)
          .setData('index', row * gridWidth + col)
          .setData('bg', bg);
          
        // Add hover effect
        oyster.on('pointerover', () => {
          if (!oyster.getData('opened')) {
            oyster.setScale(1.1);
          }
        });
        
        oyster.on('pointerout', () => {
          if (!oyster.getData('opened')) {
            oyster.setScale(1.0);
          }
        });
        
        // Add click handler
        oyster.on('pointerdown', () => {
          this.selectOyster(oyster);
        });
        
        // Store reference
        this.oysters.push(oyster);
      }
    }
    
    // Generate hidden prizes
    this.generatePrizes();
  }
  
  generatePrizes() {
    // Define prize distribution percentages
    const prizeDistribution = {
      credits: 0.60,    // 60% chance of credit values
      multiplier: 0.20, // 20% chance of multipliers
      picks: 0.15,      // 15% chance of extra picks
      collect: 0.05     // 5% chance of collect
    };
    
    // Define credit value distribution
    const creditValues = [
      { value: 1, weight: 25 },
      { value: 2, weight: 20 },
      { value: 3, weight: 15 },
      { value: 5, weight: 12 },
      { value: 10, weight: 10 },
      { value: 15, weight: 8 },
      { value: 20, weight: 5 },
      { value: 25, weight: 3 },
      { value: 50, weight: 2 }
    ];
    
    // Define multiplier distribution
    const multiplierValues = [
      { value: 2, weight: 55 },
      { value: 3, weight: 30 },
      { value: 5, weight: 10 },
      { value: 10, weight: 5 }
    ];
    
    // Define extra picks distribution
    const picksValues = [
      { value: 1, weight: 70 },
      { value: 2, weight: 25 },
      { value: 3, weight: 5 }
    ];
    
    // Generate a random prize based on weights
    const getRandomWeightedItem = (items) => {
      const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
      let random = Math.random() * totalWeight;
      
      for (const item of items) {
        random -= item.weight;
        if (random <= 0) {
          return item.value;
        }
      }
      
      return items[0].value; // Fallback
    };
    
    // Create array of all possible prizes
    const allPrizes = this.oysters.map(() => {
      const random = Math.random();
      let prize;
      
      if (random < prizeDistribution.credits) {
        const value = getRandomWeightedItem(creditValues);
        prize = {
          type: 'credits',
          value: value,
          text: `${value}× BET`
        };
      } else if (random < prizeDistribution.credits + prizeDistribution.multiplier) {
        const value = getRandomWeightedItem(multiplierValues);
        prize = {
          type: 'multiplier',
          value: value,
          text: `${value}× MULTIPLIER`
        };
      } else if (random < prizeDistribution.credits + prizeDistribution.multiplier + prizeDistribution.picks) {
        const value = getRandomWeightedItem(picksValues);
        prize = {
          type: 'picks',
          value: value,
          text: `+${value} PICK${value > 1 ? 'S' : ''}`
        };
      } else {
        prize = {
          type: 'collect',
          value: 0,
          text: 'COLLECT'
        };
      }
      
      return prize;
    });
    
    // Ensure at least one good prize (credit ≥ 10 or multiplier ≥ 3)
    let hasGoodPrize = allPrizes.some(prize => 
      (prize.type === 'credits' && prize.value >= 10) || 
      (prize.type === 'multiplier' && prize.value >= 3)
    );
    
    if (!hasGoodPrize) {
      // Replace a random prize with a good one
      const randomIndex = Math.floor(Math.random() * allPrizes.length);
      const goodPrizes = [
        { type: 'credits', value: 15, text: '15× BET' },
        { type: 'multiplier', value: 3, text: '3× MULTIPLIER' }
      ];
      
      allPrizes[randomIndex] = goodPrizes[Math.floor(Math.random() * goodPrizes.length)];
    }
    
    // Shuffle prizes and assign to oysters
    this.shuffleArray(allPrizes);
    
    for (let i = 0; i < this.oysters.length; i++) {
      this.oysters[i].setData('prize', allPrizes[i]);
    }
  }
  
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  
  selectOyster(oyster) {
    // Only allow selection if player has picks and oyster isn't already opened
    if (this.picks <= 0 || oyster.getData('opened')) {
      return;
    }
    
    // Mark as opened
    oyster.setData('opened', true);
    
    // Decrement picks
    this.picks--;
    this.picksText.setText(`PICKS REMAINING: ${this.picks}`);
    
    // Get prize
    const prize = oyster.getData('prize');
    
    // Show opening animation
    this.tweens.add({
      targets: oyster,
      scale: 1.2,
      duration: 300,
      yoyo: true,
      onComplete: () => {
        // Reveal the pearl inside
        this.revealPrize(oyster, prize);
      }
    });
    
    // Play sound
    if (this.sound.get('winSound')) {
      this.sound.play('winSound');
    }
  }
  
  revealPrize(oyster, prize) {
    // Change oyster appearance
    oyster.setAlpha(0.7);
    
    // Get background reference
    const bg = oyster.getData('bg');
    
    // Change background color based on prize type
    let bgColor;
    switch (prize.type) {
      case 'credits':
        bgColor = 0x00FF00; // Green for credits
        break;
      case 'multiplier':
        bgColor = 0xFF00FF; // Magenta for multipliers
        break;
      case 'picks':
        bgColor = 0x00FFFF; // Cyan for extra picks
        break;
      case 'collect':
        bgColor = 0xFF0000; // Red for collect
        break;
    }
    
    bg.setFillStyle(bgColor, 0.6);
    
    // Show prize text
    const prizeText = this.add.text(oyster.x, oyster.y, prize.text, {
      fontSize: '16px',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5);
    
    // Apply prize effect after brief delay
    this.time.delayedCall(300, () => {
      this.applyPrize(prize);
    });
  }
  
  applyPrize(prize) {
    console.log('Applying prize:', prize);
    
    switch (prize.type) {
      case 'credits':
        // Add win based on bet, value, and current multiplier
        const winAmount = this.currentBet * prize.value * this.multiplier;
        this.totalWin += winAmount;
        this.winText.setText(`WIN: ${this.totalWin.toFixed(2)}`);
        
        // Show floating text
        this.showFloatingText(`+${winAmount.toFixed(2)}`, 0x00FF00);
        break;
        
        case 'multiplier':
          // Store old total win for calculation
          const oldTotalWin = this.totalWin;
          
          // Set new multiplier
          this.multiplier = prize.value;
          this.multiplierText.setText(`MULTIPLIER: ${this.multiplier}×`);
          
          // Apply multiplier to accumulated win (retroactive application)
          if (oldTotalWin > 0) {
            // Multiple the entire win by the new multiplier
            this.totalWin = oldTotalWin * prize.value;
            
            // Show bonus amount added
            const bonusAmount = this.totalWin - oldTotalWin;
            this.showFloatingText(`+${bonusAmount.toFixed(2)}`, 0xFF00FF);
          }
          
          // Update win display
          this.updateWinDisplay();
          
          // Highlight multiplier text
          this.tweens.add({
            targets: this.multiplierText,
            scale: 1.3,
            duration: 300,
            yoyo: true,
            repeat: 1
          });
          
          // Show multiplier text
          this.showFloatingText(`MULTIPLIER: ${prize.value}×`, 0xFF00FF);
          break;
      case 'picks':
        // Add extra picks
        this.picks += prize.value;
        this.picksText.setText(`PICKS REMAINING: ${this.picks}`);
        
        // Highlight picks text
        this.tweens.add({
          targets: this.picksText,
          scale: 1.3,
          duration: 300,
          yoyo: true,
          repeat: 1
        });
        
        // Show floating text
        this.showFloatingText(`+${prize.value} PICK${prize.value > 1 ? 'S' : ''}`, 0x00FFFF);
        break;
        
      case 'collect':
        // End bonus immediately
        this.picks = 0;
        this.picksText.setText(`PICKS REMAINING: ${this.picks}`);
        
        // Show collect message
        this.showCollectMessage();
        break;
    }
    
    // Check if bonus should end
    if (this.picks <= 0) {
      this.time.delayedCall(1500, this.endBonus, [], this);
    }
  }

  updateWinDisplay() {
    this.winText.setText(`WIN: ${this.totalWin.toFixed(2)}`);
    
    // Add pulse animation when win changes
    this.tweens.add({
      targets: this.winText,
      scale: 1.2,
      duration: 200,
      yoyo: true
    });
  }
  
  showFloatingText(text, color) {
    const x = Phaser.Math.Between(400, 880);
    const y = Phaser.Math.Between(200, 500);
    
    const floatingText = this.add.text(x, y, text, {
      fontSize: '28px',
      color: '#FFFFFF',
      stroke: color ? `#${color.toString(16).padStart(6, '0')}` : '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    
    this.tweens.add({
      targets: floatingText,
      y: y - 80,
      alpha: 0,
      duration: 2000,
      ease: 'Cubic.Out',
      onComplete: () => {
        floatingText.destroy();
      }
    });
  }
  
  showCollectMessage() {
    const collectText = this.add.text(640, 360, 'COLLECT!', {
      fontSize: '48px',
      color: '#FF0000',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5).setAlpha(0);
    
    this.tweens.add({
      targets: collectText,
      alpha: 1,
      scale: 1.5,
      duration: 800,
      ease: 'Back.Out',
      onComplete: () => {
        this.time.delayedCall(1500, () => {
          collectText.destroy();
        });
      }
    });
  }
  
  endBonus() {
    console.log('Ending Pearl bonus with total win:', this.totalWin);
    
    // Show ending message
    const message = this.add.text(640, 360, `BONUS COMPLETED!\nTOTAL WIN: ${this.totalWin.toFixed(2)}`, {
      fontSize: '32px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 5,
      align: 'center',
      backgroundColor: '#000000',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setDepth(2000);
    
    // Play win sound
    if (this.sound.get('winSound')) {
      this.sound.play('winSound');
    }
    
    // After a delay, return to main game
    this.time.delayedCall(3000, () => {
      // Resume main scenes
      this.scene.resume('MainScene');
      this.scene.resume('UIScene');
      
      // Pass data back to main scene
      this.scene.get('MainScene').pearlBonusCompleted(this.totalWin);
      
      // Stop this scene
      this.scene.stop();
    });
  }
}