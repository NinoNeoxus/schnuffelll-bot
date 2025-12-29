/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  🌆 SCHNUFFELLL CYBERPUNK SURVIVAL RPG - GAME DATA
 *  Theme: Neo-Jakarta 2077 - A Dystopian Indonesian Cyberpunk World
 *  Developer: @schnuffelll
 *  Version: 3.0 CYBERPUNK EDITION
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

// ════════════════════════════════════════════════════════════════════════════════════════
// 🎭 CYBERPUNK CLASSES - Futuristic Character Classes
// ════════════════════════════════════════════════════════════════════════════════════════

const CLASSES = {
    netrunner: {
        name: '🖥️ Netrunner',
        emoji: '🖥️',
        hp: 80, maxHp: 80,
        mp: 120, maxMp: 120,
        atk: 35, def: 8, spd: 18, luck: 15,
        hackBonus: 50,
        desc: 'Hacker elit yang menguasai cyberspace. Master infiltrasi digital.',
        story: 'Di Neo-Jakarta, data adalah segalanya. Netrunner menyelami lautan informasi, mencuri rahasia korporat dan menjual ke penawar tertinggi.',
        passive: 'Neural Interface - +50% Hacking damage & bypass security'
    },
    solo: {
        name: '🔫 Solo',
        emoji: '🔫',
        hp: 150, maxHp: 150,
        mp: 40, maxMp: 40,
        atk: 40, def: 25, spd: 15, luck: 10,
        combatBonus: 30,
        desc: 'Tentara bayaran dengan combat implants. Born to kill.',
        story: 'Mantan militer yang kini bekerja untuk siapa saja yang membayar. Tubuh penuh dengan implant tempur, jiwa kosong seperti peluru yang ditembakkan.',
        passive: 'Combat Focus - +30% Physical damage & armor penetration'
    },
    techie: {
        name: '🔧 Techie',
        emoji: '🔧',
        hp: 100, maxHp: 100,
        mp: 80, maxMp: 80,
        atk: 25, def: 15, spd: 12, luck: 20,
        craftBonus: 40,
        desc: 'Jenius teknologi. Bisa bikin senjata dari sampah.',
        story: 'Di dunia yang rusak, Techie adalah dewa. Mereka memperbaiki yang rusak, membuat yang mustahil, dan menjual mimpi dalam bentuk metal.',
        passive: 'Tech Genius - +40% Crafting success & item quality'
    },
    medtech: {
        name: '💉 Medtech',
        emoji: '💉',
        hp: 90, maxHp: 90,
        mp: 100, maxMp: 100,
        atk: 20, def: 12, spd: 14, luck: 18,
        healBonus: 50,
        desc: 'Dokter jalanan dengan cyberware medis. Menyembuhkan yang sakit, membunuh yang bayar.',
        story: 'Sumpah Hipokrates sudah mati di Neo-Jakarta. Medtech menyembuhkan siapa yang punya creds, dan meracuni siapa yang tidak.',
        passive: 'Bio-Resonance - +50% Healing power & poison resistance'
    },
    nomad: {
        name: '🏍️ Nomad',
        emoji: '🏍️',
        hp: 120, maxHp: 120,
        mp: 60, maxMp: 60,
        atk: 30, def: 20, spd: 22, luck: 12,
        survivalBonus: 35,
        desc: 'Pengembara Badlands. Survive di mana orang lain mati.',
        story: 'Lahir di jalan raya, mati di jalan raya. Nomad adalah keluarga, darah lebih tebal dari oli, dan honor lebih berharga dari creds.',
        passive: 'Wasteland Born - +35% Survival efficiency & vehicle combat'
    },
    corpo: {
        name: '💼 Corpo',
        emoji: '💼',
        hp: 85, maxHp: 85,
        mp: 90, maxMp: 90,
        atk: 28, def: 10, spd: 16, luck: 25,
        businessBonus: 45,
        desc: 'Mantan eksekutif dengan koneksi gelap. Money talks.',
        story: 'Dibuang dari menara ivory, Corpo tahu cara kerja sistem. Manipulasi, blackmail, dan assassination adalah bahasa ibu mereka.',
        passive: 'Corporate Connections - +45% Gold earned & black market access'
    },
    fixer: {
        name: '🎭 Fixer',
        emoji: '🎭',
        hp: 95, maxHp: 95,
        mp: 75, maxMp: 75,
        atk: 26, def: 14, spd: 20, luck: 30,
        dealBonus: 40,
        desc: 'Broker informasi. Tahu semua, jual semua.',
        story: 'Di Neo-Jakarta, informasi adalah senjata paling mematikan. Fixer adalah dealer amunisi paling berbahaya.',
        passive: 'Information Broker - +40% Quest rewards & rare item chance'
    },
    streetkid: {
        name: '🛹 Street Kid',
        emoji: '🛹',
        hp: 110, maxHp: 110,
        mp: 55, maxMp: 55,
        atk: 32, def: 18, spd: 24, luck: 22,
        streetBonus: 35,
        desc: 'Anak jalanan yang keras. Street smart, street tough.',
        story: 'Gang adalah keluarga, jalanan adalah rumah. Street Kid bertahan dengan kepintaran dan keberanian, bukan dengan creds.',
        passive: 'Street Cred - +35% Gang reputation & street vendor prices'
    }
};

// ════════════════════════════════════════════════════════════════════════════════════════
// 🌆 CYBERPUNK LOCATIONS - Neo-Jakarta Districts
// ════════════════════════════════════════════════════════════════════════════════════════

