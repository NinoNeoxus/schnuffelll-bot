/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  🔄 SCHNUFFELLL BOT - LIVE AUTO-UPDATE SYSTEM v7.3
 *  Nuclear Update Approach: Clean Install from GitHub
 *  
 *  Logic: Delete ALL files except config.js & db/ → Download fresh → Extract → Restart
 *  Like Android EDL Mode - Complete fresh install while preserving user data
 *  
 *  @author @schnuffelll
 *  @version 7.3
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const settings = require('../config.js');

// GitHub repository for updates
const UPDATE_CONFIG = {
    versionUrl: 'https://raw.githubusercontent.com/NinoNeoxus/schnuffelll-bot/main/version.json',
    downloadUrl: 'https://raw.githubusercontent.com/NinoNeoxus/schnuffelll-bot/main/latest.zip',
    localVersionFile: './version.json',
    downloadPath: './update_download.zip',
    tempExtractPath: './temp_update',

    // Files/folders to PRESERVE during update (NEVER delete these)
    preserveList: [
        'config.js',
        'db',
        'backups',
        'node_modules',
        'package-lock.json',
        '.env'
    ]
};

module.exports = (bot) => {
    const OWNER_ID = parseInt(settings.ownerId);

    // License validation
    let license = null;
    try {
        license = require('../lib/license');
    } catch (e) {
        console.log('[UPDATE] License module not found, using owner-only mode');
    }

    console.log('[UPDATE] ⚡ Nuclear Update Module v8.1 loaded - Owner ID:', OWNER_ID);

    // ═══════════════════════════════════════════════════════════════════════════════
    // HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════

    // Get local version
    function getLocalVersion() {
        try {
            if (fs.existsSync(UPDATE_CONFIG.localVersionFile)) {
                return JSON.parse(fs.readFileSync(UPDATE_CONFIG.localVersionFile, 'utf8'));
            }
        } catch (e) {
            console.error('[UPDATE] Error reading local version:', e.message);
        }
        return { version: '0.0', build: '0' };
    }

    // Get remote version from GitHub
    async function getRemoteVersion() {
        try {
            const response = await axios.get(UPDATE_CONFIG.versionUrl, {
                timeout: 15000,
                headers: { 'Cache-Control': 'no-cache' }
            });
            return response.data;
        } catch (e) {
            console.error('[UPDATE] Error fetching remote version:', e.message);
            return null;
        }
    }

    // BULLETPROOF VERSION CHECK - Checks version, build, AND date
    // If ANY of these is different/newer = UPDATE AVAILABLE
    function isNewerVersion(local, remote) {
        console.log('[UPDATE] ═══════════════════════════════════════════');
        console.log('[UPDATE] BULLETPROOF UPDATE CHECK');

        // If no local version, definitely need update
        if (!local || !local.version) {
            console.log('[UPDATE] ✓ No local version - UPDATE NEEDED');
            return true;
        }

        // If no remote version data, can't check
        if (!remote || !remote.version) {
            console.error('[UPDATE] ✗ Remote version data missing');
            return false;
        }

        console.log(`[UPDATE] Local:  v${local.version} | build ${local.build} | ${local.releaseDate}`);
        console.log(`[UPDATE] Remote: v${remote.version} | build ${remote.build} | ${remote.releaseDate}`);

        // CHECK 1: Version number comparison
        const cleanLocal = (local.version || "0.0.0").replace(/-.*/, '');
        const cleanRemote = (remote.version || "0.0.0").replace(/-.*/, '');

        const localParts = cleanLocal.split('.').map(Number);
        const remoteParts = cleanRemote.split('.').map(Number);

        for (let i = 0; i < Math.max(localParts.length, remoteParts.length); i++) {
            const l = localParts[i] || 0;
            const r = remoteParts[i] || 0;
            if (r > l) {
                console.log(`[UPDATE] ✓ Version higher: ${cleanRemote} > ${cleanLocal}`);
                return true;
            }
            if (r < l) {
                // Remote is older? Still check build/date in case of rollback fix
                break;
            }
        }

        // CHECK 2: Build number comparison
        const localBuild = parseInt(local.build) || 0;
        const remoteBuild = parseInt(remote.build) || 0;

        if (remoteBuild > localBuild) {
            console.log(`[UPDATE] ✓ Build higher: ${remoteBuild} > ${localBuild}`);
            return true;
        }

        // CHECK 3: Release date comparison (if builds are same, check date)
        if (remote.releaseDate && local.releaseDate) {
            const localDate = new Date(local.releaseDate).getTime();
            const remoteDate = new Date(remote.releaseDate).getTime();

            if (remoteDate > localDate) {
                console.log(`[UPDATE] ✓ Date newer: ${remote.releaseDate} > ${local.releaseDate}`);
                return true;
            }
        }

        // CHECK 4: If versions are EXACTLY same but build is different (hotfix)
        if (cleanLocal === cleanRemote && localBuild !== remoteBuild && remoteBuild > 0) {
            console.log(`[UPDATE] ✓ Same version but different build (hotfix)`);
            return true;
        }

        console.log('[UPDATE] ✗ Already up to date');
        console.log('[UPDATE] ═══════════════════════════════════════════');
        return false;
    }

    // Download update ZIP from GitHub
    async function downloadUpdate() {
        console.log('[UPDATE] 📥 Downloading update from GitHub...');

        const response = await axios({
            method: 'get',
            url: UPDATE_CONFIG.downloadUrl,
            responseType: 'arraybuffer',
            timeout: 120000, // 2 minutes timeout
            onDownloadProgress: (progressEvent) => {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                if (percent % 25 === 0) {
                    console.log(`[UPDATE] Download progress: ${percent}%`);
                }
            }
        });

        fs.writeFileSync(UPDATE_CONFIG.downloadPath, response.data);
        console.log('[UPDATE] ✅ Download complete:', UPDATE_CONFIG.downloadPath);
        return true;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // NUCLEAR UPDATE: Clean all files except preserved ones
    // ═══════════════════════════════════════════════════════════════════════════════

    function cleanAllFiles() {
        console.log('[UPDATE] 🧹 Starting NUCLEAR CLEAN - removing all files except preserved...');

        const rootDir = process.cwd();
        const preserveSet = new Set(UPDATE_CONFIG.preserveList.map(p => p.toLowerCase()));

        // Also preserve the update files themselves during update
        preserveSet.add('update_download.zip');
        preserveSet.add('temp_update');

        let deletedCount = 0;
        let preservedCount = 0;

        function shouldPreserve(itemName) {
            const lowerName = itemName.toLowerCase();
            return preserveSet.has(lowerName);
        }

        function deleteRecursive(dirPath, isRoot = false) {
            if (!fs.existsSync(dirPath)) return;

            const items = fs.readdirSync(dirPath);

            for (const item of items) {
                const itemPath = path.join(dirPath, item);

                // Only check preserve list at root level
                if (isRoot && shouldPreserve(item)) {
                    console.log('[UPDATE] 🔒 Preserving:', item);
                    preservedCount++;
                    continue;
                }

                try {
                    const stat = fs.statSync(itemPath);

                    if (stat.isDirectory()) {
                        // Delete directory recursively
                        fs.rmSync(itemPath, { recursive: true, force: true });
                        deletedCount++;
                    } else {
                        // Delete file
                        fs.unlinkSync(itemPath);
                        deletedCount++;
                    }
                } catch (e) {
                    console.log('[UPDATE] ⚠️ Could not delete:', item, e.message);
                }
            }
        }

        deleteRecursive(rootDir, true);

        console.log(`[UPDATE] 🧹 Clean complete: ${deletedCount} items deleted, ${preservedCount} items preserved`);
        return true;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // EXTRACT UPDATE: Extract ZIP and copy to root
    // ═══════════════════════════════════════════════════════════════════════════════

    async function extractUpdate() {
        console.log('[UPDATE] 📦 Extracting update...');

        return new Promise((resolve, reject) => {
            const zipPath = UPDATE_CONFIG.downloadPath;
            const extractPath = UPDATE_CONFIG.tempExtractPath;

            // Remove old temp folder if exists
            if (fs.existsSync(extractPath)) {
                fs.rmSync(extractPath, { recursive: true, force: true });
            }
            fs.mkdirSync(extractPath, { recursive: true });

            // Detect OS and use appropriate extraction command
            const isWindows = process.platform === 'win32';
            let execOptions = { timeout: 120000 };

            if (isWindows) {
                // Windows: Use PowerShell
                const extractCmd = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractPath}' -Force"`;
                console.log('[UPDATE] Using: PowerShell');

                exec(extractCmd, execOptions, (error) => {
                    if (error) {
                        console.error('[UPDATE] ❌ Extract error:', error.message);
                        reject(error);
                    } else {
                        console.log('[UPDATE] ✅ Extraction complete');
                        resolve(true);
                    }
                });
            } else {
                // Linux/Mac: Try multiple methods
                console.log('[UPDATE] Using: Linux extraction (unzip -> python -> busybox)');

                // Method 1: unzip
                exec(`unzip -o "${zipPath}" -d "${extractPath}"`, execOptions, (err1) => {
                    if (!err1) {
                        console.log('[UPDATE] ✅ Extraction complete (unzip)');
                        return resolve(true);
                    }

                    console.log('[UPDATE] unzip failed, trying python...');

                    // Method 2: Python zipfile (usually available)
                    const pythonCmd = `python3 -c "import zipfile; zipfile.ZipFile('${zipPath}').extractall('${extractPath}')"`;
                    exec(pythonCmd, execOptions, (err2) => {
                        if (!err2) {
                            console.log('[UPDATE] ✅ Extraction complete (python)');
                            return resolve(true);
                        }

                        console.log('[UPDATE] python failed, trying busybox...');

                        // Method 3: busybox unzip
                        exec(`busybox unzip -o "${zipPath}" -d "${extractPath}"`, execOptions, (err3) => {
                            if (!err3) {
                                console.log('[UPDATE] ✅ Extraction complete (busybox)');
                                return resolve(true);
                            }

                            console.log('[UPDATE] busybox failed, trying jar...');

                            // Method 4: jar (Java)
                            exec(`cd "${extractPath}" && jar xf "${zipPath}"`, execOptions, (err4) => {
                                if (!err4) {
                                    console.log('[UPDATE] ✅ Extraction complete (jar)');
                                    return resolve(true);
                                }

                                // All methods failed
                                console.error('[UPDATE] ❌ All extraction methods failed!');
                                console.error('[UPDATE] Please install unzip: apt install unzip');
                                reject(new Error('No ZIP extraction tool available. Install unzip: apt install unzip'));
                            });
                        });
                    });
                });
            }
        });
    }
    // Copy extracted files to root
    function copyToRoot() {
        console.log('[UPDATE] 📁 Copying files to root...');

        const extractPath = UPDATE_CONFIG.tempExtractPath;
        const rootDir = process.cwd();
        let sourceDir = extractPath;

        // Check if files are in a subfolder (e.g., SCHNUFFELLL_BACKUP)
        const items = fs.readdirSync(extractPath);
        if (items.length === 1) {
            const subPath = path.join(extractPath, items[0]);
            if (fs.statSync(subPath).isDirectory()) {
                // Check if this subfolder contains the main files
                if (fs.existsSync(path.join(subPath, 'schnuffelll.js')) ||
                    fs.existsSync(path.join(subPath, 'package.json'))) {
                    sourceDir = subPath;
                    console.log('[UPDATE] 📂 Found subfolder:', items[0]);
                }
            }
        }

        let copiedCount = 0;
        const preserveSet = new Set(UPDATE_CONFIG.preserveList.map(p => p.toLowerCase()));

        function copyRecursive(src, dest) {
            const stat = fs.statSync(src);

            if (stat.isDirectory()) {
                if (!fs.existsSync(dest)) {
                    fs.mkdirSync(dest, { recursive: true });
                }

                for (const item of fs.readdirSync(src)) {
                    copyRecursive(path.join(src, item), path.join(dest, item));
                }
            } else {
                // Check if should skip (preserve original)
                const relativePath = path.relative(rootDir, dest);
                const rootItem = relativePath.split(path.sep)[0].toLowerCase();

                if (preserveSet.has(rootItem)) {
                    // Skip - keep original file
                    return;
                }

                // Ensure parent directory exists
                const parentDir = path.dirname(dest);
                if (!fs.existsSync(parentDir)) {
                    fs.mkdirSync(parentDir, { recursive: true });
                }

                fs.copyFileSync(src, dest);
                copiedCount++;
            }
        }

        // Copy all files from source to root
        for (const item of fs.readdirSync(sourceDir)) {
            const srcPath = path.join(sourceDir, item);
            const destPath = path.join(rootDir, item);

            // Skip preserved items
            if (preserveSet.has(item.toLowerCase())) {
                console.log('[UPDATE] 🔒 Skipping (preserved):', item);
                continue;
            }

            copyRecursive(srcPath, destPath);
        }

        console.log(`[UPDATE] ✅ Copied ${copiedCount} files to root`);
        return copiedCount;
    }

    // Cleanup temp files
    function cleanup() {
        console.log('[UPDATE] 🧹 Cleaning up temp files...');

        try {
            if (fs.existsSync(UPDATE_CONFIG.downloadPath)) {
                fs.unlinkSync(UPDATE_CONFIG.downloadPath);
            }
            if (fs.existsSync(UPDATE_CONFIG.tempExtractPath)) {
                fs.rmSync(UPDATE_CONFIG.tempExtractPath, { recursive: true, force: true });
            }
            console.log('[UPDATE] ✅ Cleanup complete');
        } catch (e) {
            console.log('[UPDATE] ⚠️ Cleanup warning:', e.message);
        }
    }

    // Schedule restart (ROBUST METHOD)
    function scheduleRestart() {
        console.log('[UPDATE] 🔄 Restarting bot...');

        setTimeout(() => {
            // Method 1: If using PM2 (try-catch to avoid crash)
            exec('pm2 restart all', (err) => {
                if (!err) return; // PM2 succeeded

                // Method 2: Spawn new process directly using current Node executable
                console.log('[UPDATE] PM2 failed, using direct spawn...');
                const { spawn } = require('child_process');
                const subprocess = spawn(process.execPath, [process.argv[1]], {
                    detached: true,
                    stdio: 'ignore'
                });
                subprocess.unref();
                process.exit(0);
            });
        }, 2000);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // BOT COMMANDS
    // ═══════════════════════════════════════════════════════════════════════════════

    // /version - Check current version
    bot.onText(/^\/version$/i, async (msg) => {
        const chatId = msg.chat.id;
        const local = getLocalVersion();

        const text = `
📦 <b>SCHNUFFELLL BOT</b>
<code>━━━━━━━━━━━━━━━━━━</code>

📀 <b>Version:</b> ${local.version}
🔢 <b>Build:</b> ${local.build}
📅 <b>Release:</b> ${local.releaseDate || 'Unknown'}

<i>Ketik /update untuk cek update terbaru</i>
`;

        bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
    });

    // /changelog - Show changelog
    bot.onText(/^\/changelog$/i, async (msg) => {
        const chatId = msg.chat.id;
        const local = getLocalVersion();

        let changelogText = `📋 <b>CHANGELOG v${local.version}</b>\n<code>━━━━━━━━━━━━━━━━━━</code>\n\n`;

        if (local.changelog && Array.isArray(local.changelog)) {
            local.changelog.forEach(item => {
                changelogText += `• ${item}\n`;
            });
        } else {
            changelogText += '<i>Tidak ada changelog tersedia</i>';
        }

        bot.sendMessage(chatId, changelogText, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
    });

    // /update - Check for updates
    bot.onText(/^\/update$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = parseInt(msg.from.id);

        console.log('[UPDATE] /update command from:', userId);

        // Check access: Owner OR licensed user with update feature
        const hasUpdateAccess = userId === OWNER_ID || (license && license.canUpdate(userId.toString()));

        if (!hasUpdateAccess) {
            return bot.sendMessage(chatId, `🚫 <b>UPDATE ACCESS DENIED</b>

Anda tidak memiliki lisensi untuk update.
Hubungi @schnuffelll untuk membeli lisensi.

<b>Tipe Lisensi:</b>
⭐ PREMIUM - Auto-update included
📦 BASIC - Manual update only`, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '💬 Contact Dev', url: 'https://t.me/schnuffelll' }]
                    ]
                }
            });
        }

        const wait = await bot.sendMessage(chatId, '🔍 Mengecek update...', { reply_to_message_id: msg.message_id });

        try {
            const local = getLocalVersion();
            const remote = await getRemoteVersion();

            if (!remote) {
                return bot.editMessageText('❌ Gagal mengecek update. Cek koneksi internet.', {
                    chat_id: chatId,
                    message_id: wait.message_id
                });
            }

            if (!isNewerVersion(local.version, remote.version)) {
                return bot.editMessageText(`✅ <b>BOT SUDAH TERBARU!</b>\n\n📀 <b>Versi:</b> ${local.version}\n📅 <b>Release:</b> ${local.releaseDate || 'Unknown'}`, {
                    chat_id: chatId,
                    message_id: wait.message_id,
                    parse_mode: 'HTML'
                });
            }

            // Show update available
            let changelogText = '';
            if (remote.changelog && Array.isArray(remote.changelog)) {
                changelogText = remote.changelog.slice(0, 5).join('\n');
            }

            const updateText = `
🆕 <b>UPDATE TERSEDIA!</b>

📦 <b>Versi Baru:</b> ${remote.version}
📅 <b>Release:</b> ${remote.releaseDate}

<b>Changelog:</b>
${changelogText}

⚠️ <b>PENTING:</b>
• Config.js akan tetap aman
• Database (db/) akan tetap aman
• Bot akan restart otomatis

Ketik <code>/update confirm</code> untuk mulai update.
`;

            bot.editMessageText(updateText, {
                chat_id: chatId,
                message_id: wait.message_id,
                parse_mode: 'HTML'
            });

        } catch (e) {
            console.error('[UPDATE] Error:', e);
            bot.editMessageText('❌ Error: ' + e.message, {
                chat_id: chatId,
                message_id: wait.message_id
            });
        }
    });

    // /update confirm - Actually perform the update
    bot.onText(/^\/update confirm$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = parseInt(msg.from.id);

        console.log('[UPDATE] /update confirm from:', userId);

        if (userId !== OWNER_ID) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ ʙᴏᴛ!');
        }

        const wait = await bot.sendMessage(chatId, '⏳ Memulai proses update...', { reply_to_message_id: msg.message_id });

        try {
            // Step 1: Download
            await bot.editMessageText('📥 [1/4] Mendownload update...', {
                chat_id: chatId,
                message_id: wait.message_id
            });
            await downloadUpdate();

            // Step 2: Extract
            await bot.editMessageText('📦 [2/4] Mengekstrak file...', {
                chat_id: chatId,
                message_id: wait.message_id
            });
            await extractUpdate();

            // Validate extraction
            const extractPath = UPDATE_CONFIG.tempExtractPath;
            if (!fs.existsSync(extractPath) || fs.readdirSync(extractPath).length === 0) {
                throw new Error("Extraction failed: Temp folder empty");
            }

            // Step 3: Safe Clean (Only delete code folders to prevent ghost files)
            await bot.editMessageText('🧹 [3/4] Update kode...', {
                chat_id: chatId,
                message_id: wait.message_id
            });

            // Safe clean: Only delete menu and lib to ensure no ghost commands
            try {
                if (fs.existsSync('./menu')) fs.rmSync('./menu', { recursive: true, force: true });
                if (fs.existsSync('./lib')) fs.rmSync('./lib', { recursive: true, force: true });
            } catch (e) { console.log('[UPDATE] Safe clean error:', e.message); }

            // Step 4: Copy new files (Overwrite)
            await bot.editMessageText('📁 [4/4] Menyalin file baru...', {
                chat_id: chatId,
                message_id: wait.message_id
            });
            const copiedFiles = copyToRoot();

            // Cleanup temp files
            cleanup();

            // Get new version info
            const newVersion = getLocalVersion();

            // Success message
            await bot.editMessageText(`
✅ <b>UPDATE BERHASIL!</b>

📦 <b>Versi:</b> ${newVersion.version}
📅 <b>Date:</b> ${newVersion.releaseDate}
📊 <b>Files:</b> ${copiedFiles} files updated

🔄 <b>Bot akan restart dalam 3 detik...</b>

<i>Jika bot tidak aktif, restart manual dari panel.</i>
`, {
                chat_id: chatId,
                message_id: wait.message_id,
                parse_mode: 'HTML'
            });

            // Schedule restart
            scheduleRestart();

        } catch (e) {
            console.error('[UPDATE] Update failed:', e);

            // Try cleanup on error
            try { cleanup(); } catch (ce) { }

            bot.editMessageText(`❌ <b>UPDATE GAGAL!</b>\n\n<code>${e.message}</code>\n\n<i>Bot tetap di versi lama.</i>`, {
                chat_id: chatId,
                message_id: wait.message_id,
                parse_mode: 'HTML'
            });
        }
    });

    // /forceupdate - Force reinstall even if same version
    bot.onText(/^\/forceupdate$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = parseInt(msg.from.id);

        if (userId !== OWNER_ID) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ ʙᴏᴛ!');
        }

        bot.sendMessage(chatId, `
⚠️ <b>FORCE UPDATE</b>

Ini akan menginstall ulang bot dari GitHub meskipun versi sama.
Berguna jika ada file corrupt atau ingin reset ke default.

Ketik <code>/update confirm</code> untuk mulai.
`, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
    });
};
