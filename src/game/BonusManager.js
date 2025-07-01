// src/game/BonusManager.js
// Claude suggested refactor on 2025-06-08: Extracted bonus scene management from MainScene

import config from './config';
import { showFreeSpinsMessage, showPuppyBonusMessage } from '../utils/winEffects';

export default class BonusManager {
  constructor(scene) {
    this.scene = scene;
    
    // Bind completion handlers to maintain context
    this.freeSpinsCompleted = this.freeSpinsCompleted.bind(this);
    this.puppyBonusCompleted = this.puppyBonusCompleted.bind(this);
    
    console.log("BonusManager: Bonus completion handlers bound in constructor.");
  }

  setupEventListeners() {
    console.log("BonusManager: Setting up GLOBAL listeners for bonus completion.");
    
    // Remove any existing listeners to prevent duplicates
    this.scene.sys.events.off('freeSpinsCompleteGlobal', this.freeSpinsCompleted, this);
    this.scene.sys.events.off('puppyBonusCompleteGlobal', this.puppyBonusCompleted, this);
    
    // Add listeners
    this.scene.sys.events.on('freeSpinsCompleteGlobal', this.freeSpinsCompleted, this);
    this.scene.sys.events.on('puppyBonusCompleteGlobal', this.puppyBonusCompleted, this);

    // Add registry check for bonus completion
    this.scene.game.registry.events.on('changedata', (parent, key, data) => {
      if (key === 'bonusCompleted' && data) {
        console.log("BonusManager: Registry detected bonus completion:", data);
        if (data.type === 'freeSpins') {
          this.freeSpinsCompleted(data.totalWin);
        } else if (data.type === 'puppyBonus') {
          this.puppyBonusCompleted(data.totalWin);
        }
        this.scene.game.registry.set('bonusCompleted', null);
      }
    });

    // Verify listeners were attached
    console.log(`BonusManager: Listener count for freeSpinsCompleteGlobal: ${this.scene.sys.events.listenerCount('freeSpinsCompleteGlobal')}`);
    console.log(`BonusManager: Listener count for puppyBonusCompleteGlobal: ${this.scene.sys.events.listenerCount('puppyBonusCompleteGlobal')}`);
    
    if (this.scene.sys.events.listenerCount('freeSpinsCompleteGlobal') === 0 || 
        this.scene.sys.events.listenerCount('puppyBonusCompleteGlobal') === 0) {
      console.error("BonusManager: A bonus completion listener failed to attach!");
    }
  }

  launchFreeSpins(spins) {
    console.log(`BonusManager: Launching FS with ${spins} spins.`);
    
    this.scene.reelState = 'bonus';
    this.scene.game.registry.set('bonusCompleted', null);
    
    // Claude suggested addition on 2025-06-08: Pause background music for bonus
    if (this.scene.pauseBackgroundMusic) {
      this.scene.pauseBackgroundMusic();
    }
    
    console.log("BonusManager: Pausing MainScene & UIScene. Hiding MainScene.");
    this.scene.scene.pause();
    this.scene.scene.pause('UIScene');
    this.scene.scene.setVisible(false);
    
    this.scene.sound.play('sfx_bonus_freespins_start');
    this.scene.scene.launch('FreeSpinsScene', { spins: spins, bet: this.scene.currentBet });
  }

  launchPuppyBonus(picks) {
    console.log(`BonusManager: Launching Puppy Bonus with ${picks} picks.`);
    
    this.scene.reelState = 'bonus';
    this.scene.game.registry.set('bonusCompleted', null);
    
    // Claude suggested addition on 2025-06-08: Pause background music for bonus
    if (this.scene.pauseBackgroundMusic) {
      this.scene.pauseBackgroundMusic();
    }
    
    console.log("BonusManager: Pausing MainScene & UIScene. Hiding MainScene.");
    this.scene.scene.pause();
    this.scene.scene.pause('UIScene');
    this.scene.scene.setVisible(false);

    this.scene.sound.play('sfx_bonus_puppy_start');
    this.scene.scene.launch('PuppyBonusScene', { picks: picks, bet: this.scene.currentBet });
  }

