const fs = require('fs');
var logFile;

module.exports = {
    async init(sessionId) {
        logFile = `./logs/${sessionId}.log`
        fs.writeFile(logFile, 'Logger Initialised\n\n', function (err) {
            if (err) throw err;
            console.log('Logger Initialised')
            return;
        });
    },
    async log(error) {
        var currentdate = new Date(); 
        var datetime = currentdate.getDate() + "/"
                + (currentdate.getMonth()+1)  + "/" 
                + currentdate.getFullYear() + " @ "  
                + currentdate.getHours() + ":"  
                + currentdate.getMinutes() + ":" 
                + currentdate.getSeconds();
        fs.appendFile(logFile, `${datetime} | ${error}\n\n`, function (err) {
            if (err) throw err;
            console.log(`error saved to logfile ${this.logFile}`);
        });
    }
}