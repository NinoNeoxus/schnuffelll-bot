/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  🔐 SCHNUFFELLL BOT - SECRET CONFIGURATION v8.0
 *  File ini akan di-OBFUSCATE saat dijual
 *  
 *  JANGAN EDIT MANUAL! Gunakan /dev menu untuk mengubah settings
 *  
 *  @author @schnuffelll
 *  @version 8.0
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════
// HARDCODED DEV IDS - TIDAK BISA DIUBAH TANPA EDIT CODE
// ═══════════════════════════════════════════════════════════════════════════════
const _DEV_IDS = [
    '1126396317'  // @schnuffelll - Main Dev
];

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT SECRET CONFIG (akan di-override oleh .dev_config.json)
// ═══════════════════════════════════════════════════════════════════════════════
const _DEFAULT_CONFIG = {
    // GitHub Personal Access Token
    _ghp: 'YOUR_GITHUB_TOKEN_HERE',

    // GitHub Repository untuk database
    _repo: 'NinoNeoxus/schnuffelll-database',

    // Path dalam repo untuk token file
    _path: 'token',

    // Raw GitHub URL base
    _raw: 'https://raw.githubusercontent.com',

    // Update repository
    _updateRepo: 'NinoNeoxus/schnuffelll-bot',

    // License check interval (ms)
    _checkInterval: 3600000, // 1 hour

    // Encryption key (untuk fitur premium)
    _encKey: 'SCHNUFF3LL_2024_S3CR3T',

    // Version signature
    _sig: 'v8.0-official'
};

// ═══════════════════════════════════════════════════════════════════════════════
// DYNAMIC CONFIG FILE (bisa diubah via /dev menu)
// ═══════════════════════════════════════════════════════════════════════════════
const _CONFIG_FILE = path.join(__dirname, 'db', '.dev_config.json');

/**
 * Load config from file, merge with defaults
 */
function _loadConfig() {
    try {
        if (fs.existsSync(_CONFIG_FILE)) {
            const saved = JSON.parse(fs.readFileSync(_CONFIG_FILE, 'utf8'));
            return { ..._DEFAULT_CONFIG, ...saved };
        }
    } catch (e) {
        console.log('[SECRET] Error loading config, using defaults');
    }
    return { ..._DEFAULT_CONFIG };
}

/**
 * Save config to file
 */
function _saveConfig(newConfig) {
    try {
        const dirPath = path.dirname(_CONFIG_FILE);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        // Only save non-default values to keep file small
        const toSave = {};
        for (const key in newConfig) {
            if (newConfig[key] !== _DEFAULT_CONFIG[key]) {
                toSave[key] = newConfig[key];
            }
        }

        fs.writeFileSync(_CONFIG_FILE, JSON.stringify(toSave, null, 2));
        return true;
    } catch (e) {
        console.error('[SECRET] Error saving config:', e.message);
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTED FUNCTIONS (obfuscation-friendly names)
// ═══════════════════════════════════════════════════════════════════════════════

// Check if user is dev
function isDev(userId) {
    return _DEV_IDS.includes(String(userId));
}

// Get all dev IDs
function getDevIds() {
    return [..._DEV_IDS];
}

// Get GitHub token
function getToken() {
    const config = _loadConfig();
    return config._ghp;
}

// Set GitHub token
function setToken(newToken) {
    const config = _loadConfig();
    config._ghp = newToken;
    return _saveConfig(config);
}

// Get repository
function getRepo() {
    const config = _loadConfig();
    return config._repo;
}

// Set repository
function setRepo(newRepo) {
    const config = _loadConfig();
    config._repo = newRepo;
    return _saveConfig(config);
}

// Get token path
function getPath() {
    const config = _loadConfig();
    return config._path;
}

// Set token path
function setPath(newPath) {
    const config = _loadConfig();
    config._path = newPath;
    return _saveConfig(config);
}

// Get raw URL base
function getRawUrl() {
    const config = _loadConfig();
    return config._raw;
}

// Set raw URL base
function setRawUrl(newUrl) {
    const config = _loadConfig();
    config._raw = newUrl;
    return _saveConfig(config);
}

// Get update repository
function getUpdateRepo() {
    const config = _loadConfig();
    return config._updateRepo;
}

// Set update repository
function setUpdateRepo(newRepo) {
    const config = _loadConfig();
    config._updateRepo = newRepo;
    return _saveConfig(config);
}

// Get full config (for dev info)
function getAllConfig() {
    return _loadConfig();
}

// Reset to defaults
function resetConfig() {
    try {
        if (fs.existsSync(_CONFIG_FILE)) {
            fs.unlinkSync(_CONFIG_FILE);
        }
        return true;
    } catch (e) {
        return false;
    }
}

// Get license object (compatible with old code)
function getLicense() {
    const config = _loadConfig();
    return {
        githubToken: config._ghp,
        githubRepo: config._repo,
        githubPath: config._path
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = {
    // Dev functions
    isDev,
    getDevIds,

    // Token/License functions
    getToken,
    setToken,
    getLicense,

    // Repository functions
    getRepo,
    setRepo,
    getPath,
    setPath,

    // URL functions
    getRawUrl,
    setRawUrl,
    getUpdateRepo,
    setUpdateRepo,

    // Config management
    getAllConfig,
    resetConfig
};