  freeSpinsCompleted(totalWin) {
    console.log(`BonusManager: GLOBAL 'freeSpinsCompleteGlobal' received. Win: ${totalWin}. State: ${this.scene.reelState}`);
    
    if (this.scene.reelState !== 'bonus') {
      console.warn(`FS complete handler called in wrong state: ${this.scene.reelState}.`);
    }
    
    console.log("BonusManager: Ensuring MainScene is visible");
    this.scene.scene.setVisible(true);
    console.log("BonusManager: Resuming MainScene.");
    this.scene.scene.resume();
    
    // Set reel backgrounds visible
    console.log("BonusManager: Setting reel BGs visible.");
    for (let r = 0; r < config.reels; r++) {
      if (!this.scene.reelBackgrounds[r]) continue;
      for (let w = 0; w < config.rows; w++) {
        if (this.scene.reelBackgrounds[r][w]) {
          this.scene.reelBackgrounds[r][w].setVisible(true);
        }
      }
    }
    
    console.log("BonusManager: Force applying mask to all sprites");
    this.scene.applyMaskToAll();
    
    const uiScene = this.scene.scene.manager.getScene('UIScene');
    if (uiScene && this.scene.scene.manager.isPaused('UIScene')) {
      console.log("BonusManager: Resuming UIScene.");
      this.scene.scene.resume('UIScene');
    } else {
      console.warn(`BonusManager: UIScene not found or not paused.`);
    }
    
    if (totalWin > 0) {
      console.log("BonusManager: Emitting 'win' event.");
      this.scene.events.emit('win', { amount: totalWin, bonusType: 'freeSpins' });
    }
    
    // Claude suggested addition on 2025-06-08: Resume background music after bonus
    if (this.scene.resumeBackgroundMusic) {
      this.scene.resumeBackgroundMusic();
    }
    
    this.scene.reelState = 'idle';
    console.log("BonusManager: State -> 'idle' after FS handler.");
    this.scene.resetUISceneSpinningFlag();
  }

  puppyBonusCompleted(totalWin) {
    console.log(`BonusManager: GLOBAL 'puppyBonusCompleteGlobal' received. Win: ${totalWin}. State: ${this.scene.reelState}`);
    
    if (this.scene.reelState !== 'bonus') {
      console.warn(`Puppy Bonus complete handler called in wrong state: ${this.scene.reelState}.`);
    }
    
    console.log("BonusManager: Ensuring MainScene is visible");
    this.scene.scene.setVisible(true);
    console.log("BonusManager: Resuming MainScene.");
    this.scene.scene.resume();
    
    console.log("BonusManager: Setting reel BGs visible.");
    for (let r = 0; r < config.reels; r++) {
      if (!this.scene.reelBackgrounds[r]) continue;
      for (let w = 0; w < config.rows; w++) {
        if (this.scene.reelBackgrounds[r][w]) {
          this.scene.reelBackgrounds[r][w].setVisible(true);
        }
      }
    }
    
    console.log("BonusManager: Force applying mask to all sprites");
    this.scene.applyMaskToAll();
    
    const uiScene = this.scene.scene.manager.getScene('UIScene');
    if (uiScene && this.scene.scene.manager.isPaused('UIScene')) {
      console.log("BonusManager: Resuming UIScene.");
      this.scene.scene.resume('UIScene');
    } else {
      console.warn(`BonusManager: UIScene not found or not paused.`);
    }
    
    if (totalWin > 0) {
      console.log("BonusManager: Emitting 'win' event for Puppy Bonus.");
      this.scene.events.emit('win', { amount: totalWin, bonusType: 'puppyBonus' });
    }
    
    // Claude suggested addition on 2025-06-08: Resume background music after bonus
    if (this.scene.resumeBackgroundMusic) {
      this.scene.resumeBackgroundMusic();
    }
    
    this.scene.reelState = 'idle';
    console.log("BonusManager: State -> 'idle' after Puppy Bonus handler.");
    this.scene.resetUISceneSpinningFlag();
  }

  triggerDebugFreeSpins() {
    if (this.scene.reelState !== 'idle') {
      console.warn("Debug blocked: not idle.");
      return;
    }
    
    console.log('DEBUG: Triggering FS');
    this.scene.reelState = 'evaluation';
    
    const scatterId = config.scatter?.id || 'fire';
    const needed = config.freeSpins?.triggerCount || 3;
    const targetRowIndex = 1;
    const spriteOffset = (this.scene.symbolSprites[0]?.length === config.rows + 1) ? 1 : 0;
    const physicalRowIndex = targetRowIndex + spriteOffset;
    
    for (let reel = 0; reel < needed; reel++) {
      const targetSprite = this.scene.symbolSprites[reel]?.[physicalRowIndex];
      if (targetSprite) {
        targetSprite.setTexture(scatterId);
        console.log(`DEBUG: Set r${reel} (phys ${physicalRowIndex}) to ${scatterId}`);
      } else {
        console.error(`DEBUG FS: Sprite missing r${reel}, phys ${physicalRowIndex}`);
        this.scene.reelState = 'idle';
        return;
      }
    }
    
    const dbgMsg = this.scene.add.text(this.scene.cameras.main.width - 10, 10, 'DEBUG FS', {
      fontSize: '14px',
      color: '#FF0000',
      align: 'right'
    }).setOrigin(1, 0).setDepth(3000);
    
    this.scene.time.delayedCall(2000, () => {
      if (dbgMsg?.scene) dbgMsg.destroy();
    });
    
    this.scene.time.delayedCall(100, () => {
      // Use getCurrentBoardState to read the current sprites
      const finalBoard = this.scene.getCurrentBoardState();
      console.log("DEBUG FS Board:", finalBoard);
      
      // Create a mock outcome for the debug trigger
      const mockOutcome = {
        type: 'free_spins_3',
        scatters: needed,
        freeSpins: config.freeSpins?.awards?.[needed] || 8,
        description: `DEBUG: ${needed} fire scatters`
      };
      
      console.log("DEBUG FS Info:", mockOutcome);
      
      if (this.scene.sound.get('bonusSound')) this.scene.sound.play('bonusSound');
      showFreeSpinsMessage(this.scene, mockOutcome.freeSpins);
      this.scene.time.delayedCall(2000, () => {
        this.launchFreeSpins(mockOutcome.freeSpins);
      });
    });
  }