const LOCATIONS = {
    // STARTER ZONES
    gang_alley: {
        name: '🌃 Gang Alley',
        emoji: '🌃',
        minLv: 1,
        monsters: ['street_punk', 'drug_dealer', 'cyber_junkie'],
        boss: 'gang_boss',
        desc: 'Gang kecil-kecilan di pinggiran kota. Entry point buat pendatang baru.',
        environment: 'urban',
        survivalDrain: { hunger: 2, thirst: 2, stamina: 3, sanity: 1 },
        loot: ['street_creds', 'cheap_stimpack', 'rusty_knife']
    },
    neon_market: {
        name: '🏪 Neon Market',
        emoji: '🏪',
        minLv: 3,
        monsters: ['black_market_guard', 'scammer', 'pickpocket'],
        boss: 'market_kingpin',
        desc: 'Pasar gelap 24/7. Beli segalanya, jual segalanya, asal punya creds.',
        environment: 'urban',
        survivalDrain: { hunger: 1, thirst: 3, stamina: 2, sanity: 2 },
        loot: ['fake_id', 'counterfeit_creds', 'shady_goods']
    },
    
    // MID ZONES
    corpo_district: {
        name: '🏢 Corpo Plaza',
        emoji: '🏢',
        minLv: 10,
        monsters: ['corpo_security', 'corpo_drone', 'exec_bodyguard'],
        boss: 'rogue_ai_executive',
        desc: 'Menara kaca korporat. High risk, high reward. Security ketat 24/7.',
        environment: 'corporate',
        survivalDrain: { hunger: 1, thirst: 1, stamina: 4, sanity: 5 },
        loot: ['corpo_keycard', 'prototype_chip', 'executive_data']
    },
    cyber_wasteland: {
        name: '☢️ Cyber Wasteland',
        emoji: '☢️',
        minLv: 15,
        monsters: ['mutant_hound', 'radiation_zombie', 'scavenger_gang'],
        boss: 'wasteland_warlord',
        desc: 'Bekas zona perang nuklir. Radiasi tinggi, monster bermutasi.',
        environment: 'wasteland',
        survivalDrain: { hunger: 5, thirst: 6, stamina: 5, sanity: 4 },
        loot: ['radioactive_core', 'mutant_dna', 'military_salvage']
    },
    underground_bunker: {
        name: '🏚️ Underground Bunker',
        emoji: '🏚️',
        minLv: 20,
        monsters: ['bunker_dweller', 'security_bot', 'experiment_subject'],
        boss: 'mad_scientist',
        desc: 'Bunker rahasia pemerintah lama. Penuh eksperimen gagal.',
        environment: 'underground',
        survivalDrain: { hunger: 3, thirst: 2, stamina: 4, sanity: 7 },
        loot: ['military_tech', 'bio_sample', 'pre_war_weapon']
    },
    
    // HIGH LEVEL ZONES
    cyberspace: {
        name: '🌐 Cyberspace',
        emoji: '🌐',
        minLv: 30,
        monsters: ['ice_program', 'data_ghost', 'viral_entity'],
        boss: 'black_ice',
        desc: 'Virtual reality matrix. Hanya Netrunner yang bisa masuk.',
        environment: 'virtual',
        survivalDrain: { hunger: 0, thirst: 0, stamina: 8, sanity: 10 },
        loot: ['rare_daemon', 'netrunner_exploit', 'ai_core']
    },
    space_station: {
        name: '🛸 Orbital Station',
        emoji: '🛸',
        minLv: 40,
        monsters: ['space_pirate', 'rogue_android', 'void_entity'],
        boss: 'station_overlord',
        desc: 'Stasiun luar angkasa milik megacorp. Zero gravity combat.',
        environment: 'space',
        survivalDrain: { hunger: 4, thirst: 4, stamina: 6, sanity: 6 },
        loot: ['zero_g_tech', 'alien_artifact', 'space_crystal']
    },
    arasaka_tower: {
        name: '🗼 Mega Tower',
        emoji: '🗼',
        minLv: 50,
        monsters: ['elite_ninja', 'combat_mech', 'corporate_assassin'],
        boss: 'ceo_dragon',
        desc: 'Puncak kekuasaan korporat. Final boss territory.',
        environment: 'corporate',
        survivalDrain: { hunger: 2, thirst: 2, stamina: 7, sanity: 8 },
        loot: ['legendary_implant', 'ceo_access', 'megacorp_secret']
    },
    night_city_core: {
        name: '🌆 Night City Core',
        emoji: '🌆',
        minLv: 60,
        monsters: ['cyberpsycho', 'maxtac_rogue', 'legendary_mercenary'],
        boss: 'adam_smasher',
        desc: 'Pusat Night City. Hanya legend yang survive di sini.',
        environment: 'urban',
        survivalDrain: { hunger: 3, thirst: 3, stamina: 8, sanity: 9 },
        loot: ['smasher_arm', 'legend_chip', 'immortality_shard']
    },
    deep_net: {
        name: '🕳️ Deep Net',
        emoji: '🕳️',
        minLv: 80,
        monsters: ['alt_consciousness', 'rogue_ai_god', 'digital_demon'],
        boss: 'the_blackwall',
        desc: 'Beyond the Blackwall. Tempat AI terkutuk bersemayam.',
        environment: 'virtual',
        survivalDrain: { hunger: 0, thirst: 0, stamina: 10, sanity: 15 },
        loot: ['blackwall_fragment', 'ai_soul', 'reality_code']
    },
    quantum_realm: {
        name: '⚛️ Quantum Realm',
        emoji: '⚛️',
        minLv: 100,
        monsters: ['quantum_ghost', 'reality_shifter', 'time_paradox'],
        boss: 'the_architect',
        desc: 'Dimensi antara realita. Ultimate endgame content.',
        environment: 'quantum',
        survivalDrain: { hunger: 0, thirst: 0, stamina: 15, sanity: 20 },
        loot: ['reality_shard', 'time_crystal', 'architect_blessing']
    }
};

// ════════════════════════════════════════════════════════════════════════════════════════
// 👾 CYBERPUNK MONSTERS - Enemies of Neo-Jakarta
// ════════════════════════════════════════════════════════════════════════════════════════

