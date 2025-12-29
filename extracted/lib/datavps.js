const fs = require('fs');
const dbFile = './db/datavps.json';

if (!fs.existsSync('./db')) fs.mkdirSync('./db');

function loadVPS() {
    return fs.existsSync(dbFile) ? JSON.parse(fs.readFileSync(dbFile)) : {};
}

function saveVPS(data) {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
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

module.exports = { addVPS, getVPS };