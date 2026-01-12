import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface PterodactylServer {
    id?: number;
    userId: string;
    serverName: string;
    serverUrl: string;
    apiKey: string;
}

export default class Database {
    private db: Database.Database;
    private dbPath: string;

    constructor(dbFileName: string) {
        this.dbPath = path.join(__dirname, '../../data', dbFileName);
        this.db = new Database(this.dbPath);
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

    getAllServers(): PterodactylServer[] {
        const stmt = this.db.prepare('SELECT * FROM pterodactyl_servers');
        return stmt.all() as PterodactylServer[];
    }

    updateServer(id: number, server: Partial<PterodactylServer>): boolean {
        const updates: string[] = [];
        const values: any[] = [];

        if (server.userId !== undefined) {
            updates.push('userId = ?');
            values.push(server.userId);
        }
        if (server.serverName !== undefined) {
            updates.push('serverName = ?');
            values.push(server.serverName);
        }
        if (server.serverUrl !== undefined) {
            updates.push('serverUrl = ?');
            values.push(server.serverUrl);
        }
        if (server.apiKey !== undefined) {
            updates.push('apiKey = ?');
            values.push(server.apiKey);
        }

        if (updates.length === 0) return false;

        values.push(id);
        const stmt = this.db.prepare(`
            UPDATE pterodactyl_servers
            SET ${updates.join(', ')}
            WHERE id = ?
        `);
        const result = stmt.run(...values);
        return result.changes > 0;
    }

    deleteServer(id: number): boolean {
        const stmt = this.db.prepare('DELETE FROM pterodactyl_servers WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    deleteServersByUserId(userId: string): number {
        const stmt = this.db.prepare('DELETE FROM pterodactyl_servers WHERE userId = ?');
        const result = stmt.run(userId);
        return result.changes;
    }

    close(): void {
        this.db.close();
    }
}
