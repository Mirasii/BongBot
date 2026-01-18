import path from 'path';
import fsp from 'fs/promises';
import BetterSqlite3 from 'better-sqlite3';
import 'source-map-support/register.js';
import { Logger } from '../helpers/interfaces.js';
import Utilities from '../helpers/utilities.js';

/**
 * @class DefaultLogger
 * Default logger implementation using SQLite database to store logs.
 * Logs are stored in the 'logs' directory with a database file named after the current date (YYYY-MM-DD.db).
 * If database logging fails, it falls back to a legacy file-based logging mechanism.
 * Logs include session ID, timestamp, message, stack trace, and log level.
 */
export default class DefaultLogger implements Logger {
    private db: BetterSqlite3.Database;
    private stmt: BetterSqlite3.Statement;

    constructor() {
        const logsDir = path.join(process.cwd(), 'logs');
        const dbPath = path.join(logsDir, `${Utilities.getCurrentDateISO()}.db`);
        console.log('Initializing DefaultLogger with DB path:', dbPath);
        this.db = new BetterSqlite3(dbPath);
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                message TEXT NOT NULL,
                stack TEXT,
                level TEXT NOT NULL
            )
        `;
        this.db.exec(createTableSQL);
        this.stmt = this.db.prepare(`
            INSERT INTO logs (message, stack, level, session_id)
            VALUES (?, ?, ?, ?)
        `);
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

    close(): void { this.db.close(); }

    private log(message: string, stack: string | undefined, level: string): void {
        try {
            this.stmt.run(message, stack || null, level, process.env.SESSION_ID);
        } catch (err) {
            console.error('Failed to log to DB:', err, 'falling back to legacy file logger');
            this.logLegacy(message, stack).catch((error) => { console.error('Failed to log to legacy file:', error); });
        }
    }

    private async logLegacy(message: string, stack: string | undefined): Promise<void> {
        const logsDir = path.join(process.cwd(), 'logs');
        const logFile = path.join(logsDir, `${Utilities.getCurrentDateISO()}.log`);
        if (!await fsp.access(logFile).then(() => true).catch(() => false)) {
            await fsp.writeFile(logFile, 'Logger Initialised\n\n');
        }
        fsp.appendFile(logFile, `${Utilities.formatLocalDateTime()} | ${message}\n${stack ? stack + '\n' : ''}\n`).catch((err) => {
            console.error('Failed to append to log file:', err);
        });
    }
}