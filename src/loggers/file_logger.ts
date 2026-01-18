import path from 'path';
import fs from 'fs';
import 'source-map-support/register.js';
import Logger from '../helpers/interfaces.js';
import Utilities from '../helpers/utilities.js';

/**
 * @class FileLogger
 * A simple file-based logger that appends log messages to a file named after the current session ID.
 * Logs are stored in the 'logs' directory.
 * This logger is intended for local development and debugging purposes, and uses session id to differentiate log files.
 */
export default class FileLogger implements Logger {
    private logFile: string;

    constructor() {
        const logsDir = path.join(process.cwd(), 'logs');
        this.logFile = path.join(logsDir, `${process.env.SESSION_ID}.log`);
        try {
            fs.accessSync(this.logFile);
        } catch {
            fs.writeFileSync(this.logFile, 'Logger Initialised\n\n');
        }
    }

    info(message: string, stack?: string): void {
        this.log(message, stack, 'INFO');
        console.info(`${Utilities.formatLocalDateTime()} | ${message}`);
    }

    debug(message: string, stack?: string): void {
        this.log(message, stack, 'DEBUG');
        console.debug(`${Utilities.formatLocalDateTime()} | ${message}`);
    }

    error(error: Error): void {
        const resolvedStack = error.stack;
        this.log(`${error.message || error}`, resolvedStack, 'ERROR');
        console.error(`${Utilities.formatLocalDateTime()} | An Error Occurred - check logs for details.`);
    }

    private log(message: string, stack: string | undefined, level: string): void {
        const logEntry = `[${Utilities.formatLocalDateTime()}] [${level}] ${message}${stack ? `\nStack Trace: ${stack}` : ''}\n\n`;
        try {
            fs.appendFileSync(this.logFile, logEntry);
        } catch (err) {
            console.error('Failed to append to log file:', err);
        }
    }
}