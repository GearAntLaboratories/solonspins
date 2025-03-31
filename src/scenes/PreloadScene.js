// src/scenes/PreloadScene.js
import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
    console.log('PreloadScene constructor called');
  }
  
  preload() {
    console.log('PreloadScene preload running');
    
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Try-catch to handle potential missing assets
    try {
      const logo = this.add.image(width / 2, height / 2 - 100, 'logo');
      
      const progressBar = this.add.graphics();
      const progressBox = this.add.graphics();
      progressBox.fillStyle(0x222222, 0.8);
      progressBox.fillRect(width / 2 - 160, height / 2, 320, 50);
      
      // Loading text
      const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
        font: '20px Arial',
        fill: '#ffffff'
      }).setOrigin(0.5, 0.5);
      
      // Progress event
      this.load.on('progress', (value) => {
        progressBar.clear();
        progressBar.fillStyle(0xffffff, 1);
        progressBar.fillRect(width / 2 - 150, height / 2 + 10, 300 * value, 30);
      });
      
      // Load complete event
      this.load.on('complete', () => {
        progressBar.destroy();
        progressBox.destroy();
        loadingText.destroy();
      });
    } catch (e) {
      console.error('Error setting up loading screen:', e);
    }
    
    console.log('Loading game assets...');
    
    // Load symbol sprites - wrap in try/catch to see errors
    try {
      this.load.image('chest', 'assets/images/symbols/chest.png');
      this.load.image('captain', 'assets/images/symbols/captain.png');
      this.load.image('ship', 'assets/images/symbols/ship.png');
      this.load.image('mermaid', 'assets/images/symbols/mermaid.png');
      this.load.image('anchor', 'assets/images/symbols/anchor.png');
      this.load.image('compass', 'assets/images/symbols/compass.png');
      this.load.image('a', 'assets/images/symbols/a.png');
      this.load.image('k', 'assets/images/symbols/k.png');
      this.load.image('q', 'assets/images/symbols/q.png');
      this.load.image('j', 'assets/images/symbols/j.png');
      this.load.image('kraken', 'assets/images/symbols/kraken.png');
      this.load.image('map', 'assets/images/symbols/map.png');
      this.load.image('pearl', 'assets/images/symbols/pearl.png');
      
      // Load UI elements
      this.load.image('background', 'assets/images/ui/background.png');
      this.load.image('reelBackground', 'assets/images/ui/reel-background.png');
      this.load.image('spinButton', 'assets/images/ui/spin-button.png');
      this.load.image('betUpButton', 'assets/images/ui/bet-up.png');
      this.load.image('betDownButton', 'assets/images/ui/bet-down.png');
      
      // Load audio
      this.load.audio('spinSound', 'assets/sounds/spin.mp3');
      this.load.audio('winSound', 'assets/sounds/win.mp3');
      this.load.audio('bonusSound', 'assets/sounds/bonus.mp3');
      
      console.log('All assets loaded successfully');
    } catch (e) {
      console.error('Error loading assets:', e);
    }
  }
  
  create() {
    console.log('PreloadScene create running, starting MainScene and UIScene');
    this.scene.start('MainScene');
    this.scene.launch('UIScene');
  }
}