/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  🌆 SCHNUFFELLL CYBERPUNK SURVIVAL RPG v3.0
 *  Main Entry Point - Loads modular RPG system
 *  
 *  Theme: Neo-Jakarta 2077 - A Dystopian Indonesian Cyberpunk World
 *  Developer: @schnuffelll
 *  
 *  This is the main entry point that loads the modular RPG system.
 *  All game logic is split into:
 *  - ./rpg/data.js - Game data (Classes, Monsters, Items, etc.)
 *  - ./rpg/survival.js - Survival mechanics
 *  - ./rpg/combat.js - Combat system
 *  - ./rpg/index.js - Bot commands and main logic
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

// Import the main RPG module
const rpgModule = require('./rpg/index');

// Export the module for use by the bot
module.exports = rpgModule;
