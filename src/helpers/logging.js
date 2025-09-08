const fsp = require('fs').promises;
var logFile;

module.exports = {
    async init(sessionId) {
        logFile = `./logs/${sessionId}.log`
        try {
            await fsp.writeFile(logFile, 'Logger Initialised\n\n');
            console.log('Logger Initialised');
        } catch (err) {
            throw err;
        }
    },
    async log(error) {
        var currentdate = new Date(); 
        var datetime = currentdate.getDate() + "/"
                + (currentdate.getMonth()+1)  + "/" 
                + currentdate.getFullYear() + " @ "  
                + currentdate.getHours() + ":"  
                + currentdate.getMinutes() + ":" 
                + currentdate.getSeconds();
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