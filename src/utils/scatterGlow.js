// src/utils/scatterGlow.js

export function createScatterGlow(scene, x, y, scatterGlowsArray) {
    const glow = scene.add.sprite(x, y, 'fire')
      .setScale(1.2)
      .setAlpha(0.6)
      .setDepth(20)
      .setTint(0xFFAA00);
    
    scene.tweens.add({
      targets: glow,
      scale: 1.5,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Store for cleanup
    if (scatterGlowsArray) {
      scatterGlowsArray.push(glow);
    }
  }
  