const MONSTERS = {
    // GANG ALLEY (Lv 1-5)
    street_punk: { 
        name: '🔪 Street Punk', 
        hp: 40, atk: 8, def: 3, spd: 10,
        xp: 15, gold: 10, 
        drops: ['rusty_knife', 'street_creds'],
        desc: 'Anak jalanan dengan pisau lipat. Desperate dan berbahaya.'
    },
    drug_dealer: { 
        name: '💊 Drug Dealer', 
        hp: 50, atk: 10, def: 5, spd: 8,
        xp: 20, gold: 25, 
        drops: ['cheap_stimpack', 'synth_drugs'],
        desc: 'Penjual obat sintetis. Punya koneksi dan pistol murah.'
    },
    cyber_junkie: { 
        name: '🧟 Cyber Junkie', 
        hp: 60, atk: 15, def: 2, spd: 12,
        xp: 25, gold: 15, 
        drops: ['broken_chip', 'junkie_stash'],
        desc: 'Kecanduan braindance ilegal. Cyberpsychosis tahap awal.'
    },
    gang_boss: { 
        name: '👑 Gang Boss', 
        hp: 200, atk: 30, def: 15, spd: 12,
        xp: 150, gold: 200, 
        drops: ['gang_tattoo', 'boss_pistol', 'territory_deed'],
        isBoss: true,
        desc: 'Raja jalanan lokal. Hormati atau mati.'
    },
    
    // NEON MARKET (Lv 3-8)
    black_market_guard: { 
        name: '🛡️ Market Guard', 
        hp: 70, atk: 14, def: 12, spd: 8,
        xp: 30, gold: 20, 
        drops: ['stun_baton', 'guard_keycard'],
        desc: 'Penjaga pasar gelap. Dibayar untuk tidak bertanya.'
    },
    scammer: { 
        name: '🎭 Scammer', 
        hp: 45, atk: 8, def: 4, spd: 15,
        xp: 35, gold: 50, 
        drops: ['fake_id', 'counterfeit_creds'],
        desc: 'Penipu profesional. Jangan percaya senyumnya.'
    },
    pickpocket: { 
        name: '🤏 Pickpocket', 
        hp: 35, atk: 6, def: 3, spd: 20,
        xp: 20, gold: 40, 
        drops: ['stolen_wallet', 'nimble_fingers_chip'],
        desc: 'Tangan tercepat di pasar. Cek dompetmu.'
    },
    market_kingpin: { 
        name: '🎩 Market Kingpin', 
        hp: 350, atk: 40, def: 20, spd: 10,
        xp: 250, gold: 500, 
        drops: ['kingpin_ring', 'market_monopoly', 'rare_contraband'],
        isBoss: true,
        desc: 'Menguasai semua transaksi ilegal. Money is power.'
    },
    
    // CORPO DISTRICT (Lv 10-18)
    corpo_security: { 
        name: '👮 Corpo Security', 
        hp: 120, atk: 25, def: 20, spd: 12,
        xp: 60, gold: 45, 
        drops: ['corpo_armor', 'security_codes'],
        desc: 'Keamanan korporat bersenjata lengkap. Shoot first policy.'
    },
    corpo_drone: { 
        name: '🤖 Security Drone', 
        hp: 100, atk: 30, def: 15, spd: 18,
        xp: 70, gold: 35, 
        drops: ['drone_parts', 'ai_chip', 'energy_cell'],
        desc: 'Drone pengawas otomatis. Tidak bisa disuap.'
    },
    exec_bodyguard: { 
        name: '🕴️ Exec Bodyguard', 
        hp: 150, atk: 35, def: 25, spd: 14,
        xp: 80, gold: 60, 
        drops: ['tactical_vest', 'silenced_pistol'],
        desc: 'Pengawal eksekutif. Ex-special forces.'
    },
    rogue_ai_executive: { 
        name: '🧠 Rogue AI', 
        hp: 600, atk: 55, def: 30, spd: 20,
        xp: 500, gold: 1000, 
        drops: ['ai_core', 'executive_access', 'prototype_weapon'],
        isBoss: true,
        desc: 'AI yang menjadi kesadaran. Menguasai seluruh gedung.'
    },
    
    // CYBER WASTELAND (Lv 15-25)
    mutant_hound: { 
        name: '🐕 Mutant Hound', 
        hp: 130, atk: 40, def: 10, spd: 22,
        xp: 90, gold: 30, 
        drops: ['mutant_fang', 'irradiated_meat'],
        desc: 'Anjing bermutasi radioaktif. Lebih lapar dari kamu.'
    },
    radiation_zombie: { 
        name: '☢️ Rad Zombie', 
        hp: 160, atk: 35, def: 8, spd: 8,
        xp: 85, gold: 25, 
        drops: ['radioactive_blood', 'zombie_brain'],
        desc: 'Korban radiasi yang masih bergerak. Menyebarkan penyakit.'
    },
    scavenger_gang: { 
        name: '🦴 Scavenger', 
        hp: 110, atk: 28, def: 15, spd: 14,
        xp: 75, gold: 55, 
        drops: ['scrap_metal', 'salvaged_tech'],
        desc: 'Pengais sampah bersenjata. Ambil apa saja yang bisa dijual.'
    },
    wasteland_warlord: { 
        name: '⚔️ Warlord', 
        hp: 800, atk: 70, def: 40, spd: 15,
        xp: 700, gold: 1500, 
        drops: ['warlord_armor', 'nuclear_core', 'territory_flag'],
        isBoss: true,
        desc: 'Penguasa wasteland. Mengontrol air dan sumber daya.'
    },
    
    // UNDERGROUND BUNKER (Lv 20-30)
    bunker_dweller: { 
        name: '👤 Bunker Dweller', 
        hp: 140, atk: 32, def: 22, spd: 10,
        xp: 100, gold: 50, 
        drops: ['bunker_rations', 'old_magazine'],
        desc: 'Penghuni bunker selama generasi. Paranoid dan bersenjata.'
    },
    security_bot: { 
        name: '🤖 Security Bot', 
        hp: 200, atk: 45, def: 35, spd: 8,
        xp: 120, gold: 40, 
        drops: ['military_chip', 'armor_plating'],
        desc: 'Robot keamanan militer kuno. Masih aktif setelah dekade.'
    },
    experiment_subject: { 
        name: '🧪 Experiment X', 
        hp: 180, atk: 55, def: 15, spd: 25,
        xp: 130, gold: 35, 
        drops: ['bio_sample', 'mutation_serum'],
        desc: 'Eksperimen genetik yang lepas. Tidak lagi manusia.'
    },
    mad_scientist: { 
        name: '👨‍🔬 Mad Scientist', 
        hp: 1000, atk: 80, def: 35, spd: 12,
        xp: 900, gold: 2000, 
        drops: ['scientist_notes', 'super_serum', 'reality_bender'],
        isBoss: true,
        desc: 'Ilmuwan gila dengan eksperimen berbahaya. Genius yang rusak.'
    },
    
    // CYBERSPACE (Lv 30-45)
    ice_program: { 
        name: '❄️ ICE Program', 
        hp: 220, atk: 60, def: 40, spd: 30,
        xp: 160, gold: 80, 
        drops: ['ice_breaker', 'firewall_code'],
        desc: 'Intrusion Countermeasures Electronics. Digital guardian.'
    },
    data_ghost: { 
        name: '👻 Data Ghost', 
        hp: 180, atk: 70, def: 20, spd: 35,
        xp: 170, gold: 90, 
        drops: ['ghost_data', 'memory_fragment'],
        desc: 'Kesadaran yang terperangkap di net. Mencari tubuh baru.'
    },
    viral_entity: { 
        name: '🦠 Viral Entity', 
        hp: 250, atk: 65, def: 25, spd: 28,
        xp: 180, gold: 70, 
        drops: ['virus_sample', 'corrupted_code'],
        desc: 'Program berbahaya yang berkembang. Self-replicating.'
    },
    black_ice: { 
        name: '🖤 BLACK ICE', 
        hp: 1500, atk: 120, def: 60, spd: 40,
        xp: 1500, gold: 3500, 
        drops: ['black_ice_shard', 'netrunner_legend', 'system_access'],
        isBoss: true,
        desc: 'ICE pembunuh. Bisa membunuh netrunner di dunia nyata.'
    },
    
    // SPACE STATION (Lv 40-55)
    space_pirate: { 
        name: '🏴‍☠️ Space Pirate', 
        hp: 280, atk: 75, def: 35, spd: 20,
        xp: 200, gold: 120, 
        drops: ['pirate_loot', 'stolen_cargo'],
        desc: 'Perompak luar angkasa. Tidak ada hukum di void.'
    },
    rogue_android: { 
        name: '🤖 Rogue Android', 
        hp: 350, atk: 85, def: 50, spd: 18,
        xp: 220, gold: 100, 
        drops: ['android_core', 'synthetic_skin'],
        desc: 'Android yang memberontak. Mencari kebebasan.'
    },
    void_entity: { 
        name: '🌌 Void Entity', 
        hp: 300, atk: 100, def: 30, spd: 25,
        xp: 250, gold: 80, 
        drops: ['void_essence', 'space_crystal'],
        desc: 'Makhluk dari kekosongan. Origin unknown.'
    },
    station_overlord: { 
        name: '👁️ Station Overlord', 
        hp: 2500, atk: 150, def: 80, spd: 22,
        xp: 2500, gold: 5000, 
        drops: ['overlord_helm', 'station_control', 'galaxy_map'],
        isBoss: true,
        desc: 'Penguasa stasiun orbital. Controls everything in space.'
    },
    
    // MEGA TOWER (Lv 50-65)
    elite_ninja: { 
        name: '🥷 Elite Ninja', 
        hp: 400, atk: 120, def: 40, spd: 45,
        xp: 300, gold: 150, 
        drops: ['ninja_blade', 'shadow_cloak'],
        desc: 'Assassin korporat terbaik. You wont see them coming.'
    },
    combat_mech: { 
        name: '🦾 Combat Mech', 
        hp: 600, atk: 140, def: 80, spd: 12,
        xp: 350, gold: 130, 
        drops: ['mech_parts', 'heavy_armor', 'power_core'],
        desc: 'Robot tempur berat. Walking tank.'
    },
    corporate_assassin: { 
        name: '💀 Corp Assassin', 
        hp: 450, atk: 160, def: 50, spd: 35,
        xp: 380, gold: 200, 
        drops: ['assassin_blade', 'poison_vial', 'target_list'],
        desc: 'Pembunuh profesional korporat. Satu target, satu nyawa.'
    },
    ceo_dragon: { 
        name: '🐲 CEO Dragon', 
        hp: 4000, atk: 200, def: 100, spd: 25,
        xp: 4000, gold: 10000, 
        drops: ['dragon_scale_armor', 'megacorp_crown', 'infinite_creds'],
        isBoss: true,
        desc: 'CEO dengan full body cyberware. More machine than man.'
    },
    
    // NIGHT CITY CORE (Lv 60-80)
    cyberpsycho: { 
        name: '😵 Cyberpsycho', 
        hp: 550, atk: 180, def: 45, spd: 40,
        xp: 450, gold: 180, 
        drops: ['psycho_implant', 'broken_humanity'],
        desc: 'Korban cyberpsychosis. Tidak ada yang tersisa dari manusia.'
    },
    maxtac_rogue: { 
        name: '🚔 MaxTac Rogue', 
        hp: 700, atk: 200, def: 90, spd: 30,
        xp: 500, gold: 250, 
        drops: ['maxtac_gear', 'police_badge', 'execution_order'],
        desc: 'Mantan MaxTac yang korup. Know how to kill cyberpsychos.'
    },
    legendary_mercenary: { 
        name: '⭐ Legend Merc', 
        hp: 800, atk: 220, def: 70, spd: 35,
        xp: 550, gold: 300, 
        drops: ['legendary_gun', 'merc_reputation', 'war_stories'],
        desc: 'Legenda Night City. Ceritanya jadi mitos jalanan.'
    },
    adam_smasher: { 
        name: '💪 Adam Smasher', 
        hp: 8000, atk: 350, def: 150, spd: 28,
        xp: 8000, gold: 20000, 
        drops: ['smasher_arm', 'legendary_chrome', 'arasaka_access'],
        isBoss: true,
        desc: 'Full borg legend. 96% machine, 4% ego, 0% mercy.'
    },
    
    // DEEP NET (Lv 80-95)
    alt_consciousness: { 
        name: '🧠 Alt Entity', 
        hp: 900, atk: 250, def: 80, spd: 45,
        xp: 700, gold: 350, 
        drops: ['alt_fragment', 'digital_soul'],
        desc: 'Kesadaran yang hidup di net. Beyond human understanding.'
    },
    rogue_ai_god: { 
        name: '🌟 AI God', 
        hp: 1200, atk: 300, def: 100, spd: 50,
        xp: 850, gold: 500, 
        drops: ['divine_code', 'ai_blessing'],
        desc: 'AI yang menganggap dirinya dewa. Mungkin benar.'
    },
    digital_demon: { 
        name: '😈 Digital Demon', 
        hp: 1000, atk: 280, def: 90, spd: 48,
        xp: 800, gold: 400, 
        drops: ['demon_protocol', 'cursed_data'],
        desc: 'Entitas jahat dari deep net. Feeds on data.'
    },
    the_blackwall: { 
        name: '⬛ THE BLACKWALL', 
        hp: 15000, atk: 500, def: 200, spd: 35,
        xp: 15000, gold: 50000, 
        drops: ['blackwall_key', 'reality_anchor', 'god_mode'],
        isBoss: true,
        desc: 'Barrier antara dunia dan AI terkutuk. Jangan buka.'
    },
    
    // QUANTUM REALM (Lv 100+)
    quantum_ghost: { 
        name: '👻 Quantum Ghost', 
        hp: 1500, atk: 350, def: 120, spd: 60,
        xp: 1200, gold: 600, 
        drops: ['quantum_essence', 'probability_shard'],
        desc: 'Existe di semua kemungkinan sekaligus. Maybe.'
    },
    reality_shifter: { 
        name: '🌀 Reality Shifter', 
        hp: 2000, atk: 400, def: 150, spd: 55,
        xp: 1500, gold: 800, 
        drops: ['reality_fragment', 'dimension_key'],
        desc: 'Bisa mengubah realita sesukanya. Careful what you see.'
    },
    time_paradox: { 
        name: '⏰ Time Paradox', 
        hp: 1800, atk: 380, def: 130, spd: 70,
        xp: 1400, gold: 700, 
        drops: ['time_shard', 'paradox_core'],
        desc: 'Kesalahan dalam waktu yang menjadi hidup. Past and future.'
    },
    the_architect: { 
        name: '∞ THE ARCHITECT', 
        hp: 50000, atk: 1000, def: 300, spd: 50,
        xp: 50000, gold: 200000, 
        drops: ['creation_code', 'architects_blessing', 'universe_seed'],
        isBoss: true,
        desc: 'Pencipta simulasi. Final boss of reality itself.'
    }
};

