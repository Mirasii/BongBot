import Database from '../helpers/database.js';
import Logger from '../helpers/interfaces.js';
import DefaultLogger from '../loggers/default_logger.js';

export default class DatabasePool {
    private static instance: DatabasePool;
    private connections: Map<string, Database> = new Map();

    private constructor() {}

    static getInstance(): DatabasePool {
        if (!DatabasePool.instance) {
            DatabasePool.instance = new DatabasePool();
        }
        return DatabasePool.instance;
    }

    getConnection(dbFileName: string = 'pterodactyl.db'): Database {
        const resolvedFileName = process.env.SERVER_DATABASE || dbFileName;

        if (!this.connections.has(resolvedFileName)) {
            this.connections.set(resolvedFileName, new Database(resolvedFileName));
        }
        return this.connections.get(resolvedFileName)!;
    }

    getLoggerConnection(): Logger {
        if (!this.connections.has('logger')) {
            this.connections.set('logger', new DefaultLogger());
        }
        return this.connections.get('logger')!;
    }

    closeAll(): void {
        for (const db of this.connections.values()) {
            db.close();
        }
        this.connections.clear();
    }
}
