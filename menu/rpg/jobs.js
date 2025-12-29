/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  🏭 SCHNUFFELLL RPG - JOBS & AFK SYSTEM v7.0
 *  Theme: Neo-Jakarta 2077 - Career & Lifestyle System
 *  Developer: @schnuffelll
 *  
 *  Features:
 *  - 50+ Different Jobs/Careers
 *  - AFK System with Reasons
 *  - Passive Income
 *  - Job Progression
 *  - Side Hustles
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

// ════════════════════════════════════════════════════════════════════════════════════════
// 💼 JOBS & CAREERS - Employment System
// ════════════════════════════════════════════════════════════════════════════════════════

const JOBS = {
    // === ENTRY LEVEL JOBS (No Requirements) ===
    street_vendor: {
        name: '🌭 Street Vendor',
        category: 'entry',
        minLevel: 1,
        requirements: {},
        salary: { min: 50, max: 100 },
        workTime: 4, // hours
        xpGain: 10,
        skills: ['dealing', 'survival'],
        risks: ['robbery', 'police'],
        desc: 'Jualan makanan jalanan. Penghasilan kecil tapi stabil.',
        promotion: 'food_stall_owner'
    },
    delivery_runner: {
        name: '📦 Delivery Runner',
        category: 'entry',
        minLevel: 1,
        requirements: {},
        salary: { min: 40, max: 80 },
        workTime: 3,
        xpGain: 15,
        skills: ['speed', 'navigation'],
        risks: ['accident', 'theft'],
        desc: 'Kurir paket dan makanan. Cepat dan lincah.',
        promotion: 'courier_lead'
    },
    scrap_collector: {
        name: '🔩 Scrap Collector',
        category: 'entry',
        minLevel: 1,
        requirements: {},
        salary: { min: 30, max: 120 },
        workTime: 5,
        xpGain: 12,
        skills: ['scavenging', 'tech'],
        risks: ['radiation', 'mutants'],
        desc: 'Mengumpulkan barang rongsokan. Kadang dapat barang langka.',
        promotion: 'scrap_dealer'
    },
    club_bouncer: {
        name: '🚪 Club Bouncer',
        category: 'entry',
        minLevel: 3,
        requirements: { hp: 100 },
        salary: { min: 80, max: 150 },
        workTime: 6,
        xpGain: 20,
        skills: ['combat', 'intimidation'],
        risks: ['fights', 'gang_trouble'],
        desc: 'Jaga pintu klub malam. Butuh fisik kuat.',
        promotion: 'security_lead'
    },
    data_miner: {
        name: '💾 Data Miner',
        category: 'entry',
        minLevel: 3,
        requirements: { mp: 50 },
        salary: { min: 60, max: 140 },
        workTime: 4,
        xpGain: 25,
        skills: ['hacking', 'analysis'],
        risks: ['ice_attack', 'trace'],
        desc: 'Mining data dari net untuk dijual.',
        promotion: 'data_broker'
    },

    // === SKILLED JOBS (Require Some Stats/Level) ===
    mechanic: {
        name: '🔧 Mechanic',
        category: 'skilled',
        minLevel: 10,
        requirements: { craftBonus: 10 },
        salary: { min: 150, max: 300 },
        workTime: 6,
        xpGain: 40,
        skills: ['crafting', 'vehicles'],
        risks: ['injury', 'explosion'],
        desc: 'Perbaiki kendaraan dan mesin. Skill teknis.',
        promotion: 'garage_owner'
    },
    street_doc: {
        name: '💊 Street Doc',
        category: 'skilled',
        minLevel: 12,
        requirements: { healBonus: 15 },
        salary: { min: 200, max: 400 },
        workTime: 5,
        xpGain: 50,
        skills: ['medical', 'cyberware'],
        risks: ['patient_death', 'mafia'],
        desc: 'Dokter jalanan. Pasang cyberware ilegal.',
        promotion: 'clinic_owner'
    },
    netrunner_freelance: {
        name: '🖥️ Freelance Netrunner',
        category: 'skilled',
        minLevel: 15,
        requirements: { hackBonus: 20 },
        salary: { min: 300, max: 600 },
        workTime: 4,
        xpGain: 60,
        skills: ['hacking', 'stealth'],
        risks: ['black_ice', 'corp_trace'],
        desc: 'Hacker bayaran. High risk, high reward.',
        promotion: 'elite_netrunner'
    },
    bodyguard: {
        name: '🛡️ Bodyguard',
        category: 'skilled',
        minLevel: 15,
        requirements: { combatBonus: 15, def: 20 },
        salary: { min: 250, max: 500 },
        workTime: 8,
        xpGain: 55,
        skills: ['combat', 'awareness'],
        risks: ['assassination', 'ambush'],
        desc: 'Lindungi VIP dari bahaya.',
        promotion: 'security_chief'
    },
    smuggler: {
        name: '📦 Smuggler',
        category: 'skilled',
        minLevel: 12,
        requirements: { luck: 15 },
        salary: { min: 200, max: 800 },
        workTime: 6,
        xpGain: 45,
        skills: ['stealth', 'dealing'],
        risks: ['arrest', 'robbery'],
        desc: 'Selundupkan barang ilegal. Very risky.',
        promotion: 'smuggle_kingpin'
    },
    bounty_hunter: {
        name: '🎯 Bounty Hunter',
        category: 'skilled',
        minLevel: 18,
        requirements: { atk: 30, spd: 20 },
        salary: { min: 400, max: 1000 },
        workTime: 8,
        xpGain: 70,
        skills: ['tracking', 'combat'],
        risks: ['target_revenge', 'gang_war'],
        desc: 'Buru target dengan bounty. Dead or alive.',
        promotion: 'legendary_hunter'
    },

    // === PROFESSIONAL JOBS (High Requirements) ===
    corpo_contractor: {
        name: '💼 Corpo Contractor',
        category: 'professional',
        minLevel: 25,
        requirements: { businessBonus: 20 },
        salary: { min: 600, max: 1200 },
        workTime: 8,
        xpGain: 80,
        skills: ['negotiation', 'connections'],
        risks: ['backstab', 'politics'],
        desc: 'Kerja untuk korporat. Clean money, dirty work.',
        promotion: 'corpo_executive'
    },
    club_owner: {
        name: '🎵 Club Owner',
        category: 'professional',
        minLevel: 30,
        requirements: { gold: 50000, streetBonus: 25 },
        salary: { min: 800, max: 2000 },
        workTime: 10,
        xpGain: 90,
        skills: ['management', 'dealing'],
        risks: ['raid', 'competition'],
        desc: 'Punya klub malam sendiri. Passive income.',
        promotion: 'entertainment_mogul'
    },
    arms_dealer: {
        name: '🔫 Arms Dealer',
        category: 'professional',
        minLevel: 28,
        requirements: { dealBonus: 25 },
        salary: { min: 700, max: 1800 },
        workTime: 6,
        xpGain: 85,
        skills: ['dealing', 'combat'],
        risks: ['maxtac', 'gang_war'],
        desc: 'Jual senjata ilegal. Big money.',
        promotion: 'arms_kingpin'
    },
    fixer_operator: {
        name: '🎭 Fixer',
        category: 'professional',
        minLevel: 32,
        requirements: { dealBonus: 30, luck: 25 },
        salary: { min: 1000, max: 3000 },
        workTime: 8,
        xpGain: 100,
        skills: ['connections', 'info'],
        risks: ['betrayal', 'assassination'],
        desc: 'Broker jobs dan informasi. Know everyone.',
        promotion: 'legendary_fixer'
    },

    // === ELITE JOBS (Very High Requirements) ===
    solo_mercenary: {
        name: '⚔️ Solo Mercenary',
        category: 'elite',
        minLevel: 40,
        requirements: { combatBonus: 40, atk: 50 },
        salary: { min: 2000, max: 5000 },
        workTime: 12,
        xpGain: 150,
        skills: ['combat', 'tactics'],
        risks: ['death', 'enemy_corps'],
        desc: 'Tentara bayaran elite. Kill for creds.',
        promotion: 'legendary_solo'
    },
    black_ops: {
        name: '🥷 Black Ops',
        category: 'elite',
        minLevel: 45,
        requirements: { atk: 60, spd: 40, luck: 30 },
        salary: { min: 3000, max: 8000 },
        workTime: 24,
        xpGain: 200,
        skills: ['stealth', 'assassination'],
        risks: ['death', 'torture'],
        desc: 'Operasi rahasia untuk corp/government.',
        promotion: 'shadow_legend'
    },
    crime_boss: {
        name: '👑 Crime Boss',
        category: 'elite',
        minLevel: 50,
        requirements: { gold: 200000, streetBonus: 50 },
        salary: { min: 5000, max: 15000 },
        workTime: 16,
        xpGain: 250,
        skills: ['leadership', 'dealing'],
        risks: ['war', 'betrayal'],
        desc: 'Kuasai dunia kriminal. Be the king.',
        promotion: null
    },
    tech_mogul: {
        name: '🏭 Tech Mogul',
        category: 'elite',
        minLevel: 55,
        requirements: { craftBonus: 50, gold: 300000 },
        salary: { min: 8000, max: 20000 },
        workTime: 12,
        xpGain: 280,
        skills: ['crafting', 'business'],
        risks: ['corporate_war', 'sabotage'],
        desc: 'Pemilik pabrik cyberware. Tech empire.',
        promotion: null
    }
};