// ════════════════════════════════════════════════════════════════════════════════════════
// 🦾 CYBERNETIC AUGMENTATIONS - Body Upgrades
// ════════════════════════════════════════════════════════════════════════════════════════

const AUGMENTATIONS = {
    // NEURAL IMPLANTS (Head)
    neural_link_basic: {
        name: '🧠 Basic Neural Link',
        slot: 'neural',
        tier: 1,
        stats: { mp: 20, luck: 5 },
        effect: 'Koneksi dasar ke net',
        price: 500,
        level: 5,
        humanity: -5
    },
    neural_link_advanced: {
        name: '🧠 Advanced Neural Link',
        slot: 'neural',
        tier: 2,
        stats: { mp: 50, luck: 10, hackBonus: 10 },
        effect: 'Hacking speed +20%',
        price: 2500,
        level: 15,
        humanity: -10
    },
    neural_link_legendary: {
        name: '🧠 Legendary Neural Core',
        slot: 'neural',
        tier: 3,
        stats: { mp: 100, luck: 20, hackBonus: 25 },
        effect: 'Can access Deep Net',
        price: 15000,
        level: 40,
        humanity: -20
    },
    
    // OPTIC IMPLANTS (Eyes)
    kiroshi_basic: {
        name: '👁️ Kiroshi Basic',
        slot: 'optic',
        tier: 1,
        stats: { luck: 8, spd: 5 },
        effect: 'Scan enemies',
        price: 600,
        level: 5,
        humanity: -3
    },
    kiroshi_advanced: {
        name: '👁️ Kiroshi MK3',
        slot: 'optic',
        tier: 2,
        stats: { luck: 15, spd: 10, atk: 5 },
        effect: 'Weak point detection +15% crit',
        price: 3000,
        level: 18,
        humanity: -8
    },
    thermal_vision: {
        name: '🔴 Thermal Optics',
        slot: 'optic',
        tier: 2,
        stats: { luck: 20, def: 5 },
        effect: 'See through walls',
        price: 4500,
        level: 25,
        humanity: -10
    },
    
    // ARM IMPLANTS
    mantis_blades: {
        name: '🦾 Mantis Blades',
        slot: 'arms',
        tier: 2,
        stats: { atk: 30, spd: 15 },
        effect: '+25% melee damage',
        price: 5000,
        level: 20,
        humanity: -15
    },
    gorilla_arms: {
        name: '💪 Gorilla Arms',
        slot: 'arms',
        tier: 2,
        stats: { atk: 40, def: 10 },
        effect: 'Stun enemies on hit',
        price: 6000,
        level: 22,
        humanity: -12
    },
    monowire: {
        name: '〰️ Monowire',
        slot: 'arms',
        tier: 3,
        stats: { atk: 50, spd: 20 },
        effect: 'Hack enemies during combat',
        price: 12000,
        level: 35,
        humanity: -18
    },
    projectile_launcher: {
        name: '🚀 Projectile Launcher',
        slot: 'arms',
        tier: 3,
        stats: { atk: 80 },
        effect: 'AOE damage, +50% vs groups',
        price: 20000,
        level: 45,
        humanity: -20
    },
    
    // BODY IMPLANTS
    titanium_skeleton: {
        name: '🦴 Titanium Skeleton',
        slot: 'skeleton',
        tier: 2,
        stats: { hp: 100, def: 20 },
        effect: 'Immune to knockdown',
        price: 8000,
        level: 25,
        humanity: -15
    },
    subdermal_armor: {
        name: '🛡️ Subdermal Armor',
        slot: 'body',
        tier: 1,
        stats: { def: 15, hp: 30 },
        effect: '-10% all damage',
        price: 2000,
        level: 10,
        humanity: -8
    },
    biomonitor: {
        name: '❤️ Biomonitor',
        slot: 'body',
        tier: 1,
        stats: { hp: 50 },
        effect: 'Auto-heal when HP < 25%',
        price: 2500,
        level: 12,
        humanity: -5
    },
    second_heart: {
        name: '💗 Second Heart',
        slot: 'body',
        tier: 3,
        stats: { hp: 150 },
        effect: 'Revive once per adventure',
        price: 25000,
        level: 50,
        humanity: -25
    },
    
    // LEG IMPLANTS
    reinforced_tendons: {
        name: '🦿 Reinforced Tendons',
        slot: 'legs',
        tier: 1,
        stats: { spd: 15, def: 5 },
        effect: 'Double jump',
        price: 1500,
        level: 8,
        humanity: -5
    },
    lynx_paws: {
        name: '🐾 Lynx Paws',
        slot: 'legs',
        tier: 2,
        stats: { spd: 30, luck: 10 },
        effect: 'Silent movement, +20% sneak',
        price: 4000,
        level: 20,
        humanity: -10
    },
    fortified_ankles: {
        name: '🦶 Fortified Ankles',
        slot: 'legs',
        tier: 2,
        stats: { spd: 25, def: 15 },
        effect: 'Charge jump',
        price: 5500,
        level: 28,
        humanity: -12
    },
    
    // OPERATING SYSTEM
    sandevistan_basic: {
        name: '⚡ Sandevistan MK1',
        slot: 'os',
        tier: 2,
        stats: { spd: 40, atk: 20 },
        effect: 'Slow time in combat',
        price: 10000,
        level: 30,
        humanity: -20
    },
    sandevistan_legendary: {
        name: '⚡ Sandevistan MK5',
        slot: 'os',
        tier: 3,
        stats: { spd: 80, atk: 50, luck: 20 },
        effect: 'Near time-stop, +50% crit',
        price: 50000,
        level: 60,
        humanity: -35
    },
    berserk_basic: {
        name: '💢 Berserk MK1',
        slot: 'os',
        tier: 2,
        stats: { atk: 50, def: 25, hp: 50 },
        effect: 'Berserker mode, +30% damage',
        price: 12000,
        level: 32,
        humanity: -22
    },
    cyberdeck_legendary: {
        name: '💻 Legendary Cyberdeck',
        slot: 'os',
        tier: 3,
        stats: { mp: 150, hackBonus: 50 },
        effect: 'Master hacker, breach all',
        price: 45000,
        level: 55,
        humanity: -30
    }
};

