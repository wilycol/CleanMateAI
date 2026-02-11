
const path = require('path');
const fs = require('fs');

// Mock electron-log before requiring cleaner.js
const logMock = {
    info: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.log
};

// We need to mock electron-log module
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
    if (id === 'electron-log') {
        return logMock;
    }
    return originalRequire.apply(this, arguments);
};

const { analyzeSystem } = require('../services/cleaner');

console.log('--- STARTING SIMULATION OF SYSTEM SCAN ---');
const startTime = Date.now();

const onProgress = (data) => {
    // Clear line and write progress
    if (data.status === 'scanning') {
        process.stdout.write(`\rScanning: ${data.currentFile.substring(0, 50)}...`);
    }
};

analyzeSystem(onProgress)
    .then(result => {
        const duration = (Date.now() - startTime) / 1000;
        console.log('\n\n--- SCAN COMPLETE ---');
        console.log(`Duration: ${duration}s`);
        console.log(`Files found: ${result.fileCount}`);
        console.log(`Space recoverable: ${result.spaceRecoverableMB} MB`);
        console.log(`Estimated time to clean: ${result.estimatedTimeSeconds}s`);
        console.log('---------------------');
    })
    .catch(err => {
        console.error('\n\n!!! SCAN FAILED !!!');
        console.error(err);
    });
