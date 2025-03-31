// src/game/config.js
export default {
  reels: 5,
  rows: 3,
  paylines: 9,
  minBet: 0.09,
  maxBet: 45.00,
  defaultBet: 0.09,
  coinValues: [0.01, 0.02, 0.05, 0.10, 0.20, 0.50, 1.00, 2.00, 5.00],
  
  // Symbol configuration (simplified for initial implementation)
  symbols: [
    { id: 'chest', name: 'Treasure Chest', pays: [0, 0, 30, 100, 500] },
    { id: 'captain', name: 'Pirate Captain', pays: [0, 0, 25, 80, 300] },
    { id: 'ship', name: 'Sunken Ship', pays: [0, 0, 20, 60, 200] },
    { id: 'mermaid', name: 'Mermaid', pays: [0, 0, 15, 50, 150] },
    { id: 'anchor', name: 'Anchor', pays: [0, 0, 10, 30, 100] },
    { id: 'compass', name: 'Compass', pays: [0, 0, 8, 25, 80] },
    { id: 'a', name: 'A', pays: [0, 0, 5, 15, 60] },
    { id: 'k', name: 'K', pays: [0, 0, 4, 12, 50] },
    { id: 'q', name: 'Q', pays: [0, 0, 3, 10, 40] },
    { id: 'j', name: 'J', pays: [0, 0, 2, 8, 30] }
  ],
  
  // Special symbols
  wild: { id: 'kraken', name: 'Kraken', isWild: true },
  scatter: { id: 'map', name: 'Treasure Map', isScatter: true, pays: [0, 0, 5, 20, 50] },
  bonus: { id: 'pearl', name: 'Pearl', isBonus: true }
};