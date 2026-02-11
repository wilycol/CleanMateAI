const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { cleanSystem } = require('../services/cleaner');
const log = require('electron-log');

// Configure logs for test
log.transports.file.level = 'info';
log.transports.console.level = 'info';

const MOCK_DIR = path.join(os.tmpdir(), 'cleanmate_stress_test');

async function setupMockEnvironment(fileCount = 1000) {
    console.log(`Creating mock environment with ${fileCount} files...`);
    await fs.ensureDir(MOCK_DIR);
    
    const files = [];
    for (let i = 0; i < fileCount; i++) {
        const filePath = path.join(MOCK_DIR, `test_file_${i}.tmp`);
        await fs.writeFile(filePath, 'x'.repeat(1024)); // 1KB files
        files.push(filePath);
    }
    
    // Create a locked file
    const lockedFile = path.join(MOCK_DIR, 'locked_file.tmp');
    const fd = fs.openSync(lockedFile, 'w');
    console.log('Environment ready.');
    return { fd, lockedFile };
}

async function runStressTest() {
    console.log('=== STARTING STRESS TEST ===');
    
    // Scenario 1: Mock Environment Setup
    const { fd } = await setupMockEnvironment(5000); // 5000 files
    
    // Inject mock path into cleaner (We need to modify cleaner.js temporarily or mock pathsToClean? 
    // Since we cannot easily inject paths into cleanSystem without modifying it, 
    // we will simulate the logic or assume cleanSystem cleans os.tmpdir() which MOCK_DIR is inside)
    
    // Wait, cleanSystem cleans os.tmpdir(). MOCK_DIR is inside os.tmpdir().
    // So cleanSystem SHOULD attempt to delete MOCK_DIR content.
    
    const start = process.hrtime();
    const startMem = process.memoryUsage().heapUsed;
    
    // Scenario 4: Concurrency Check
    console.log('Launching concurrent cleanup requests...');
    const p1 = cleanSystem();
    const p2 = cleanSystem();
    const p3 = cleanSystem();
    
    const results = await Promise.all([p1, p2, p3]);
    
    const end = process.hrtime(start);
    const endMem = process.memoryUsage().heapUsed;
    
    // Cleanup locked file
    fs.closeSync(fd);
    await fs.remove(MOCK_DIR);
    
    const timeMs = (end[0] * 1000 + end[1] / 1e6).toFixed(2);
    const memDiff = ((endMem - startMem) / 1024 / 1024).toFixed(2);
    
    console.log('\n=== RESULTS ===');
    console.log(`Execution Time: ${timeMs}ms`);
    console.log(`Memory Delta: ${memDiff} MB`);
    console.log('Concurrent Results:', results.map(r => r.filesDeleted));
    
    if (results[0].filesDeleted !== results[1].filesDeleted) {
        console.log('WARNING: Inconsistent results in concurrency (Race Condition possible if not handled)');
    } else {
        console.log('Concurrency seems consistent (or all executed sequentially)');
    }
}

runStressTest().catch(console.error);
