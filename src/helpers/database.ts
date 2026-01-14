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
            WHERE userId = ? AND (serverUrl = ? OR serverName = ?)
        `);
        const existing = checkStmt.get(server.userId, server.serverUrl, server.serverName);

        if (existing) {
            throw new Error('This server is already registered for this user.');
        }

        const stmt = this.db.prepare(`
            INSERT INTO pterodactyl_servers (userId, serverName, serverUrl, apiKey)
            VALUES (?, ?, ?, ?)
        `);
        const result = stmt.run(
            server.userId,
            server.serverName,
            server.serverUrl,
            server.apiKey,
        );
        return result.lastInsertRowid as number;
    }

    deleteServer(userId: string, serverName: string): void {
        const stmt = this.db.prepare(`
            DELETE FROM pterodactyl_servers
            WHERE userId = ? AND serverName = ?
        `);
        stmt.run(userId, serverName);
    }

    updateServer(userId: string, serverName: string, updates: { serverUrl?: string; apiKey?: string }): void {
        // Get the existing server to verify it exists
        const checkStmt = this.db.prepare(`
            SELECT id FROM pterodactyl_servers
            WHERE userId = ? AND serverName = ?
        `);
        const existing = checkStmt.get(userId, serverName);

        if (!existing) {
            throw new Error(`Server "${serverName}" not found for this user.`);
        }

        // Build the update query dynamically based on provided fields
        const updateFields: string[] = [];
        const values: any[] = [];

        if (updates.serverUrl !== undefined) {
            updateFields.push('serverUrl = ?');
            values.push(updates.serverUrl);
        }

        if (updates.apiKey !== undefined) {
            updateFields.push('apiKey = ?');
            values.push(updates.apiKey);
        }

        if (updateFields.length === 0) {
            throw new Error('No fields to update. Please provide at least one field (server_url or api_key).');
        }

        // Add WHERE clause values
        values.push(userId, serverName);

        const stmt = this.db.prepare(`
            UPDATE pterodactyl_servers
            SET ${updateFields.join(', ')}
            WHERE userId = ? AND serverName = ?
        `);
        stmt.run(...values);
    }

    getServerById(id: number): PterodactylServer | undefined {
        const stmt = this.db.prepare(
            'SELECT * FROM pterodactyl_servers WHERE id = ?',
        );
        return stmt.get(id) as PterodactylServer | undefined;
    }

    getServersByUserId(userId: string): PterodactylServer[] {
        const stmt = this.db.prepare(
            'SELECT * FROM pterodactyl_servers WHERE userId = ?',
        );
        return stmt.all(userId) as PterodactylServer[];
    }

    close(): void {
        this.db.close();
    }
}
