const axios = require('axios');
const fs = require('fs');

// CONFIGURATION (HARDCODED - OBFUSCATED)
// Ganti URL ini dengan URL Raw file password di repo private/public lu
const REMOTE_AUTH_URL = 'https://raw.githubusercontent.com/NinoNeoxus/schnuffelll-database/main/access_key.txt';

let currentSessionKey = null;
let verificationInterval = null;

/**
 * Fetch the current valid key from GitHub
 */
async function fetchRemoteKey() {
    try {
        const response = await axios.get(REMOTE_AUTH_URL, {
            headers: { 'Cache-Control': 'no-cache' } // Avoid caching
        });
        return response.data.trim();
    } catch (err) {
        console.error('❌ Failed to connect to Auth Server (GitHub). Check internet connection.');
        return null; // Fail safe: If cannot check, prevent start? Or allow?
        // Security strict: Fail.
    }
}

/**
 * Verify input key against remote key
 */
async function verifyKey(inputKey) {
    console.log('🔄 Verifying access key...');
    const remoteKey = await fetchRemoteKey();

    if (!remoteKey) return false;

    if (inputKey === remoteKey) {
        currentSessionKey = inputKey;
        return true;
    }
    return false;
}

/**
 * Start periodic background check (Anti-Bypass)
 * If key changes on GitHub, kill the bot.
 */
function startPeriodicCheck(bot) {
    if (verificationInterval) return;

    // Check every 10 minutes (600000 ms)
    verificationInterval = setInterval(async () => {
        const remoteKey = await fetchRemoteKey();

        if (remoteKey && remoteKey !== currentSessionKey) {
            console.log('\n\n❌ SECURITY ALERT: Access Key has been changed by Admin!');
            console.log('❌ Session Revoked. Bot shutting down...');

            // Notify owner if possible? No, simply die.
            try {
                // Optional: Send message if bot is active?
                // await bot.sendMessage(someId, "Session Expired.");
            } catch (e) { }

            process.exit(1); // KILL BOT
        }
    }, 10 * 60 * 1000); // 10 Minutes
}

module.exports = { verifyKey, startPeriodicCheck };
