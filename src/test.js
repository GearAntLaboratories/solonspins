// src/test.js
import Phaser from 'phaser';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#4488aa',
  parent: 'game-container',
  scene: {
    create: function() {
      console.log('Test scene created');
      this.add.text(400, 300, 'Phaser is working!', {
        color: '#ffffff',
        fontSize: '32px'
      }).setOrigin(0.5);
    }
  }
};

console.log('Creating test Phaser game');
window.game = new Phaser.Game(config);