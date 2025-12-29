const fs = require('fs');

const GROUP_SETTINGS_FILE = './db/group_settings.json';

function loadGroupSettings() {
    try {
        if (!fs.existsSync(GROUP_SETTINGS_FILE)) {
            return {};
        }
        const raw = fs.readFileSync(GROUP_SETTINGS_FILE, 'utf8');
        if (!raw) return {};
        return JSON.parse(raw);
    } catch (err) {
        console.error('Error reading group_settings.json:', err);
        return {};
    }
}

function saveGroupSettings(data) {
    try {
        fs.writeFileSync(GROUP_SETTINGS_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (err) {
        console.error('Error writing group_settings.json:', err);
        return false;
    }
}

/**
 * Ambil tipe grup: 'public' | 'private' | 'none'
 * - Kalau belum di-set di file, fallback ke config.js:
 *   - exGroupId  => 'public'
 *   - exPGroupId => 'private'
 */
function getGroupType(chatId, fallbacks = {}) {
    const id = chatId.toString();
    const data = loadGroupSettings();
    let type = data[id];

    if (!type && fallbacks) {
        const exGroupId = fallbacks.exGroupId?.toString();
        const exPGroupId = fallbacks.exPGroupId?.toString();

        if (id === exGroupId) type = 'public';
        else if (id === exPGroupId) type = 'private';
    }

    return type || 'none';
}

function setGroupType(chatId, type) {
    const id = chatId.toString();
    const data = loadGroupSettings();
    data[id] = type;
    return saveGroupSettings(data);
}

function clearGroupType(chatId) {
    const id = chatId.toString();
    const data = loadGroupSettings();
    if (data[id]) {
        delete data[id];
        return saveGroupSettings(data);
    }
    return true;
}

module.exports = {
    GROUP_SETTINGS_FILE,
    loadGroupSettings,
    saveGroupSettings,
    getGroupType,
    setGroupType,
    clearGroupType,
};
