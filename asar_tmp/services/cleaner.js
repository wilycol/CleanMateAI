const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const log = require('electron-log');
const { execSync } = require('child_process');

let isCleaning = false; // Simple mutex

function isAdmin() {
    try {
        execSync('net session', { stdio: 'ignore' });
        return true;
    } catch (e) {
        return false;
    }
}

function getPathsToClean() {
    const isElevated = isAdmin();
    const paths = [
        { path: path.join(os.tmpdir()), category: 'Temporales' }, // %TEMP%
        { path: path.join(os.homedir(), 'AppData', 'Local', 'Temp'), category: 'Temporales' },
        // Chrome Cache
        { path: path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Cache'), category: 'Caché Navegador' },
        // Edge Cache
        { path: path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache'), category: 'Caché Navegador' }
    ];

    if (isElevated) {
        paths.push({ path: path.join(process.env.SystemRoot || 'C:\\Windows', 'Logs'), category: 'Registros Sistema' });
    }

    return paths;
}

// Whitelist roots for extra security
const ALLOWED_ROOTS = [
    os.tmpdir(),
    path.join(os.homedir(), 'AppData'),
    process.env.SystemRoot || 'C:\\Windows'
].map(r => path.resolve(r).toLowerCase());

async function scanDirectory(dirPath, category) {
    let files = [];
    let size = 0;
    
    // Validate path
    const resolvedPath = path.resolve(dirPath);
    const lowerPath = resolvedPath.toLowerCase();
    const isAllowed = ALLOWED_ROOTS.some(root => lowerPath.startsWith(root));
    
    if (!isAllowed || resolvedPath.includes('..')) {
        return { files: [], size: 0 };
    }

    if (fs.existsSync(resolvedPath)) {
        try {
            const dirFiles = await fs.readdir(resolvedPath);
            for (const file of dirFiles) {
                const curPath = path.join(resolvedPath, file);
                try {
                    const stat = await fs.stat(curPath);
                    if (stat.isFile()) {
                        files.push({ 
                            path: curPath, 
                            size: stat.size,
                            category: category,
                            name: file
                        });
                        size += stat.size;
                    } else if (stat.isDirectory()) {
                        // Shallow scan for subdirectories to find large files logic could go here
                        // For now, keeping it shallow-ish for performance or adding recursion logic if needed
                        // Implementation of recursive scan for deep stats:
                        try {
                             const subFiles = await scanRecursive(curPath, category);
                             files = files.concat(subFiles.files);
                             size += subFiles.size;
                        } catch (e) {}
                    }
                } catch (e) {
                    // Ignore
                }
            }
        } catch (e) {
            // Ignore
        }
    }
    return { files, size };
}

// Helper for recursive scan (limited depth/safety)
async function scanRecursive(dirPath, category, depth = 0) {
    if (depth > 3) return { files: [], size: 0 }; // Limit recursion depth
    let files = [];
    let size = 0;

    try {
        const dirFiles = await fs.readdir(dirPath);
        for (const file of dirFiles) {
            const curPath = path.join(dirPath, file);
            try {
                const stat = await fs.stat(curPath);
                if (stat.isFile()) {
                    files.push({ 
                        path: curPath, 
                        size: stat.size,
                        category: category,
                        name: file
                    });
                    size += stat.size;
                } else if (stat.isDirectory()) {
                    const subResult = await scanRecursive(curPath, category, depth + 1);
                    files = files.concat(subResult.files);
                    size += subResult.size;
                }
            } catch (e) {}
        }
    } catch (e) {}
    return { files, size };
}

async function analyzeSystem(onProgress) {
    log.info('Starting system analysis...');
    const paths = getPathsToClean();
    let allFiles = [];
    let totalSize = 0;
    
    // Categories tracking
    const categories = {
        'Temporales': { size: 0, count: 0 },
        'Caché Navegador': { size: 0, count: 0 },
        'Registros Sistema': { size: 0, count: 0 }
    };

    let processedCount = 0;
    const totalPaths = paths.length;

    for (const p of paths) {
        // Report progress
        if (onProgress) {
            const percent = Math.round((processedCount / totalPaths) * 100);
            onProgress({ percent, status: `Analizando ${p.category}...` });
        }

        const { files, size } = await scanDirectory(p.path, p.category);
        
        // Update aggregates
        allFiles = allFiles.concat(files);
        totalSize += size;
        
        if (categories[p.category]) {
            categories[p.category].size += size;
            categories[p.category].count += files.length;
        } else {
             // Fallback
             categories[p.category] = { size, count: files.length };
        }

        processedCount++;
    }

    // Identify Top 10 heaviest files
    const topFiles = allFiles
        .sort((a, b) => b.size - a.size)
        .slice(0, 10)
        .map(f => ({
            name: f.name,
            path: f.path, // Full path for tooltip/details
            size: f.size,
            category: f.category
        }));

    // Identify recoverable space (all found files are potentially recoverable in this context)
    const recoverableMB = (totalSize / (1024 * 1024)).toFixed(2);
    const spaceRecoverableMB = parseFloat(recoverableMB);
    const estimatedPerformanceGain = Math.min(100, Math.ceil(spaceRecoverableMB / 100));

    return {
        totalSize,
        recoverableMB,
        fileCount: allFiles.length,
        categories,
        topFiles,
        files: allFiles, // Return all for cleaning phase reference
        spaceRecoverableMB,
        estimatedPerformanceGain,
        readOnlyFiles: [],
        filesToDelete: allFiles.map(f => f.path)
    };
}

async function getFilesRecursively(dir, onFileFound) {
    let files = [];
    let readOnly = [];
    let size = 0;

    // Validate path
    const resolvedPath = path.resolve(dir);
    const lowerPath = resolvedPath.toLowerCase();
    const isAllowed = ALLOWED_ROOTS.some(root => lowerPath.startsWith(root));
    if (!isAllowed || resolvedPath.includes('..')) return { files: [], readOnly: [], size: 0 };

    if (!fs.existsSync(dir)) return { files: [], readOnly: [], size: 0 };

    async function walk(currentDir) {
        try {
            const list = await fs.readdir(currentDir);
            for (const file of list) {
                const filePath = path.join(currentDir, file);
                
                // Report progress
                if (onFileFound) onFileFound(filePath);

                try {
                    const stat = await fs.stat(filePath);
                    if (stat.isDirectory()) {
                        await walk(filePath);
                        files.push({ path: filePath, size: 0, type: 'dir' });
                    } else {
                        files.push({ path: filePath, size: stat.size, type: 'file' });
                        size += stat.size;
                        if ((stat.mode & 0o222) === 0) {
                            readOnly.push({ path: filePath });
                        }
                    }
                } catch (e) {
                    // Ignore locked/perm errors during scan
                }
            }
        } catch (e) {
            // Ignore access errors
        }
    }

    await walk(dir);
    return { files, readOnly, size };
}

async function cleanSystem(onProgress) {
    if (isCleaning) {
        log.warn('Cleanup already in progress.');
        return null;
    }

    isCleaning = true;
    log.info('Starting system cleanup with progress...');
    
    try {
        const analysis = await analyzeSystem(); // Re-scan to get fresh list
        const totalItems = analysis.filesToDelete.length;
        let processed = 0;
        let freedBytes = 0;
        let filesDeleted = 0;
        let errors = [];

        // Sort: files first, then directories (depth-first usually better for deletion but here we have a flat list mixed)
        // Actually, if we delete a dir, files inside are gone. 
        // Our recursive scanner added files AND dirs. 
        // If we delete a parent dir, children errors might occur if we try to delete them after.
        // Safe strategy: Delete files first, then directories (reverse sort by length of path)
        // Longest paths first = deepest files/dirs first.
        
        const sortedItems = analysis.filesToDelete.sort((a, b) => b.length - a.length);

        for (const itemPath of sortedItems) {
            try {
                // Check existence first to avoid ENOENT on stat if race condition
                let stat;
                try {
                    stat = await fs.stat(itemPath);
                } catch (statErr) {
                    if (statErr.code === 'ENOENT') continue; // File already gone
                    throw statErr;
                }

                if (stat.isDirectory()) {
                    // Use fs.rm with force: true for directories
                    await fs.rm(itemPath, { recursive: true, force: true });
                } else {
                    await fs.unlink(itemPath);
                    // Only count size if successfully deleted
                    freedBytes += stat.size;
                }
                filesDeleted++;
            } catch (e) {
                // Ignore ENOENT (file gone), log others
                if (e.code !== 'ENOENT') {
                     errors.push({ path: itemPath, error: e.message });
                }
            }

            processed++;
            if (onProgress) {
                const percent = Math.round((processed / totalItems) * 100);
                onProgress({
                    percent,
                    currentFile: path.basename(itemPath),
                    processed,
                    total: totalItems
                });
            }
        }

        const freedMB = parseFloat((freedBytes / (1024 * 1024)).toFixed(2));
        log.info(`Cleanup finished. Freed: ${freedMB} MB`);

        return {
            freedMB,
            filesDeleted,
            errors,
            timeMs: 0 // Caller can measure
        };

    } catch (e) {
        log.error('Critical error:', e);
        throw e;
    } finally {
        isCleaning = false;
    }
}

module.exports = { cleanSystem, analyzeSystem };
