import BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

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
        const encrypted = this.encryptApiKey(server.apiKey);
        const result = stmt.run(
            server.userId,
            server.serverName,
            server.serverUrl,
            encrypted,
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
            const encrypted = this.encryptApiKey(updates.apiKey);
            values.push(encrypted);
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
        let server = stmt.get(id) as PterodactylServer | undefined;
        if (!server) { return server; }
        server.apiKey = this.decryptApiKey(server.apiKey);
        return server;
    }

    getServersByUserId(userId: string): PterodactylServer[] {
        const stmt = this.db.prepare(
            'SELECT * FROM pterodactyl_servers WHERE userId = ?',
        );
        let servers = stmt.all(userId) as PterodactylServer[];
        servers = servers.map((server) => {
            server.apiKey = this.decryptApiKey(server.apiKey);
            return server;
        });
        return servers;
    }

    close(): void {
        this.db.close();
    }

    private encryptApiKey(plaintext: string): string {
        const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag(); // Extract the authentication tag
        return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    }

    private decryptApiKey(ciphertext: string): string {
        const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
        const parts = ciphertext.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid ciphertext format');
        }
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag); // Set auth tag before decryption
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
