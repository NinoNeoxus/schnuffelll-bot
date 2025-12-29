/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  🔐 SCHNUFFELLL BOT - LICENSE VALIDATION SYSTEM v8.1
 *  Validates license tokens for feature access control
 *  
 *  License Types:
 *  - OWNER     : Full access to everything
 *  - PREMIUM   : Update + AutoUpdate + All features
 *  - BASIC     : Manual update only, limited features
 *  - FREE      : No update access
 *  
 *  @author @schnuffelll
 *  @version 8.1
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

const LICENSE_FILE = path.join(__dirname, '../db/licenses.json');

/**
 * Load licenses database
 */
function loadLicenses() {
    try {
        if (fs.existsSync(LICENSE_FILE)) {
            return JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('[LICENSE] Error loading licenses:', e.message);
    }
    return [];
}

/**
 * Save licenses database
 */
function saveLicenses(licenses) {
    try {
        fs.writeFileSync(LICENSE_FILE, JSON.stringify(licenses, null, 4));
        return true;
    } catch (e) {
        console.error('[LICENSE] Error saving licenses:', e.message);
        return false;
    }
}

/**
 * Get license for user
 * @param {string} userId - Telegram user ID
 * @returns {object|null} License object or null
 */
function getLicense(userId) {
    const licenses = loadLicenses();
    return licenses.find(l => l.userId === String(userId)) || null;
}

/**
 * Check if user has specific feature access
 * @param {string} userId - Telegram user ID
 * @param {string} feature - Feature name (update, autoUpdate, rpg, vps, panel)
 * @returns {boolean}
 */
function hasFeature(userId, feature) {
    const license = getLicense(userId);
    if (!license) return false;

    // Check expiry
    if (license.expiry && new Date(license.expiry) < new Date()) {
        return false;
    }

    // OWNER always has access
    if (license.type === 'OWNER') return true;

    return license.features?.[feature] === true;
}

/**
 * Check if user can update
 * @param {string} userId 
 * @returns {boolean}
 */
function canUpdate(userId) {
    return hasFeature(userId, 'update');
}

/**
 * Check if user can auto-update
 * @param {string} userId 
 * @returns {boolean}
 */
function canAutoUpdate(userId) {
    return hasFeature(userId, 'autoUpdate');
}

/**
 * Add new license
 * @param {string} token - Unique license token
 * @param {string} userId - Telegram user ID
 * @param {string} type - License type (OWNER/PREMIUM/BASIC/FREE)
 * @param {object} features - Feature access object
 * @param {string|null} expiry - Expiry date (YYYY-MM-DD) or null
 * @returns {boolean}
 */
function addLicense(token, userId, type, features = {}, expiry = null) {
    const licenses = loadLicenses();

    // Check if user already has license
    const existing = licenses.findIndex(l => l.userId === String(userId));
    if (existing !== -1) {
        // Update existing
        licenses[existing] = {
            token,
            userId: String(userId),
            type,
            features: {
                update: type !== 'FREE',
                autoUpdate: type === 'OWNER' || type === 'PREMIUM',
                rpg: true,
                vps: type !== 'FREE',
                panel: type !== 'FREE',
                ...features
            },
            expiry,
            createdAt: new Date().toISOString().split('T')[0]
        };
    } else {
        // Add new
        licenses.push({
            token,
            userId: String(userId),
            type,
            features: {
                update: type !== 'FREE',
                autoUpdate: type === 'OWNER' || type === 'PREMIUM',
                rpg: true,
                vps: type !== 'FREE',
                panel: type !== 'FREE',
                ...features
            },
            expiry,
            createdAt: new Date().toISOString().split('T')[0]
        });
    }

    return saveLicenses(licenses);
}

/**
 * Remove license by user ID
 * @param {string} userId 
 * @returns {boolean}
 */
function removeLicense(userId) {
    let licenses = loadLicenses();
    const original = licenses.length;
    licenses = licenses.filter(l => l.userId !== String(userId));

    if (licenses.length < original) {
        return saveLicenses(licenses);
    }
    return false;
}

/**
 * Generate random license token
 * @param {string} prefix - Token prefix (e.g., 'PREMIUM', 'BASIC')
 * @returns {string}
 */
function generateToken(prefix = 'SCHNUFFELLL') {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = prefix + '-';
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        if (i < 3) token += '-';
    }
    return token;
}

/**
 * Get all licenses (for admin)
 * @returns {array}
 */
function getAllLicenses() {
    return loadLicenses();
}

/**
 * License type presets
 */
const LICENSE_PRESETS = {
    OWNER: {
        update: true,
        autoUpdate: true,
        rpg: true,
        vps: true,
        panel: true
    },
    PREMIUM: {
        update: true,
        autoUpdate: true,
        rpg: true,
        vps: true,
        panel: true
    },
    BASIC: {
        update: true,
        autoUpdate: false,
        rpg: true,
        vps: false,
        panel: true
    },
    FREE: {
        update: false,
        autoUpdate: false,
        rpg: true,
        vps: false,
        panel: false
    }
};

module.exports = {
    loadLicenses,
    saveLicenses,
    getLicense,
    hasFeature,
    canUpdate,
    canAutoUpdate,
    addLicense,
    removeLicense,
    generateToken,
    getAllLicenses,
    LICENSE_PRESETS
};
