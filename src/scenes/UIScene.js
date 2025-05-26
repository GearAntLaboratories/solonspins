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
    const buttonStartX = 300;
    let buttonStartY = 50;
    this.paytableButton = this.add.text(
      buttonStartX, buttonStartY, 'PAYTABLE',
      { fontSize: '18px', color: '#FFFFFF', backgroundColor: '#004488', padding: { x: 12, y: 6 } }
    ).setOrigin(0, 0).setDepth(1100).setInteractive().on('pointerdown', this.showPaytable, this);
  
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
    }
  }

  createTextDisplays() {
    // Credits (upper left)
    const style = { fontFamily: 'Arial', fontSize: '24px', color: '#FFFFFF', align: 'center', stroke: '#000000', strokeThickness: 3 };
    this.creditsText = this.add.text(100, 50, `CREDITS: ${this.credits.toFixed(2)}`, style);
  
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
      // --- WIN TEXT: Always at fixed position, clear after short delay
      if (data.bonusType === 'freeSpins') this.winText.setText(`FREE SPINS BONUS WIN: ${data.amount.toFixed(2)}`);
      else if (data.bonusType === 'puppyBonus') this.winText.setText(`PUPPY BONUS WIN: ${data.amount.toFixed(2)}`);
      else this.winText.setText(`WIN: ${data.amount.toFixed(2)}`);
      this.showCoins(data.amount);
      this.time.delayedCall(1800, () => {
        if (this.winText?.scene) this.winText.setText('');
      });
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
    if (this.creditsText) this.creditsText.setText(`CREDITS: ${this.credits.toFixed(2)}`);
  }
  updateBetText() {
    if (this.betText) this.betText.setText(`BET: ${this.bet.toFixed(2)}`);
  }

  showInsufficientFunds() {
    if (this.insufficientFundsMsg?.scene) return;
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
}