  triggerDebugPuppy() {
    if (this.scene.reelState !== 'idle') {
      console.warn("Debug blocked: not idle.");
      return;
    }
    
    console.log('DEBUG: Triggering Puppy Bonus');
    this.scene.reelState = 'evaluation';
    
    const bonusId = config.bonus?.id || 'elsi';
    const needed = config.puppyBonus?.triggerCount || 3;
    const targetRowIndex = 1;
    const spriteOffset = (this.scene.symbolSprites[0]?.length === config.rows + 1) ? 1 : 0;
    const physicalRowIndex = targetRowIndex + spriteOffset;
    
    for (let reel = 0; reel < needed; reel++) {
      const targetSprite = this.scene.symbolSprites[reel]?.[physicalRowIndex];
      if (targetSprite) {
        targetSprite.setTexture(bonusId);
        console.log(`DEBUG: Set r${reel} (phys ${physicalRowIndex}) to ${bonusId}`);
      } else {
        console.error(`DEBUG Puppy: Sprite missing r${reel}, phys ${physicalRowIndex}`);
        this.scene.reelState = 'idle';
        return;
      }
    }
    
    const dbgMsg = this.scene.add.text(this.scene.cameras.main.width - 10, 30, 'DEBUG Puppy', {
      fontSize: '14px',
      color: '#00FF00',
      align: 'right'
    }).setOrigin(1, 0).setDepth(3000);
    
    this.scene.time.delayedCall(2000, () => {
      if (dbgMsg?.scene) dbgMsg.destroy();
    });
    
    this.scene.time.delayedCall(100, () => {
      // Use getCurrentBoardState to read the current sprites
      const finalBoard = this.scene.getCurrentBoardState();
      console.log("DEBUG Puppy Board:", finalBoard);
      
      // Create a mock outcome for the debug trigger
      const mockOutcome = {
        type: 'puppy_bonus_3',
        bonusSymbols: needed,
        picks: needed, // Picks usually equals trigger count
        description: `DEBUG: ${needed} elsi bonus`
      };
      
      console.log("DEBUG Puppy Info:", mockOutcome);
      
      if (this.scene.sound.get('bonusSound')) this.scene.sound.play('bonusSound');
      showPuppyBonusMessage(this.scene, mockOutcome.picks);
      this.scene.time.delayedCall(2000, () => {
        this.launchPuppyBonus(mockOutcome.picks);
      });
    });
  }

  handleBonusLaunch(bonusInfo) {
    let bonusLaunched = false;
    
    if (bonusInfo.freeSpins) {
      bonusLaunched = true;
      console.log(`BonusManager: FS Trigger! Count: ${bonusInfo.freeSpinsCount}`);
      
      this.scene.animationManager.cleanupAnticipationEffects();
      
      if (this.scene.sound.get('bonusSound')) this.scene.sound.play('bonusSound');
      showFreeSpinsMessage(this.scene, bonusInfo.freeSpinsCount);
      this.scene.time.delayedCall(2000, () => {
        this.launchFreeSpins(bonusInfo.freeSpinsCount);
      });
    } else if (bonusInfo.puppyBonus) {
      bonusLaunched = true;
      console.log(`BonusManager: Puppy Bonus Trigger! Picks: ${bonusInfo.puppyBonusPicks}`);
      
      this.scene.animationManager.cleanupAnticipationEffects();
      
      if (this.scene.sound.get('bonusSound')) this.scene.sound.play('bonusSound');
      showPuppyBonusMessage(this.scene, bonusInfo.puppyBonusPicks);
      this.scene.time.delayedCall(2000, () => {
        this.launchPuppyBonus(bonusInfo.puppyBonusPicks);
      });
    }
    
    return bonusLaunched;
  }
}