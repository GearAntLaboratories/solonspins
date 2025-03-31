// src/scenes/BootScene.js
import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
    console.log('BootScene constructor called');
  }
  
  preload() {
    console.log('BootScene preload running');
    // Load loading screen assets
    this.load.image('logo', 'assets/images/logo.png');
    this.load.image('loading-bar', 'assets/images/loading-bar.png');
  }
  
  create() {
    console.log('BootScene create running, starting PreloadScene');
    this.scene.start('PreloadScene');
  }
}