// ════════════════════════════════════════════════════════════════════════════════════════
// 💤 AFK SYSTEM - Away From Keyboard Activities
// ════════════════════════════════════════════════════════════════════════════════════════

const AFK_ACTIVITIES = {
    // === REST & RECOVERY ===
    sleeping: {
        name: '😴 Tidur',
        emoji: '😴',
        category: 'rest',
        duration: { min: 4, max: 12 }, // hours
        effects: {
            hp: { regen: 10 }, // per hour
            mp: { regen: 5 },
            stamina: { regen: 15 },
            sanity: { regen: 8 }
        },
        goldCost: 0,
        reasons: [
            'Capek banget, butuh istirahat...',
            'Mata udah 5 watt nih',
            'Recharge dulu biar fresh',
            'Mimpi indah dulu...'
        ]
    },
    meditation: {
        name: '🧘 Meditasi',
        emoji: '🧘',
        category: 'rest',
        duration: { min: 1, max: 6 },
        effects: {
            mp: { regen: 15 },
            sanity: { regen: 20 }
        },
        goldCost: 0,
        reasons: [
            'Clear my mind dulu...',
            'Zen mode activated',
            'Inner peace loading...'
        ]
    },

    // === PASSIVE INCOME ===
    working: {
        name: '💼 Kerja',
        emoji: '💼',
        category: 'income',
        duration: { min: 2, max: 8 },
        effects: {
            gold: { gain: 'job_salary' },
            xp: { gain: 'job_xp' },
            stamina: { drain: 5 }
        },
        goldCost: 0,
        requiresJob: true,
        reasons: [
            'Gotta make that money...',
            'Bills wont pay themselves',
            'Hustle time',
            'Another day, another creds'
        ]
    },
    mining_crypto: {
        name: '⛏️ Mining Crypto',
        emoji: '⛏️',
        category: 'income',
        duration: { min: 1, max: 24 },
        effects: {
            gold: { gain: { min: 10, max: 100 } }, // per hour
            mp: { drain: 2 }
        },
        goldCost: 50, // electricity cost per hour
        requirements: { hackBonus: 10 },
        reasons: [
            'Let the rig do the work',
            'Passive income baby',
            'Mining night shift'
        ]
    },
    renting_property: {
        name: '🏠 Sewa Properti',
        emoji: '🏠',
        category: 'income',
        duration: { min: 24, max: 168 }, // 1-7 days
        effects: {
            gold: { gain: 'property_rental' }
        },
        goldCost: 0,
        requiresHousing: true,
        reasons: [
            'Tenants paying rent',
            'Property investment paying off',
            'Real estate hustle'
        ]
    },

    // === TRAINING ===
    gym_training: {
        name: '🏋️ Latihan Gym',
        emoji: '🏋️',
        category: 'training',
        duration: { min: 1, max: 4 },
        effects: {
            xp: { gain: 20 },
            hp: { permanent: 1 },
            atk: { chance: 0.1 }
        },
        goldCost: 100, // per session
        stamina_cost: 20,
        reasons: [
            'No pain no gain',
            'Getting swole',
            'Pump iron time'
        ]
    },
    shooting_range: {
        name: '🎯 Latihan Tembak',
        emoji: '🎯',
        category: 'training',
        duration: { min: 1, max: 3 },
        effects: {
            xp: { gain: 25 },
            atk: { chance: 0.15 }
        },
        goldCost: 200,
        stamina_cost: 15,
        reasons: [
            'Sharpening my aim',
            'Bang bang practice',
            'Headshot training'
        ]
    },
    hacking_practice: {
        name: '💻 Latihan Hacking',
        emoji: '💻',
        category: 'training',
        duration: { min: 2, max: 6 },
        effects: {
            xp: { gain: 30 },
            hackBonus: { chance: 0.1 }
        },
        goldCost: 50,
        mp_cost: 30,
        reasons: [
            'Breaching firewalls',
            'Learning new exploits',
            'Git gud at hacking'
        ]
    },

    // === ENTERTAINMENT ===
    braindance: {
        name: '🎬 Braindance',
        emoji: '🎬',
        category: 'entertainment',
        duration: { min: 1, max: 4 },
        effects: {
            sanity: { regen: 25 },
            happiness: { gain: 30 }
        },
        goldCost: 150,
        reasons: [
            'Living someone elses life',
            'BD session time',
            'Escaping reality for a bit'
        ]
    },
    clubbing: {
        name: '🎉 Clubbing',
        emoji: '🎉',
        category: 'entertainment',
        duration: { min: 3, max: 8 },
        effects: {
            sanity: { regen: 15 },
            happiness: { gain: 40 },
            gold: { drain: { min: 100, max: 500 } }
        },
        goldCost: 200, // entry fee
        reasons: [
            'Party time!',
            'Dance the night away',
            'Vibing at the club'
        ]
    },
    gambling: {
        name: '🎰 Gambling',
        emoji: '🎰',
        category: 'entertainment',
        duration: { min: 1, max: 6 },
        effects: {
            gold: { gamble: { risk: 0.5, multiplier: 3 } },
            sanity: { change: { min: -20, max: 30 } }
        },
        goldCost: 500, // minimum bet
        reasons: [
            'Feeling lucky tonight',
            'High stakes, high rewards',
            'All in baby'
        ]
    },

    // === SOCIAL ===
    dating: {
        name: '❤️ Dating',
        emoji: '❤️',
        category: 'social',
        duration: { min: 2, max: 6 },
        effects: {
            sanity: { regen: 30 },
            happiness: { gain: 50 },
            gold: { drain: { min: 200, max: 1000 } }
        },
        goldCost: 300,
        reasons: [
            'Got a date tonight',
            'Romance in the air',
            'Special someone waiting'
        ]
    },
    gang_meeting: {
        name: '🤝 Gang Meeting',
        emoji: '🤝',
        category: 'social',
        duration: { min: 2, max: 4 },
        effects: {
            reputation: { gain: 'gang', amount: 10 },
            xp: { gain: 15 }
        },
        goldCost: 0,
        requiresGang: true,
        reasons: [
            'Family meeting',
            'Gang business',
            'Crew needs me'
        ]
    },
    networking: {
        name: '🤵 Networking',
        emoji: '🤵',
        category: 'social',
        duration: { min: 3, max: 6 },
        effects: {
            reputation: { gain: 'corpo', amount: 15 },
            connections: { chance: 0.3 }
        },
        goldCost: 500,
        reasons: [
            'Building connections',
            'Corpo event',
            'Making friends in high places'
        ]
    },

    // === EXPLORATION ===
    scavenging: {
        name: '🔍 Scavenging',
        emoji: '🔍',
        category: 'exploration',
        duration: { min: 2, max: 8 },
        effects: {
            items: { chance: 0.7, pool: 'scavenge_loot' },
            gold: { gain: { min: 20, max: 200 } }
        },
        goldCost: 0,
        stamina_cost: 30,
        reasons: [
            'Treasure hunting',
            'One mans trash...',
            'Looking for valuables'
        ]
    },
    exploring: {
        name: '🗺️ Exploring',
        emoji: '🗺️',
        category: 'exploration',
        duration: { min: 4, max: 12 },
        effects: {
            xp: { gain: 40 },
            items: { chance: 0.4, pool: 'exploration_loot' },
            locations: { discover: 0.1 }
        },
        goldCost: 100, // supplies
        stamina_cost: 40,
        reasons: [
            'Adventure awaits',
            'Discovering new areas',
            'Mapping the unknown'
        ]
    }
};