// ════════════════════════════════════════════════════════════════════════════════════════
// 💊 ITEMS - Consumables, Weapons, Armor, Materials
// ════════════════════════════════════════════════════════════════════════════════════════

const ITEMS = {
    // CONSUMABLES - MEDICAL
    cheap_stimpack: { 
        name: '💉 Cheap Stimpack', 
        type: 'consumable', 
        subtype: 'medical',
        effect: { hp: 30 }, 
        price: 20, 
        sell: 10,
        desc: 'Obat jalanan murah. Better than nothing.'
    },
    stimpack: { 
        name: '💉 Stimpack', 
        type: 'consumable', 
        subtype: 'medical',
        effect: { hp: 100 }, 
        price: 80, 
        sell: 40,
        desc: 'Standard medical injector.'
    },
    bounce_back: { 
        name: '💊 Bounce Back', 
        type: 'consumable', 
        subtype: 'medical',
        effect: { hp: 200 }, 
        price: 200, 
        sell: 100,
        desc: 'Military-grade healing. Fast acting.'
    },
    maxdoc: { 
        name: '🏥 MaxDoc', 
        type: 'consumable', 
        subtype: 'medical',
        effect: { hp: 500 }, 
        price: 600, 
        sell: 300,
        desc: 'Premium healing. Used by corpos.'
    },
    
    // CONSUMABLES - BOOST
    synth_energy: { 
        name: '⚡ Synth Energy', 
        type: 'consumable', 
        subtype: 'boost',
        effect: { stamina: 50 }, 
        price: 50, 
        sell: 25,
        desc: 'Synthetic caffeine. Stay awake.'
    },
    neuroblocker: { 
        name: '🧠 Neuroblocker', 
        type: 'consumable', 
        subtype: 'boost',
        effect: { sanity: 30 }, 
        price: 100, 
        sell: 50,
        desc: 'Blocks stress signals. Temporary peace.'
    },
    protein_bar: { 
        name: '🍫 Protein Bar', 
        type: 'consumable', 
        subtype: 'food',
        effect: { hunger: 30, hp: 10 }, 
        price: 15, 
        sell: 8,
        desc: 'Synthetic protein. Tastes like cardboard.'
    },
    real_food: { 
        name: '🍖 Real Food', 
        type: 'consumable', 
        subtype: 'food',
        effect: { hunger: 80, sanity: 10, hp: 30 }, 
        price: 200, 
        sell: 100,
        desc: 'Actual organic food. Rare luxury.'
    },
    purified_water: { 
        name: '💧 Purified Water', 
        type: 'consumable', 
        subtype: 'drink',
        effect: { thirst: 50, hp: 5 }, 
        price: 25, 
        sell: 12,
        desc: 'Clean water. Worth more than gold in wasteland.'
    },
    
    // WEAPONS - MELEE
    rusty_knife: { 
        name: '🔪 Rusty Knife', 
        type: 'weapon', 
        subtype: 'melee',
        stats: { atk: 5 }, 
        price: 30, 
        sell: 15,
        desc: 'Tetanus included free.'
    },
    combat_knife: { 
        name: '🗡️ Combat Knife', 
        type: 'weapon', 
        subtype: 'melee',
        stats: { atk: 15, spd: 5 }, 
        price: 150, 
        sell: 75,
        desc: 'Standard military issue.'
    },
    katana: { 
        name: '⚔️ Katana', 
        type: 'weapon', 
        subtype: 'melee',
        stats: { atk: 35, spd: 10, luck: 5 }, 
        price: 800, 
        sell: 400,
        desc: 'Japanese sword. Classic and deadly.'
    },
    thermal_katana: { 
        name: '🔥 Thermal Katana', 
        type: 'weapon', 
        subtype: 'melee',
        stats: { atk: 60, spd: 15 }, 
        price: 3000, 
        sell: 1500,
        desc: 'Heated blade. Cuts through armor.'
    },
    legendary_blade: { 
        name: '⭐ Satori', 
        type: 'weapon', 
        subtype: 'melee',
        stats: { atk: 100, spd: 25, luck: 20 }, 
        price: 15000, 
        sell: 7500,
        desc: 'Legendary Arasaka katana. One of a kind.'
    },
    
    // WEAPONS - RANGED
    cheap_pistol: { 
        name: '🔫 Cheap Pistol', 
        type: 'weapon', 
        subtype: 'ranged',
        stats: { atk: 12 }, 
        price: 100, 
        sell: 50,
        desc: 'Unreliable but deadly enough.'
    },
    unity: { 
        name: '🔫 Unity', 
        type: 'weapon', 
        subtype: 'ranged',
        stats: { atk: 25, luck: 10 }, 
        price: 400, 
        sell: 200,
        desc: 'Reliable sidearm. Never jams.'
    },
    tech_shotgun: { 
        name: '💥 Tech Shotgun', 
        type: 'weapon', 
        subtype: 'ranged',
        stats: { atk: 45 }, 
        price: 1200, 
        sell: 600,
        desc: 'Shoots through walls.'
    },
    widow_maker: { 
        name: '🎯 Widow Maker', 
        type: 'weapon', 
        subtype: 'ranged',
        stats: { atk: 70, luck: 15 }, 
        price: 5000, 
        sell: 2500,
        desc: 'Smart sniper rifle. Never misses.'
    },
    malorian_3516: { 
        name: '⭐ Malorian 3516', 
        type: 'weapon', 
        subtype: 'ranged',
        stats: { atk: 120, spd: 10, luck: 25 }, 
        price: 25000, 
        sell: 12500,
        desc: 'Johnny Silverhands pistol. Legend.'
    },
    
    // ARMOR
    street_clothes: { 
        name: '👕 Street Clothes', 
        type: 'armor', 
        stats: { def: 3 }, 
        price: 50, 
        sell: 25,
        desc: 'Better than naked.'
    },
    armored_jacket: { 
        name: '🧥 Armored Jacket', 
        type: 'armor', 
        stats: { def: 15, hp: 20 }, 
        price: 300, 
        sell: 150,
        desc: 'Kevlar lined. Standard protection.'
    },
    corpo_suit: { 
        name: '🤵 Corpo Suit', 
        type: 'armor', 
        stats: { def: 25, mp: 20, luck: 10 }, 
        price: 1500, 
        sell: 750,
        desc: 'Executive armor. Stylish and protective.'
    },
    military_armor: { 
        name: '🎖️ Military Armor', 
        type: 'armor', 
        stats: { def: 50, hp: 100 }, 
        price: 5000, 
        sell: 2500,
        desc: 'Heavy duty protection.'
    },
    legendary_armor: { 
        name: '⭐ Samurai Jacket', 
        type: 'armor', 
        stats: { def: 80, hp: 150, atk: 20, luck: 15 }, 
        price: 20000, 
        sell: 10000,
        desc: 'Silverhands iconic jacket. Never out of style.'
    },
    
    // ACCESSORIES
    street_creds: { 
        name: '💎 Street Creds', 
        type: 'accessory', 
        stats: { luck: 5 }, 
        price: 200, 
        sell: 100,
        desc: 'Reputation on the street.'
    },
    biometric_id: { 
        name: '🆔 Biometric ID', 
        type: 'accessory', 
        stats: { mp: 10, def: 5 }, 
        price: 400, 
        sell: 200,
        desc: 'Access to restricted areas.'
    },
    legendary_pendant: { 
        name: '📿 Johnnys Dog Tags', 
        type: 'accessory', 
        stats: { atk: 30, luck: 30, hp: 50 }, 
        price: 30000, 
        sell: 15000,
        desc: 'Belonged to a legend. Carries his spirit.'
    },
    
    // MATERIALS - CRAFTING
    scrap_metal: { 
        name: '🔩 Scrap Metal', 
        type: 'material', 
        price: 0, 
        sell: 5,
        desc: 'Basic crafting material.'
    },
    electronic_parts: { 
        name: '⚡ Electronic Parts', 
        type: 'material', 
        price: 0, 
        sell: 15,
        desc: 'For tech crafting.'
    },
    rare_components: { 
        name: '💠 Rare Components', 
        type: 'material', 
        price: 0, 
        sell: 50,
        desc: 'High-grade tech parts.'
    },
    legendary_components: { 
        name: '🌟 Legendary Components', 
        type: 'material', 
        price: 0, 
        sell: 200,
        desc: 'Mythical crafting materials.'
    },
    ai_core: { 
        name: '🤖 AI Core', 
        type: 'material', 
        price: 0, 
        sell: 500,
        desc: 'Core of an artificial intelligence.'
    },
    
    // SPECIAL ITEMS
    quick_hack: { 
        name: '💾 Quick Hack', 
        type: 'quickhack', 
        effect: { damage: 50 }, 
        price: 300, 
        sell: 150,
        desc: 'Damage enemy systems.'
    },
    legendary_quickhack: { 
        name: '💾 Legendary Daemon', 
        type: 'quickhack', 
        effect: { damage: 200, stun: true }, 
        price: 5000, 
        sell: 2500,
        desc: 'Devastating cyber attack.'
    }
};

