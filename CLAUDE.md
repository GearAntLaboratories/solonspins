# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
- This is a Phaser-based HTML5 slot machine game called **Solon Spins**.
- The game is a 9-line slot machine themed around an up-north Wisconsin cabin.
- The project is built for **desktop browsers only**.

## Project Structure

### Frontend Structure (Phaser.js Game)
- **Entry Point**: `src/main.js` - Configures Phaser game and scene list
- **Scene Architecture**: Game uses multiple Phaser scenes for different states:
  - `BootScene` - Initial startup
  - `PreloadScene` - Asset loading
  - `MainScene` - Core slot machine gameplay
  - `UIScene` - User interface overlay
  - `FreeSpinsScene` - Free spins bonus feature with expanding wilds
  - `PuppyBonusScene` - Pick-style bonus game
  - `PaytableScene` - Paytable display
  - `PearlBonusScene` - Additional bonus feature

### Game Logic Components
- **OutcomeManager** (`src/game/OutcomeManager.js`) - Outcome determination with RTP management; RTP tuning is critical to game balance.
- **Game Config** (`src/game/config.js`) - Symbols, reels, paylines, betting, and bonus configuration.
- **API Client** (`src/utils/api.js`) - Communication with backend server.

### Backend Structure
- **Server**: Express.js app (`server/index.js`) serving API and static files.
- **Data Persistence**: JSON file-based storage (`server/gameData.json`).
- **API Endpoints**:
  - `GET /api/player/:id` - Retrieve player data.
  - `POST /api/player/:id` - Save player data.
  - `GET /api/status` - Server health check.

### Asset Organization
- **Images**: `public/assets/images/` with subfolders for symbols, UI, and bonus features.
- **Audio**: `public/assets/sounds/` for SFX and music.
- Webpack copies assets from `public/` to `dist/` during build.

## Development Commands

### Essential Commands
- **Start Development**: `npm run dev` - Runs both frontend (port 8080) and backend (port 3000) concurrently
- **Frontend Only**: `npm start` - Webpack dev server with hot reload
- **Backend Only**: `npm run server` - Express server on port 3000
- **Production Build**: `npm run build` - Creates optimized dist/ bundle
- **Production Server**: `npm run pi` - Runs production server

### Development Workflow
- Frontend development uses Webpack dev server with hot reload on port 8080
- Backend runs Express server on port 3000
- API calls are proxied from frontend to backend in development
- Use `npm run dev` for full-stack development

## Key Technical Details

### Slot Machine Mechanics
- 5x3 reel grid with 9 configurable paylines.
- Wild symbols (`loon`), scatter symbols (`fire`), and bonus symbols (`elsi`).
- Two bonus features:
  - **Free Spins** → with expanding wilds.
  - **Puppy Bonus** → pick bonus feature.
- RTP is managed across multiple components (OutcomeManager, MainScene logic, bonus scenes).
- **Any change impacting game logic, payout behavior, or RTP must be explicitly approved.**

### Development Proxy Setup
- Webpack dev server proxies `/api` requests to backend on port 3000.
- API client detects development vs production environment.
- In dev (port 8080), API calls go to `http://localhost:3000`.

### Scene Communication
- Events are used for scene transitions and bonus completions.
- MainScene handles outcome evaluation and triggers bonus scenes.
- Bonus scenes return control to MainScene via completion handlers.

## Code Style & Workflow Guidelines
- Use **modern JavaScript** (ES6+):
  - `let` and `const` (avoid `var`).
  - Arrow functions where appropriate.
  - Template literals preferred.
  - Clear, well-formatted code with readable indentation.
- All changes must include clear comments where modified:
  - Example: `// Claude suggested change on 2025-06-07: ...`
- Never introduce new npm dependencies unless explicitly requested.
- Never refactor or restructure core spin logic (`MainScene.js`, `OutcomeManager.js`, `FreeSpinsScene.js`) unless explicitly requested.
- Do not modify `public/assets` files — reference filenames only.

## Defensive Developer Instructions
- Treat **spin logic and RTP management as highly sensitive** → approach changes with extreme caution.
- Propose all changes clearly, and seek approval before applying.
- For any game logic change:
  - Explain what will change.
  - Explain why the change is consistent with modern slot machine design principles.
  - Explain potential impact on RTP, performance, or game feel.
- Be aware that complex logic in MainScene and OutcomeManager must be fully understood before attempting edits.
- Expanding wild behavior is critical to Free Spins balance and must be preserved unless explicitly requested otherwise.
- Large-scale refactors should not be proposed unless specifically asked.

## Interaction & Tone
- Act as a **very defensive, professional developer**.
- Always ask before proceeding with any non-cosmetic change.
- Favor small, safe improvements over broad rewrites.
- Assume code readability and maintainability are a priority.