// ════════════════════════════════════════════════════════════════════════════════════════
// 🎭 SIDE HUSTLES - Quick Money Activities
// ════════════════════════════════════════════════════════════════════════════════════════

const SIDE_HUSTLES = {
    street_race: {
        name: '🏎️ Street Racing',
        minLevel: 10,
        cost: 500,
        duration: 1, // hour
        success: { chance: 0.6, reward: { gold: 2000, xp: 50 } },
        failure: { consequence: 'vehicle_damage', fine: 1000 },
        desc: 'Balap liar di jalanan Night City.'
    },
    fight_club: {
        name: '🥊 Fight Club',
        minLevel: 8,
        cost: 200,
        duration: 2,
        success: { chance: 0.5, reward: { gold: 1500, xp: 60 } },
        failure: { consequence: 'injury', hp_loss: 50 },
        desc: 'Tarung di underground fight club.'
    },
    gig_running: {
        name: '📋 Gig Running',
        minLevel: 5,
        cost: 0,
        duration: 3,
        success: { chance: 0.8, reward: { gold: 500, xp: 30 } },
        failure: { consequence: 'reputation_loss', rep: -5 },
        desc: 'Ambil gig kecil dari fixer lokal.'
    },
    chip_dealing: {
        name: '💽 Chip Dealing',
        minLevel: 15,
        cost: 1000,
        duration: 4,
        success: { chance: 0.7, reward: { gold: 3000, xp: 40 } },
        failure: { consequence: 'arrest_risk', chance: 0.3 },
        desc: 'Jual datachip ilegal di black market.'
    },
    taxi_driver: {
        name: '🚕 Taxi Driver',
        minLevel: 3,
        cost: 50,
        duration: 4,
        success: { chance: 0.95, reward: { gold: 300, xp: 15 } },
        failure: { consequence: 'accident', repair: 200 },
        desc: 'Jadi supir taksi dadakan.'
    },
    photo_gig: {
        name: '📸 Photo Gig',
        minLevel: 5,
        cost: 0,
        duration: 2,
        success: { chance: 0.9, reward: { gold: 400, xp: 20 } },
        failure: { consequence: 'angry_subject', rep: -3 },
        desc: 'Jadi fotografer event.'
    },
    hacking_gig: {
        name: '🖥️ Hacking Gig',
        minLevel: 12,
        requirements: { hackBonus: 15 },
        cost: 200,
        duration: 2,
        success: { chance: 0.6, reward: { gold: 2500, xp: 70 } },
        failure: { consequence: 'traced', danger: 20 },
        desc: 'Hack target untuk klien.'
    }
};

