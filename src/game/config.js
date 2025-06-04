// src/game/config.js
export default {
  reels: 5,
  rows: 3,
  paylines: 9,
  minBet: 0.09,
  maxBet: 1.35,
  defaultBet: 0.90,
  coinValues: [0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.10, 0.11, 0.12, 0.13, 0.14, 0.15],

  // Updated symbol paytable to match simulation values (per payline)
  // Updated symbol paytable for 99% RTP (per payline)
  symbols: [
    { id: 'pam_mike', name: 'Pam & Mike', pays: { 2: 2, 3: 15, 4: 75, 5: 250 } },
    { id: 'grant', name: 'Grant', pays: { 2: 2, 3: 12, 4: 60, 5: 200 } },
    { id: 'logan', name: 'Logan', pays: { 2: 0, 3: 10, 4: 50, 5: 150 } },
    { id: 'nick', name: 'Nick', pays: { 2: 0, 3: 8, 4: 40, 5: 125 } },
    { id: 'beer', name: 'Beer Can', pays: { 2: 0, 3: 5, 4: 25, 5: 75 } },
    { id: 'flag', name: 'American Flag', pays: { 2: 0, 3: 5, 4: 25, 5: 75 } },
    { id: 'a', name: 'A', pays: { 2: 0, 3: 3, 4: 15, 5: 50 } },
    { id: 'k', name: 'K', pays: { 2: 0, 3: 3, 4: 15, 5: 50 } },
    { id: 'q', name: 'Q', pays: { 2: 0, 3: 2, 4: 10, 5: 40 } },
    { id: 'j', name: 'J', pays: { 2: 0, 3: 2, 4: 10, 5: 40 } }
  ],

  // Enhanced wild pays for 99% RTP
  wild: { 
    id: 'loon', 
    name: 'Loon', 
    isWild: true,
    pays: { 2: 2, 3: 20, 4: 100, 5: 500 }
  },

  // Scatter pays remain the same
  scatter: {
    id: 'fire',
    name: 'Bonfire',
    isScatter: true,
    pays: { 2: 2, 3: 5, 4: 20, 5: 100 } // x total bet (not per line)
  },

  bonus: { id: 'elsi', name: 'Esli', isBonus: true },

  // Free Spins configuration
  // Free Spins configuration
  freeSpins: {
    triggerCount: 3, // Min scatters needed
    awards: {        // Spins awarded (simplified - always 10)
      3: 10,
      4: 10,
      5: 10
    },
    multiplier: 1, // Default multiplier in free spins
    minimumWin: 5  // Minimum win multiplier guaranteed
  },

  // Puppy Bonus configuration (renamed from puppyBonus to match new theme)
  puppyBonus: {
    triggerCount: 3 // Min bonus symbols on line needed
    // Picks awarded equals trigger count (3, 4, or 5) based on MainScene logic
  },

  // Paylines definition (0-indexed positions)
  // paylinesDefinition: [
  //   [[0,1],[1,1],[2,1],[3,1],[4,1]], // Center line
  //   [[0,0],[1,0],[2,0],[3,0],[4,0]], // Top line
  //   [[0,2],[1,2],[2,2],[3,2],[4,2]], // Bottom line
  //   [[0,0],[1,1],[2,2],[3,1],[4,0]], // V shape
  //   [[0,2],[1,1],[2,0],[3,1],[4,2]], // Inverted V
  //   [[0,0],[1,2],[2,0],[3,2],[4,0]], // ZigZag
  //   [[0,2],[1,0],[2,2],[3,0],[4,2]], // Inverted ZigZag
  //   [[0,0],[1,2],[2,1],[3,2],[4,0]], // W shape
  //   [[0,2],[1,0],[2,1],[3,0],[4,2]]  // M shape
  // ]
   paylinesDefinition: [
    // 1. Middle Row (straight)
    [[0,1],[1,1],[2,1],[3,1],[4,1]],
  
    // 2. Top Row (straight)
    [[0,0],[1,0],[2,0],[3,0],[4,0]],
  
    // 3. Bottom Row (straight)
    [[0,2],[1,2],[2,2],[3,2],[4,2]],
  
    // 4. V Down (top-middle-bottom-middle-top)
    [[0,0],[1,1],[2,2],[3,1],[4,0]],
  
    // 5. V Up (bottom-middle-top-middle-bottom)
    [[0,2],[1,1],[2,0],[3,1],[4,2]],
  
   // "Stair Down Long" or "Falling Ladder"
[[0,0],[1,0],[2,1],[3,2],[4,2]],

  
    // "Stair Up Long" or "Rising Ladder"
[[0,2], [1,2], [2,1], [3,0], [4,0]],

  
    // 8. Bottom-Mid-Bottom-Mid-Bottom ("Zigzag Low")
    [[0,2],[1,1],[2,2],[3,1],[4,2]],
  
    // 9. Top-Mid-Top-Mid-Top ("Zigzag High")
    [[0,0],[1,1],[2,0],[3,1],[4,0]]
  ]
  
};