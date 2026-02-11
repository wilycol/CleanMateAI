const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { cleanSystem } = require('../services/cleaner');
const log = require('electron-log');

// Configure logs for test
log.transports.file.level = 'info';
log.transports.console.level = 'info';

const MOCK_DIR = path.join(os.tmpdir(), 'cleanmate_stress_test_20k');

async function setupMassiveEnvironment(fileCount = 20000) {
    console.log(`Creating massive mock environment with ${fileCount} files...`);
    await fs.ensureDir(MOCK_DIR);
    
    // Create nested structure
    const subDirs = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];
    for (const dir of subDirs) {
        await fs.ensureDir(path.join(MOCK_DIR, dir));
    }

    const files = [];
    const BATCH_SIZE = 1000;
    
    for (let i = 0; i < fileCount; i++) {
        const subDir = subDirs[i % subDirs.length];
        const filePath = path.join(MOCK_DIR, subDir, `file_${i}.tmp`);
        
        // Write file (async but awaited in batches to avoid EMFILE)
        files.push(fs.writeFile(filePath, 'data'));
        
        if (files.length >= BATCH_SIZE) {
            await Promise.all(files);
            files.length = 0;
            if (i % 5000 === 0) console.log(`Created ${i} files...`);
        }
    }
    await Promise.all(files);

    // Create Read-Only File
    const readOnlyFile = path.join(MOCK_DIR, 'readonly.tmp');
    await fs.writeFile(readOnlyFile, 'readonly');
    await fs.chmod(readOnlyFile, 0o444); // Read-only

    console.log('Environment ready.');
}

async function runFinalValidation() {
    console.log('=== STARTING FINAL VALIDATION (20k FILES) ===');
    
    const startSetup = process.hrtime();
    await setupMassiveEnvironment(20000);
    const endSetup = process.hrtime(startSetup);
    console.log(`Setup Time: ${(endSetup[0] + endSetup[1]/1e9).toFixed(2)}s`);

    const start = process.hrtime();
    const startMem = process.memoryUsage().heapUsed;
    
    console.log('Starting cleanup...');
    const result = await cleanSystem();
    
    const end = process.hrtime(start);
    const endMem = process.memoryUsage().heapUsed;
    
    const timeMs = (end[0] * 1000 + end[1] / 1e6).toFixed(2);
    const memDiff = ((endMem - startMem) / 1024 / 1024).toFixed(2);
    
    console.log('\n=== RESULTS ===');
    console.log(`Execution Time: ${timeMs}ms`);
    console.log(`Memory Delta: ${memDiff} MB`);
    console.log(`Files Deleted: ${result.filesDeleted}`);
    console.log(`Freed Space: ${result.freedMB} MB`);
    
    // Check if read-only file exists (it should be gone ideally if force=true, or skipped if strict)
    // fs.unlink usually works on read-only files on Windows unless ACL prevents it.
    // fs-extra remove uses graceful-fs which might retry.
    // Let's check.
    const readOnlyExists = await fs.pathExists(path.join(MOCK_DIR, 'readonly.tmp'));
    console.log(`Read-Only File Deleted: ${!readOnlyExists}`);

    // Cleanup main mock dir if still exists (cleanSystem deletes CONTENTS of temp, not temp itself usually, 
    // but here we put it inside os.tmpdir(), so cleanSystem iterates os.tmpdir(). 
    // It should have deleted the folder 'cleanmate_stress_test_20k' itself if it was in os.tmpdir() root 
    // AND cleanSystem iterates files inside os.tmpdir().
    // services/cleaner.js: const files = await fs.readdir(p);
    // It iterates children of %TEMP%. 'cleanmate_stress_test_20k' IS a child.
    // So it should be removed via fs.remove(curPath) (lines 76-78).
    
    const rootExists = await fs.pathExists(MOCK_DIR);
    console.log(`Root Mock Dir Deleted: ${!rootExists}`);
    
    if (rootExists) {
        await fs.remove(MOCK_DIR);
    }
}

runFinalValidation().catch(console.error);
