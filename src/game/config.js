// src/game/config.js
export default {
  reels: 5,
  rows: 3,
  paylines: 9,
  minBet: 0.09,
  maxBet: 45.00,
  defaultBet: 0.09,
  coinValues: [0.01, 0.02, 0.05, 0.10, 0.20, 0.50, 1.00, 2.00, 5.00],

  // Updated symbol paytable to match simulation values (per payline)
  symbols: [
    { id: 'pam_mike', name: 'Pam & Mike', pays: { 3: 10, 4: 50, 5: 200 } },
    { id: 'grant', name: 'Grant', pays: { 3: 8, 4: 40, 5: 150 } },
    { id: 'logan', name: 'Logan', pays: { 3: 8, 4: 40, 5: 150 } },
    { id: 'nick', name: 'Nick', pays: { 3: 6, 4: 30, 5: 100 } },
    { id: 'beer', name: 'Beer Can', pays: { 3: 4, 4: 20, 5: 75 } },
    { id: 'flag', name: 'American Flag', pays: { 3: 4, 4: 20, 5: 75 } },
    { id: 'a', name: 'A', pays: { 3: 2, 4: 10, 5: 50 } },
    { id: 'k', name: 'K', pays: { 3: 2, 4: 10, 5: 40 } },
    { id: 'q', name: 'Q', pays: { 3: 1.5, 4: 8, 5: 30 } },
    { id: 'j', name: 'J', pays: { 3: 1.5, 4: 8, 5: 25 } }
  ],

  // Added wild pays from simulation
  wild: { 
    id: 'loon', 
    name: 'Loon', 
    isWild: true,
    pays: { 3: 10, 4: 100, 5: 500 }
  },

  // Updated scatter pays to match simulation
  scatter: {
    id: 'fire',
    name: 'Bonfire',
    isScatter: true,
    pays: { 3: 5, 4: 20, 5: 100 } // x total bet (not per line)
  },

  bonus: { id: 'elsi', name: 'Esli', isBonus: true },

  // Free Spins configuration
  freeSpins: {
    triggerCount: 3, // Min scatters needed
    awards: {        // Spins awarded per scatter count
      3: 8,
      4: 12,
      5: 15
    },
    multiplier: 1 // Default multiplier in free spins
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