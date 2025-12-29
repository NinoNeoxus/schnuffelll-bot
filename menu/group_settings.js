const settings = require("../config.js");
const { getGroupType, setGroupType, clearGroupType } = require("../lib/groupSettings");

const OWNER_ID = settings.ownerId;
const dev = settings.dev;

module.exports = function (bot) {

    // Set tipe panel untuk grup ini: public / private
    bot.onText(/^\/setpaneltype(?:\s+(public|private))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const fromId = msg.from.id;

        if (msg.chat.type === "private") {
            return bot.sendMessage(chatId, "❌ Perintah ini hanya bisa dipakai di dalam grup.");
        }

        if (fromId.toString() !== OWNER_ID.toString()) {
            return bot.sendMessage(chatId, "❌ Perintah ini khusus Owner Bot!");
        }

        const type = (match && match[1]) ? match[1].toLowerCase() : null;
        if (!type || (type !== "public" && type !== "private")) {
            return bot.sendMessage(
                chatId,
                "❌ Format salah!\n\n" +
                "Contoh:\n" +
                "/setpaneltype public\n" +
                "/setpaneltype private"
            );
        }

        const ok = setGroupType(chatId, type);
        if (!ok) {
            return bot.sendMessage(chatId, "❌ Gagal menyimpan pengaturan grup. Coba lagi nanti.");
        }

        return bot.sendMessage(
            chatId,
            `✅ Tipe grup ini telah diset sebagai <b>PANEL ${type.toUpperCase()}</b>.`,
            { parse_mode: "HTML" }
        );
    });

    // Cek tipe panel untuk grup ini
    bot.onText(/^\/paneltype$/, async (msg) => {
        const chatId = msg.chat.id;

        if (msg.chat.type === "private") {
            return bot.sendMessage(chatId, "ℹ️ Perintah ini hanya berguna di dalam grup.");
        }

        const type = getGroupType(chatId, { exGroupId: settings.exGroupId, exPGroupId: settings.exPGroupId });

        let text;
        if (type === "public") {
            text = "📢 Grup ini terdaftar sebagai <b>PANEL PUBLIC</b>.";
        } else if (type === "private") {
            text = "🔐 Grup ini terdaftar sebagai <b>PANEL PRIVATE</b>.";
        } else {
            text =
                "ℹ️ Grup ini <b>belum di-set</b> sebagai panel.\n\n" +
                "Jika ini grup panel public/private, set dulu dengan:\n" +
                "<code>/setpaneltype public</code>\n" +
                "atau\n" +
                "<code>/setpaneltype private</code>";
        }

        return bot.sendMessage(chatId, text, { parse_mode: "HTML" });
    });

    // Reset setting tipe panel untuk grup ini (kembali pakai fallback exGroupId / exPGroupId)
    bot.onText(/^\/resetpaneltype$/, async (msg) => {
        const chatId = msg.chat.id;
        const fromId = msg.from.id;

        if (msg.chat.type === "private") {
            return bot.sendMessage(chatId, "❌ Perintah ini hanya bisa dipakai di dalam grup.");
        }

        if (fromId.toString() !== OWNER_ID.toString()) {
            return bot.sendMessage(chatId, "❌ Perintah ini khusus Owner Bot!");
        }

        const ok = clearGroupType(chatId);
        if (!ok) {
            return bot.sendMessage(chatId, "❌ Gagal reset setting grup. Coba lagi nanti.");
        }

        return bot.sendMessage(
            chatId,
            "✅ Setting tipe panel untuk grup ini sudah dihapus.\n" +
            "Bot sekarang kembali pakai pengaturan default dari <code>config.js</code> (exGroupId / exPGroupId).",
            { parse_mode: "HTML" }
        );
    });
};
