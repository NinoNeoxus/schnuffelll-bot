/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  🏆 SCHNUFFELLL BOT - RPG LEADERBOARD v8.0
 *  Global leaderboards and rankings
 *  
 *  Commands:
 *  /leaderboard     - Main leaderboard menu
 *  /top             - Top players
 *  /toplevel        - Top by level
 *  /topgold         - Top by gold
 *  /topexp          - Top by exp
 *  /topfish         - Top fishers
 *  /tophunt         - Top hunters
 *  /myrank          - My ranking
 *  /profile         - Player profile
 *  
 *  @author @schnuffelll
 *  @version 8.0
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const { loadJsonData, saveJsonData } = require('../../lib/function');

module.exports = (bot) => {

    console.log('[RANK] 🏆 RPG Leaderboard v8.0 loaded');

    const PLAYER_FILE = './db/rpg/players.json';
    const STATS_FILE = './db/rpg/stats.json';

    // Helper functions
    function getPlayers() {
        return loadJsonData(PLAYER_FILE) || {};
    }

    function getStats() {
        return loadJsonData(STATS_FILE) || {};
    }

    function getRank(userId, sortKey) {
        const players = getPlayers();
        const sorted = Object.entries(players)
            .sort((a, b) => (b[1][sortKey] || 0) - (a[1][sortKey] || 0));

        const rank = sorted.findIndex(([id]) => id === userId) + 1;
        return rank || sorted.length + 1;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // /leaderboard - Main menu
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/leaderboard$/i, async (msg) => {
        const chatId = msg.chat.id;
        const players = getPlayers();
        const totalPlayers = Object.keys(players).length;

        const text = `
🏆 <b>LEADERBOARD</b>
<code>━━━━━━━━━━━━━━━━━━━━━━</code>

📊 Total Players: <b>${totalPlayers}</b>

<b>RANKINGS</b>
📈 Level - Siapa paling tinggi
💰 Gold - Siapa paling kaya
⭐ EXP - Siapa paling berpengalaman
🎣 Fish - Raja mancing
🏹 Hunt - Raja berburu

<i>Pilih kategori dibawah!</i>
`;

        bot.sendMessage(chatId, text, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📈 Level', callback_data: 'lb_level' },
                        { text: '💰 Gold', callback_data: 'lb_gold' },
                        { text: '⭐ EXP', callback_data: 'lb_exp' }
                    ],
                    [
                        { text: '🎣 Fish', callback_data: 'lb_fish' },
                        { text: '🏹 Hunt', callback_data: 'lb_hunt' }
                    ],
                    [
                        { text: '📊 My Rank', callback_data: 'lb_myrank' }
                    ]
                ]
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /top atau /toplevel - Top by level
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/top(?:level)?$/i, async (msg) => {
        const chatId = msg.chat.id;
        const players = getPlayers();

        const sorted = Object.entries(players)
            .sort((a, b) => (b[1].level || 1) - (a[1].level || 1))
            .slice(0, 10);

        if (sorted.length === 0) {
            return bot.sendMessage(chatId, '📋 Belum ada player.');
        }

        let text = `📈 <b>TOP LEVEL</b>\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

        sorted.forEach(([id, p], i) => {
            const medal = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
            text += `${medal} ID: ${id.slice(-6)}\n   📊 Level ${p.level || 1} | ⭐ ${p.exp || 0} EXP\n\n`;
        });

        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /topgold - Top by gold
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/topgold$/i, async (msg) => {
        const chatId = msg.chat.id;
        const players = getPlayers();

        const sorted = Object.entries(players)
            .sort((a, b) => (b[1].gold || 0) - (a[1].gold || 0))
            .slice(0, 10);

        if (sorted.length === 0) {
            return bot.sendMessage(chatId, '📋 Belum ada player.');
        }

        let text = `💰 <b>TOP GOLD</b>\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

        sorted.forEach(([id, p], i) => {
            const medal = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
            text += `${medal} ID: ${id.slice(-6)}\n   💰 ${(p.gold || 0).toLocaleString()} gold\n\n`;
        });

        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /topexp - Top by exp
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/topexp$/i, async (msg) => {
        const chatId = msg.chat.id;
        const players = getPlayers();

        const sorted = Object.entries(players)
            .sort((a, b) => (b[1].exp || 0) - (a[1].exp || 0))
            .slice(0, 10);

        if (sorted.length === 0) {
            return bot.sendMessage(chatId, '📋 Belum ada player.');
        }

        let text = `⭐ <b>TOP EXP</b>\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

        sorted.forEach(([id, p], i) => {
            const medal = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
            text += `${medal} ID: ${id.slice(-6)}\n   ⭐ ${(p.exp || 0).toLocaleString()} EXP | Lv.${p.level || 1}\n\n`;
        });

        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /topfish - Top fishers
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/topfish$/i, async (msg) => {
        const chatId = msg.chat.id;
        const stats = getStats();

        const sorted = Object.entries(stats)
            .filter(([id, s]) => s.fishCaught)
            .sort((a, b) => (b[1].fishCaught || 0) - (a[1].fishCaught || 0))
            .slice(0, 10);

        if (sorted.length === 0) {
            return bot.sendMessage(chatId, '📋 Belum ada data fishing.');
        }

        let text = `🎣 <b>TOP FISHERS</b>\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

        sorted.forEach(([id, s], i) => {
            const medal = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
            text += `${medal} ID: ${id.slice(-6)}\n   🎣 ${s.fishCaught || 0} tangkapan\n\n`;
        });

        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /tophunt - Top hunters
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/tophunt$/i, async (msg) => {
        const chatId = msg.chat.id;
        const stats = getStats();

        const sorted = Object.entries(stats)
            .filter(([id, s]) => s.animalsHunted)
            .sort((a, b) => (b[1].animalsHunted || 0) - (a[1].animalsHunted || 0))
            .slice(0, 10);

        if (sorted.length === 0) {
            return bot.sendMessage(chatId, '📋 Belum ada data hunting.');
        }

        let text = `🏹 <b>TOP HUNTERS</b>\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

        sorted.forEach(([id, s], i) => {
            const medal = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
            text += `${medal} ID: ${id.slice(-6)}\n   🏹 ${s.animalsHunted || 0} buruan\n\n`;
        });

        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /myrank - My ranking
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/myrank$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const players = getPlayers();
        const player = players[userId];

        if (!player) {
            return bot.sendMessage(chatId, '❌ Kamu belum punya profile RPG!\n\nGunakan /shop atau /daily untuk mulai.');
        }

        const totalPlayers = Object.keys(players).length;
        const levelRank = getRank(userId, 'level');
        const goldRank = getRank(userId, 'gold');
        const expRank = getRank(userId, 'exp');

        const text = `
📊 <b>MY RANKING</b>
<code>━━━━━━━━━━━━━━━━━━━━━━</code>

<blockquote>
📈 <b>Level:</b> #${levelRank} of ${totalPlayers}
💰 <b>Gold:</b> #${goldRank} of ${totalPlayers}
⭐ <b>EXP:</b> #${expRank} of ${totalPlayers}
</blockquote>

📊 Level: ${player.level || 1}
💰 Gold: ${(player.gold || 0).toLocaleString()}
⭐ EXP: ${(player.exp || 0).toLocaleString()}
`;

        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /profile [user_id] - Player profile
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/profile(?:\s+(\d+))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const targetId = match[1] || msg.from.id.toString();
        const players = getPlayers();
        const player = players[targetId];

        if (!player) {
            return bot.sendMessage(chatId, '❌ Player tidak ditemukan!');
        }

        const stats = getStats();
        const playerStats = stats[targetId] || {};

        const text = `
👤 <b>PLAYER PROFILE</b>
<code>━━━━━━━━━━━━━━━━━━━━━━</code>

<blockquote>
🆔 ID: ${targetId}

📊 <b>STATS</b>
┣ Level: ${player.level || 1}
┣ EXP: ${(player.exp || 0).toLocaleString()}
┣ Gold: ${(player.gold || 0).toLocaleString()}
┣ HP: ${player.hp || 100}/${player.maxHp || 100}
┣ MP: ${player.mp || 50}/${player.maxMp || 50}
┣ ATK: ${player.attack || 10}
┗ DEF: ${player.defense || 5}

🎮 <b>ACTIVITY</b>
┣ 🎣 Fish: ${playerStats.fishCaught || 0}
┣ 🏹 Hunt: ${playerStats.animalsHunted || 0}
┣ ⚔️ Battles: ${playerStats.battlesWon || 0}W/${playerStats.battlesLost || 0}L
┗ 📜 Quests: ${playerStats.questsCompleted || 0}
</blockquote>
`;

        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // CALLBACK HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.on('callback_query', async (query) => {
        const data = query.data;
        const chatId = query.message.chat.id;
        const userId = query.from.id.toString();

        if (!data.startsWith('lb_')) return;

        bot.answerCallbackQuery(query.id);

        const type = data.replace('lb_', '');
        const players = getPlayers();

        if (['level', 'gold', 'exp'].includes(type)) {
            const label = { level: '📈 TOP LEVEL', gold: '💰 TOP GOLD', exp: '⭐ TOP EXP' };
            const sorted = Object.entries(players)
                .sort((a, b) => (b[1][type] || 0) - (a[1][type] || 0))
                .slice(0, 10);

            let text = `<b>${label[type]}</b>\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

            if (sorted.length === 0) {
                text += '<i>No data yet</i>';
            } else {
                sorted.forEach(([id, p], i) => {
                    const medal = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
                    const value = type === 'gold' ? `${(p[type] || 0).toLocaleString()}g` :
                        type === 'level' ? `Lv.${p[type] || 1}` :
                            `${(p[type] || 0).toLocaleString()} EXP`;
                    text += `${medal} ${id.slice(-6)} - ${value}\n`;
                });
            }

            bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
        }

        if (type === 'fish' || type === 'hunt') {
            const stats = getStats();
            const key = type === 'fish' ? 'fishCaught' : 'animalsHunted';
            const emoji = type === 'fish' ? '🎣' : '🏹';

            const sorted = Object.entries(stats)
                .filter(([_, s]) => s[key])
                .sort((a, b) => (b[1][key] || 0) - (a[1][key] || 0))
                .slice(0, 10);

            let text = `<b>${emoji} TOP ${type.toUpperCase()}</b>\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

            if (sorted.length === 0) {
                text += '<i>No data yet</i>';
            } else {
                sorted.forEach(([id, s], i) => {
                    const medal = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
                    text += `${medal} ${id.slice(-6)} - ${s[key] || 0}\n`;
                });
            }

            bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
        }

        if (type === 'myrank') {
            const player = players[userId];
            if (!player) {
                return bot.sendMessage(chatId, '❌ Belum punya profile RPG!');
            }

            const total = Object.keys(players).length;
            const levelRank = getRank(userId, 'level');
            const goldRank = getRank(userId, 'gold');

            bot.sendMessage(chatId, `📊 <b>Your Ranking</b>\n\n📈 Level: #${levelRank}/${total}\n💰 Gold: #${goldRank}/${total}`, { parse_mode: 'HTML' });
        }
    });

};
