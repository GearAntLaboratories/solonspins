// src/main.js
import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import PreloadScene from './scenes/PreloadScene';
import MainScene from './scenes/MainScene';
import UIScene from './scenes/UIScene';
import PaytableScene from './scenes/PaytableScene';
import FreeSpinsScene from './scenes/FreeSpinsScene';
// Import the renamed scene from the renamed file
import PuppyBonusScene from './scenes/PuppyBonusScene'; // UPDATED IMPORT


console.log('Solon Spins game starting...'); // Updated game name
console.log('Checking for scene imports:',
  typeof BootScene,
  typeof PreloadScene,
  typeof MainScene,
  typeof UIScene,
  // Add checks for other scenes if needed
  typeof PaytableScene,
  typeof FreeSpinsScene,
  typeof PuppyBonusScene // Check the new scene import
);

// src/main.js - Make sure this section matches your code
const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  backgroundColor: '#12658F', // You might want to change this color later
  parent: 'game-container',
  // Update the scene list
  scene: [
    BootScene,
    PreloadScene,
    MainScene,
    UIScene,
    PaytableScene,
    FreeSpinsScene,
    PuppyBonusScene // UPDATED SCENE LIST
  ],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

window.game = new Phaser.Game(config);