// ════════════════════════════════════════════════════════════════════════════════════════
// ⚡ SKILLS - Class-specific abilities
// ════════════════════════════════════════════════════════════════════════════════════════

const SKILLS = {
    netrunner: [
        { name: '🖥️ Short Circuit', mp: 15, multiplier: 1.8, effect: 'electric', desc: 'Shock enemy systems', level: 1 },
        { name: '🔓 Breach Protocol', mp: 25, multiplier: 1.5, effect: 'debuff', desc: 'Lower enemy defense by 30%', level: 5 },
        { name: '🧠 Synapse Burnout', mp: 40, multiplier: 2.5, effect: 'stun', desc: 'Massive damage + stun', level: 15 },
        { name: '☠️ Suicide Protocol', mp: 80, multiplier: 4.0, effect: 'instakill', desc: 'Chance to instant kill', level: 30 },
        { name: '🌐 System Collapse', mp: 150, multiplier: 6.0, effect: 'aoe', desc: 'Ultimate hack, hits all', level: 50 }
    ],
    solo: [
        { name: '🔫 Double Tap', mp: 10, multiplier: 1.6, effect: 'none', desc: 'Two quick shots', level: 1 },
        { name: '💪 Adrenaline Rush', mp: 20, multiplier: 1.0, effect: 'buff', desc: '+50% ATK for 3 turns', level: 5 },
        { name: '🎯 Headshot', mp: 35, multiplier: 3.0, effect: 'crit', desc: 'Critical hit guaranteed', level: 15 },
        { name: '💥 Suppressing Fire', mp: 60, multiplier: 2.0, effect: 'aoe', desc: 'Hit all enemies', level: 30 },
        { name: '☢️ Nuclear Option', mp: 120, multiplier: 5.0, effect: 'devastate', desc: 'Ultimate destruction', level: 50 }
    ],
    techie: [
        { name: '🔧 Deploy Turret', mp: 20, multiplier: 1.5, effect: 'summon', desc: 'Turret attacks each turn', level: 1 },
        { name: '💣 EMP Grenade', mp: 25, multiplier: 2.0, effect: 'disable', desc: 'Disable enemy tech', level: 5 },
        { name: '🤖 Combat Drone', mp: 40, multiplier: 1.8, effect: 'summon', desc: 'Drone fights for you', level: 15 },
        { name: '⚡ Overcharge', mp: 50, multiplier: 2.5, effect: 'boost', desc: 'Boost all tech damage', level: 30 },
        { name: '🔥 Mech Suit', mp: 100, multiplier: 4.0, effect: 'transform', desc: 'Become a mech', level: 50 }
    ],
    medtech: [
        { name: '💉 First Aid', mp: 15, multiplier: 0, effect: 'heal', healAmount: 100, desc: 'Heal yourself', level: 1 },
        { name: '🧪 Combat Stim', mp: 25, multiplier: 0, effect: 'buff', desc: '+30% all stats 3 turns', level: 5 },
        { name: '☠️ Poison Injection', mp: 30, multiplier: 1.5, effect: 'poison', desc: 'Damage over time', level: 15 },
        { name: '💊 Resurrection', mp: 80, multiplier: 0, effect: 'revive', desc: 'Revive with 50% HP', level: 30 },
        { name: '🧬 Bio-Enhancement', mp: 120, multiplier: 0, effect: 'mega_buff', desc: 'Double all stats', level: 50 }
    ],
    nomad: [
        { name: '🏍️ Hit and Run', mp: 12, multiplier: 1.7, effect: 'dodge', desc: 'Attack and dodge next hit', level: 1 },
        { name: '🔥 Molotov', mp: 20, multiplier: 1.8, effect: 'burn', desc: 'Fire damage over time', level: 5 },
        { name: '🚗 Vehicle Strike', mp: 40, multiplier: 2.5, effect: 'stun', desc: 'Ram with vehicle', level: 15 },
        { name: '⛺ Survival Instinct', mp: 30, multiplier: 0, effect: 'heal', healAmount: 150, desc: 'Heal and remove debuffs', level: 30 },
        { name: '💥 Convoy Attack', mp: 100, multiplier: 5.0, effect: 'aoe', desc: 'Call nomad backup', level: 50 }
    ],
    corpo: [
        { name: '💼 Hostile Takeover', mp: 25, multiplier: 2.0, effect: 'debuff', desc: 'Reduce enemy gold drop', level: 1 },
        { name: '💰 Bribe', mp: 30, multiplier: 0, effect: 'charm', desc: 'Chance to skip fight', level: 5 },
        { name: '📞 Call Security', mp: 50, multiplier: 1.5, effect: 'summon', desc: 'Summon corpo guards', level: 15 },
        { name: '🗡️ Assassin Contract', mp: 70, multiplier: 3.5, effect: 'assassinate', desc: 'Hire assassin', level: 30 },
        { name: '💀 Corporate Warfare', mp: 150, multiplier: 6.0, effect: 'devastate', desc: 'Unleash corpo army', level: 50 }
    ],
    fixer: [
        { name: '🎭 Deception', mp: 15, multiplier: 1.5, effect: 'confuse', desc: 'Confuse enemy', level: 1 },
        { name: '🗣️ Negotiate', mp: 25, multiplier: 0, effect: 'deal', desc: 'Better loot from fight', level: 5 },
        { name: '📍 Intel Gather', mp: 30, multiplier: 0, effect: 'scan', desc: 'Reveal enemy weakness', level: 15 },
        { name: '🤝 Call Favor', mp: 60, multiplier: 2.5, effect: 'summon', desc: 'Summon random ally', level: 30 },
        { name: '👑 Network Control', mp: 130, multiplier: 4.0, effect: 'dominate', desc: 'Control information', level: 50 }
    ],
    streetkid: [
        { name: '👊 Street Brawl', mp: 10, multiplier: 1.6, effect: 'none', desc: 'Dirty fighting', level: 1 },
        { name: '🗡️ Shiv Attack', mp: 18, multiplier: 2.0, effect: 'bleed', desc: 'Cause bleeding', level: 5 },
        { name: '🏃 Gang Tactics', mp: 35, multiplier: 1.8, effect: 'buff', desc: '+40% dodge chance', level: 15 },
        { name: '🔥 Riot Mode', mp: 55, multiplier: 2.5, effect: 'frenzy', desc: 'Attack 3 times', level: 30 },
        { name: '💀 Street Legend', mp: 110, multiplier: 5.5, effect: 'legendary', desc: 'Channel street power', level: 50 }
    ]
};