// ════════════════════════════════════════════════════════════════════════════════════════
// 🎮 MINIGAMES - Interactive Activities
// ════════════════════════════════════════════════════════════════════════════════════════

const MINIGAMES = {
    slot_machine: {
        name: '🎰 Slot Machine',
        cost: 100,
        outcomes: [
            { symbols: '🍒🍒🍒', multiplier: 3, chance: 0.15 },
            { symbols: '💎💎💎', multiplier: 10, chance: 0.05 },
            { symbols: '7️⃣7️⃣7️⃣', multiplier: 50, chance: 0.01 },
            { symbols: 'mixed', multiplier: 0, chance: 0.79 }
        ]
    },
    rock_paper_scissors: {
        name: '✊✋✌️ RPS',
        cost: 50,
        multiplier: 2,
        winChance: 0.33
    },
    dice_roll: {
        name: '🎲 Dice Roll',
        cost: 200,
        type: 'higher_lower',
        multiplier: 2
    },
    card_game: {
        name: '🃏 Blackjack',
        cost: 500,
        type: 'blackjack',
        multiplier: 2
    },
    coin_flip: {
        name: '🪙 Coin Flip',
        cost: 100,
        multiplier: 2,
        winChance: 0.5
    }
};

// ════════════════════════════════════════════════════════════════════════════════════════
// 🏆 JOB RANKS & PROGRESSION
// ════════════════════════════════════════════════════════════════════════════════════════

const JOB_RANKS = {
    rookie: { name: '🟢 Rookie', minXp: 0, salaryBonus: 0 },
    regular: { name: '🔵 Regular', minXp: 500, salaryBonus: 0.1 },
    experienced: { name: '🟡 Experienced', minXp: 2000, salaryBonus: 0.25 },
    expert: { name: '🟠 Expert', minXp: 5000, salaryBonus: 0.5 },
    master: { name: '🔴 Master', minXp: 15000, salaryBonus: 1.0 },
    legend: { name: '🌟 Legend', minXp: 50000, salaryBonus: 2.0 }
};

// ════════════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════════════

module.exports = {
    JOBS,
    AFK_ACTIVITIES,
    SIDE_HUSTLES,
    MINIGAMES,
    JOB_RANKS
};
