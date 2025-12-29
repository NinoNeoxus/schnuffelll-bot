const fs = require('fs');
const axios = require('axios'); // <-- Dibutuhkan untuk /cekserver
const { loadJsonData, saveJsonData } = require('../lib/function');
const settings = require('../config.js'); // <-- Dibutuhkan untuk cek Owner ID

const SETTINGS_FILE = './db/panel_settings.json';
const OWNER_ID = settings.ownerId; // Mengambil ID Owner dari config.js

/**
 * Cek status koneksi server panel
 * @param {string} domain - URL panel
 * @param {string} plta - Application API Key (ptla)
 * @returns {Promise<boolean>} - true jika konek, false jika gagal
 */
async function checkServerStatus(domain, plta) {
    // Jika domain atau plta tidak di-set, otomatis gagal
    if (!domain || !plta || domain === '-' || plta === '-') {
        return false; 
    }
    try {
        // Kita coba tes koneksi dengan mengambil data lokasi (API call ringan)
        await axios.get(`${domain}/api/application/locations`, {
            headers: { 'Authorization': `Bearer ${plta}` },
            timeout: 5000 // Batas waktu 5 detik
        });
        return true; // Berhasil
    } catch (error) {
        return false; // Gagal (404, 401, 403, timeout, dll.)
    }
}

module.exports = (bot) => {
    
    /**
     * Fungsi helper untuk membuat command /set...
     * @param {string} command - Nama command (cth: "seturl")
     * @param {string} key - Key di file JSON (cth: "domain")
     * @param {string} serverName - Nama server (cth: "Server 1")
     */
    function createSetHandler(command, key, serverName) {
        bot.onText(new RegExp(`^/${command}(?:\\s+(.+))?$`), (msg, match) => {
            const chatId = msg.chat.id;
            
            // Cek apakah user adalah Owner
            // --- FIX STRING vs NUMBER ---
            if (msg.from.id.toString() !== OWNER_ID.toString()) {
            // --- SELESAI FIX ---
                return bot.sendMessage(chatId, '❌ Perintah ini khusus Owner Bot!');
            }
            
            const newValue = match[1] ? match[1].trim() : null;
            if (!newValue) {
                return bot.sendMessage(chatId, `❌ Format salah! Contoh:\n/${command} <data_baru>`);
            }

            const settingsData = loadJsonData(SETTINGS_FILE);
            settingsData[key] = newValue;
            
            if (saveJsonData(SETTINGS_FILE, settingsData)) {
                bot.sendMessage(chatId, `✅ ${serverName} (${key}) berhasil diubah ke:\n\`${newValue}\``, { parse_mode: 'Markdown' });
            } else {
                bot.sendMessage(chatId, '❌ Gagal menyimpan pengaturan ke database.');
            }
        });
    }

    // --- Membuat command /set... untuk semua server ---

    // Server 1 (Public)
    createSetHandler('seturl', 'domain', 'Server 1 (Public)');
    createSetHandler('setplta', 'plta', 'Server 1 (Public)');
    createSetHandler('setpltc', 'pltc', 'Server 1 (Public)');

    // Server 2
    createSetHandler('seturlv2', 'domainV2', 'Server 2');
    createSetHandler('setpltav2', 'pltaV2', 'Server 2');
    createSetHandler('setpltcv2', 'pltcV2', 'Server 2');
    
    // Server 3
    createSetHandler('seturlv3', 'domainV3', 'Server 3');
    createSetHandler('setpltav3', 'pltaV3', 'Server 3');
    createSetHandler('setpltcv3', 'pltcV3', 'Server 3');

    // Server 4
    createSetHandler('seturlv4', 'domainV4', 'Server 4');
    createSetHandler('setpltav4', 'pltaV4', 'Server 4');
    createSetHandler('setpltcv4', 'pltcV4', 'Server 4');

    // Server 5
    createSetHandler('seturlv5', 'domainV5', 'Server 5');
    createSetHandler('setpltav5', 'pltaV5', 'Server 5');
    createSetHandler('setpltcv5', 'pltcV5', 'Server 5');

    // Server Private
    createSetHandler('seturlpriv', 'domainPriv', 'Server Private');
    createSetHandler('setpltapriv', 'pltaPriv', 'Server Private');
    createSetHandler('setpltcpriv', 'pltcPriv', 'Server Private');


    // --- COMMAND BARU: /cekserver ---
    bot.onText(/^\/cekserver$/, async (msg) => {
        const chatId = msg.chat.id;
        
        // Cek Owner
        // --- FIX STRING vs NUMBER ---
        if (msg.from.id.toString() !== OWNER_ID.toString()) {
        // --- SELESAI FIX ---
            return bot.sendMessage(chatId, '❌ Perintah ini khusus Owner Bot!');
        }

        const waitMsg = await bot.sendMessage(chatId, '⏳ <i>Mengecek status semua server...</i>', { parse_mode: 'HTML' });
        
        const panelSettings = loadJsonData(SETTINGS_FILE);

        // Daftar semua server dari database
        const servers = [
            { name: "Server 1 (Public)", domain: panelSettings.domain, plta: panelSettings.plta },
            { name: "Server 2", domain: panelSettings.domainV2, plta: panelSettings.pltaV2 },
            { name: "Server 3", domain: panelSettings.domainV3, plta: panelSettings.pltaV3 },
            { name: "Server 4", domain: panelSettings.domainV4, plta: panelSettings.pltaV4 },
            { name: "Server 5", domain: panelSettings.domainV5, plta: panelSettings.pltaV5 },
            { name: "Server Private", domain: panelSettings.domainPriv, plta: panelSettings.pltaPriv }
        ];

        let reply = "<b>📊 Status Koneksi Server Panel</b>\n\n";

        // Cek satu per satu
        for (const server of servers) {
            const status = await checkServerStatus(server.domain, server.plta);
            reply += `${server.name}: ${status ? '✅' : '❌'}\n`;
        }

        reply += "\n<i>✅ = URL & API Key (plta) valid dan server merespon.\n❌ = URL/API Key belum di-set, salah, atau server tidak merespon.</i>";

        // Edit pesan "Mengecek..." menjadi hasil
        await bot.editMessageText(reply, {
            chat_id: chatId,
            message_id: waitMsg.message_id,
            parse_mode: 'HTML'
        });
    });
}
