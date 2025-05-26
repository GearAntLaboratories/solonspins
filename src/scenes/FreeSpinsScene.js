// src/scenes/FreeSpinsScene.js
import Phaser from 'phaser';
import config from '../game/config';
import OutcomeManager from '../game/OutcomeManager';

export default class FreeSpinsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FreeSpinsScene' });
    this.spinsRemaining = 0;
    this.initialSpins = 0;
    this.totalWin = 0;
    this.currentBet = 0;
    this.symbolSprites = [];
    this.expandedWilds = [false, false, false, false, false]; // Tracks which reels HAVE expanded
    this.reelsToExpand = []; // Tracks which reels SHOULD expand based on outcome
    this.winLineGraphics = null;
    this.spinSequences = [];
    this.compositeMask = null;
    this.spinState = 'idle'; // idle, spinning, evaluation, transitioning, ending

    // Initialize OutcomeManager
    this.outcomeManager = new OutcomeManager();
  }

  init(data) {
    console.log('FreeSpinsScene init:', data);
    this.spinsRemaining = data.spins || 8;
    this.initialSpins = data.spins || 8;
    this.currentBet = data.bet || config.defaultBet;
    this.totalWin = 0;
    this.spinState = 'idle';
    this.expandedWilds = [false, false, false, false, false]; // Reset for each bonus round
    this.reelsToExpand = []; // Reset for each bonus round
  }

  create() {
    console.log('FreeSpinsScene create');
    this.createNewBackground();

    this.add.image(640, 110, 'freespins_logo')
        .setOrigin(0.5)
        .setScale(0.4)
        .setDepth(1);

    this.spinsText = this.add.text(420, 195, `FREE SPINS LEFT: ${this.spinsRemaining}`, {
        fontSize: '24px', color: '#FFFFFF', backgroundColor: '#00000088',
        padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(100);

    this.winText = this.add.text(900, 195, `TOTAL WIN: ${this.totalWin.toFixed(2)}`, {
        fontSize: '24px', color: '#FFD700', backgroundColor: '#00000088',
        padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(100);

    this.createMask(); // Create the mask geometry BEFORE creating reels
    this.createInitialReels(); // Create the actual symbols
    this.createWinLineGraphics();
    this.applyMaskToAll(); // Apply the created mask AFTER symbols exist

    this.time.delayedCall(1500, this.startNextSpin, [], this);
  }

  createNewBackground() {
    this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'freespins_background')
        .setOrigin(0.5)
        .setDisplaySize(this.cameras.main.width, this.cameras.main.height)
        .setDepth(-1);
  }

  createInitialReels() {
    console.log('FS createInitialReels');
    const rW = 150, rH = 150, sX = 350, sY = 295, dS = rW * 0.7;
    const symbolOptions = this.outcomeManager.getSymbolIds();

    this.symbolSprites.forEach(reel => reel?.forEach(s => s?.destroy()));
    this.symbolSprites = [];

    for (let r = 0; r < config.reels; r++) {
        this.symbolSprites[r] = [];
        for (let w = 0; w < config.rows; w++) {
            const x = sX + r * rW;
            const y = sY + w * rH;
            this.add.rectangle(x, y, rW - 10, rH - 10, 0x8B4513, .7)
                .setStrokeStyle(2, 0xD2691E)
                .setDepth(10);
            const sT = symbolOptions[Math.floor(Math.random() * symbolOptions.length)];
            const s = this.add.sprite(x, y, sT)
                .setDisplaySize(dS, dS)
                .setDepth(11);
            this.symbolSprites[r][w] = s;
        }
    }
  }

  createWinLineGraphics() {
    if (!this.winLineGraphics) {
        this.winLineGraphics = this.add.graphics().setDepth(1500);
    } else {
        this.winLineGraphics.clear();
    }
  }

  createMask() {
    console.log("FS createMask called.");
    const rW = 150, rH = 150, sX = 350, sY = 295, dS = rW * 0.7;
    if (this.compositeMask) {
        try { this.compositeMask.destroy(); } catch (e) { console.warn("Error destroying old mask:", e); }
        this.compositeMask = null;
    }
    let gfx = this.make.graphics({ add: false });
    gfx.fillStyle(0xffffff);
    const mX = sX - (rW / 2);
    const mW = rW * config.reels;
    for (let w = 0; w < config.rows; w++) {
        let mY = (sY + w * rH) - (dS / 2);
        gfx.fillRect(mX, mY, mW, dS);
    }
    this.compositeMask = gfx.createGeometryMask();
    console.log("FS Mask geometry created.");
  }

  applyMaskToAll() {
    if (!this.compositeMask) {
        console.error("FS applyMaskToAll: Mask not created yet!");
        return;
    }
    console.log("FS applyMaskToAll called.");
    let appliedCount = 0;
    for (let r = 0; r < config.reels; r++) {
        if (this.symbolSprites[r]) {
            for (let i = 0; i < this.symbolSprites[r].length; i++) {
                if (this.symbolSprites[r][i] && typeof this.symbolSprites[r][i].setMask === 'function') {
                    this.symbolSprites[r][i].setMask(this.compositeMask);
                    appliedCount++;
                }
            }
        }
    }
    console.log(`FS Applied mask to ${appliedCount} sprites.`);
  }

  startNextSpin() {
    if (this.spinsRemaining <= 0 || this.spinState !== 'idle') {
        if (this.spinsRemaining <= 0 && this.spinState === 'idle') {
            this.endBonus();
        }
        return;
    }
    const curSpin = this.initialSpins - this.spinsRemaining + 1;
    console.log(`Starting FS ${curSpin}/${this.initialSpins}`);
    this.spin();
  }

  spin() {
    if (this.spinState !== 'idle') return;
    this.spinState = 'spinning';
    this.expandedWilds = [false, false, false, false, false]; // Reset before each spin
    this.reelsToExpand = []; // Reset before each spin's outcome generation

    this.spinsRemaining--;
    this.spinsText.setText(`FREE SPINS LEFT: ${this.spinsRemaining}`);
    console.log('Spinning in FS');

    if (this.winLineGraphics) {
        this.winLineGraphics.clear();
    }

    this.children.list.slice().forEach(child => {
        if (child && child.getData?.('isWinLabel')) {
            child.destroy();
        }
    });

    if (this.sound.get('spinSound')) {
        this.sound.play('spinSound');
    }

    const outcome = this.outcomeManager.getFreeSpinOutcome();
    console.log("FS: Got outcome:", outcome);

    // If outcome designates reels to expand, store them (generateSymbolBoardFromOutcome will also use this)
    if (outcome.reelsToExpand && Array.isArray(outcome.reelsToExpand)) {
        this.reelsToExpand = [...outcome.reelsToExpand];
    }

    const symbolBoard = this.generateSymbolBoardFromOutcome(outcome);
    console.log("FS: Generated board for spin animation:", symbolBoard);

    this.runSpinAnimation(symbolBoard, outcome);
  }

  generateSymbolBoardFromOutcome(outcome) {
    // This now uses this.reelsToExpand if set by the outcome in spin()
    switch (outcome.type) {
        case 'no_win':
            return this.generateNoWinBoard();
        case 'free_small_win':
            return this.generateFreeSpinWinBoard(['j', 'q', 'k', 'a'], 3, outcome);
        case 'free_medium_win':
            return this.generateFreeSpinWinBoard(['beer', 'flag'], 3, outcome);
        case 'free_large_win':
            return this.generateFreeSpinWinBoard(['logan', 'nick'], 4, outcome);
        case 'free_huge_win':
            return this.generateFreeSpinWinBoard(['pam_mike', 'grant'], 4, outcome);
        case 'wild_expand_small':
        case 'wild_expand_medium':
        case 'wild_expand_large':
            return this.generateExpandingWildBoard(outcome); // This method uses this.reelsToExpand
        case 'retrigger_3':
        case 'retrigger_4_5':
            return this.generateRetriggerBoard(outcome);
        default:
            console.warn(`Unknown FS outcome type: ${outcome.type}`);
            return this.generateRandomBoard();
    }
  }

  // --- BUGFIX: NO LOONS IN NON-EXPANDING-WILD WINS ---

  generateNoWinBoard() {
    const board = this.createEmptyBoard();
    const wildId = config.wild?.id || 'loon';
const symbols = this.outcomeManager.getSymbolIds()
  .filter(s => s !== 'fire' && s !== 'elsi' && s !== wildId);
    for (let r = 0; r < config.reels; r++) {
      const usedInReel = [];
      for (let row = 0; row < config.rows; row++) {
        let symbol;
        do {
          symbol = symbols[Math.floor(Math.random() * symbols.length)];
        } while (usedInReel.includes(symbol) && usedInReel.length < symbols.length);
        board[r][row] = symbol;
        usedInReel.push(symbol);
      }
    }
    // Defensive: no loons allowed
    this.checkForUnexpectedLoons(board, 'generateNoWinBoard');
    return board;
  }

  generateFreeSpinWinBoard(symbolPool, matchLength, outcome) {
    const board = this.generateRandomBoard();
    const targetPayline = config.paylinesDefinition[Math.floor(Math.random() * config.paylinesDefinition.length)];
    const symbol = symbolPool[Math.floor(Math.random() * symbolPool.length)];
    for (let i = 0; i < matchLength; i++) {
      const [reel, row] = targetPayline[i];
      board[reel][row] = symbol;
    }
    // --- REMOVED: no random wild injection ---
    // Defensive: no loons allowed
    this.checkForUnexpectedLoons(board, 'generateFreeSpinWinBoard');
    return board;
  }

  generateExpandingWildBoard(outcome) {
    const board = this.generateRandomBoard();
    // this.reelsToExpand should already be set by spin() based on the outcome.
    // If not, determine based on outcome type (fallback)
    if (!this.reelsToExpand || this.reelsToExpand.length === 0) {
        console.warn("FS: this.reelsToExpand not set by outcome, determining fallback for generateExpandingWildBoard");
        let numReelsToExpand;
        switch(outcome.type) {
            case 'wild_expand_small': numReelsToExpand = Math.random() < 0.7 ? 1 : 2; break;
            case 'wild_expand_medium': numReelsToExpand = 3; break;
            case 'wild_expand_large': numReelsToExpand = Math.random() < 0.8 ? 4 : 5; break;
            default: numReelsToExpand = 1;
        }
        this.reelsToExpand = [];
        while (this.reelsToExpand.length < numReelsToExpand) {
            const reel = Math.floor(Math.random() * config.reels);
            if (!this.reelsToExpand.includes(reel)) {
                this.reelsToExpand.push(reel);
            }
        }
    }
    
    // Place one wild in each selected reel at a random row.
    // The actual expansion will happen visually and be caught by getCurrentBoardState.
    this.reelsToExpand.forEach(reel => {
        const row = Math.floor(Math.random() * config.rows);
        board[reel][row] = config.wild?.id || 'loon';
    });
    console.log("FS: Board for expanding wild outcome (pre-spin):", board, "Reels to expand:", this.reelsToExpand);
    // No defensive check here: loons are expected.
    return board;
  }

  generateRetriggerBoard(outcome) {
    const board = this.generateRandomBoard();
    let placed = 0;
    const scatterId = config.scatter?.id || 'fire';
    while (placed < outcome.scatters) {
      const reel = Math.floor(Math.random() * config.reels);
      const row = Math.floor(Math.random() * config.rows);
      if (board[reel][row] !== scatterId) {
        board[reel][row] = scatterId;
        placed++;
      }
    }
    // Defensive: no loons allowed
    this.checkForUnexpectedLoons(board, 'generateRetriggerBoard');
    return board;
  }

  createEmptyBoard() {
    return Array(config.reels).fill().map(() => Array(config.rows).fill(null));
  }

  generateRandomBoard() {
    const board = this.createEmptyBoard();
    const wildId = config.wild?.id || 'loon';
    const symbols = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi' && s !== wildId);
    for (let r = 0; r < config.reels; r++) {
      for (let row = 0; row < config.rows; row++) {
        board[r][row] = symbols[Math.floor(Math.random() * symbols.length)];
      }
    }
    return board;
  }
  

  // ---- Defensive: error if a wild/loon appears where it shouldn't ----
  checkForUnexpectedLoons(board, source) {
    const wildId = config.wild?.id || 'loon';
    for (let r = 0; r < config.reels; r++) {
      for (let w = 0; w < config.rows; w++) {
        if (board[r][w] === wildId || board[r][w] === 'loon') {
          // Only log in dev, or remove for production!
          console.error(`BUG: Loon/wild found in ${source} board! [reel ${r}, row ${w}]`);
        }
      }
    }
  }

  runSpinAnimation(finalBoard, outcome) {
    const sI = 100, bTS = 25, rDF = 5, rH = 150, rW = 150, dS = rW * 0.7;
    const sY = 295, sX = 350;
    const wildId = config.wild?.id || 'loon';
    const symbolOptions = this.outcomeManager.getSymbolIds().filter(s => s !== 'fire' && s !== 'elsi');

    this.applyMaskToAll();
    this.spinSequences = [];

    for (let r = 0; r < config.reels; r++) {
        let rTS = bTS + r * rDF; // reelTotalShifts
        let seq = [];
        const finalBlockLength = config.rows + 1;

        for (let i = 0; i < rTS - finalBlockLength; i++) {
            let s = symbolOptions[Math.floor(Math.random() * symbolOptions.length)];
            if (outcome.type.includes('wild_expand') && Math.random() < 0.10) s = wildId;
            seq.push(s);
        }

        for (let row = config.rows - 1; row >= 0; row--) {
            seq.push(finalBoard[r][row]);
        }
        seq.push(symbolOptions[Math.floor(Math.random() * symbolOptions.length)]);

        this.spinSequences[r] = seq;
        if (seq.length !== rTS) {
            console.error(`FS Reel ${r} sequence length mismatch! Expected ${rTS}, Got ${seq.length}`);
        }
    }

    for (let r = 0; r < config.reels; r++) {
        if (!this.symbolSprites[r]) this.symbolSprites[r] = [];
        if (this.symbolSprites[r].length !== config.rows + 1) {
            console.warn(`FS Spin: Correcting sprite length for reel ${r}`);
            this.symbolSprites[r].forEach(s => s?.destroy());
            this.symbolSprites[r] = [];

            let x_above = sX + r * rW, y_above = sY - rH;
            let tex_above = this.spinSequences[r]?.[0] || symbolOptions[0];
            this.symbolSprites[r].push(this.add.sprite(x_above, y_above, tex_above)
                .setDisplaySize(dS, dS).setDepth(11).setMask(this.compositeMask));

            for (let w = 0; w < config.rows; w++) {
                let x = sX + r * rW, y = sY + w * rH;
                const sT = finalBoard[r]?.[w] || symbolOptions[0];
                this.symbolSprites[r].push(this.add.sprite(x, y, sT)
                    .setDisplaySize(dS, dS).setDepth(11).setMask(this.compositeMask));
            }
        }

        if (this.symbolSprites[r][0]) {
            this.symbolSprites[r][0].y = sY - rH;
            let tex = this.spinSequences[r]?.[0] || symbolOptions[0];
            this.symbolSprites[r][0].setTexture(tex).setVisible(true).setMask(this.compositeMask);
        }
    }

    let reelsFinished = 0;
    const animateReel = (r, sR) => {
        if (sR <= 0) {
            reelsFinished++;
            let didExpandOnThisReel = false;
            if (outcome.type.includes('wild_expand') && this.reelsToExpand?.includes(r)) {
                let wildLandedOnReel = false;
                for (let w = 0; w < config.rows; w++) {
                    // Check current visual state of the reel after it stopped
                    if (this.symbolSprites[r]?.[w + 1]?.texture.key === wildId) {
                        wildLandedOnReel = true;
                        break;
                    }
                }
                if (wildLandedOnReel) {
                    this.expandWild(r); // This updates symbolSprites textures and sets this.expandedWilds[r]
                    didExpandOnThisReel = true;
                }
            }

            if (reelsFinished === config.reels) {
              const evalDelay = this.expandedWilds.some(e => e) ? 600 : 200;
              this.time.delayedCall(evalDelay, () => {
                  // ---- START DEBUG FOR FREE SPINS ----
                  const actualBoardFS = this.getCurrentBoardState();
                  console.log("FS FINAL VERIFICATION:");
                  console.log("FS Expected finalBoard (from outcome):", finalBoard);
                  console.log("FS Actual board (from sprites):", actualBoardFS);
                  let perfectMatchFS = true;
                  for (let r_idx = 0; r_idx < config.reels; r_idx++) {
                      for (let row_idx = 0; row_idx < config.rows; row_idx++) {
                          if (actualBoardFS[r_idx][row_idx] !== finalBoard[r_idx][row_idx]) {
                              console.error(`FS MISMATCH [${r_idx}][${row_idx}]: Expected '${finalBoard[r_idx][row_idx]}', Got '${actualBoardFS[r_idx][row_idx]}'`);
                              perfectMatchFS = false;
                          }
                      }
                  }
                  if (perfectMatchFS) {
                      console.log("FS SUCCESS: Reel alignment matches finalBoard!");
                  } else {
                      console.error("FS FAILURE: Reel alignment MISMATCH. This is likely why wild expansion might fail to trigger.");
                  }
                  // ---- END DEBUG ----

                  this.evaluateWin(finalBoard, outcome); // Original call
              });
            }
            return;
        }

        if (!this.symbolSprites[r] || this.symbolSprites[r].length !== config.rows + 1) {
            console.error(`FS animateReel: Reel ${r} has invalid sprite array! Length: ${this.symbolSprites[r]?.length}. Skipping animation.`);
            animateReel(r, 0); // Effectively end this reel's animation
            return;
        }

        this.tweens.add({
            targets: this.symbolSprites[r],
            y: `+=${rH}`, duration: sI, ease: 'Linear',
            onComplete: () => {
                let offScreenSprite = this.symbolSprites[r][config.rows]; // The last element after unshift
                if (!offScreenSprite) { // Should not happen if length is config.rows + 1
                    console.error(`FS animateReel: offScreenSprite is null for reel ${r}`);
                    animateReel(r, sR - 1); return;
                }
                let nextTexture = this.spinSequences[r]?.shift() || offScreenSprite.texture.key || symbolOptions[0];
                offScreenSprite.setTexture(nextTexture).setScale(1).setAlpha(1).setDisplaySize(dS, dS).setMask(this.compositeMask);
                offScreenSprite.y = sY - rH;
                this.symbolSprites[r].pop();
                this.symbolSprites[r].unshift(offScreenSprite);
                animateReel(r, sR - 1);
            },
            callbackScope: this
        });
    };

    for (let r = 0; r < config.reels; r++) {
        animateReel(r, bTS + r * rDF);
    }
  }

  evaluateWin(finalBoard, outcome) { // finalBoard from outcome generator, outcome itself
    if (this.spinState !== 'spinning') {
        console.warn("FS evaluateWin called in wrong state:", this.spinState);
        if (this.spinState !== 'ending' && this.spinState !== 'transitioning') { // Avoid recursion if already ending/transitioning
            this.spinState = 'idle';
            if (this.spinsRemaining <= 0) {
                this.endBonus();
            }
        }
        return;
    }

    this.spinState = 'evaluation';
    console.log("FS: Evaluating Win. Outcome type:", outcome.type);
    
    // IMPORTANT: Get the board state AFTER potential wild expansions for win calculation
    const boardStateForWinCalc = this.getCurrentBoardState();
    console.log("FS: Board state for win calculation (after any expansions):", boardStateForWinCalc);

    const { totalWin, winningLines } = this.evaluateWins(boardStateForWinCalc); // Use the current visual board

    let retriggered = false;
    // Retrigger logic can use the original finalBoard or check current board for scatters
    // If outcome object itself contains retrigger info, that's most reliable
    if (outcome.type.startsWith('retrigger_') && outcome.additionalSpins > 0) {
        this.spinsRemaining += outcome.additionalSpins;
        this.spinsText.setText(`FREE SPINS LEFT: ${this.spinsRemaining}`);
        this.showRetriggerMessage(outcome.additionalSpins);
        retriggered = true;
    } else { // Fallback: Check board for scatters if outcome doesn't explicitly state retrigger
        const scatterId = config.scatter?.id || 'fire';
        let scatterCount = 0;
        for (let r = 0; r < config.reels; r++) {
            for (let w = 0; w < config.rows; w++) {
                if (boardStateForWinCalc[r]?.[w] === scatterId) scatterCount++;
            }
        }
        const triggerCount = config.freeSpins?.triggerCount || 3;
        if (scatterCount >= triggerCount) {
            const awards = config.freeSpins?.awards || { 3: 5, 4: 7, 5: 9 }; // FS specific awards
            const extraSpins = awards[scatterCount] || 0;
            if (extraSpins > 0) {
                this.spinsRemaining += extraSpins;
                this.spinsText.setText(`FREE SPINS LEFT: ${this.spinsRemaining}`);
                this.showRetriggerMessage(extraSpins);
                retriggered = true;
            }
        }
    }

    if (totalWin > 0) {
        console.log(`FS Win: ${totalWin.toFixed(2)}`);
        this.showWinningLines(winningLines);
        if (this.sound.get('winSound')) {
            this.sound.play('winSound');
        }
        this.showWinMessage(totalWin);
        this.totalWin += totalWin; // Accumulate FS total win
        this.winText.setText(`TOTAL WIN: ${this.totalWin.toFixed(2)}`);
    }

    this.spinState = 'transitioning';
    const displayDelay = (totalWin > 0 || retriggered) ? 2000 : 500;
    this.time.delayedCall(displayDelay, () => {
        if (this.spinsRemaining > 0) {
            this.spinState = 'idle';
            this.startNextSpin();
        } else {
            this.spinState = 'idle'; // Ensure it's idle before calling endBonus
            this.endBonus();
        }
    }, [], this);
  }

  expandWild(reelIndex) {
    if (reelIndex < 0 || reelIndex >= config.reels) return;
    console.log(`FS: Expanding wild on reel ${reelIndex}`);
    this.expandedWilds[reelIndex] = true;
    const wildId = config.wild?.id || 'loon';
    for (let row = 0; row < config.rows; row++) {
        // symbolSprites[reelIndex][0] is the off-screen one
        const sprite = this.symbolSprites[reelIndex]?.[row + 1];
        if (sprite) {
            sprite.setTexture(wildId);
            this.showWildExpansionEffect(sprite);
        }
    }
  }

  showWildExpansionEffect(sprite) { /* ... (same as provided) ... */
    if(!sprite)return; const wildId=config.wild?.id||'loon'; const effect=this.add.sprite(sprite.x,sprite.y,wildId).setDepth(sprite.depth+1).setAlpha(0.6).setScale(0.9); this.tweens.add({targets:effect,scale:1.4,alpha:0,duration:400,ease:'Quad.easeOut',onComplete:()=>{effect.destroy();}}); this.tweens.add({targets:sprite,scale:1.1,duration:150,yoyo:true,ease:'Quad.easeInOut'});
  }

  getCurrentBoardState() { /* ... (same as provided, ensure it correctly reads N visible rows) ... */
    const board=[]; 
    for(let r=0;r<config.reels;r++){
        board[r]=[]; 
        const sprites=this.symbolSprites[r]; 
        const expectedLen=config.rows+1; 
        if(!sprites||sprites.length!==expectedLen){
            console.warn(`FS: Reel ${r} invalid sprite array length ${sprites?.length}. Expected ${expectedLen}. Reading visible rows if possible.`); 
            // Attempt to read config.rows from the end if array is too short but has at least config.rows
            if(sprites && sprites.length >= config.rows){
                 for(let w=0;w<config.rows;w++){ board[r][w]=sprites[sprites.length - config.rows + w]?.texture.key||'__DEFAULT'; }
            } else {
                for(let w=0;w<config.rows;w++) board[r][w]='__DEFAULT';
            }
        }else{
            for(let w=0;w<config.rows;w++){
                board[r][w]=sprites[w+1]?.texture.key||'__DEFAULT'; // sprites[0] is off-screen
            }
        }
    } 
    return board;
  }

  evaluateWins(boardState) { /* ... (same as provided, but ensure this.expandedWilds is correctly used) ... */
    const paylines=config.paylinesDefinition||[]; 
    let totalWin=0; 
    let winningLines=[]; 
    const wildKey=config.wild?.id||'loon'; 
    const scatterKey=config.scatter?.id||'fire'; 
    const bonusKey=config.bonus?.id||'elsi'; 
    
    for(let lineIdx=0;lineIdx<paylines.length;lineIdx++){
        const coords=paylines[lineIdx]; 
        const syms=[]; 
        const pos=[]; 
        for(const p of coords){
            const[r,w]=p; 
            if(boardState[r]?.[w]!==undefined){
                syms.push(boardState[r][w]); pos.push(p);
            }else{
                syms.push(null); pos.push(p);
            }
        } 
        if(syms.length===0||syms[0]===null||syms[0]===scatterKey||syms[0]===bonusKey)continue; 
        
        let firstSymbol=syms[0]; 
        let matchCount=0; 
        let effectiveSymbol=firstSymbol; 
        
        for(let i=0;i<syms.length;i++){
            const currentSymbolOnBoard=syms[i]; 
            const currentReelIndex=pos[i]?pos[i][0]:-1; 
            // Check if the current reel IS expanded, not if the symbol itself is a wild by nature
            const isCurrentReelExpanded=(currentReelIndex!==-1)?this.expandedWilds[currentReelIndex]:false;
            let symbolToMatch = currentSymbolOnBoard;

            if (isCurrentReelExpanded) { // If the reel is expanded, treat this position as a wild
                symbolToMatch = wildKey;
            }

            if(i===0){
                if(symbolToMatch===wildKey){
                    matchCount++; 
                    effectiveSymbol=wildKey; // Assume wild line initially
                    // Look for a non-wild to determine the line's actual symbol type
                    for(let j=1;j<syms.length;j++){
                        const nextSymOnBoard=syms[j];
                        const nextReelIdx = pos[j]?pos[j][0]:-1;
                        const isNextReelExpanded = (nextReelIdx !== -1) ? this.expandedWilds[nextReelIdx] : false;
                        let nextSymToConsider = nextSymOnBoard;
                        if(isNextReelExpanded) nextSymToConsider = wildKey;

                        if(nextSymToConsider!==wildKey && nextSymToConsider!==scatterKey && nextSymToConsider!==bonusKey){
                            effectiveSymbol=nextSymToConsider;
                            break;
                        }
                    }
                    // If effectiveSymbol is still wildKey, it's an all-wild line (or wild + special)
                    // Handled by config.wild.pays
                }else{
                    matchCount++; 
                    effectiveSymbol=symbolToMatch;
                }
            }else{
                if(symbolToMatch===effectiveSymbol || symbolToMatch===wildKey){ // Match effective symbol or any wild (natural or expanded)
                    matchCount++;
                }else{
                    break;
                }
            }
        } 
        
        const minMatch = config.minMatch || 3; // Use a global minMatch if available
        if(matchCount>=minMatch){
            let pay=0; 
            // If effectiveSymbol became wildKey due to an all-wild line, use config.wild.pays
            // (which should be aliased to Pam&Mike for FS as per requirements)
            const symCfg = (effectiveSymbol===wildKey) ? (config.wildPaysAsPamAndMikeInFS ? config.symbols.find(s=>s.id==='pam_mike') : config.wild) 
                                                     : config.symbols.find(s=>s.id===effectiveSymbol);

            if(symCfg?.pays?.[matchCount]){
                pay=symCfg.pays[matchCount];
            }else{
                console.warn(`FS Payout missing for ${matchCount}x ${effectiveSymbol}`);
            } 
            const betPerLine=this.currentBet/(config.paylines?.length || 9); // Use paylines.length
            const fsMultiplier=config.freeSpins?.multiplier||1; 
            const lineWin=pay*betPerLine*fsMultiplier; 
            
            if(lineWin>0){
                totalWin+=lineWin; 
                winningLines.push({lineIndex:lineIdx,symbolPositions:pos.slice(0,matchCount),symbol:effectiveSymbol,winAmount:lineWin,count:matchCount});
            }
        }
    } 
    return{totalWin,winningLines};
  }

  showWinningLines(winningLines) { /* ... (same as provided) ... */
    const colors=[0xFF0000,0x00FF00,0x0000FF,0xFFFF00,0xFF00FF,0x00FFFF,0xFFAA00,0xAAFF00,0xFF00AA]; const paylines=config.paylinesDefinition||[]; const rW=150,rH=150,sX=350,sY=295; this.winLineGraphics.clear(); winningLines.forEach((winInfo)=>{ if(winInfo.lineIndex===-1){winInfo.symbolPositions.forEach(([r,w])=>{const spriteIndex=1+w; if(this.symbolSprites[r]?.[spriteIndex]){this.highlightSymbol(this.symbolSprites[r][spriteIndex],0xFFD700);}}); return;}; const color=colors[winInfo.lineIndex%colors.length]; this.winLineGraphics.lineStyle(5,color,0.8); const fullCoords=paylines[winInfo.lineIndex]; if(!fullCoords)return; const points=fullCoords.map(([r,w])=>({x:sX+r*rW,y:sY+w*rH})); if(points.length>0){this.winLineGraphics.beginPath(); this.winLineGraphics.moveTo(points[0].x,points[0].y); for(let i=1;i<points.length;i++){this.winLineGraphics.lineTo(points[i].x,points[i].y);} this.winLineGraphics.strokePath();} winInfo.symbolPositions.forEach(([r,w])=>{const spriteIndex=1+w; if(this.symbolSprites[r]?.[spriteIndex]){this.highlightSymbol(this.symbolSprites[r][spriteIndex],color);}}); if(winInfo.symbolPositions.length>0){const mid=Math.floor(winInfo.symbolPositions.length/2); const[midR,midW]=winInfo.symbolPositions[mid]; this.showWinLabel(`WIN: ${winInfo.winAmount.toFixed(2)}`,sX+midR*rW,sY+midW*rH-30,color);}});
  }
  highlightSymbol(sprite, color) { /* ... (same as provided) ... */
    if(!sprite||!sprite.scene)return; this.tweens.add({targets:sprite,scaleX:1.08,scaleY:1.08,duration:150,yoyo:true,repeat:1,ease:'Quad.easeInOut'});
  }
  showWinLabel(text, x, y, color) { /* ... (same as provided) ... */
    const style={fontSize:'18px',fontStyle:'bold',color:'#FFFFFF',stroke:`#${color.toString(16).padStart(6,'0')}`,strokeThickness:4,backgroundColor:'#000000A0',padding:{x:8,y:4}}; const label=this.add.text(x,y,text,style).setOrigin(0.5).setDepth(1600).setAlpha(0).setData('isWinLabel',true); this.tweens.add({targets:label,alpha:1,y:y-10,duration:300,ease:'Power1'});
  }
  showWinMessage(amount) { /* ... (same as provided) ... */
    const msg=this.add.text(640,360,`WIN: ${amount.toFixed(2)}`,{fontSize:'32px',color:'#FFD700',stroke:'#000000',strokeThickness:5}).setOrigin(0.5).setDepth(2000).setAlpha(0).setData('isWinLabel',true); this.tweens.add({targets:msg,alpha:1,scale:1.1,duration:300,yoyo:true,hold:800,ease:'Power1'});
  }
  showRetriggerMessage(spins) { /* ... (same as provided) ... */
    if(this.sound.get('bonusSound')){this.sound.play('bonusSound');} const msg=this.add.text(640,280,`RETRIGGERED!\n+${spins} FREE SPINS`,{fontSize:'32px',color:'#FFD700',stroke:'#000000',strokeThickness:5,align:'center',backgroundColor:'#000000CC',padding:{x:15,y:10}}).setOrigin(0.5).setDepth(2100).setAlpha(0).setData('isWinLabel',true); this.tweens.add({targets:msg,alpha:1,scale:1.1,duration:500,hold:1500,yoyo:true,ease:'Power1'});
  }

  endBonus() {
    console.log(`FreeSpinsScene: endBonus() called. Win: ${this.totalWin}. State: ${this.spinState}`);
    if (this.spinState === 'ending') return; // Prevent multiple calls
    this.spinState = 'ending';

    if (this.winLineGraphics) { this.winLineGraphics.clear(); }
    this.children.list.slice().forEach(child => {
        if (child && child.getData?.('isWinLabel')) {
            try { child.destroy(); } catch (e) { /* ignore if already destroyed */ }
        }
    });

    const message = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY,
        `FREE SPINS COMPLETE!\nTOTAL WIN: ${this.totalWin.toFixed(2)}`, {
        fontSize: '40px', color: '#FFD700', stroke: '#000000', strokeThickness: 5,
        align: 'center', backgroundColor: '#000000E0', padding: { x: 25, y: 15 }
    }).setOrigin(0.5).setDepth(2000).setScale(0);

    this.tweens.add({ targets: message, scale: 1, duration: 600, ease: 'Back.easeOut' });

    if (this.totalWin > 0 && this.sound.get('bonusSound')) {
        this.sound.play('bonusSound');
    }

    const delayDuration = 4000;
    console.log(`FreeSpinsScene: Scheduling scene stop & GLOBAL event emission in ${delayDuration}ms.`);
    this.time.delayedCall(delayDuration, () => {
        console.log("FreeSpinsScene: Delayed call executing for endBonus.");
        console.log("FreeSpinsScene: Setting registry data for bonus completion");
        this.game.registry.set('bonusCompleted', { type: 'freeSpins', totalWin: this.totalWin });
        console.log("FreeSpinsScene: Emitting 'freeSpinsCompleteGlobal' globally.");
        this.sys.events.emit('freeSpinsCompleteGlobal', this.totalWin);
        
        // Short delay before stopping to ensure events are processed
        this.time.delayedCall(100, () => {
            console.log("FreeSpinsScene: Stopping FreeSpinsScene now.");
            this.events.removeAllListeners(); // Clean up scene-specific listeners
            this.scene.stop();
        });
    }, [], this);
  }
}