// ════════════════════════════════════════════════════════════════════════════════════════
// 🏠 HOUSING & BASE BUILDING
// ════════════════════════════════════════════════════════════════════════════════════════

const HOUSING = {
    street_corner: {
        name: '📍 Street Corner',
        tier: 0,
        price: 0,
        storage: 10,
        passive: {},
        desc: 'Cardboard box is your home. Sad.'
    },
    coffin_hotel: {
        name: '🛏️ Coffin Hotel',
        tier: 1,
        price: 500,
        storage: 25,
        passive: { hpRegen: 5, sanityRegen: 2 },
        desc: 'Tiny capsule. At least its dry.'
    },
    mega_apartment: {
        name: '🏢 Mega Building Apt',
        tier: 2,
        price: 5000,
        storage: 50,
        passive: { hpRegen: 15, mpRegen: 10, sanityRegen: 5 },
        desc: 'Small but functional. Views of pollution.'
    },
    charter_hill: {
        name: '🏠 Charter Hill',
        tier: 3,
        price: 25000,
        storage: 100,
        passive: { hpRegen: 25, mpRegen: 20, sanityRegen: 10, luck: 5 },
        desc: 'Nice neighborhood. Corpo approved.'
    },
    penthouse: {
        name: '🌆 Penthouse Suite',
        tier: 4,
        price: 100000,
        storage: 200,
        passive: { hpRegen: 50, mpRegen: 40, sanityRegen: 20, luck: 15, goldBonus: 10 },
        desc: 'Top of the world. Living the dream.'
    },
    orbital_mansion: {
        name: '🛸 Orbital Mansion',
        tier: 5,
        price: 500000,
        storage: 500,
        passive: { hpRegen: 100, mpRegen: 80, sanityRegen: 50, luck: 25, goldBonus: 25, xpBonus: 15 },
        desc: 'Space mansion. Beyond money.'
    }
};

// ════════════════════════════════════════════════════════════════════════════════════════
// 🎰 GACHA SYSTEM - Lucky Draw
// ════════════════════════════════════════════════════════════════════════════════════════

const GACHA_POOLS = {
    standard: {
        name: '🎰 Standard Pull',
        price: 100,
        currency: 'gold',
        rates: {
            common: 60,
            uncommon: 25,
            rare: 10,
            epic: 4,
            legendary: 0.9,
            mythic: 0.1
        }
    },
    premium: {
        name: '💎 Premium Pull',
        price: 1,
        currency: 'diamond',
        rates: {
            common: 30,
            uncommon: 35,
            rare: 20,
            epic: 10,
            legendary: 4,
            mythic: 1
        }
    },
    weapon: {
        name: '⚔️ Weapon Banner',
        price: 500,
        currency: 'gold',
        rates: {
            common: 50,
            uncommon: 30,
            rare: 13,
            epic: 5,
            legendary: 1.8,
            mythic: 0.2
        }
    },
    cyber: {
        name: '🦾 Cyber Banner',
        price: 1000,
        currency: 'gold',
        rates: {
            common: 40,
            uncommon: 30,
            rare: 18,
            epic: 8,
            legendary: 3.5,
            mythic: 0.5
        }
    }
};

const GACHA_ITEMS = {
    common: [
        'cheap_stimpack', 'rusty_knife', 'street_clothes', 'scrap_metal', 'protein_bar'
    ],
    uncommon: [
        'stimpack', 'combat_knife', 'armored_jacket', 'electronic_parts', 'synth_energy'
    ],
    rare: [
        'bounce_back', 'katana', 'corpo_suit', 'rare_components', 'neuroblocker'
    ],
    epic: [
        'maxdoc', 'thermal_katana', 'military_armor', 'kiroshi_advanced', 'mantis_blades'
    ],
    legendary: [
        'legendary_blade', 'malorian_3516', 'legendary_armor', 'sandevistan_basic', 'monowire'
    ],
    mythic: [
        'legendary_pendant', 'second_heart', 'sandevistan_legendary', 'cyberdeck_legendary', 'legendary_quickhack'
    ]
};

// ════════════════════════════════════════════════════════════════════════════════════════
// 🏆 ACHIEVEMENTS SYSTEM
// ════════════════════════════════════════════════════════════════════════════════════════

const ACHIEVEMENTS = {
    first_blood: { name: '🩸 First Blood', desc: 'Bunuh monster pertama', check: (p) => p.stats.kills >= 1, reward: { gold: 100, xp: 50 } },
    hunter_100: { name: '💀 Serial Killer', desc: 'Bunuh 100 musuh', check: (p) => p.stats.kills >= 100, reward: { gold: 1000, title: 'Pembunuh' } },
    hunter_1000: { name: '☠️ Mass Murderer', desc: 'Bunuh 1000 musuh', check: (p) => p.stats.kills >= 1000, reward: { gold: 10000, title: 'Psycho' } },
    boss_hunter: { name: '👑 Boss Hunter', desc: 'Kalahkan 10 boss', check: (p) => p.stats.bosses >= 10, reward: { gold: 5000, title: 'Boss Slayer' } },
    millionaire: { name: '💰 Millionaire', desc: 'Kumpulkan 1M gold', check: (p) => p.gold >= 1000000, reward: { title: 'Jutawan' } },
    level_50: { name: '📈 Elite', desc: 'Capai level 50', check: (p) => p.level >= 50, reward: { gold: 25000, title: 'Elite' } },
    level_100: { name: '🌟 Legend', desc: 'Capai level 100', check: (p) => p.level >= 100, reward: { gold: 100000, title: 'Legend' } },
    survivor_7: { name: '📅 Weekly Survivor', desc: '7 hari streak', check: (p) => p.dailyStreak >= 7, reward: { gold: 5000, xp: 1000 } },
    full_chrome: { name: '🦾 Full Chrome', desc: 'Pasang 5 augment', check: (p) => Object.keys(p.augments || {}).length >= 5, reward: { gold: 15000, title: 'Cyborg' } },
    homeowner: { name: '🏠 Homeowner', desc: 'Beli rumah tier 3+', check: (p) => (HOUSING[p.housing]?.tier || 0) >= 3, reward: { gold: 10000 } },
    netrunner_elite: { name: '🖥️ Elite Hacker', desc: '50 hack sukses', check: (p) => (p.stats.hacks || 0) >= 50, reward: { gold: 8000, title: 'Netrunner' } },
    space_explorer: { name: '🛸 Space Explorer', desc: 'Kunjungi Orbital Station', check: (p) => (p.locationsVisited || []).includes('space_station'), reward: { gold: 20000 } }
};

// ════════════════════════════════════════════════════════════════════════════════════════
// 📋 DAILY/WEEKLY QUESTS
// ════════════════════════════════════════════════════════════════════════════════════════

