const path = require('path');
const os = require('os');
const log = require('electron-log');

// Security Whitelist for Actions
const ALLOWED_TARGETS = {
    'logs': [path.join(process.env.SystemRoot || 'C:\\Windows', 'Logs')],
    'temp': [os.tmpdir(), path.join(os.homedir(), 'AppData', 'Local', 'Temp')],
    'cache_chrome': [path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Cache')],
    'cache_edge': [path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache')],
    'recycle_bin': [] // Special handling usually needed, or just warn user
};

const ALLOWED_ACTIONS = ['clean', 'analyze', 'open_settings'];

function validateAction(action) {
    if (!action || !action.type || !ALLOWED_ACTIONS.includes(action.type)) {
        return { valid: false, reason: "Invalid action type" };
    }

    if (action.type === 'clean') {
        if (!Array.isArray(action.targets)) {
            return { valid: false, reason: "Targets must be an array" };
        }

        for (const targetKey of action.targets) {
            if (!ALLOWED_TARGETS[targetKey]) {
                return { valid: false, reason: `Target '${targetKey}' is not whitelisted` };
            }
        }
    }

    return { valid: true };
}

function interpretAction(actionRequest) {
    const validation = validateAction(actionRequest);
    
    if (!validation.valid) {
        log.warn(`Action blocked by interpreter: ${validation.reason}`);
        return null;
    }

    // Return enriched executable action object
    return {
        ...actionRequest,
        status: 'ready',
        securityCheck: 'passed',
        timestamp: new Date().toISOString()
    };
}

module.exports = { interpretAction, validateAction };
