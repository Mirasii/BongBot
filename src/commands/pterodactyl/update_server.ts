import { ChatInputCommandInteraction } from 'discord.js';
import { buildError } from '../../helpers/errorBuilder.js';
import Database from '../../helpers/database.js';
import { Caller } from '../../helpers/caller.js';
import { validateApiConnection } from './master.js'
export default class UpdateServer {
    private db : Database;
    private caller : Caller;
    constructor(db: Database, caller: Caller) {
        this.db = db;
        this.caller = caller;
    }
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const serverName = interaction.options.getString('server_name', true).trim();
            let serverUrl = interaction.options.getString('server_url');
            const apiKey = interaction.options.getString('api_key');
            const userId = interaction.user.id;

            const existingServers = this.db.getServersByUserId(userId);
            const existingServer = existingServers.find(s => s.serverName === serverName);

            if (!existingServer) {
                throw new Error(`Server "${serverName}" not found for this user.`);
            }

            const updates: { serverUrl?: string; apiKey?: string } = {};
            if (serverUrl) {
                serverUrl = serverUrl.trim();
                if (serverUrl.endsWith('/')) { serverUrl = serverUrl.slice(0, -1); }
                updates.serverUrl = serverUrl;
            }
            if (apiKey) updates.apiKey = apiKey.trim();

            const finalUrl = updates.serverUrl || existingServer.serverUrl;
            const finalApiKey = updates.apiKey || existingServer.apiKey;
            await validateApiConnection(finalUrl, finalApiKey, this.caller);

            this.db.updateServer(userId, serverName, updates);

            const updatedFields: string[] = [];
            if (updates.serverUrl) updatedFields.push('URL');
            if (updates.apiKey) updatedFields.push('API key');

            return {
                content: `Successfully updated **${serverName}**!\nUpdated: ${updatedFields.join(', ')}`,
                ephemeral: true
            };
        } catch (error) {
            return await buildError(interaction, error);
        }
    }
}