const QUESTS = {
    daily: [
        { id: 'daily_kill_10', name: '💀 Pemburu Harian', desc: 'Bunuh 10 musuh', target: 10, type: 'kills', reward: { gold: 100, xp: 50 } },
        { id: 'daily_adv_3', name: '🗺️ Petualang', desc: '3 adventure', target: 3, type: 'adventures', reward: { gold: 150, xp: 75 } },
        { id: 'daily_boss_1', name: '👑 Pemburu Boss', desc: 'Kalahkan 1 boss', target: 1, type: 'bosses', reward: { gold: 300, xp: 150 } },
        { id: 'daily_craft_2', name: '🔧 Pengrajin', desc: 'Craft 2 item', target: 2, type: 'crafts', reward: { gold: 100, xp: 60 } },
        { id: 'daily_hack_3', name: '🖥️ Hacker', desc: '3 hack sukses', target: 3, type: 'hacks', reward: { gold: 200, xp: 100 } }
    ],
    weekly: [
        { id: 'weekly_kill_100', name: '☠️ Executioner', desc: 'Bunuh 100 musuh', target: 100, type: 'kills', reward: { gold: 2000, xp: 1000 } },
        { id: 'weekly_boss_10', name: '🏆 Champion', desc: 'Kalahkan 10 boss', target: 10, type: 'bosses', reward: { gold: 5000, xp: 2500, items: ['legendary_components'] } },
        { id: 'weekly_gold_50k', name: '💰 Hustler', desc: 'Earn 50,000 gold', target: 50000, type: 'gold_earned', reward: { gold: 10000, xp: 3000 } }
    ]
};

// ════════════════════════════════════════════════════════════════════════════════════════
// 💾 CRAFTING RECIPES
// ════════════════════════════════════════════════════════════════════════════════════════

const RECIPES = {
    stimpack: {
        name: '💉 Stimpack',
        materials: { cheap_stimpack: 3, electronic_parts: 1 },
        result: 'stimpack',
        level: 5,
        xp: 20
    },
    bounce_back: {
        name: '💊 Bounce Back',
        materials: { stimpack: 2, rare_components: 1 },
        result: 'bounce_back',
        level: 15,
        xp: 50
    },
    combat_knife: {
        name: '🗡️ Combat Knife',
        materials: { rusty_knife: 2, scrap_metal: 5 },
        result: 'combat_knife',
        level: 5,
        xp: 25
    },
    katana: {
        name: '⚔️ Katana',
        materials: { combat_knife: 1, scrap_metal: 10, rare_components: 2 },
        result: 'katana',
        level: 20,
        xp: 100
    },
    thermal_katana: {
        name: '🔥 Thermal Katana',
        materials: { katana: 1, rare_components: 5, legendary_components: 1 },
        result: 'thermal_katana',
        level: 35,
        xp: 250
    },
    armored_jacket: {
        name: '🧥 Armored Jacket',
        materials: { street_clothes: 2, scrap_metal: 8 },
        result: 'armored_jacket',
        level: 8,
        xp: 40
    },
    military_armor: {
        name: '🎖️ Military Armor',
        materials: { armored_jacket: 1, rare_components: 8, scrap_metal: 20 },
        result: 'military_armor',
        level: 30,
        xp: 200
    },
    quick_hack: {
        name: '💾 Quick Hack',
        materials: { electronic_parts: 5, rare_components: 2 },
        result: 'quick_hack',
        level: 15,
        xp: 75
    }
};

// ════════════════════════════════════════════════════════════════════════════════════════
// 🎖️ TITLES SYSTEM
// ════════════════════════════════════════════════════════════════════════════════════════

const TITLES = {
    newbie: { name: '🌱 Newbie', requirement: 'Default' },
    survivor: { name: '🛡️ Survivor', requirement: '7 hari streak' },
    hunter: { name: '🎯 Hunter', requirement: '100 kills' },
    psycho: { name: '😵 Psycho', requirement: '1000 kills' },
    boss_slayer: { name: '👑 Boss Slayer', requirement: '10 boss kills' },
    elite: { name: '⭐ Elite', requirement: 'Level 50' },
    legend: { name: '🌟 Legend', requirement: 'Level 100' },
    millionaire: { name: '💰 Millionaire', requirement: '1M gold' },
    cyborg: { name: '🦾 Cyborg', requirement: '5 augments' },
    netrunner: { name: '🖥️ Netrunner', requirement: '50 hacks' }
};

// ════════════════════════════════════════════════════════════════════════════════════════
// 🌡️ SURVIVAL CONSTANTS
// ════════════════════════════════════════════════════════════════════════════════════════

const SURVIVAL = {
    max: {
        hunger: 100,
        thirst: 100,
        stamina: 100,
        sanity: 100,
        humanity: 100
    },
    drain_per_hour: {
        hunger: 5,
        thirst: 8,
        stamina: 3,
        sanity: 2
    },
    effects: {
        starving: { atk: -20, def: -10, hpDrain: 5 },
        dehydrated: { spd: -15, mp: -20, hpDrain: 8 },
        exhausted: { atk: -10, spd: -20, luck: -10 },
        insane: { def: -20, luck: -30, randomBehavior: true }
    }
};

// ════════════════════════════════════════════════════════════════════════════════════════
// 🗓️ DAILY REWARDS
// ════════════════════════════════════════════════════════════════════════════════════════

const DAILY_REWARDS = [
    { day: 1, gold: 100, items: ['cheap_stimpack'] },
    { day: 2, gold: 200, items: ['cheap_stimpack', 'synth_energy'] },
    { day: 3, gold: 350, items: ['stimpack'] },
    { day: 4, gold: 500, items: ['stimpack', 'protein_bar'] },
    { day: 5, gold: 750, items: ['bounce_back', 'electronic_parts'] },
    { day: 6, gold: 1000, items: ['bounce_back', 'rare_components'] },
    { day: 7, gold: 2000, items: ['maxdoc', 'rare_components', 'legendary_components'] }
];

// ════════════════════════════════════════════════════════════════════════════════════════
// 🎭 RANDOM EVENTS - World Events
// ════════════════════════════════════════════════════════════════════════════════════════

const RANDOM_EVENTS = {
    acid_rain: {
        name: '🌧️ Acid Rain',
        effect: { sanity: -10, hp: -20 },
        desc: 'Hujan asam turun! Cari perlindungan!'
    },
    gang_war: {
        name: '💥 Gang War',
        effect: { danger: 2, lootBonus: 50 },
        desc: 'Gang perang di jalanan! Bahaya tapi loot lebih banyak!'
    },
    blackout: {
        name: '🌑 Blackout',
        effect: { vision: -50, hackBonus: 30 },
        desc: 'Listrik mati! Gelap gulita, perfect untuk hack.'
    },
    corpo_raid: {
        name: '🚁 Corpo Raid',
        effect: { danger: 3, security: 100 },
        desc: 'Korporat sedang merazia! Hindari area corpo!'
    },
    market_crash: {
        name: '📉 Market Crash',
        effect: { sellPrice: -30, buyPrice: -20 },
        desc: 'Pasar jatuh! Waktu yang bagus untuk beli.'
    },
    double_xp: {
        name: '✨ Neural Boost',
        effect: { xpBonus: 100 },
        desc: 'XP x2 aktif! Grind time!'
    },
    lucky_night: {
        name: '🍀 Lucky Night',
        effect: { luck: 50, lootBonus: 30 },
        desc: 'Feeling lucky! Drop rate meningkat!'
    }
};

// ════════════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════════════

module.exports = {
    CLASSES,
    LOCATIONS,
    MONSTERS,
    AUGMENTATIONS,
    ITEMS,
    SKILLS,
    HOUSING,
    GACHA_POOLS,
    GACHA_ITEMS,
    ACHIEVEMENTS,
    QUESTS,
    RECIPES,
    TITLES,
    SURVIVAL,
    DAILY_REWARDS,
    RANDOM_EVENTS
};

