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
      // New Themed Symbols
      this.load.image('pam_mike', 'assets/images/symbols/pam_mike.png');   // Replaces chest
      this.load.image('grant', 'assets/images/symbols/grant.png');         // Replaces captain
      this.load.image('logan', 'assets/images/symbols/logan.png');         // Replaces ship
      this.load.image('nick', 'assets/images/symbols/nick.png');           // Replaces mermaid
      this.load.image('beer', 'assets/images/symbols/beer.png');           // Replaces anchor
      this.load.image('flag', 'assets/images/symbols/flag.png');           // Replaces compass
      this.load.image('loon', 'assets/images/symbols/loon.png');           // Replaces kraken (Wild)
      this.load.image('fire', 'assets/images/symbols/fire.png');           // Replaces map (Scatter)
      this.load.image('elsi', 'assets/images/symbols/elsi.png');           // Replaces pearl (Bonus Trigger) & Puppy Bonus

      // Low Symbols (Keep)
      this.load.image('a', 'assets/images/symbols/a.png');
      this.load.image('k', 'assets/images/symbols/k.png');
      this.load.image('q', 'assets/images/symbols/q.png');
      this.load.image('j', 'assets/images/symbols/j.png');

      // Load Puppy Bonus Assets
      this.load.image('puppy_background', 'assets/images/bonus/puppy_background.png'); // Adjust path if needed
      this.load.image('puppy_logo', 'assets/images/bonus/puppy_logo.png'); // Adjust path if needed

         // Load Free Spins Bonus Assets
         this.load.image('freespins_background', 'assets/images/bonus/freespins_background.png'); // Adjust path if needed
         this.load.image('freespins_logo', 'assets/images/bonus/freespins_logo.png'); // Adjust path if needed

// Add these inside PreloadScene.js's preload() method's try block:
this.load.image('main_background', 'assets/images/ui/main_background.png'); // Adjust path
this.load.image('main_logo', 'assets/images/ui/main_logo.png'); // Adjust path

      // Additional Dog Images for Puppy Bonus Scene
      this.load.image('ruby', 'assets/images/symbols/ruby.png');
      this.load.image('marlin', 'assets/images/symbols/marlin.png');
      this.load.image('minnow', 'assets/images/symbols/minnow.png');

      // Load UI elements (Assuming these filenames are still correct)
      this.load.image('background', 'assets/images/ui/background.png');
      this.load.image('reelBackground', 'assets/images/ui/reel-background.png');
      this.load.image('spinButton', 'assets/images/ui/spin-button.png');
      this.load.image('betUpButton', 'assets/images/ui/bet-up.png');
      this.load.image('betDownButton', 'assets/images/ui/bet-down.png');

      // Load audio (Assuming these filenames are still correct)
      this.load.audio('sfx_spin_button', 'assets/sounds/sfx_spin_button.mp3');
this.load.audio('sfx_reel_start', 'assets/sounds/sfx_reel_start.mp3');
this.load.audio('sfx_reel_stop', 'assets/sounds/sfx_reel_stop.mp3');
this.load.audio('sfx_win_small', 'assets/sounds/sfx_win_small.mp3');
this.load.audio('sfx_win_big', 'assets/sounds/sfx_win_big.mp3');
this.load.audio('sfx_scatter_landed', 'assets/sounds/sfx_scatter_landed.mp3');
this.load.audio('sfx_bonus_puppy_start', 'assets/sounds/sfx_bonus_puppy_start.mp3');
this.load.audio('sfx_bonus_freespins_start', 'assets/sounds/sfx_bonus_freespins_start.mp3');
this.load.audio('music_bonus_puppy_loop', 'assets/sounds/music_bonus_puppy_loop.mp3');
this.load.audio('music_bonus_freespins_loop', 'assets/sounds/music_bonus_freespins_loop.mp3');
this.load.audio('sfx_pick_credit', 'assets/sounds/sfx_pick_credit.mp3');
this.load.audio('sfx_pick_poop', 'assets/sounds/sfx_pick_poop.mp3');
this.load.audio('sfx_expanding_wild', 'assets/sounds/sfx_expanding_wild.mp3');
this.load.audio('sfx_bonus_end', 'assets/sounds/sfx_bonus_end.mp3');
this.load.audio('sfx_insufficient_credits', 'assets/sounds/sfx_insufficient_credits.mp3');
this.load.audio('sfx_near_miss', 'assets/sounds/sfx_near_miss.mp3');


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