const fs = require("fs")
const path = require("path")
const vpsFile = './db/datavps.json';
const cd = './db/cooldown.json';

let cooldownData = fs.existsSync(cd) ? JSON.parse(fs.readFileSync(cd)) : { time: 5 * 60 * 1000, users: {} };

function saveCooldown() {
    fs.writeFileSync(cd, JSON.stringify(cooldownData, null, 2));
}

function checkCooldown(userId) {
    if (cooldownData.users[userId]) {
        const remainingTime = cooldownData.time - (Date.now() - cooldownData.users[userId]);
        if (remainingTime > 0) return Math.ceil(remainingTime / 1000); 
    }
    cooldownData.users[userId] = Date.now();
    saveCooldown();
    setTimeout(() => {
        delete cooldownData.users[userId];
        saveCooldown();
    }, cooldownData.time);
    return 0;
}

function setCooldown(timeString) {
    const match = timeString.match(/(\d+)([smh])/);
    if (!match) return "❌ Format salah!\nContoh:\n/setjeda 30s";

    let [_, value, unit] = match;
    value = parseInt(value);

    if (unit === "s") cooldownData.time = value * 1000;
    else if (unit === "m") cooldownData.time = value * 60 * 1000;
    else if (unit === "h") cooldownData.time = value * 60 * 60 * 1000;

    saveCooldown();
    return `✅ Cooldown diatur ke ${value}${unit}`;
}

// fungsi load json file
function loadJsonData(filename) {
    try {
        const filePath = path.resolve(filename)
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, "utf8")
            return JSON.parse(data)
        }
    } catch (error) {
        console.error(`Error loading ${filename}:`, error)
    }
    return []
}

// fungsi save json file
function saveJsonData(filename, data) {
    try {
        const filePath = path.resolve(filename)
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4))
        return true
    } catch (error) {
        console.error(`Error saving ${filename}:`, error)
        return false
    }
}

// fungsi save & load data vps
function loadVPS() {
    return fs.existsSync(vpsFile) ? JSON.parse(fs.readFileSync(vpsFile)) : {};
}

function saveVPS(data) {
    fs.writeFileSync(vpsFile, JSON.stringify(data, null, 2));
}

function addVPS(dropletId, info) {
    const db = loadVPS();
    db[dropletId] = info;
    saveVPS(db);
}

function getVPS(dropletId) {
    const db = loadVPS();
    return db[dropletId] || null;
}

module.exports = {
    checkCooldown,
    setCooldown,
    loadJsonData,
    saveJsonData,
    addVPS,
    getVPS
}
