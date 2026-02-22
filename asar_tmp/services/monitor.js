const si = require('systeminformation');
const log = require('electron-log');

async function getSystemStats() {
    try {
        const [cpu, mem, disk] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.fsSize()
        ]);

        // Calculate main disk usage (usually C:)
        const mainDisk = disk.find(d => d.mount === 'C:') || disk[0];
        const diskUsage = mainDisk ? mainDisk.use : 0;

        let status = 'good';
        if (cpu.currentLoad > 80 || (mem.active / mem.total) * 100 > 80 || diskUsage > 90) {
            status = 'critical';
        } else if (cpu.currentLoad > 50 || (mem.active / mem.total) * 100 > 60 || diskUsage > 70) {
            status = 'warning';
        }

        return {
            cpu: Math.round(cpu.currentLoad),
            ram: Math.round((mem.active / mem.total) * 100),
            disk: Math.round(diskUsage),
            status: status
        };
    } catch (error) {
        log.error('Error getting system stats:', error);
        return { cpu: 0, ram: 0, disk: 0, status: 'unknown' };
    }
}

module.exports = { getSystemStats };
