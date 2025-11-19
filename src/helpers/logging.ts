import fsp from 'fs/promises';
let logFile: string | undefined;

export default {
    async init(sessionId: string) {
        logFile = `./logs/${sessionId}.log`
        try {
            await fsp.writeFile(logFile, 'Logger Initialised\n\n');
            console.log('Logger Initialised');
        } catch (err) {
            throw err;
        }
    },
    async log(error: any) {
        let currentdate = new Date(); 
        let datetime = `${currentdate.toLocaleDateString()} @ ${currentdate.toLocaleTimeString()}`
        if (!logFile) {
            console.error('Log file not initialized');
            return;
        }
        try {
            await fsp.appendFile(logFile, `${datetime} | ${error.stack || error}\n\n`);
            console.log(`error saved to logfile ${logFile}`);
        } catch (err) {
            console.error('Failed to append to log file:', err);
        }
    }
}