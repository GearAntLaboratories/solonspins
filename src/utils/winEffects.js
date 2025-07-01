// src/utils/winEffects.js

export function showBigWinEffects(scene, totalWin, currentBet) {
    const flash = scene.add.rectangle(640, 360, 1280, 720, 0xFFFFFF, 0.8)
      .setDepth(2500);
  
    scene.sound.play('sfx_win_big');
  
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy()
    });
  
    scene.cameras.main.shake(300, 0.01);
  
    const bigWinText = scene.add.text(640, 200, 'BIG WIN!', {
      fontSize: '72px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 6,
      fontFamily: 'Arial Black'
    })
    .setOrigin(0.5)
    .setDepth(2600)
    .setScale(0);
  
    scene.tweens.add({
      targets: bigWinText,
      scale: 1.2,
      duration: 500,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: 1000,
      onComplete: () => bigWinText.destroy()
    });
  
    createWinParticles(scene, totalWin, currentBet);
  }
  
  export function createWinParticles(scene, winAmount, currentBet) {
    const particleCount = Math.min(50, Math.floor(winAmount / currentBet));
  
    for (let i = 0; i < particleCount; i++) {
      const x = Phaser.Math.Between(200, 1080);
      const y = Phaser.Math.Between(200, 520);
  
      const particle = scene.add.sprite(x, y, 'beer')
        .setScale(0.3)
        .setAlpha(0)
        .setDepth(2400);
  
      scene.tweens.add({
        targets: particle,
        alpha: 1,
        scale: 0.5,
        x: x + Phaser.Math.Between(-100, 100),
        y: y - Phaser.Math.Between(50, 150),
        duration: Phaser.Math.Between(1000, 2000),
        delay: i * 20,
        ease: 'Power2',
        onComplete: () => {
          scene.tweens.add({
            targets: particle,
            alpha: 0,
            duration: 500,
            onComplete: () => particle.destroy()
          });
        }
      });
    }
  }
  
  export function showMediumWinEffects(scene) {
    const glow = scene.add.sprite(640, 360, 'beer')
      .setAlpha(0.3)
      .setScale(15)
      .setTint(0xFFD700)
      .setDepth(10);
  
    scene.tweens.add({
      targets: glow,
      alpha: 0,
      scale: 20,
      duration: 1000,
      onComplete: () => glow.destroy()
    });
  }
  
  export function showFreeSpinsMessage(scene, spins) {
    const msg = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY,
      `FREE SPINS BONUS!\n${spins} FREE SPINS`, {
        fontSize: '48px',
        color: '#FFD700',
        backgroundColor: '#000000CC',
        padding: { x: 30, y: 20 },
        align: 'center',
        stroke: '#000000',
        strokeThickness: 2,
        fontFamily: 'Arial Black, Arial, sans-serif'
      })
      .setOrigin(0.5)
      .setDepth(2000)
      .setScale(0);
  
    scene.tweens.add({
      targets: msg,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut'
    });
  
    scene.time.delayedCall(2000, () => {
      if (msg?.scene) {
        scene.tweens.add({
          targets: msg,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            if (msg?.scene) msg.destroy();
          }
        });
      }
    });
  }
  
  export function showPuppyBonusMessage(scene, picks) {
    const msg = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY,
      `PUPPY BONUS!\n${picks} PICKS`, {
        fontSize: '48px',
        color: '#ADD8E6',
        backgroundColor: '#000000CC',
        padding: { x: 30, y: 20 },
        align: 'center',
        stroke: '#654321',
        strokeThickness: 2,
        fontFamily: 'Arial Black, Arial, sans-serif'
      })
      .setOrigin(0.5)
      .setDepth(2000)
      .setScale(0);
  
    scene.tweens.add({
      targets: msg,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut'
    });
  
    scene.time.delayedCall(2000, () => {
      if (msg?.scene) {
        scene.tweens.add({
          targets: msg,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            if (msg?.scene) msg.destroy();
          }
        });
      }
    });
  }
  