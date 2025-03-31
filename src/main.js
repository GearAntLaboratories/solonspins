// src/main.js
import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import PreloadScene from './scenes/PreloadScene';
import MainScene from './scenes/MainScene';
import UIScene from './scenes/UIScene';
import PaytableScene from './scenes/PaytableScene';
import FreeSpinsScene from './scenes/FreeSpinsScene';
import PearlBonusScene from './scenes/PearlBonusScene';


console.log('Treasure Cove game starting...');
console.log('Checking for scene imports:', 
  typeof BootScene, 
  typeof PreloadScene, 
  typeof MainScene, 
  typeof UIScene
);

// src/main.js - Make sure this section matches your code
const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  backgroundColor: '#12658F',
  parent: 'game-container',
  scene: [BootScene, PreloadScene, MainScene, UIScene,PaytableScene,
    FreeSpinsScene,
    PearlBonusScene],  // Make sure scenes are in this order
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

window.game = new Phaser.Game(config);