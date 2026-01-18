import Logger from '../helpers/interfaces.js';
import DatabasePool from '../services/databasePool.js';
import FileLogger from '../loggers/file_logger.js';

export default {
    get default(): Logger {
        const loggerService = LoggerService.getInstance();
        if (process.env.DEFAULT_LOGGER === 'file') return loggerService.getFileLogger(); /** use environment variable to switch loggers for local dev */
        return loggerService.getDefaultLogger();
    },
    /** 
     * Legacy log function has been updated to use the new DefaultLogger so that code uses it implicitly. 
     * Old code using LOGGER.log(error) will still work as expected, however it is recommended to use the new Logger interface directly.
     * New folder structure places loggers in src/loggers - if additional loggers are created, they should have get functions here.
     * This file is now intended to surface loggers, e.g. LOGGER.default, LOGGER.custom_logger, etc.
     */
    async log(error: any) {
        const logger = this.default;
        if (error instanceof Error) {
            logger.error(error);
            return;
        }
        logger.debug(typeof error === 'string' ? error : JSON.stringify(error));
    }
}

class LoggerService {
    private static instance: LoggerService;
    private connections: Map<string, Logger> = new Map();

    private constructor() {}

    static getInstance(): LoggerService {
        if (!LoggerService.instance) {
            LoggerService.instance = new LoggerService();
        }
        return LoggerService.instance;
    }

    getDefaultLogger(): Logger {
        if (!this.connections.has('default')) {
            this.connections.set('default', new DefaultLogger());
        }
        return this.connections.get('default')!;
    }

    getFileLogger (): Logger {
        if (!this.connections.has('file')) {
            this.connections.set('file', new FileLogger());
        }
        return this.connections.get('file')!;
    }

    closeAll(): void {
        for (const db of this.connections.values()) {
            db.close?.();
        }
        this.connections.clear();
    }
}