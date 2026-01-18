import path from 'path';
import fs from 'fs';
import Logger from '../helpers/interfaces.js';
import 'source-map-support/register.js';

/**
 * FileLogger
 * A simple file-based logger that appends log messages to a file named after the current session ID.
 * Logs are stored in the 'logs' directory.
 * This logger is intended for local development and debugging purposes, and uses session id to differentiate log files.
 */
export default class FileLogger implements Logger {
    private logFile: string;

    constructor() {
        const logsDir = path.join(process.cwd(), 'logs');
        this.logFile = path.join(logsDir, `${process.env.SESSION_ID}.log`);
        fs.access(this.logFile).catch(() => {
            fs.writeFile(this.logFile, 'Logger Initialised\n\n');
        });
    }

    info(message: string, stack?: string): void {
        this.log(message, stack, 'INFO');
        const datetime = new Date().toLocaleString().replace(', ', '@');
        console.info(`${datetime} | ${message}`);
    }

    debug(message: string, stack?: string): void {
        this.log(message, stack, 'DEBUG');
        const datetime = new Date().toLocaleString().replace(', ', '@');
        console.debug(`${datetime} | ${message}`);
    }

    error(error: Error): void {
        const resolvedStack = error.stack;
        this.log(`${error.message || error}`, resolvedStack, 'ERROR');
        const datetime = new Date().toLocaleString().replace(', ', '@');
        console.error(`${datetime} | An Error Occurred - check logs for details.`);
    }

    close(): void { this.db.close(); }

    private log(message: string, stack: string | undefined, level: string): void {
        const datetime = new Date().toLocaleString().replace(', ', ' ');
        const logEntry = `[${datetime}] [${level}] ${message}${stack ? `\nStack Trace: ${stack}` : ''}\n\n`;
        fs.appendFile(this.logFile, logEntry).catch((err) => {
            console.error('Failed to append to log file:', err);
        });
    }
}