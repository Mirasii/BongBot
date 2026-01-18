import fsp from 'fs/promises';
import BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import Logger from '../helpers/interfaces.js';
import DatabasePool from '../services/databasePool.js';
import 'source-map-support/register.js';
let logFile: string | undefined;

export default {
    async init() {
        const logsDir = path.join(process.cwd(), 'logs');
        logFile = path.join(logsDir, `${new Date().toISOString().slice(0, 10)}.log`);
    },
    get default(): Logger {
        return DatabasePool.getInstance().getLoggerConnection();
    },
    /** Legacy log function has been updated to use the new _logger so that code uses it implicitly. */
    async log(error: any) {
        const _logger = DatabasePool.getInstance().getLoggerConnection();
        if (!_logger) throw new Error('Logger not initialised');
        if (error instanceof Error) {
            _logger.error(error);
            return;
        }
        _logger.debug(typeof error === 'string' ? error : JSON.stringify(error));
    }
}

export class DefaultLogger implements Logger {
    private db: BetterSqlite3.Database;
    private stmt: BetterSqlite3.Statement;

    constructor() {
        const logsDir = path.join(process.cwd(), 'logs');
        const dbPath = path.join(logsDir, `${new Date().toISOString().slice(0, 10)}.db`);
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
        try {
            this.stmt.run(message, stack || null, level, process.env.SESSION_ID);
        } catch (err) {
            console.error('Failed to log to DB:', err, 'falling back to legacy file logger');
            this.logLegacy(message, stack);
        }
    }

    private async logLegacy(message: string, stack: string | undefined): Promise<void> {
        if (!logFile) {
            console.error('Log file not initialized');
            await fsp.writeFile(logFile, 'Logger Initialised\n\n');
        }
        let datetime = `${new Date().toISOString()}`
        fsp.appendFile(logFile, `${datetime} | ${message}\n${stack ? stack + '\n' : ''}\n`).catch((err) => {
            console.error('Failed to append to log file:', err);
        });
    }
}