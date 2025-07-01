// src/scenes/PaytableScene.js
import Phaser from 'phaser';
import config from '../game/config'; // Assuming config.js is updated as previously instructed

export default class PaytableScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PaytableScene' });
    this.contentContainer = null; // Initialize properties
    this.scrollY = 0;
    this.maxScroll = 0;
    this.contentHeight = 0;
    this.scrollTrack = null;
    this.scrollThumb = null;
    this.scrollUpButton = null;
    this.scrollDownButton = null;
  }

  create() {
    // Dark semi-transparent background
    const bg = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.9);
    bg.setOrigin(0);

    // Add static elements (Title, Close Button) - These DON'T scroll
    this.add.text(640, 50, 'SOLON SPINS PAYTABLE', {
      fontSize: '32px',
      color: '#FFD700',
      align: 'center'
    }).setOrigin(0.5);

    const closeButton = this.add.text(1200, 50, 'X', {
      fontSize: '32px', color: '#FFFFFF', backgroundColor: '#880000',
      padding: { x: 15, y: 10 }
    }).setOrigin(0.5).setInteractive();

    closeButton.on('pointerdown', () => {
      this.scene.stop();
      // Ensure scenes being resumed exist and are paused
      if (this.scene.manager.getScene('MainScene') && this.scene.isPaused('MainScene')) {
           this.scene.resume('MainScene');
      }
      if (this.scene.manager.getScene('UIScene') && this.scene.isPaused('UIScene')) {
           this.scene.resume('UIScene');
      }
    });

    // Create a container for scrollable content
    this.contentContainer = this.add.container(0, 100); // Position container initially

    // --- CORRECTED ORDER ---
    // 1. Create the actual paytable text/images first INSIDE THE CONTAINER
    this.createPaytableContent(); // This populates the container AND sets this.contentHeight

    // 2. Set up scrolling logic (needs contentHeight) AND creates Up/Down buttons
    this.setupScrolling();

    // 3. Create the visual scroll bar elements (track/thumb)
    this.createScrollIndicators(); // This calls updateScrollIndicators which now has all elements
    // --- END CORRECTED ORDER ---
  }

  setupScrolling() {
    this.scrollY = 0;
    // Ensure contentHeight has a fallback value if 0
    this.maxScroll = Math.max(0, (this.contentHeight || 1000) - 550);

    // Keyboard controls
    this.input.keyboard.off('keydown-UP'); // Remove previous listeners if scene restarts
    this.input.keyboard.off('keydown-DOWN');
    this.input.keyboard.off('keydown-ESC'); // Claude suggested addition on 2025-07-01: Remove previous ESC listener
    this.input.keyboard.on('keydown-UP', () => this.scrollContent(-30));
    this.input.keyboard.on('keydown-DOWN', () => this.scrollContent(30));
    // Claude suggested addition on 2025-07-01: ESC key to exit paytable
    this.input.keyboard.on('keydown-ESC', () => this.exitPaytable());

    // Mouse wheel
    this.input.off('wheel'); // Remove previous listener
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => this.scrollContent(deltaY * 0.5));

    // Pointer drag (added check for scrollable content)
    this.input.off('pointermove'); // Remove previous listener
    this.input.on('pointermove', (pointer) => {
        if (pointer.isDown && this.maxScroll > 0 && Math.abs(pointer.velocity.y) > Math.abs(pointer.velocity.x)) {
            const dy = pointer.position.y - pointer.prevPosition.y;
            this.scrollContent(-dy);
        }
    });


    // --- Add scroll buttons (ensure keys are loaded in PreloadScene) ---
    // Destroy old buttons if they exist (e.g., on scene restart)
    this.scrollUpButton?.destroy();
    this.scrollDownButton?.destroy();

    this.scrollUpButton = this.add.image(1200, 200, 'betUpButton')
      .setDisplaySize(60, 60).setInteractive().on('pointerdown', () => this.scrollContent(-50));
    this.scrollDownButton = this.add.image(1200, 500, 'betDownButton')
      .setDisplaySize(60, 60).setInteractive().on('pointerdown', () => this.scrollContent(50));
  }

  scrollContent(amount) {
    if (this.maxScroll <= 0) return; // Don't scroll if not needed

    this.scrollY = Phaser.Math.Clamp(this.scrollY + amount, 0, this.maxScroll);
    // Ensure container exists before setting its position
    if (this.contentContainer) {
        this.contentContainer.y = 100 - this.scrollY;
    }
    this.updateScrollIndicators();
  }

  createScrollIndicators() {
     // Destroy old indicators if they exist
     this.scrollTrack?.destroy();
     this.scrollThumb?.destroy();

     this.scrollTrack = this.add.rectangle(1200, 350, 10, 250, 0x333333);
     this.scrollThumb = this.add.rectangle(1200, 350, 10, 50, 0xFFFFFF)
        .setInteractive().setDepth(100); // Depth ensures thumb is clickable
     this.input.setDraggable(this.scrollThumb);

     // Remove previous drag listener before adding a new one
     this.input.off('drag');
     this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
        if (gameObject === this.scrollThumb && this.maxScroll > 0) {
            const trackTop = this.scrollTrack.y - this.scrollTrack.height / 2;
            const trackBottom = this.scrollTrack.y + this.scrollTrack.height / 2;
            const thumbHeight = this.scrollThumb.height;
            const minY = trackTop + thumbHeight / 2;
            const maxY = trackBottom - thumbHeight / 2;

            if (maxY > minY) { // Prevent issues if thumb is too big
                const newY = Phaser.Math.Clamp(dragY, minY, maxY);
                this.scrollThumb.y = newY;
                // Avoid division by zero if maxY equals minY
                const range = maxY - minY;
                const percentage = range > 0 ? Phaser.Math.Percent(newY - minY, 0, range) : 0;
                this.scrollY = this.maxScroll * percentage;
                if (this.contentContainer) { // Check container exists
                   this.contentContainer.y = 100 - this.scrollY;
                }
            }
        }
     });

     // Initial update after creating indicators
     this.updateScrollIndicators();
  }

  updateScrollIndicators() {
     // Defensive checks: Ensure all elements exist before using them
     if (!this.scrollTrack || !this.scrollThumb || !this.scrollUpButton || !this.scrollDownButton || !this.contentContainer) {
        // console.warn("Paytable: Scroll indicators or container not ready for update.");
        return;
     }

     const isScrollable = this.maxScroll > 0;

     this.scrollTrack.setVisible(isScrollable);
     this.scrollThumb.setVisible(isScrollable);
     // Use setAlpha instead of setVisible for buttons to allow pointer events when disabled
     this.scrollUpButton.setAlpha(isScrollable ? 1 : 0.5).setInteractive(isScrollable);
     this.scrollDownButton.setAlpha(isScrollable ? 1 : 0.5).setInteractive(isScrollable);

     if (isScrollable && this.contentHeight) {
        const visibleRatio = 550 / this.contentHeight;
        const thumbHeight = Phaser.Math.Clamp(this.scrollTrack.height * visibleRatio, 20, this.scrollTrack.height);
        this.scrollThumb.height = thumbHeight;

        const trackTop = this.scrollTrack.y - this.scrollTrack.height / 2;
        const trackBottom = this.scrollTrack.y + this.scrollTrack.height / 2;
        const minY = trackTop + thumbHeight / 2;
        const maxY = trackBottom - thumbHeight / 2;

        if (maxY > minY && this.maxScroll > 0) { // Check ranges
            const percentage = this.scrollY / this.maxScroll;
            this.scrollThumb.y = minY + percentage * (maxY - minY);
        } else { // Handle non-scrollable or invalid range case
            this.scrollThumb.y = minY; // Place at top
        }
     } else {
         // Position thumb at top when not scrollable
         const trackTop = this.scrollTrack.y - this.scrollTrack.height / 2;
         this.scrollThumb.y = trackTop + this.scrollThumb.height / 2;
     }
  }


  createPaytableContent() {
    // Ensure container exists and clear previous content if necessary
    if (!this.contentContainer) {
        console.error("Paytable content container does not exist!");
        return;
    }
    this.contentContainer.removeAll(true); // Clear previous content

    let yPos = 0; // Relative Y position within the container
    const xPos = 640; // Center X
    const textX = xPos - 250;
    const payoutX = xPos + 150;
    const symbolX = xPos - 400;
    const spacing = 100;
    const sectionSpacing = 50;

    const configSymbols = config.symbols || [];
    const wildConfig = config.wild || { id: 'loon', name: 'Loon' };
    const scatterConfig = config.scatter || { id: 'fire', name: 'Bonfire', pays: { 3: 5, 4: 20, 5: 50 } };
    const bonusConfig = config.bonus || { id: 'elsi', name: 'Esli' };
    const freeSpinAwards = config.freeSpins?.awards || { 3: 8, 4: 12, 5: 15 };
    const freeSpinTriggerCount = config.freeSpins?.triggerCount || 3;
    const puppyBonusTriggerCount = config.puppyBonus?.triggerCount || 3;

    // --- IMPORTANT: Use this helper to add ALL content to the CONTAINER ---
    const createSymbolRow = (symbolInfo) => {
        if (!symbolInfo || !symbolInfo.id || !symbolInfo.name) return;
        // Add sprite TO CONTAINER
        const symbolSprite = this.add.sprite(symbolX, yPos, symbolInfo.id).setDisplaySize(80, 80);
        this.contentContainer.add(symbolSprite);
        // Add name text TO CONTAINER
        this.contentContainer.add(this.add.text(textX, yPos, symbolInfo.name, { fontSize: '20px', color: '#FFFFFF' }).setOrigin(0, 0.5));
        const pays = symbolInfo.pays || {};
        const payText = `3: ${pays[3] || 0}   4: ${pays[4] || 0}   5: ${pays[5] || 0}`;
        // Add payout text TO CONTAINER
        this.contentContainer.add(this.add.text(payoutX, yPos, payText, { fontSize: '18px', color: '#FFFFFF' }).setOrigin(0, 0.5));
        yPos += spacing; // Increment relative Y position
    };

    // Helper to add text TO CONTAINER
    const addPaytableText = (x, y, text, style, origin = { x: 0.5, y: 0.5 }) => {
       const textObj = this.add.text(x, y, text, style).setOrigin(origin.x, origin.y);
       this.contentContainer.add(textObj);
       return textObj; // Return if needed, e.g., for bounds calculation
    };


    // --- Build content using the helpers ---

    addPaytableText(xPos, yPos, 'FAMILY SYMBOLS', { fontSize: '24px', color: '#FFFFFF', align: 'center' });
    yPos += sectionSpacing;
    configSymbols.slice(0, 4).forEach(createSymbolRow);

    yPos += sectionSpacing / 2;
    addPaytableText(xPos, yPos, 'CABIN SYMBOLS', { fontSize: '24px', color: '#FFFFFF', align: 'center' });
    yPos += sectionSpacing;
    configSymbols.slice(4, 6).forEach(createSymbolRow);

    yPos += sectionSpacing / 2;
    addPaytableText(xPos, yPos, 'LOW SYMBOLS', { fontSize: '24px', color: '#FFFFFF', align: 'center' });
    yPos += sectionSpacing;
    configSymbols.slice(6, 10).forEach(createSymbolRow);

    yPos += sectionSpacing / 2;
    addPaytableText(xPos, yPos, 'SPECIAL SYMBOLS', { fontSize: '24px', color: '#FFFFFF', align: 'center' });
    yPos += sectionSpacing;

    // Wild (Loon) - Add elements to container
    const wildSymbol = this.add.sprite(symbolX, yPos, wildConfig.id).setDisplaySize(80, 80);
    this.contentContainer.add(wildSymbol);
    addPaytableText(textX, yPos, `WILD (${wildConfig.name})`, { fontSize: '20px', color: '#FFFFFF' }, {x: 0, y: 0.5});
    addPaytableText(payoutX, yPos, 'Substitutes for all except Scatter and Bonus', { fontSize: '16px', color: '#FFFFFF', wordWrap: { width: 350 } }, {x: 0, y: 0.5});
    yPos += spacing;

    // Scatter (Fire) - Add elements to container
    const scatterSymbol = this.add.sprite(symbolX, yPos, scatterConfig.id).setDisplaySize(80, 80);
    this.contentContainer.add(scatterSymbol);
    addPaytableText(textX, yPos, `SCATTER (${scatterConfig.name})`, { fontSize: '20px', color: '#FFFFFF' }, {x: 0, y: 0.5});
    const scatterPayText = `Pays: 3:${scatterConfig.pays[3]} 4:${scatterConfig.pays[4]} 5:${scatterConfig.pays[5]} (x Total Bet)`;
    const scatterTriggerText = `${freeSpinTriggerCount}+ trigger Free Spins`;
    addPaytableText(payoutX, yPos - 10, scatterPayText, { fontSize: '16px', color: '#FFFFFF' }, {x: 0, y: 0.5});
    addPaytableText(payoutX, yPos + 10, scatterTriggerText, { fontSize: '16px', color: '#FFFFFF' }, {x: 0, y: 0.5});
    yPos += spacing;

    // Bonus (Esli) - Add elements to container
    const bonusSymbol = this.add.sprite(symbolX, yPos, bonusConfig.id).setDisplaySize(80, 80);
    this.contentContainer.add(bonusSymbol);
    addPaytableText(textX, yPos, `BONUS (${bonusConfig.name})`, { fontSize: '20px', color: '#FFFFFF' }, {x: 0, y: 0.5});
    addPaytableText(payoutX, yPos, `${puppyBonusTriggerCount}+ on payline trigger Puppy Bonus`, { fontSize: '16px', color: '#FFFFFF', wordWrap: { width: 350 } }, {x: 0, y: 0.5});
    yPos += spacing;

    addPaytableText(xPos, yPos, 'PAYLINES: 9', { fontSize: '24px', color: '#FFD700', align: 'center' });
    yPos += sectionSpacing;
    // Optional: Add visual representation of paylines TO CONTAINER

    yPos += sectionSpacing / 2;
    addPaytableText(xPos, yPos, 'BONUS FEATURES', { fontSize: '24px', color: '#FFD700', align: 'center' });
    yPos += sectionSpacing;

    addPaytableText(xPos, yPos, 'FREE SPINS BONUS', { fontSize: '20px', color: '#FFFFFF', align: 'center' });
    yPos += 30;
    const freeSpinsDesc = [ /* ... free spins descriptions ... */ `3 Scatters: ${freeSpinAwards[3] || 8} free spins`, `4 Scatters: ${freeSpinAwards[4] || 12} free spins`, `5 Scatters: ${freeSpinAwards[5] || 15} free spins`, "Free spins can be retriggered" ];
    freeSpinsDesc.forEach(desc => {
        addPaytableText(xPos, yPos, desc, { fontSize: '16px', color: '#FFFFFF', align: 'center' });
        yPos += 25;
    });
    yPos += 30;

    addPaytableText(xPos, yPos, 'PUPPY BONUS', { fontSize: '20px', color: '#FFFFFF', align: 'center' });
    yPos += 30;
    const puppyBonusDesc = [ /* ... puppy bonus descriptions ... */ `3 Esli Symbols on payline: 3 picks`, `4 Esli Symbols on payline: 4 picks`, `5 Esli Symbols on payline: 5 picks`, "Pick Dog Photos to reveal prizes:", "- Credit values (based on total bet)", "- Find 'POOP!' to end the bonus round" ];
    puppyBonusDesc.forEach(desc => {
        addPaytableText(xPos, yPos, desc, { fontSize: '16px', color: '#FFFFFF', align: 'center' });
        yPos += 25;
    });

    // --- IMPORTANT: Set contentHeight AT THE END ---
    this.contentHeight = yPos + 50; // Add padding
    console.log("Paytable content created. Height:", this.contentHeight);
    // --- DO NOT call updateScrollIndicators from here ---
 }

  // Claude suggested addition on 2025-07-01: Method to exit paytable via ESC key
  exitPaytable() {
    this.scene.stop();
    // Ensure scenes being resumed exist and are paused
    if (this.scene.manager.getScene('MainScene') && this.scene.isPaused('MainScene')) {
         this.scene.resume('MainScene');
    }
    if (this.scene.manager.getScene('UIScene') && this.scene.isPaused('UIScene')) {
         this.scene.resume('UIScene');
    }
  }

} // End of PaytableScene Class