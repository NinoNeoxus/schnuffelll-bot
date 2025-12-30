const axios = require('axios');
const fs = require('fs');

// =====================================================
// AUTH MODE CONFIGURATION
// =====================================================
// MODE 1: DYNAMIC (Default) - Checks GitHub every 10 mins
//         Set STATIC_PASSWORD = null
//         Seller has full remote control (kill-switch)
//
// MODE 2: STATIC (No Update Tier) - Hardcoded password
//         Set STATIC_PASSWORD = 'YOUR_SECRET_PASS'
//         No network check, no kill-switch
//         Once buyer has password, works forever
// =====================================================

const STATIC_PASSWORD = null; // <-- SET THIS FOR "NO UPDATE" VERSION
// Example: const STATIC_PASSWORD = 'BUYER123-NOUPDATE';

// Remote URL for Dynamic Mode
const REMOTE_AUTH_URL = 'https://raw.githubusercontent.com/NinoNeoxus/schnuffelll-database/main/access_key.txt';

let currentSessionKey = null;
let verificationInterval = null;

/**
 * Fetch the current valid key from GitHub (Dynamic Mode Only)
 */
async function fetchRemoteKey() {
    // If static mode, no need to fetch
    if (STATIC_PASSWORD) return STATIC_PASSWORD;

    try {
        const response = await axios.get(REMOTE_AUTH_URL, {
            headers: { 'Cache-Control': 'no-cache' }
        });
        return response.data.trim();
    } catch (err) {
        console.error('❌ Failed to connect to Auth Server. Check internet connection.');
        return null;
    }
}

/**
 * Verify input key against remote/static key
 */
async function verifyKey(inputKey) {
    console.log('🔄 Verifying access key...');

    // STATIC MODE: Compare directly
    if (STATIC_PASSWORD) {
        if (inputKey === STATIC_PASSWORD) {
            currentSessionKey = inputKey;
            return true;
        }
        return false;
    }

    // DYNAMIC MODE: Fetch from GitHub
    const remoteKey = await fetchRemoteKey();

    if (!remoteKey) return false;

    if (inputKey === remoteKey) {
        currentSessionKey = inputKey;
        return true;
    }
    return false;
}

/**
 * Start periodic background check (Dynamic Mode Only)
 * If key changes on GitHub, kill the bot.
 */
function startPeriodicCheck(bot) {
    // STATIC MODE: No periodic check needed
    if (STATIC_PASSWORD) {
        console.log('[Auth] Static mode - No periodic check.');
        return;
    }

    if (verificationInterval) return;

    // Check every 10 minutes
    verificationInterval = setInterval(async () => {
        const remoteKey = await fetchRemoteKey();

        if (remoteKey && remoteKey !== currentSessionKey) {
            console.log('\n\n❌ SECURITY ALERT: Access Key has been changed by Admin!');
            console.log('❌ Session Revoked. Bot shutting down...');
            process.exit(1);
        }
    }, 10 * 60 * 1000); // 10 Minutes
}

/**
 * Check if running in static mode (for UI display)
 */
function isStaticMode() {
    return STATIC_PASSWORD !== null;
}

module.exports = { verifyKey, startPeriodicCheck, isStaticMode };
