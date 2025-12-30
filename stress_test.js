/**
 * ☢️ CPU STRESS TEST TOOL ☢️
 * 
 * Script ini digunakan untuk memaksa CPU bekerja 100%
 * Cocok untuk testing fitur CPU Monitor / Auto-Suspend.
 * 
 * Cara pakai:
 * 1. Upload ke server target
 * 2. Jalankan: node stress_test.js
 * 
 * @author @schnuffelll
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

if (isMainThread) {
    // Configuration
    const args = process.argv.slice(2);
    const duration = parseInt(args[0]) || 60; // Default 60 detik (biar kerasa)
    const threadCount = parseInt(args[1]) || os.cpus().length || 4; // Default pake semua core

    console.log(`
╔══════════════════════════════════════════╗
║       ☢️  CPU STRESS TEST TOOL  ☢️       ║
╠══════════════════════════════════════════╣
║ ⏱️  Duration : ${duration} seconds             ║
║ 🧵 Threads  : ${threadCount} workers             ║
║ 🖥️  CPU Cores: ${os.cpus().length} detected            ║
╚══════════════════════════════════════════╝
    `);

    console.log(`[MAIN] 🔥 Starting attack on CPU...`);

    let activeWorkers = 0;

    for (let i = 0; i < threadCount; i++) {
        const worker = new Worker(__filename, {
            workerData: { duration }
        });

        worker.on('exit', () => {
            activeWorkers--;
            if (activeWorkers === 0) {
                console.log(`[MAIN] ✅ Stress test complete.`);
                process.exit(0);
            }
        });

        activeWorkers++;
    }

    console.log(`[MAIN] 🚀 All ${activeWorkers} workers are RUNNING! (CPU should be 100%)`);

    // Timer countdown visual
    let timeLeft = duration;
    const timer = setInterval(() => {
        timeLeft--;
        process.stdout.write(`\r⏳ Time left: ${timeLeft}s  `);
        if (timeLeft <= 0) clearInterval(timer);
    }, 1000);

} else {
    // WORKER THREAD LOGIC (The Stressor)
    const endTime = Date.now() + (workerData.duration * 1000);

    // Infinite loop heavy calculation until time is up
    // Math.random() + Math.sqrt() is intensive enough
    while (Date.now() < endTime) {
        let x = 0;
        for (let i = 0; i < 10000; i++) {
            x += Math.sqrt(Math.random() * Math.random());
        }
    }

    parentPort.postMessage('done');
}
