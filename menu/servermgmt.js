const axios = require('axios');
const { loadJsonData } = require('../lib/function');
const settings = require('../config.js');

module.exports = (bot) => {
    console.log('[SERVER] Loaded');
    const OWNER = './db/users/adminID.json';
    const PREM = './db/users/premiumUsers.json';

    function hasAccess(id) {
        return loadJsonData(OWNER).includes(String(id)) || loadJsonData(PREM).includes(String(id));
    }

    function getCfg(v=1) {
        if(v==2) return {d:settings.domainV2, k:settings.pltaV2, c:settings.pltcV2};
        return {d:settings.domain, k:settings.plta, c:settings.pltc};
    }

    async function req(ep, met='GET', dat=null, v=1, isClient=false) {
        const c = getCfg(v);
        const url = 'https://' + c.d + '/api' + (isClient?'/client':'') + ep;
        const key = isClient ? c.c : c.k;
        return (await axios({method:met, url, data:dat, headers:{'Authorization':'Bearer ' + key,'Content-Type':'application/json','Accept':'application/json'}})).data;
    }

    // /unli <id>
    bot.onText(/^\/unli\s+(\d+)(?:\s+(\d))?$/i, async (msg, match) => {
        if(!hasAccess(msg.from.id)) return bot.sendMessage(msg.chat.id, '❌ Owner/Prem only');
        const id = match[1];
        const v = match[2] ? parseInt(match[2]) : 1;
        const m = await bot.sendMessage(msg.chat.id, '⏳ Processing...');
        try {
            await req('/application/servers/' + id + '/build', 'PATCH', {
                allocation: 0, memory: 0, swap: 0, io: 500, cpu: 0, disk: 0,
                feature_limits: { databases: 0, allocations: 0, backups: 0 }
            }, v);
            bot.editMessageText('✅ Server ' + id + ' is now UNLIMITED!', {chat_id:msg.chat.id, message_id:m.message_id});
        } catch(e) {
            bot.editMessageText('❌ Error: ' + e.message, {chat_id:msg.chat.id, message_id:m.message_id});
        }
    });

    // /srvsuspend <id>
    bot.onText(/^\/srvsuspend\s+(\d+)(?:\s+(\d))?$/i, async (msg, match) => {
        if(!loadJsonData(OWNER).includes(String(msg.from.id))) return;
        try {
            await req('/application/servers/' + match[1] + '/suspend', 'POST', null, match[2]||1);
            bot.sendMessage(msg.chat.id, '✅ Suspended ' + match[1]);
        } catch(e) { bot.sendMessage(msg.chat.id, '❌ ' + e.message); }
    });
    
    // /srvunsuspend <id>
    bot.onText(/^\/srvunsuspend\s+(\d+)(?:\s+(\d))?$/i, async (msg, match) => {
        if(!loadJsonData(OWNER).includes(String(msg.from.id))) return;
        try {
            await req('/application/servers/' + match[1] + '/unsuspend', 'POST', null, match[2]||1);
            bot.sendMessage(msg.chat.id, '✅ Unsuspended ' + match[1]);
        } catch(e) { bot.sendMessage(msg.chat.id, '❌ ' + e.message); }
    });

    // /srvinfo <id>
    bot.onText(/^\/srvinfo\s+(\S+)(?:\s+(\d))?$/i, async (msg, match) => {
       if(!hasAccess(msg.from.id)) return;
       try {
           const d = await req('/servers/' + match[1], 'GET', null, match[2]||1, true);
           const a = d.attributes;
           bot.sendMessage(msg.chat.id, 'ID: ' + a.identifier + '\nName: ' + a.name + '\nRAM: ' + a.limits.memory + 'MB\nDisk: ' + a.limits.disk + 'MB');
       } catch(e) { bot.sendMessage(msg.chat.id, '❌ ' + e.message); }
    });
};
