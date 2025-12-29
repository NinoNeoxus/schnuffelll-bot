/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  📜 SCHNUFFELLL BOT - RPG QUEST SYSTEM v8.0
 *  Quest, missions, daily/weekly challenges
 *  
 *  Commands:
 *  /quest           - Quest menu
 *  /questlist       - List semua quest
 *  /questactive     - Quest yang sedang dijalankan
 *  /questcomplete   - Selesaikan quest
 *  /dailyquest      - Daily quest
 *  /weeklyquest     - Weekly quest
 *  /achievement     - Achievement list
 *  
 *  @author @schnuffelll
 *  @version 8.0
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const { loadJsonData, saveJsonData } = require('../../lib/function');

module.exports = (bot) => {

    console.log('[QUEST] 📜 RPG Quest System v8.0 loaded');

    const QUEST_PROGRESS_FILE = './db/rpg/quest_progress.json';
    const PLAYER_FILE = './db/rpg/players.json';

    // Quest Database
    const QUESTS = {
        // === DAILY QUESTS ===
        'daily_fish_5': { name: '🎣 Fisherman\'s Start', desc: 'Tangkap 5 ikan', type: 'daily', requirement: { action: 'fish', count: 5 }, reward: { gold: 200, exp: 50 } },
        'daily_hunt_3': { name: '🏹 Hunter\'s Morning', desc: 'Berburu 3 hewan', type: 'daily', requirement: { action: 'hunt', count: 3 }, reward: { gold: 250, exp: 60 } },
        'daily_chat_10': { name: '💬 Social Butterfly', desc: 'Kirim 10 pesan', type: 'daily', requirement: { action: 'chat', count: 10 }, reward: { gold: 100, exp: 30 } },
        'daily_shop_1': { name: '🛒 Shopaholic', desc: 'Beli 1 item', type: 'daily', requirement: { action: 'buy', count: 1 }, reward: { gold: 150, exp: 40 } },

        // === WEEKLY QUESTS ===
        'weekly_fish_50': { name: '🎣 Master Angler', desc: 'Tangkap 50 ikan', type: 'weekly', requirement: { action: 'fish', count: 50 }, reward: { gold: 2000, exp: 500 } },
        'weekly_hunt_30': { name: '🏹 Great Hunter', desc: 'Berburu 30 hewan', type: 'weekly', requirement: { action: 'hunt', count: 30 }, reward: { gold: 2500, exp: 600 } },
        'weekly_gold_5000': { name: '💰 Gold Collector', desc: 'Kumpulkan 5000 gold', type: 'weekly', requirement: { action: 'gold', count: 5000 }, reward: { gold: 1000, exp: 300 } },
        'weekly_level_5': { name: '📈 Leveling Up', desc: 'Naik 5 level', type: 'weekly', requirement: { action: 'level', count: 5 }, reward: { gold: 3000, exp: 800 } },

        // === STORY QUESTS ===
        'story_1': { name: '🌟 The Beginning', desc: 'Mulai petualanganmu', type: 'story', requirement: { action: 'start', count: 1 }, reward: { gold: 500, exp: 100, item: 'fishing_rod' } },
        'story_2': { name: '⚔️ First Battle', desc: 'Menangkan 1 battle', type: 'story', requirement: { action: 'battle_win', count: 1 }, reward: { gold: 800, exp: 200, item: 'wooden_sword' } },
        'story_3': { name: '🏰 Village Hero', desc: 'Selesaikan 10 quest', type: 'story', requirement: { action: 'quest_complete', count: 10 }, reward: { gold: 2000, exp: 500, item: 'iron_sword' } }
    };

    // Achievement Database
    const ACHIEVEMENTS = {
        'first_fish': { name: '🎣 First Catch', desc: 'Tangkap ikan pertama', reward: { gold: 100 } },
        'fish_100': { name: '🐟 Fish Master', desc: 'Tangkap 100 ikan', reward: { gold: 1000 } },
        'gold_10k': { name: '💰 Rich', desc: 'Kumpulkan 10000 gold', reward: { gold: 2000 } },
        'level_10': { name: '📈 Rising Star', desc: 'Mencapai level 10', reward: { gold: 1500 } },
        'level_50': { name: '⭐ Veteran', desc: 'Mencapai level 50', reward: { gold: 5000 } },
        'quest_50': { name: '📜 Quest Master', desc: 'Selesaikan 50 quest', reward: { gold: 3000 } }
    };

    // Helper functions
    function getQuestProgress(userId) {
        const progress = loadJsonData(QUEST_PROGRESS_FILE) || {};
        if (!progress[userId]) {
            progress[userId] = { active: [], completed: [], achievements: [], dailyReset: 0, weeklyReset: 0 };
            saveJsonData(QUEST_PROGRESS_FILE, progress);
        }
        return progress[userId];
    }

    function saveQuestProgress(userId, data) {
        const progress = loadJsonData(QUEST_PROGRESS_FILE) || {};
        progress[userId] = data;
        saveJsonData(QUEST_PROGRESS_FILE, progress);
    }

    function getPlayer(userId) {
        const players = loadJsonData(PLAYER_FILE) || {};
        return players[userId] || { gold: 1000, level: 1, exp: 0 };
    }

    function savePlayer(userId, data) {
        const players = loadJsonData(PLAYER_FILE) || {};
        players[userId] = data;
        saveJsonData(PLAYER_FILE, players);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // /quest - Quest menu
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/quest$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const progress = getQuestProgress(userId);

        const text = `
📜 <b>QUEST CENTER</b>
<code>━━━━━━━━━━━━━━━━━━━━━━</code>

📊 <b>PROGRESS</b>
┣ 🎯 Active: ${progress.active.length}
┣ ✅ Completed: ${progress.completed.length}
┗ 🏆 Achievements: ${progress.achievements.length}

<b>QUEST TYPES</b>

📅 <b>Daily Quest</b> - Reset setiap hari
📆 <b>Weekly Quest</b> - Reset setiap minggu
📖 <b>Story Quest</b> - Main storyline

<i>Klik tombol untuk detail!</i>
`;

        bot.sendMessage(chatId, text, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📅 Daily', callback_data: 'quest_daily' },
                        { text: '📆 Weekly', callback_data: 'quest_weekly' }
                    ],
                    [
                        { text: '📖 Story', callback_data: 'quest_story' },
                        { text: '🎯 Active', callback_data: 'quest_active' }
                    ],
                    [
                        { text: '🏆 Achievements', callback_data: 'quest_achievements' }
                    ]
                ]
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /questlist - List semua quest
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/questlist$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const progress = getQuestProgress(userId);

        let text = `📜 <b>ALL QUESTS</b>\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

        ['daily', 'weekly', 'story'].forEach(type => {
            const label = { daily: '📅 DAILY', weekly: '📆 WEEKLY', story: '📖 STORY' };
            text += `<b>${label[type]}</b>\n`;

            Object.entries(QUESTS).filter(([id, q]) => q.type === type).forEach(([id, q]) => {
                const done = progress.completed.includes(id) ? '✅' : '⬜';
                text += `${done} <code>${id}</code>\n   ${q.name}\n   💰${q.reward.gold} | ⭐${q.reward.exp}\n\n`;
            });
        });

        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /queststart <quest_id> - Start quest
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/queststart\s+(\S+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const questId = match[1];

        const quest = QUESTS[questId];
        if (!quest) {
            return bot.sendMessage(chatId, `❌ Quest "${questId}" tidak ditemukan!`);
        }

        const progress = getQuestProgress(userId);

        if (progress.active.some(q => q.id === questId)) {
            return bot.sendMessage(chatId, '❌ Quest sudah aktif!');
        }

        if (progress.completed.includes(questId) && quest.type !== 'daily' && quest.type !== 'weekly') {
            return bot.sendMessage(chatId, '❌ Quest sudah diselesaikan!');
        }

        // Add to active
        progress.active.push({
            id: questId,
            progress: 0,
            startedAt: Date.now()
        });
        saveQuestProgress(userId, progress);

        bot.sendMessage(chatId, `✅ <b>Quest Started!</b>\n\n📜 ${quest.name}\n📝 ${quest.desc}\n🎯 Target: ${quest.requirement.count}\n💰 Reward: ${quest.reward.gold} gold + ${quest.reward.exp} EXP`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /questactive - Active quests
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/questactive$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const progress = getQuestProgress(userId);

        if (progress.active.length === 0) {
            return bot.sendMessage(chatId, '📋 Tidak ada quest aktif.\n\nGunakan /questlist untuk lihat quest.');
        }

        let text = `🎯 <b>ACTIVE QUESTS</b>\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

        progress.active.forEach((aq, i) => {
            const quest = QUESTS[aq.id];
            if (quest) {
                const pct = Math.floor((aq.progress / quest.requirement.count) * 100);
                const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
                text += `${i + 1}. ${quest.name}\n`;
                text += `   ${bar} ${pct}%\n`;
                text += `   Progress: ${aq.progress}/${quest.requirement.count}\n\n`;
            }
        });

        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /achievement - Achievement list
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/achievement$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const progress = getQuestProgress(userId);

        let text = `🏆 <b>ACHIEVEMENTS</b>\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;
        text += `Unlocked: ${progress.achievements.length}/${Object.keys(ACHIEVEMENTS).length}\n\n`;

        Object.entries(ACHIEVEMENTS).forEach(([id, ach]) => {
            const unlocked = progress.achievements.includes(id);
            const icon = unlocked ? '✅' : '🔒';
            text += `${icon} <b>${ach.name}</b>\n   ${ach.desc}\n   💰 ${ach.reward.gold}\n\n`;
        });

        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // CALLBACK HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.on('callback_query', async (query) => {
        const data = query.data;
        const chatId = query.message.chat.id;
        const userId = query.from.id.toString();

        if (!data.startsWith('quest_')) return;

        bot.answerCallbackQuery(query.id);
        const progress = getQuestProgress(userId);

        const type = data.replace('quest_', '');

        if (['daily', 'weekly', 'story'].includes(type)) {
            const quests = Object.entries(QUESTS).filter(([id, q]) => q.type === type);
            const label = { daily: '📅 DAILY QUESTS', weekly: '📆 WEEKLY QUESTS', story: '📖 STORY QUESTS' };

            let text = `<b>${label[type]}</b>\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

            quests.forEach(([id, q]) => {
                const active = progress.active.find(a => a.id === id);
                const done = progress.completed.includes(id);
                let status = '⬜';
                if (done) status = '✅';
                else if (active) status = '🔄';

                text += `${status} <b>${q.name}</b>\n`;
                text += `   📝 ${q.desc}\n`;
                text += `   💰 ${q.reward.gold} | ⭐ ${q.reward.exp}\n`;
                text += `   <code>/queststart ${id}</code>\n\n`;
            });

            bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
        }

        if (type === 'active') {
            if (progress.active.length === 0) {
                return bot.sendMessage(chatId, '📋 Tidak ada quest aktif.');
            }

            let text = `🎯 <b>ACTIVE QUESTS</b>\n\n`;
            progress.active.forEach((aq, i) => {
                const quest = QUESTS[aq.id];
                if (quest) {
                    text += `${i + 1}. ${quest.name}\n   ${aq.progress}/${quest.requirement.count}\n\n`;
                }
            });
            bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
        }

        if (type === 'achievements') {
            let text = `🏆 <b>ACHIEVEMENTS</b> (${progress.achievements.length}/${Object.keys(ACHIEVEMENTS).length})\n\n`;
            Object.entries(ACHIEVEMENTS).forEach(([id, ach]) => {
                const unlocked = progress.achievements.includes(id);
                text += `${unlocked ? '✅' : '🔒'} ${ach.name}\n`;
            });
            bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
        }
    });

};
