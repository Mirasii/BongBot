import BetterSqlite3 from 'better-sqlite3';
import path from 'path';

export interface PterodactylServer {
    id?: number;
    userId: string;
    serverName: string;
    serverUrl: string;
    apiKey: string;
}

export default class Database {
    private db: BetterSqlite3.Database;
    private dbPath: string;

    constructor(dbFileName: string) {
        this.dbPath = path.join(process.cwd(), 'data', dbFileName);
        this.db = new BetterSqlite3(this.dbPath);
        this.initialize();
    }

    private initialize(): void {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS pterodactyl_servers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId TEXT NOT NULL,
                serverName TEXT NOT NULL,
                serverUrl TEXT NOT NULL,
                apiKey TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;
        this.db.exec(createTableSQL);
    }

    addServer(server: PterodactylServer): number {
        const checkStmt = this.db.prepare(`
            SELECT id FROM pterodactyl_servers
            WHERE userId = ? AND serverUrl = ?
        `);
        const existing = checkStmt.get(server.userId, server.serverUrl);

        if (existing) {
            throw new Error('This server is already registered for this user.');
        }

        const stmt = this.db.prepare(`
            INSERT INTO pterodactyl_servers (userId, serverName, serverUrl, apiKey)
            VALUES (?, ?, ?, ?)
        `);
        const result = stmt.run(server.userId, server.serverName, server.serverUrl, server.apiKey);
        return result.lastInsertRowid as number;
    }

    getServerById(id: number): PterodactylServer | undefined {
        const stmt = this.db.prepare('SELECT * FROM pterodactyl_servers WHERE id = ?');
        return stmt.get(id) as PterodactylServer | undefined;
    }

    getServersByUserId(userId: string): PterodactylServer[] {
        const stmt = this.db.prepare('SELECT * FROM pterodactyl_servers WHERE userId = ?');
        return stmt.all(userId) as PterodactylServer[];
    }

    close(): void {
        this.db.close();
    }
}
