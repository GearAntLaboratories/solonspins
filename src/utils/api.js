// src/utils/api.js - Update with base URL
export default class ApiClient {
  // Base URL - different in development vs. production
  static get baseUrl() {
    // In development, explicitly use port 3000
    if (window.location.port === '8080') {
      return 'http://localhost:3000';
    }
    // In production, use the same origin
    return '';
  }

  static async getPlayerData(playerId = 'default') {
    try {
      const response = await fetch(`${this.baseUrl}/api/player/${playerId}`);
      if (!response.ok) {
        throw new Error('Failed to get player data');
      }
      return await response.json();
    } catch (error) {
      console.error('API error:', error);
      // Return default data if API call fails
      return {
        credits: 1000,
        stats: {
          totalSpins: 0,
          totalWins: 0,
          totalBet: 0,
          totalWon: 0,
          bonusTriggers: 0
        }
      };
    }
  }
  
  static async savePlayerData(playerId = 'default', data) {
    try {
      const response = await fetch(`${this.baseUrl}/api/player/${playerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save player data');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API error:', error);
      return { success: false, error: error.message };
    }
  }
}