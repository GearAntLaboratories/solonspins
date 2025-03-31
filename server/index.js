// server/index.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Data file path
const DATA_FILE = path.join(__dirname, 'gameData.json');

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  const initialData = {
    players: {
      default: {
        credits: 1000,
        stats: {
          totalSpins: 0,
          totalWins: 0,
          totalBet: 0,
          totalWon: 0,
          bonusTriggers: 0
        },
        lastUpdated: Date.now()
      }
    }
  };
  
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  console.log('Created initial game data file');
}

// Routes
app.get('/api/status', (req, res) => {
  res.json({ status: 'operational' });
});

// Get player data
app.get('/api/player/:id', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    const playerId = req.params.id || 'default';
    
    if (data.players[playerId]) {
      res.json(data.players[playerId]);
    } else {
      // Create new player if doesn't exist
      data.players[playerId] = {
        credits: 1000,
        stats: {
          totalSpins: 0,
          totalWins: 0,
          totalBet: 0,
          totalWon: 0,
          bonusTriggers: 0
        },
        lastUpdated: Date.now()
      };
      
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      res.json(data.players[playerId]);
    }
  } catch (err) {
    console.error('Error getting player data:', err);
    res.status(500).json({ error: 'Failed to get player data' });
  }
});

// Update player data
app.post('/api/player/:id', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    const playerId = req.params.id || 'default';
    const playerData = req.body;
    
    // Update player data
    data.players[playerId] = {
      ...playerData,
      lastUpdated: Date.now()
    };
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating player data:', err);
    res.status(500).json({ error: 'Failed to update player data' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});