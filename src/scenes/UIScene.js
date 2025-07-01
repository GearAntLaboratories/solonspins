// src/scenes/UIScene.js
import Phaser from 'phaser';
import config from '../game/config';
import ApiClient from '../utils/api';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
    this.credits = 0;
    this.bet = config.defaultBet;
    this.isSpinning = false;
    this.gameStats = { totalSpins: 0, totalWins: 0, totalBet: 0, totalWon: 0, bonusTriggers: 0 };
    this.showStats = false; // CHANGED: Hide stats by default

    this.onWin = this.onWin.bind(this);
    this.onSpinComplete = this.onSpinComplete.bind(this);
  }

  async create() {
    // --- LOADING ---
    const loadingText = this.add.text(640, 360, 'Loading game data...', { fontSize: '24px', color: '#FFFFFF' }).setOrigin(0.5);
    try {
      const playerData = await ApiClient.getPlayerData();
      this.credits = playerData.credits; this.gameStats = playerData.stats || this.gameStats;
    } catch (error) { this.credits = 1000; }
    if (loadingText?.scene) { loadingText.destroy(); }

    this.createButtons();
    this.createTextDisplays();

    if (this.showStats) this.createStatsDisplay();
    this.listenToEvents();
    this.updateCreditsText();
    this.updateBetText();
    this.game.events.on('updateTotalWinText', (amount) => {
      this.updateTotalWinText(amount);
    });
    
    
  }

  createButtons() {
    const barWidth = 740;
    const barHeight = 60;
    const barX = 650;
    const barY = 685;
  
    // Draw bar background
    this.actionBarBg = this.add.rectangle(
      barX, barY,
      barWidth, barHeight,
      0x333333, 0.93
    ).setStrokeStyle(2, 0xFFFFFF).setDepth(998).setOrigin(0.5);
  
    // Button positions within the bar
    this.betDownButton = this.add.image(barX - 270, barY, 'betDownButton')
      .setDisplaySize(40, 40)
      .setDepth(999)
      .setInteractive()
      .on('pointerdown', this.decreaseBet, this);
  
    this.betUpButton = this.add.image(barX - 110, barY, 'betUpButton')
      .setDisplaySize(40, 40)
      .setDepth(999)
      .setInteractive()
      .on('pointerdown', this.increaseBet, this);
  
    this.spinButton = this.add.image(barX + 220, barY, 'spinButton')
      .setDisplaySize(60, 60)
      .setDepth(999)
      .setInteractive()
      .on('pointerdown', this.onSpinClick, this);
  
    // (Paytable & debug buttons remain top left)
    const buttonStartX = 5;
    let buttonStartY = 5;
    this.paytableButton = this.add.text(5, 5, 'PAYTABLE', {
      fontSize: '28px',
      fontFamily: 'Arial Black',
      color: '#FFD700',
      backgroundColor: '#222A',
      stroke: '#000',
      strokeThickness: 3,
      padding: { left: 20, right: 20, top: 10, bottom: 10 },
      align: 'center'
    })
    .setOrigin(0, 0)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', this.showPaytable, this); // Claude suggested fix on 2025-06-08: Added missing click handler

    // Claude suggested addition on 2025-06-08: Cashout button in top right corner
    this.cashoutButton = this.add.text(this.cameras.main.width - 5, 5, 'CASHOUT', {
      fontSize: '28px',
      fontFamily: 'Arial Black',
      color: '#FFD700',
      backgroundColor: '#222A',
      stroke: '#000',
      strokeThickness: 3,
      padding: { left: 20, right: 20, top: 10, bottom: 10 },
      align: 'center'
    })
    .setOrigin(1, 0) // Right-aligned origin
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', this.showCashoutConfirmation, this);
  
  
    buttonStartY += 36;
    if (process.env.NODE_ENV !== 'production') {
      this.debugFreeSpinsButton = this.add.text(
        buttonStartX, buttonStartY, 'DEBUG: Free Spins',
        { fontSize: '18px', color: '#FFFFFF', backgroundColor: '#004488', padding: { x: 12, y: 6 } }
      ).setOrigin(0, 0).setDepth(1100).setInteractive().on('pointerdown', this.triggerDebugFreeSpins, this);
  
      buttonStartY += 36;
      this.debugPuppyButton = this.add.text(
        buttonStartX, buttonStartY, 'DEBUG: Puppy Bonus',
        { fontSize: '18px', color: '#FFFFFF', backgroundColor: '#004488', padding: { x: 12, y: 6 } }
      ).setOrigin(0, 0).setDepth(1100).setInteractive().on('pointerdown', this.triggerDebugPuppy, this);

      // Claude suggested addition on 2025-06-08: Debug add credits button
      buttonStartY += 36;
      this.debugAddCreditsButton = this.add.text(
        buttonStartX, buttonStartY, 'DEBUG: Add Credits',
        { fontSize: '18px', color: '#FFFFFF', backgroundColor: '#004488', padding: { x: 12, y: 6 } }
      ).setOrigin(0, 0).setDepth(1100).setInteractive().on('pointerdown', this.addDebugCredits, this);
    }
  }

  createTextDisplays() {
    // Credits (upper left)
    const style = { fontFamily: 'Arial', fontSize: '24px', color: '#FFFFFF', align: 'center', stroke: '#000000', strokeThickness: 3 };
    // this.creditsText = this.add.text(100, 50, `CREDITS: ${this.credits.toFixed(2)}`, style);
    // Position
    const slotStartX = 280;
    const slotStartY = 265;
    
    // Static "CREDITS:" label
    this.creditsLabel = this.add.text(
      slotStartX,
      slotStartY - 70,
      `CREDITS:`, {
        fontSize: '22px',
        fontFamily: 'Arial',
        color: '#E6E6E6',
        backgroundColor: '#222C',
        fontStyle: 'bold',
        align: 'center',
        padding: { left: 18, right: 0, top: 4, bottom: 4 },
        stroke: '#000',
        strokeThickness: 2,
        shadow: { offsetX: 1, offsetY: 1, color: "#000", blur: 2, fill: true }
      }
    ).setOrigin(0, 1).setDepth(9999);
    
    // Credits amount (positioned just below or to the right of the label)
    this.creditsText = this.add.text(
      slotStartX+124,
      slotStartY-70, // a bit below the label
      `${this.credits.toFixed(2)}`,
      {
        fontSize: '22px',
        fontFamily: 'Arial',
        color: '#E6E6E6',
        backgroundColor: '#222C',
        fontStyle: 'bold',
        align: 'center',
        padding: { left: 5, right: 18, top: 4, bottom: 4 },
        stroke: '#000',
        strokeThickness: 2,
        shadow: { offsetX: 1, offsetY: 1, color: "#000", blur: 2, fill: true }
      }
    ).setOrigin(0, 1).setDepth(9999);
    

  
    // --- BET and WIN text in the bar ---
    const barX = 650;
    const barY = 685;
  
    // Bet (between the two bet buttons)
    this.betText = this.add.text(barX - 185, barY, `BET: ${this.bet.toFixed(2)}`, { ...style, fontSize: '26px' })
      .setOrigin(0.5).setDepth(1000);
  
    // Win (centered, but a little to the right for balance)
    this.winText = this.add.text(barX + 25, barY, '', { ...style, fontSize: '32px', color: '#FFD700' })
      .setOrigin(0.5).setDepth(1000);
  }
  
  updateTotalWinText(amount) {
    // Remove previous if present
    if (this.totalWinText && this.totalWinText.scene) this.totalWinText.destroy();
  
    // Calculate position between betUpButton and spinButton
    const x = (this.betUpButton.x + this.spinButton.x) / 2;
    const y = this.spinButton.y;
  
    this.totalWinText = this.add.text(
      x, y,
      `TOTAL WIN: ${amount.toFixed(2)}`,
      {
        fontSize: '24px',
        color: '#FFD700',
        fontFamily: 'Arial Black',
        stroke: '#000',
        strokeThickness: 4,
        align: 'center',
        //backgroundColor: '#000000CC',
        padding: { x: 18, y: 8 }
      }
    ).setOrigin(0.5).setDepth(9999); // On top of UI #FF0000 #FFD700
  }
   
  

  // Only show if this.showStats = true
  createStatsDisplay() {
    const style = { fontSize: '16px', color: '#FFFFFF', align: 'left' };
    const statsContainer = this.add.container(50, 100);
    this.statsText = this.add.text(10, 10, '', style);
    statsContainer.add(this.statsText);
    this.updateStatsDisplay();
  }
  updateStatsDisplay() {
    if (!this.statsText) return;
    const winPct = this.gameStats.totalSpins ? (this.gameStats.totalWins / this.gameStats.totalSpins * 100).toFixed(1) : '0.0';
    const rtp = this.gameStats.totalBet ? (this.gameStats.totalWon / this.gameStats.totalBet * 100).toFixed(1) : '0.0';
    this.statsText.setText(`STATS:\nSpins: ${this.gameStats.totalSpins}\nWins: ${this.gameStats.totalWins} (${winPct}%)\nBet: ${this.gameStats.totalBet.toFixed(2)}\nWon: ${this.gameStats.totalWon.toFixed(2)}\nRTP: ${rtp}%\nBonus: ${this.gameStats.bonusTriggers}`);
  }

  listenToEvents() {
    const mainScene = this.scene.manager.getScene('MainScene');
    if (mainScene) {
      mainScene.events.off('win', this.onWin, this);
      if (typeof this.onWin === 'function') mainScene.events.on('win', this.onWin, this);
    }
    this.sys.events.off('spinCompleteGlobal', this.onSpinComplete, this);
    if (typeof this.onSpinComplete === 'function') this.sys.events.on('spinCompleteGlobal', this.onSpinComplete, this);
  }

  onSpinClick() {
    console.log(`UIScene: onSpinClick() called. isSpinning = ${this.isSpinning}`);
    this.sound.play('sfx_spin_button');
    const mainScene = this.scene.manager.getScene('MainScene');
    if (this.totalWinText && this.totalWinText.scene) {
      this.totalWinText.destroy();
      this.totalWinText = null;
    }
    
    if (mainScene.activeWinLines) {
      mainScene.activeWinLines.forEach(g => g.destroy());
      mainScene.activeWinLines = [];
    }
    // Remove win labels and pucks
    mainScene.children.list.forEach(child => {
      if (child.getData && (child.getData('isWinPuck') || child.getData('isWinLabel'))) {
        child.destroy();
      }
    });

    if (this.isSpinning) {
      console.log("UIScene: Spin blocked (spinning).");
      return;
    }
    if (this.credits >= this.bet) {
      console.log("UIScene: Deduct bet, spinning=true.");
      this.credits -= this.bet;
      this.updateCreditsText();
      this.isSpinning = true;
      this.spinButton.setTint(0x888888);
  
      // Clear win text now
      this.winText.setText('');
  
      const mainScene = this.scene.manager.getScene('MainScene');
      if (mainScene) {
        console.log("UIScene: Calling MainScene.spin()");
        mainScene.spin(this.bet);
        this.gameStats.totalSpins++;
        this.gameStats.totalBet += this.bet;
        this.updateStatsDisplay();
      } else {
        console.error("UIScene: MainScene not found for spin!");
        this.isSpinning = false;
        this.spinButton.clearTint();
      }
    } else {
      console.log("UIScene: Insufficient funds.");
      this.showInsufficientFunds();
    }
  }

  onWin(data) {
    if (data.amount > 0) {
      this.gameStats.totalWins++;
      this.gameStats.totalWon += data.amount;
      if (data.bonusType) this.gameStats.bonusTriggers++;
      this.updateStatsDisplay();
      this.credits += data.amount;
      this.updateCreditsText();
  
      // No winText.setText calls!
      this.showCoins(data.amount);
    }
    this.saveGameData();
  }
  

  showCoins(amount) {
    if (amount < this.bet * 5) return;
    const coinCount = Math.min(20, Math.floor(amount / this.bet) + 5);
    for (let i = 0; i < coinCount; i++) {
      const x = Phaser.Math.Between(400, 880);
      const y = 700;
      const coinSymbolId = 'beer';
      const coin = this.add.sprite(x, y, coinSymbolId).setDisplaySize(40, 40).setDepth(1000);
      this.tweens.add({
        targets: coin,
        y: Phaser.Math.Between(200, 500),
        x: x + Phaser.Math.Between(-100, 100),
        angle: 360 * Phaser.Math.Between(1, 3),
        duration: Phaser.Math.Between(1000, 2000),
        delay: Phaser.Math.Between(0, 500),
        ease: 'Back.easeOut',
        onComplete: () => {
          if (coin?.scene) {
            this.tweens.add({
              targets: coin, alpha: 0, duration: 1000,
              delay: Phaser.Math.Between(500, 1500),
              ease: 'Power1',
              onComplete: () => { if (coin?.scene) coin.destroy(); }
            });
          }
        }
      });
    }
  }

  onSpinComplete() {
    this.isSpinning = false;
    if (this.spinButton?.scene) this.spinButton.clearTint();
  }

  saveGameData() {
    ApiClient.savePlayerData('default', { credits: this.credits, stats: this.gameStats })
      .then(result => { if (!result.success) { console.warn('UIScene: Game data save failed'); } })
      .catch(error => { console.error('UIScene: Error saving game data:', error); });
  }
  

  increaseBet() {
    if (this.isSpinning) return;
    const coinValues = config.coinValues || [0.01];
    const paylines = config.paylines || 9;
    const currentCoinValue = this.bet / paylines;
    let currentIndex = coinValues.findIndex(v => Math.abs(v - currentCoinValue) < 0.001);
    if (currentIndex < coinValues.length - 1) {
      this.bet = coinValues[currentIndex + 1] * paylines;
      if (config.maxBet && this.bet > config.maxBet) this.bet = config.maxBet;
      this.updateBetText();
    }
  }
  decreaseBet() {
    if (this.isSpinning) return;
    const coinValues = config.coinValues || [0.01];
    const paylines = config.paylines || 9;
    const currentCoinValue = this.bet / paylines;
    let currentIndex = coinValues.findIndex(v => Math.abs(v - currentCoinValue) < 0.001);
    if (currentIndex > 0) {
      this.bet = coinValues[currentIndex - 1] * paylines;
      if (config.minBet && this.bet < config.minBet) this.bet = config.minBet;
      this.updateBetText();
    } else if (coinValues.length > 0) {
      const minPossibleBet = coinValues[0] * paylines;
      if (this.bet > minPossibleBet) {
        this.bet = minPossibleBet;
        this.updateBetText();
      }
    }
  }

  updateCreditsText() {
    if (this.creditsText) this.creditsText.setText(`${this.credits.toFixed(2)}`);
  }
  updateBetText() {
    if (this.betText) this.betText.setText(`BET: ${this.bet.toFixed(2)}`);
  }

  showInsufficientFunds() {
    if (this.insufficientFundsMsg?.scene) return;
    this.sound.play('sfx_insufficient_credits');

    this.insufficientFundsMsg = this.add.text(640, 360, 'INSUFFICIENT CREDITS', {
      fontFamily: 'Arial', fontSize: '32px', color: '#FF0000', backgroundColor: '#000000',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setDepth(2000);
    this.time.delayedCall(2000, () => {
      if (this.insufficientFundsMsg?.scene) { this.insufficientFundsMsg.destroy(); }
    });
  }

  showPaytable() {
    if (this.isSpinning) return;
    this.scene.pause('MainScene');
    this.scene.pause('UIScene');
    this.scene.launch('PaytableScene');
  }

  triggerDebugFreeSpins() {
    const mainScene = this.scene.manager.getScene('MainScene');
    if (mainScene && typeof mainScene.triggerDebugFreeSpins === 'function') mainScene.triggerDebugFreeSpins();
  }
  triggerDebugPuppy() {
    const mainScene = this.scene.manager.getScene('MainScene');
    if (mainScene && typeof mainScene.triggerDebugPuppy === 'function') mainScene.triggerDebugPuppy();
  }
  triggerDebugpuppy() { this.triggerDebugPuppy(); }

  // Claude suggested addition on 2025-06-08: Cashout confirmation dialog
  showCashoutConfirmation() {
    if (this.isSpinning) return; // Prevent cashout during spins
    if (this.credits <= 0) return; // No need to cashout if no credits

    // Create semi-transparent overlay
    const overlay = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.7);
    overlay.setOrigin(0).setDepth(5000);

    // Create confirmation dialog box
    const dialogBg = this.add.rectangle(640, 360, 400, 200, 0x333333, 1.0);
    dialogBg.setStrokeStyle(3, 0xFFD700).setDepth(5001);

    // Dialog text
    const confirmText = this.add.text(640, 320, 'Are you sure you want to cashout?', {
      fontSize: '20px',
      color: '#FFFFFF',
      fontFamily: 'Arial',
      align: 'center'
    }).setOrigin(0.5).setDepth(5002);

    const creditsText = this.add.text(640, 350, `Credits: ${this.credits.toFixed(2)}`, {
      fontSize: '18px',
      color: '#FFD700',
      fontFamily: 'Arial',
      align: 'center'
    }).setOrigin(0.5).setDepth(5002);

    // Yes button
    const yesButton = this.add.text(580, 400, 'YES', {
      fontSize: '24px',
      fontFamily: 'Arial Black',
      color: '#FFFFFF',
      backgroundColor: '#AA0000',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setDepth(5002).setInteractive({ useHandCursor: true });

    // No button
    const noButton = this.add.text(700, 400, 'NO', {
      fontSize: '24px',
      fontFamily: 'Arial Black',
      color: '#FFFFFF',
      backgroundColor: '#004400',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setDepth(5002).setInteractive({ useHandCursor: true });

    // Button handlers
    const cleanup = () => {
      overlay.destroy();
      dialogBg.destroy();
      confirmText.destroy();
      creditsText.destroy();
      yesButton.destroy();
      noButton.destroy();
    };

    yesButton.on('pointerdown', () => {
      this.credits = 0;
      this.updateCreditsText();
      this.saveGameData();
      cleanup();
    });

    noButton.on('pointerdown', cleanup);
  }

  // Claude suggested addition on 2025-06-08: Debug method to add credits
  addDebugCredits() {
    this.credits += 20;
    this.updateCreditsText();
    this.saveGameData();
    console.log(`DEBUG: Added 20 credits. New total: ${this.credits}`);
  }
}
