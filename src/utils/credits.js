// src/utils/credits.js
import io from 'socket.io-client';

export default class CreditsManager {
  constructor(scene) {
    this.scene = scene;
    this.socket = null;
    this.connected = false;
    
    // Connect to server websocket
    this.connect();
  }
  
  connect() {
    // Get server address - use localhost for dev, actual IP for Pi
    const serverUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:3000' 
      : `http://${window.location.hostname}:3000`;
    
    this.socket = io(serverUrl);
    
    this.socket.on('connect', () => {
      console.log('Connected to game server');
      this.connected = true;
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from game server');
      this.connected = false;
    });
    
    // Listen for credit updates from bill validator
    this.socket.on('add-credits', (amount) => {
      console.log(`Adding ${amount} credits from bill validator`);
      this.scene.addCredits(amount);
    });
  }
  
  requestPayout(amount) {
    // For now, just show a message
    this.scene.showMessage(`Please see attendant for payout of ${amount.toFixed(2)}`);
  }
}