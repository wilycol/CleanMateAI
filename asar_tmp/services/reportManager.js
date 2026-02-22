const fs = require('fs-extra');
const path = require('path');
const { app } = require('electron');
const log = require('electron-log');

const REPORT_FILE = 'reports.json';
const MAX_REPORTS = 10;

function getReportPath() {
    return path.join(app.getPath('userData'), REPORT_FILE);
}

async function saveReport(reportData) {
    const filePath = getReportPath();
    let reports = [];
    
    try {
        if (await fs.pathExists(filePath)) {
            reports = await fs.readJson(filePath);
        }
    } catch (e) {
        log.error('Error reading reports history:', e);
    }

    const newReport = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...reportData
    };

    // Add to beginning
    reports.unshift(newReport); 
    
    // Keep only last N
    if (reports.length > MAX_REPORTS) {
        reports = reports.slice(0, MAX_REPORTS);
    }

    try {
        await fs.writeJson(filePath, reports, { spaces: 2 });
        log.info(`Report saved. Total reports: ${reports.length}`);
        return newReport;
    } catch (e) {
        log.error('Error saving report:', e);
        throw e;
    }
}

async function getReports() {
    const filePath = getReportPath();
    try {
        if (await fs.pathExists(filePath)) {
            return await fs.readJson(filePath);
        }
    } catch (e) {
        log.error('Error reading reports:', e);
    }
    return [];
}

module.exports = { saveReport, getReports };
