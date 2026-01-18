import Database from '../helpers/database.js';
import Logger from '../helpers/interfaces.js';
import { DefaultLogger } from '../helpers/logging.js';

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

    getLoggerConnection(sessionId: string): Logger {
        const resolvedFileName = `${sessionId}.db`;

        if (!this.connections.has(resolvedFileName)) {
            this.connections.set(resolvedFileName, new DefaultLogger(sessionId));
        }
        return this.connections.get(resolvedFileName)!;
    }

    closeAll(): void {
        for (const db of this.connections.values()) {
            db.close();
        }
        this.connections.clear();
    }
}
