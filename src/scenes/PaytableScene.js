// Update src/scenes/PaytableScene.js

import Phaser from 'phaser';
import config from '../game/config';

export default class PaytableScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PaytableScene' });
  }
  
  create() {
    // Dark semi-transparent background
    const bg = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.9);
    bg.setOrigin(0);
    
    // Add static elements
    this.add.text(640, 50, 'TREASURE COVE PAYTABLE', {
      fontSize: '32px',
      color: '#FFD700',
      align: 'center'
    }).setOrigin(0.5);
    
    // Close button
    const closeButton = this.add.text(1200, 50, 'X', {
      fontSize: '32px',
      color: '#FFFFFF',
      backgroundColor: '#880000',
      padding: { x: 15, y: 10 }
    }).setOrigin(0.5).setInteractive();
    
    closeButton.on('pointerdown', () => {
      this.scene.stop();
      this.scene.resume('MainScene');
      this.scene.resume('UIScene');
    });
    
    // Create a container for scrollable content
    this.contentContainer = this.add.container(0, 100);
    
    // Create all paytable content inside the container
    this.createPaytableContent();
    
    // Set up scroll controls
    this.setupScrolling();
    
    // Add scroll indicators
    this.createScrollIndicators();
  }
  
  setupScrolling() {
    // Track scrolling
    this.scrollY = 0;
    this.maxScroll = Math.max(0, this.contentHeight - 550); // Adjust based on visible area
    
    // Set up keyboard controls
    this.input.keyboard.on('keydown-UP', () => {
      this.scrollContent(-30);
    });
    
    this.input.keyboard.on('keydown-DOWN', () => {
      this.scrollContent(30);
    });
    
    // Set up mouse wheel scrolling
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
      this.scrollContent(deltaY * 0.5);
    });
    
    // Set up drag scrolling
    this.input.on('pointermove', (pointer) => {
      if (pointer.isDown) {
        const dy = pointer.position.y - pointer.prevPosition.y;
        this.scrollContent(-dy);
      }
    });
    
    // Add scroll buttons
    this.scrollUpButton = this.add.image(1200, 200, 'betUpButton')
      .setDisplaySize(60, 60)
      .setInteractive()
      .on('pointerdown', () => this.scrollContent(-50));
      
    this.scrollDownButton = this.add.image(1200, 500, 'betDownButton')
      .setDisplaySize(60, 60)
      .setInteractive()
      .on('pointerdown', () => this.scrollContent(50));
  }
  
  scrollContent(amount) {
    this.scrollY = Phaser.Math.Clamp(this.scrollY + amount, 0, this.maxScroll);
    this.contentContainer.y = 100 - this.scrollY;
    
    // Update scroll indicators
    this.updateScrollIndicators();
  }
  
  createScrollIndicators() {
    // Scroll track
    this.scrollTrack = this.add.rectangle(1200, 350, 10, 250, 0x333333);
    
    // Scroll thumb
    this.scrollThumb = this.add.rectangle(1200, 350, 10, 100, 0xFFFFFF)
      .setInteractive()
      .setDepth(100);
      
    // Make thumb draggable
    this.input.setDraggable(this.scrollThumb);
    
    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      if (gameObject === this.scrollThumb) {
        // Calculate limits
        const minY = this.scrollTrack.y - this.scrollTrack.height / 2 + this.scrollThumb.height / 2;
        const maxY = this.scrollTrack.y + this.scrollTrack.height / 2 - this.scrollThumb.height / 2;
        
        // Clamp dragY
        const newY = Phaser.Math.Clamp(dragY, minY, maxY);
        this.scrollThumb.y = newY;
        
        // Calculate percentage and apply to content
        const percentage = (newY - minY) / (maxY - minY);
        this.scrollY = this.maxScroll * percentage;
        this.contentContainer.y = 100 - this.scrollY;
      }
    });
    
    this.updateScrollIndicators();
  }
  
  updateScrollIndicators() {
    if (this.maxScroll > 0) {
      // Show scroll indicators
      this.scrollTrack.setAlpha(1);
      this.scrollThumb.setAlpha(1);
      this.scrollUpButton.setAlpha(1);
      this.scrollDownButton.setAlpha(1);
      
      // Update thumb position
      const percentage = this.scrollY / this.maxScroll;
      const minY = this.scrollTrack.y - this.scrollTrack.height / 2 + this.scrollThumb.height / 2;
      const maxY = this.scrollTrack.y + this.scrollTrack.height / 2 - this.scrollThumb.height / 2;
      this.scrollThumb.y = minY + percentage * (maxY - minY);
    } else {
      // Hide scroll indicators if content doesn't need scrolling
      this.scrollTrack.setAlpha(0);
      this.scrollThumb.setAlpha(0);
      this.scrollUpButton.setAlpha(0.5);
      this.scrollDownButton.setAlpha(0.5);
    }
  }
  
  createPaytableContent() {
    // Y position tracker
    let yPos = 0;
    const xPos = 640;
    const spacing = 100;
    
    // Premium symbols section
    this.add.text(xPos, yPos, 'PREMIUM SYMBOLS', {
      fontSize: '24px',
      color: '#FFFFFF',
      align: 'center'
    }).setOrigin(0.5).setDepth(10);
    this.contentContainer.add(this.add.text(xPos, yPos, 'PREMIUM SYMBOLS', {
      fontSize: '24px',
      color: '#FFFFFF',
      align: 'center'
    }).setOrigin(0.5));
    
    yPos += 50;
    
    // Display premium symbols and their payouts
    const premiumSymbols = [
      { id: 'chest', name: 'Treasure Chest', values: [0, 0, 30, 100, 500] },
      { id: 'captain', name: 'Pirate Captain', values: [0, 0, 25, 80, 300] },
      { id: 'ship', name: 'Sunken Ship', values: [0, 0, 20, 60, 200] },
      { id: 'mermaid', name: 'Mermaid', values: [0, 0, 15, 50, 150] }
    ];
    
    for (const symbol of premiumSymbols) {
      this.createSymbolRow(xPos, yPos, symbol);
      yPos += spacing;
    }
    
    // Medium symbols section
    yPos += 20;
    this.contentContainer.add(this.add.text(xPos, yPos, 'MEDIUM SYMBOLS', {
      fontSize: '24px',
      color: '#FFFFFF',
      align: 'center'
    }).setOrigin(0.5));
    
    yPos += 50;
    
    const mediumSymbols = [
      { id: 'anchor', name: 'Anchor', values: [0, 0, 10, 30, 100] },
      { id: 'compass', name: 'Compass', values: [0, 0, 8, 25, 80] }
    ];
    
    for (const symbol of mediumSymbols) {
      this.createSymbolRow(xPos, yPos, symbol);
      yPos += spacing;
    }
    
    // Low symbols section
    yPos += 20;
    this.contentContainer.add(this.add.text(xPos, yPos, 'LOW SYMBOLS', {
      fontSize: '24px',
      color: '#FFFFFF',
      align: 'center'
    }).setOrigin(0.5));
    
    yPos += 50;
    
    const lowSymbols = [
      { id: 'a', name: 'A', values: [0, 0, 5, 15, 60] },
      { id: 'k', name: 'K', values: [0, 0, 4, 12, 50] },
      { id: 'q', name: 'Q', values: [0, 0, 3, 10, 40] },
      { id: 'j', name: 'J', values: [0, 0, 2, 8, 30] }
    ];
    
    for (const symbol of lowSymbols) {
      this.createSymbolRow(xPos, yPos, symbol);
      yPos += spacing;
    }
    
    // Special symbols section
    yPos += 20;
    this.contentContainer.add(this.add.text(xPos, yPos, 'SPECIAL SYMBOLS', {
      fontSize: '24px',
      color: '#FFFFFF',
      align: 'center'
    }).setOrigin(0.5));
    
    yPos += 50;
    
    // Wild
    const kraken = this.add.sprite(xPos - 400, yPos, 'kraken').setDisplaySize(80, 80);
    this.contentContainer.add(kraken);
    this.contentContainer.add(this.add.text(xPos - 300, yPos, 'WILD (Kraken)', {
      fontSize: '20px',
      color: '#FFFFFF'
    }).setOrigin(0, 0.5));
    this.contentContainer.add(this.add.text(xPos, yPos, 'Substitutes for all symbols except Scatter and Bonus', {
      fontSize: '18px',
      color: '#FFFFFF'
    }).setOrigin(0, 0.5));
    
    yPos += spacing;
    
    // Scatter
    const map = this.add.sprite(xPos - 400, yPos, 'map').setDisplaySize(80, 80);
    this.contentContainer.add(map);
    this.contentContainer.add(this.add.text(xPos - 300, yPos, 'SCATTER (Map)', {
      fontSize: '20px',
      color: '#FFFFFF'
    }).setOrigin(0, 0.5));
    this.contentContainer.add(this.add.text(xPos, yPos, '3 or more trigger Free Spins Bonus', {
      fontSize: '18px',
      color: '#FFFFFF'
    }).setOrigin(0, 0.5));
    
    yPos += spacing;
    
    // Bonus
    const pearl = this.add.sprite(xPos - 400, yPos, 'pearl').setDisplaySize(80, 80);
    this.contentContainer.add(pearl);
    this.contentContainer.add(this.add.text(xPos - 300, yPos, 'BONUS (Pearl)', {
      fontSize: '20px',
      color: '#FFFFFF'
    }).setOrigin(0, 0.5));
    this.contentContainer.add(this.add.text(xPos, yPos, '3 or more on a payline trigger Pearl Collection Bonus', {
      fontSize: '18px',
      color: '#FFFFFF'
    }).setOrigin(0, 0.5));
    
    yPos += spacing;
    
    // Paylines
    this.contentContainer.add(this.add.text(xPos, yPos, 'PAYLINES: 9', {
      fontSize: '24px',
      color: '#FFD700',
      align: 'center'
    }).setOrigin(0.5));
    
    yPos += 50;
    
    // Add payline descriptions
    const paylineDescriptions = [
      "Line 1: Middle row straight across",
      "Line 2: Top row straight across",
      "Line 3: Bottom row straight across",
      "Line 4: V-shape from top",
      "Line 5: Inverted V-shape from bottom",
      "Line 6: W-shape",
      "Line 7: M-shape",
      "Line 8: Zigzag down-up-down",
      "Line 9: Zigzag up-down-up"
    ];
    
    for (const desc of paylineDescriptions) {
      this.contentContainer.add(this.add.text(xPos, yPos, desc, {
        fontSize: '18px',
        color: '#FFFFFF',
        align: 'center'
      }).setOrigin(0.5));
      yPos += 30;
    }
    
    yPos += 50;
    
    // Bonus information
    this.contentContainer.add(this.add.text(xPos, yPos, 'BONUS FEATURES', {
      fontSize: '24px',
      color: '#FFD700',
      align: 'center'
    }).setOrigin(0.5));
    
    yPos += 50;
    
    // Free Spins description
    this.contentContainer.add(this.add.text(xPos, yPos, 'FREE SPINS BONUS', {
      fontSize: '20px',
      color: '#FFFFFF',
      align: 'center'
    }).setOrigin(0.5));
    
    yPos += 30;
    
    const freeSpinsDesc = [
      "3 Scatters: 8 free spins",
      "4 Scatters: 12 free spins",
      "5 Scatters: 15 free spins",
      "During free spins, all Wild symbols expand to cover entire reels",
      "All wins during free spins are multiplied by 2",
      "Free spins can be retriggered"
    ];
    
    for (const desc of freeSpinsDesc) {
      this.contentContainer.add(this.add.text(xPos, yPos, desc, {
        fontSize: '16px',
        color: '#FFFFFF',
        align: 'center'
      }).setOrigin(0.5));
      yPos += 25;
    }
    
    yPos += 30;
    
    // Pearl Bonus description
    this.contentContainer.add(this.add.text(xPos, yPos, 'PEARL COLLECTION BONUS', {
      fontSize: '20px',
      color: '#FFFFFF',
      align: 'center'
    }).setOrigin(0.5));
    
    yPos += 30;
    
    const pearlBonusDesc = [
      "3 Pearls on a payline: 3 picks",
      "4 Pearls on a payline: 4 picks",
      "5 Pearls on a payline: 5 picks",
      "Pick oysters to reveal prizes:",
      "- Credit values (1× to 50× total bet)",
      "- Multipliers (2×, 3×, 5×, 10×)",
      "- Extra picks (+1, +2, +3)",
      "- Collect (ends the bonus round)"
    ];
    
    for (const desc of pearlBonusDesc) {
      this.contentContainer.add(this.add.text(xPos, yPos, desc, {
        fontSize: '16px',
        color: '#FFFFFF',
        align: 'center'
      }).setOrigin(0.5));
      yPos += 25;
    }
    
    // Record content height for scrolling
    this.contentHeight = yPos + 50;
  }
  
  createSymbolRow(x, y, symbolInfo) {
    // Symbol image
    const symbol = this.add.sprite(x - 400, y, symbolInfo.id).setDisplaySize(80, 80);
    this.contentContainer.add(symbol);
    
    // Symbol name
    this.contentContainer.add(this.add.text(x - 300, y, symbolInfo.name, {
      fontSize: '20px',
      color: '#FFFFFF'
    }).setOrigin(0, 0.5));
    
    // Payouts for 3, 4, 5 of a kind
    this.contentContainer.add(this.add.text(x, y, `3: ${symbolInfo.values[2]}×   4: ${symbolInfo.values[3]}×   5: ${symbolInfo.values[4]}×`, {
      fontSize: '18px',
      color: '#FFFFFF'
    }).setOrigin(0, 0.5));
  }
}