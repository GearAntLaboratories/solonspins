// src/scenes/UIScene.js (complete version)
import Phaser from 'phaser';
import config from '../game/config';
import ApiClient from '../utils/api';


export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
    this.credits = 0; // Start at 0, will load from server
    this.bet = 0.09;
    this.isSpinning = false;
    this.gameStats = {
      totalSpins: 0,
      totalWins: 0,
      totalBet: 0, 
      totalWon: 0,
      bonusTriggers: 0
    };
  }
  
  async create() {
    // Show loading message
    const loadingText = this.add.text(640, 360, 'Loading game data...', {
      fontSize: '24px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    
    // Load player data
    try {
      const playerData = await ApiClient.getPlayerData();
      this.credits = playerData.credits;
      this.gameStats = playerData.stats || this.gameStats;
      
      // Set initial bet based on config
      this.bet = config.defaultBet;
    } catch (error) {
      console.error('Failed to load game data:', error);
    }
    
    // Remove loading text
    loadingText.destroy();
    
    // Create UI elements
    this.createBackground();
    this.createButtons();
    this.createTextDisplays();
    this.createStatsDisplay();
    
    // Listen for events from the main scene
    this.listenToEvents();
    
    // Set up periodic saving
    this.time.addEvent({
      delay: 30000, // Save every 30 seconds
      callback: this.saveGameData,
      callbackScope: this,
      loop: true
    });

    this.createCoinAnimation();


  }
  saveGameData() {
    const playerData = {
      credits: this.credits,
      stats: this.gameStats
    };
    
    ApiClient.savePlayerData('default', playerData)
      .then(result => {
        if (result.success) {
          console.log('Game data saved successfully');
        } else {
          console.warn('Game data save failed');
        }
      })
      .catch(error => {
        console.error('Error saving game data:', error);
      });
  }
  
  
  createStatsDisplay() {
    const style = {
      fontSize: '16px',
      color: '#FFFFFF',
      align: 'left'
    };
    
    // Container for stats
    const statsContainer = this.add.container(50, 100);
    
    // Background
    const bg = this.add.rectangle(0, 0, 200, 150, 0x000000, 0.5);
    bg.setOrigin(0);
    statsContainer.add(bg);
    
    // Stats text
    this.statsText = this.add.text(10, 10, '', style);
    statsContainer.add(this.statsText);
    
    // Initial stats
    this.gameStats = {
      totalSpins: 0,
      totalWins: 0,
      totalBet: 0,
      totalWon: 0,
      bonusTriggers: 0
    };
    
    this.updateStatsDisplay();
  }
  
  updateStatsDisplay() {
    const winPercentage = this.gameStats.totalSpins > 0 
      ? ((this.gameStats.totalWins / this.gameStats.totalSpins) * 100).toFixed(1) 
      : '0.0';
      
    const returnPercentage = this.gameStats.totalBet > 0
      ? ((this.gameStats.totalWon / this.gameStats.totalBet) * 100).toFixed(1)
      : '0.0';
      
    this.statsText.setText(
      `STATS:\n` +
      `Spins: ${this.gameStats.totalSpins}\n` +
      `Wins: ${this.gameStats.totalWins} (${winPercentage}%)\n` +
      `Total Bet: ${this.gameStats.totalBet.toFixed(2)}\n` +
      `Total Won: ${this.gameStats.totalWon.toFixed(2)}\n` +
      `Return: ${returnPercentage}%\n` +
      `Bonus Triggers: ${this.gameStats.bonusTriggers}`
    );
  }


 // src/scenes/UIScene.js - Update the createBackground method
// src/scenes/UIScene.js - Update the createBackground method
createBackground() {
  // Add the main background at a very low depth but make it semi-transparent
  const background = this.add.image(640, 360, 'background').setDepth(-100);
  background.setAlpha(0.3); // Make it 30% opaque
  
  // Keep our debug text
  this.add.text(640, 50, 'UI SCENE ACTIVE', {
    fontSize: '24px',
    color: '#FFFFFF',
    backgroundColor: '#333333',
    padding: { x: 10, y: 5 }
  }).setOrigin(0.5).setDepth(100);
}
  // src/scenes/UIScene.js - Update button sizes in createButtons method

createButtons() {
  // Spin button
  this.paytableButton = this.add.text(1200, 100, 'PAYTABLE', {
    fontSize: '18px',
    color: '#FFFFFF',
    backgroundColor: '#004488',
    padding: { x: 10, y: 5 }
  })
  .setInteractive()
  .on('pointerdown', this.showPaytable, this);

  this.spinButton = this.add.image(640, 600, 'spinButton')
    .setDisplaySize(120, 120) // Adjust size as needed
    .setInteractive()
    .on('pointerdown', this.onSpinClick, this);
  
  // Bet control buttons
  this.betUpButton = this.add.image(740, 600, 'betUpButton')
    .setDisplaySize(80, 80) // Adjust size as needed
    .setInteractive()
    .on('pointerdown', this.increaseBet, this);
  
  this.betDownButton = this.add.image(540, 600, 'betDownButton')
    .setDisplaySize(80, 80) // Adjust size as needed
    .setInteractive()
    .on('pointerdown', this.decreaseBet, this);
  
    this.debugFreeSpinsButton = this.add.text(100, 700, 'DEBUG: Free Spins', {
      backgroundColor: '#550000',
      padding: { x: 10, y: 5 },
      color: '#FFFFFF'
    })
    .setInteractive()
    .on('pointerdown', this.triggerDebugFreeSpins, this);
    
    this.debugPearlButton = this.add.text(350, 700, 'DEBUG: Pearl Bonus', {
      backgroundColor: '#005500',
      padding: { x: 10, y: 5 },
      color: '#FFFFFF'
    })
    .setInteractive()
    .on('pointerdown', this.triggerDebugPearl, this);  


}
  
  createTextDisplays() {
    // Text style
    const style = {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#FFFFFF',
      align: 'center'
    };
    
    // Credits display
    this.creditsText = this.add.text(100, 50, `CREDITS: ${this.credits.toFixed(2)}`, style);
    
    // Bet display
    this.betText = this.add.text(640, 550, `BET: ${this.bet.toFixed(2)}`, style)
      .setOrigin(0.5);
    
    // Win display
    this.winText = this.add.text(640, 150, '', {
      ...style,
      fontSize: '32px',
      color: '#FFD700'
    }).setOrigin(0.5);
  }
  
  listenToEvents() {
    // Get a reference to MainScene
    const mainScene = this.scene.get('MainScene');
    
    // Listen for win events
    mainScene.events.on('win', this.onWin, this);
    
    // Listen for spin completion
    mainScene.events.on('spinComplete', this.onSpinComplete, this);
  }
  
  // In UIScene.js - Update the onSpinClick method
onSpinClick() {
  if (this.isSpinning) return;
  
  if (this.credits >= this.bet) {
    // Deduct bet amount
    this.credits -= this.bet;
    this.updateCreditsText();
    
    // Disable spin button during spin
    this.isSpinning = true;
    this.spinButton.setTint(0x888888);
    
    // Clear previous win
    this.winText.setText('');
    
    // Use the new spin method directly instead of emitting an event
    this.scene.get('MainScene').spin(this.bet);
  } else {
    // Not enough credits
    this.showInsufficientFunds();
  }
}
  
 // In UIScene.js - Update the onWin method
// In UIScene.js - Update the onWin method to handle bonus wins

createCoinAnimation() {
  // Load coin animation frames if not already done in preload
  // For now, we'll use existing assets
  
  // Set up animation function
  this.showCoins = (amount) => {
    // Only show for significant wins
    if (amount < this.bet * 5) return;
    
    // Number of coins based on win amount
    const coinCount = Math.min(20, Math.floor(amount / this.bet) + 5);
    
    for (let i = 0; i < coinCount; i++) {
      // Create a coin at random position at the bottom
      const x = Phaser.Math.Between(400, 880);
      const y = 700;
      
      // Use a simple coin image or symbol for now
      const coin = this.add.sprite(x, y, 'chest')
        .setDisplaySize(40, 40)
        .setDepth(1000);
      
      // Animate coin rising
      this.tweens.add({
        targets: coin,
        y: Phaser.Math.Between(200, 500),
        x: x + Phaser.Math.Between(-100, 100),
        angle: 360 * Phaser.Math.Between(1, 3),
        duration: Phaser.Math.Between(1000, 2000),
        delay: Phaser.Math.Between(0, 500),
        ease: 'Back.easeOut',
        onComplete: () => {
          // Add second tween for falling back down
          this.tweens.add({
            targets: coin,
            y: 800,
            angle: coin.angle + 360,
            duration: 1000,
            delay: Phaser.Math.Between(500, 1500),
            ease: 'Bounce.easeIn',
            onComplete: () => {
              coin.destroy();
            }
          });
        }
      });
    }
  };
}

onWin(data) {
  console.log("Win event received:", data);
  
  // Handle any win type
  if (data.amount > 0) {

    this.gameStats.totalWins++;
    this.gameStats.totalWon += data.amount;
    if (data.bonusType) {
      this.gameStats.bonusTriggers++;
    }
    
    this.updateStatsDisplay();
    // Add win to credits
    this.credits += data.amount;
    this.updateCreditsText();
    
    // Show win amount with bonus type if applicable
    if (data.bonusType === 'freeSpins') {
      this.winText.setText(`FREE SPINS BONUS WIN: ${data.amount.toFixed(2)}`);
    } 
    else if (data.bonusType === 'pearlBonus') {
      this.winText.setText(`PEARL BONUS WIN: ${data.amount.toFixed(2)}`);
    }
    else {
      this.winText.setText(`WIN: ${data.amount.toFixed(2)}`);
    }
    this.showCoins(data.amount);

  } else {
    // Clear win text if no win
    this.winText.setText('');
  }
  if (data.amount > this.bet * 10) {
    this.saveGameData();
  }
}



// Add these methods to UIScene.js
triggerDebugFreeSpins() {
  console.log('Debug: Triggering Free Spins Bonus');
  // Tell MainScene to trigger free spins
  this.scene.get('MainScene').triggerDebugFreeSpins();
}

triggerDebugPearl() {
  console.log('Debug: Triggering Pearl Bonus');
  // Tell MainScene to trigger pearl bonus
  this.scene.get('MainScene').triggerDebugPearl();
}
  
  onSpinComplete() {
    // Re-enable spin button
    this.isSpinning = false;
    this.spinButton.clearTint();
  }
  
  increaseBet() {
    if (this.isSpinning) return;
    
    const currentIndex = config.coinValues.indexOf(this.bet / config.paylines);
    if (currentIndex < config.coinValues.length - 1) {
      this.bet = config.coinValues[currentIndex + 1] * config.paylines;
      this.updateBetText();
    }
  }
  
  decreaseBet() {
    if (this.isSpinning) return;
    
    const currentIndex = config.coinValues.indexOf(this.bet / config.paylines);
    if (currentIndex > 0) {
      this.bet = config.coinValues[currentIndex - 1] * config.paylines;
      this.updateBetText();
    }
  }
  
  updateCreditsText() {
    this.creditsText.setText(`CREDITS: ${this.credits.toFixed(2)}`);
  }
  
  updateBetText() {
    this.betText.setText(`BET: ${this.bet.toFixed(2)}`);
  }
  
  showInsufficientFunds() {
    // Show message for insufficient funds
    const message = this.add.text(640, 360, 'INSUFFICIENT CREDITS', {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#FF0000',
      backgroundColor: '#000000',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5);
    
    // Remove after 2 seconds
    this.time.delayedCall(2000, () => {
      message.destroy();
    });
  }
  showPaytable() {
    // Pause the game scenes
    this.scene.pause('MainScene');
    this.scene.pause('UIScene');
    
    // Launch the paytable scene
    this.scene.launch('PaytableScene');
  }
}