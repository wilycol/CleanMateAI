
const { analyzeSystem } = require('../services/cleaner');

console.log('--- DEBUG SCAN START ---');

async function run() {
    try {
        const result = await analyzeSystem((progress) => {
            console.log(`[PROGRESS] ${progress.percent}% - ${progress.currentFile}`);
        });
        console.log('--- SCAN RESULT ---');
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('--- ERROR ---');
        console.error(error);
    }
}

run();
